const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use('/',(req,res)=>{
    res.send(JSON.stringify([{"key":"value"}]))
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

server.listen(4000, () => {
  console.log("SERVER RUNNING");
});