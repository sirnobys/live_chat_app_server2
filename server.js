const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mysql = require('mysql');
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
db_config = {
  host: "us-cdbr-east-05.cleardb.net",
  user: "b8d01d88271309",
  password: "3b220325",
  database: 'heroku_9390bfdc44d4566'
}
var con = mysql.createConnection(db_config);
function handleDisconnect() {
  con = mysql.createConnection(db_config); // Recreate the connection, since
  // the old one cannot be reused.

  con.connect(function (err) {              // The server is either down
    if (err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
  // If you're also serving http, display a 503 error.
  con.on('error', function (err) {
    console.log('db error', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}
handleDisconnect();

con.connect(function (err) {
  if (err) {
    return console.error('error: ' + err.message);
  }
  console.log('Connected to the MySQL server.');
});

let messages = []
let block = []
let users = []
let active_users = {}

const fetch = () => {
  con.query("SELECT * FROM user", (err, result, fields) => {
    if (err) throw err;
    users = result
  });

  con.query("SELECT * FROM block", (err, result, fields) => {
    if (err) throw err;
    block = result
    console.log(fields);
  });

  con.query("SELECT * FROM message", (err, result, fields) => {
    if (err) throw err;
    messages = result
  });

}

const activate_user=()=>{}

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
  socket.on("fetch", () => {
    fetch()
    socket.emit('fetched', { messages, block, users })
  })
  socket.on("activate_user", (data) => {

    active_users[data['email']] = data
    socket.emit("user_activated", active_users)
    let sql = 'SELECT * FROM user WHERE email = ?';
    con.query(sql, [data['email']], (err, result) => {
      if (err) throw err;
      if (result.length < 1) {
        sql = 'INSERT INTO user (name, email, picture) VALUES (?,?,?)';
        con.query(sql, [data['name'], data['email'], data['picture']], (err, result) => {
          if (err) throw err;
          console.log('inserted successfully');
        });
      }
    });
  });

  socket.on("send_message", (data) => {
    messages.push(data)
    io.emit("message_sent", messages);
    let sql = 'INSERT INTO message (room, sender, receiver,time,message) VALUES (?,?,?,?,?)';
    con.query(sql, [data['room'], data['sender'], data['receiver'], data['sent'], data['message']], (err, result) => {
      if (err) throw err;
      console.log('inserted message successfully');
    });
  });

  socket.on("block_user", (data) => {
    if(!(block.some(e=>e.user==data.user && e.blocked_user == data.blocked_user))){
      block.push(data)
    }
    io.emit('user_blocked', block)
    let sql = "SELECT * FROM block WHERE blocked_user=? AND user=?"
    con.query(sql, [data['blocked_user'], data['user']], (err, result) => {
      if (err) throw err;
      if (result.length < 1) {
        sql = 'INSERT into block (blocked_user, user) value (?,?)';
        con.query(sql, [data['blocked_user'], data['user']], (err, result) => {
          if (err) throw err;
          console.log('inserted block successfully');
        });
      }
    });

  });

  socket.on("unblock_user", (data) => {
    block = block.filter(e=>!(e.user==data.user && e.blocked_user == data.blocked_user))
    io.emit('user_unblocked', block)
    let sql = 'DELETE FROM block WHERE blocked_user=? AND user=?';
    con.query(sql, [data['blocked_user'], data['user']], (err, result) => {
      if (err) throw err;
      console.log('deleted block successfully');
    });
  });

  socket.on("deactivate_user", (data) => {
    delete active_users[data["emeail"]]
    socket.emit('user_deactivated', data)
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

server.listen((process.env.PORT || 5000), () => {
  console.log("SERVER RUNNING");
});