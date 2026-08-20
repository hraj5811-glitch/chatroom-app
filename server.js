const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// In-memory store: { roomName: [ {id, user, text, time} ] }
// Swap this for MongoDB later if you want persistent history across restarts.
const roomHistory = {};
const MAX_HISTORY = 50;

// Track who is in which room: { socketId: { username, room } }
const activeUsers = {};

function getUsersInRoom(room) {
  return Object.values(activeUsers)
    .filter((u) => u.room === room)
    .map((u) => u.username);
}

io.on("connection", (socket) => {
  socket.on("join_room", ({ username, room }) => {
    // Basic sanitation
    const safeUsername = String(username || "Guest").slice(0, 24);
    const safeRoom = String(room || "general").slice(0, 24);

    socket.join(safeRoom);
    activeUsers[socket.id] = { username: safeUsername, room: safeRoom };

    // Send existing history to the joining user
    const history = roomHistory[safeRoom] || [];
    socket.emit("room_history", history);

    // Notify the room
    io.to(safeRoom).emit("system_message", `${safeUsername} joined the room.`);
    io.to(safeRoom).emit("user_list", getUsersInRoom(safeRoom));
  });

  socket.on("send_message", (text) => {
    const user = activeUsers[socket.id];
    if (!user || !text) return;

    const message = {
      id: socket.id,
      user: user.username,
      text: String(text).slice(0, 1000),
      time: new Date().toISOString(),
    };

    if (!roomHistory[user.room]) roomHistory[user.room] = [];
    roomHistory[user.room].push(message);
    if (roomHistory[user.room].length > MAX_HISTORY) {
      roomHistory[user.room].shift();
    }

    io.to(user.room).emit("receive_message", message);
  });

  socket.on("typing", () => {
    const user = activeUsers[socket.id];
    if (!user) return;
    socket.to(user.room).emit("display_typing", user.username);
  });

  socket.on("disconnect", () => {
    const user = activeUsers[socket.id];
    if (user) {
      io.to(user.room).emit("system_message", `${user.username} left the room.`);
      delete activeUsers[socket.id];
      io.to(user.room).emit("user_list", getUsersInRoom(user.room));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chatroom server running on port ${PORT}`);
});
