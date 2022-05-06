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

var con = mysql.createConnection({
  host: "us-cdbr-east-05.cleardb.net",
  user: "b8d01d88271309",
  password: "3b220325",
  database: 'heroku_9390bfdc44d4566'
});
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
app.use('/', (req, res) => {
  con.query("SELECT * FROM user", (err, result, fields) => {
    if (err) throw err;
    users = result
  });

  con.query("SELECT * FROM block", (err, result, fields) => {
    if (err) throw err;
    block = result
  });

  con.query("SELECT * FROM message", (err, result, fields) => {
    if (err) throw err;
    messages = result
  });
  res.send(JSON.stringify({ data: { messages: messages, block: block, users: users } }))
})

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("activate_user", (data) => {
    active_users[data['email']] = data
    socket.emit("user_activated", data)
    let sql = 'SELECT * FROM user WHERE email = ?';
    let result =[]
    con.query(sql, [data['email']],  (err, result)=> {
      if (err) throw err;
      result = result
    });
    if(result.length<1){
      sql = 'INSERT INTO user (name, email, picture) VALUES (?,?,?)';
      con.query(sql, [data['name'],data['email'],data['picture']],  (err, result)=> {
        if (err) throw err;
        console.log('inserted succesfully');
      });
    }
  });

  socket.on("send_message", (data) => {
    socket.emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

server.listen((process.env.PORT || 5000), () => {
  console.log("SERVER RUNNING");
});