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
var x=""
con.connect(function(err) {
  if (err) {
    return console.error('error: ' + err.message);
  }
  x="connected"
  console.log('Connected to the MySQL server.');
});

app.use('/',(req,res)=>{
  con.query("SELECT * FROM user", function (err, result, fields) {
    if (err) throw err;
    console.log(result);
    res.send(JSON.stringify([{"key":result}]))
  });
})

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("activate_user", (data) => {
    socket.emit("user_activated",data)
    console.log(data);
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