const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("./passport-config");

const User = require("./models/User");
const Message = require("./models/Message");
const Room = require("./models/Room");
const { generateUniqueUsername } = require("./generateUsername");
const { generateUniqueRoomId } = require("./generateRoomId");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ---- Database ----
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ---- Middleware ----
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Share session data with Socket.IO
io.engine.use(sessionMiddleware);

function requireLogin(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Not logged in" });
}

// ---- Auth routes ----
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/app.html" }),
  (req, res) => {
    res.redirect("/app.html");
  }
);

app.get("/auth/logout", (req, res) => {
  req.session.guestUsername = null;
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect("/app.html");
    });
  });
});

// Returns the current logged-in user (Google) or guest identity, if any
app.get("/api/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({
      username: req.user.username,
      email: req.user.email,
      isGuest: false,
    });
  }
  if (req.session.guestUsername) {
    return res.json({
      username: req.session.guestUsername,
      isGuest: true,
    });
  }
  return res.status(401).json({ error: "Not logged in" });
});

// Creates a temporary guest identity for this session
app.post("/api/guest", async (req, res) => {
  const username = `Guest${Math.floor(1000 + Math.random() * 9000)}`;
  req.session.guestUsername = username;
  res.json({ username, isGuest: true });
});

// ---- Room routes ----

// Create a brand new room with a random ID
app.post("/api/rooms/create", async (req, res) => {
  try {
    const roomId = await generateUniqueRoomId();
    const isLoggedIn = req.isAuthenticated && req.isAuthenticated();

    await Room.create({
      roomId,
      createdBy: isLoggedIn ? req.user._id : null,
    });

    if (isLoggedIn) {
      req.user.joinedRooms.push({ roomId });
      await req.user.save();
    }

    res.json({ roomId });
  } catch (err) {
    console.error("Room creation failed:", err);
    res.status(500).json({ error: "Could not create room" });
  }
});

// Join an existing room by ID (validates it exists first)
app.post("/api/rooms/join", async (req, res) => {
  try {
    const roomId = String(req.body.roomId || "").toUpperCase().trim();
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: "Room ID not found. Double-check the code." });
    }

    const isLoggedIn = req.isAuthenticated && req.isAuthenticated();
    if (isLoggedIn) {
      const alreadyJoined = req.user.joinedRooms.some((r) => r.roomId === roomId);
      if (!alreadyJoined) {
        req.user.joinedRooms.push({ roomId });
        await req.user.save();
      }
    }

    res.json({ roomId });
  } catch (err) {
    console.error("Room join failed:", err);
    res.status(500).json({ error: "Could not join room" });
  }
});

// ---- Profile routes (logged-in users only) ----

app.get("/api/profile", requireLogin, async (req, res) => {
  const rooms = [...req.user.joinedRooms].sort((a, b) => b.joinedAt - a.joinedAt);
  res.json({
    username: req.user.username,
    email: req.user.email,
    joinedRooms: rooms,
  });
});

app.put("/api/profile/username", requireLogin, async (req, res) => {
  try {
    const newUsername = String(req.body.username || "").trim().slice(0, 24);
    if (!newUsername || !/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return res.status(400).json({ error: "Use only letters, numbers, and underscores." });
    }
    const taken = await User.findOne({ username: newUsername });
    if (taken && String(taken._id) !== String(req.user._id)) {
      return res.status(409).json({ error: "That username is already taken." });
    }
    req.user.username = newUsername;
    await req.user.save();
    res.json({ username: req.user.username });
  } catch (err) {
    console.error("Username update failed:", err);
    res.status(500).json({ error: "Could not update username" });
  }
});

// Fetch saved message history for a specific room (used by the profile screen)
app.get("/api/rooms/:roomId/messages", requireLogin, async (req, res) => {
  const roomId = String(req.params.roomId || "").toUpperCase();
  const messages = await Message.find({ room: roomId }).sort({ createdAt: 1 }).lean();
  res.json({ messages });
});

// ---- Admin middleware & routes ----
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Admin access required" });
}

app.get("/admin", (req, res) => {
  res.redirect("/admin.html");
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (password && password === adminPassword) {
    req.session.isAdmin = true;
    return res.json({ success: true, message: "Logged in as admin" });
  }
  return res.status(401).json({ error: "Invalid admin password" });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true, message: "Logged out from admin" });
});

app.get("/api/admin/me", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ isAdmin: true });
  }
  return res.status(401).json({ isAdmin: false });
});

// Admin Stats
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRooms = await Room.countDocuments();
    const totalMessages = await Message.countDocuments();

    const onlineSockets = Object.values(activeUsers);
    const activeRoomsSet = new Set(onlineSockets.map((u) => u.room).filter(Boolean));

    res.json({
      totalUsers,
      totalRooms,
      totalMessages,
      onlineUsersCount: onlineSockets.length,
      activeRoomsCount: activeRoomsSet.size,
      onlineUsers: onlineSockets.map((u) => ({
        username: u.username,
        room: u.room,
        isGuest: u.isGuest,
      })),
    });
  } catch (err) {
    console.error("Admin stats failed:", err);
    res.status(500).json({ error: "Could not fetch admin stats" });
  }
});

// Admin Messages (Search & Filter & Paginate)
app.get("/api/admin/messages", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.room) {
      filter.room = String(req.query.room).trim().toUpperCase();
    }
    if (req.query.username) {
      filter.username = { $regex: String(req.query.username).trim(), $options: "i" };
    }
    if (req.query.search) {
      filter.text = { $regex: String(req.query.search).trim(), $options: "i" };
    }

    const [messages, total] = await Promise.all([
      Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Message.countDocuments(filter),
    ]);

    res.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error("Admin messages failed:", err);
    res.status(500).json({ error: "Could not fetch messages" });
  }
});

app.delete("/api/admin/messages/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await Message.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Message not found" });
    }
    io.to("admin_channel").emit("admin_live_event", {
      type: "message_deleted",
      messageId: req.params.id,
      text: "A message was deleted by admin.",
      time: new Date(),
    });
    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    console.error("Delete message failed:", err);
    res.status(500).json({ error: "Could not delete message" });
  }
});

// Admin Rooms List & Delete
app.get("/api/admin/rooms", requireAdmin, async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate("createdBy", "username email displayName")
      .sort({ createdAt: -1 })
      .lean();

    const roomIds = rooms.map((r) => r.roomId);
    const messageCounts = await Message.aggregate([
      { $match: { room: { $in: roomIds } } },
      { $group: { _id: "$room", count: { $sum: 1 }, lastMessageAt: { $max: "$createdAt" } } },
    ]);

    const countMap = {};
    messageCounts.forEach((mc) => {
      countMap[mc._id] = { count: mc.count, lastMessageAt: mc.lastMessageAt };
    });

    const enrichedRooms = rooms.map((room) => {
      const onlineCount = Object.values(activeUsers).filter((u) => u.room === room.roomId).length;
      return {
        ...room,
        messageCount: countMap[room.roomId]?.count || 0,
        lastMessageAt: countMap[room.roomId]?.lastMessageAt || null,
        onlineCount,
      };
    });

    res.json({ rooms: enrichedRooms });
  } catch (err) {
    console.error("Admin rooms failed:", err);
    res.status(500).json({ error: "Could not fetch rooms" });
  }
});

app.delete("/api/admin/rooms/:roomId", requireAdmin, async (req, res) => {
  try {
    const roomId = String(req.params.roomId || "").toUpperCase();
    await Room.deleteOne({ roomId });
    await Message.deleteMany({ room: roomId });
    res.json({ success: true, message: `Room ${roomId} and its messages deleted` });
  } catch (err) {
    console.error("Delete room failed:", err);
    res.status(500).json({ error: "Could not delete room" });
  }
});

// Fetch full history of any room (active or past) for the admin inspector
app.get("/api/admin/rooms/:roomId/history", requireAdmin, async (req, res) => {
  try {
    const roomId = String(req.params.roomId || "").toUpperCase();
    const room = await Room.findOne({ roomId }).populate("createdBy", "username email displayName").lean();
    const messages = await Message.find({ room: roomId }).sort({ createdAt: 1 }).lean();
    const onlineUsersInRoom = getUsersInRoom(roomId);

    res.json({
      roomId,
      room,
      messages,
      totalMessages: messages.length,
      onlineUsers: onlineUsersInRoom,
      isLive: onlineUsersInRoom.length > 0,
    });
  } catch (err) {
    console.error("Room history inspection failed:", err);
    res.status(500).json({ error: "Could not fetch room history" });
  }
});

// Admin Users List & Delete
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch (err) {
    console.error("Admin users failed:", err);
    res.status(500).json({ error: "Could not fetch users" });
  }
});

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Delete user failed:", err);
    res.status(500).json({ error: "Could not delete user" });
  }
});

// ---- Socket.IO ----
const activeUsers = {}; // socketId -> { username, room, isGuest }
const spectators = new Set(); // socketId set of invisible admin spectators

function getUsersInRoom(room) {
  return Object.values(activeUsers)
    .filter((u) => u.room === room)
    .map((u) => u.username);
}

function getSocketSession(socket) {
  return new Promise((resolve) => {
    sessionMiddleware(socket.request, {}, () => {
      resolve(socket.request.session || {});
    });
  });
}

// Figures out who's really on the other end of this socket using the shared session,
// rather than trusting whatever the client claims to be.
async function resolveIdentity(socket) {
  const sess = await getSocketSession(socket);
  if (!sess) return null;

  if (sess.passport && sess.passport.user) {
    const dbUser = await User.findById(sess.passport.user);
    if (dbUser) return { username: dbUser.username, isGuest: false };
  }

  if (sess.guestUsername) {
    return { username: sess.guestUsername, isGuest: true };
  }

  return null;
}

io.on("connection", (socket) => {
  // Allow admin client to subscribe to live real-time server feed
  socket.on("admin_join", async () => {
    const sess = await getSocketSession(socket);
    if (sess && sess.isAdmin) {
      socket.join("admin_channel");
    }
  });

  // Ghost Spectator Mode: Join room invisibly without alerts or appearing in user list
  socket.on("admin_spectate_room", async ({ room }) => {
    const sess = await getSocketSession(socket);
    if (!sess || !sess.isAdmin) {
      socket.emit("auth_error", "Admin access required.");
      return;
    }

    const safeRoom = String(room || "").toUpperCase().slice(0, 12);
    socket.join(safeRoom);
    spectators.add(socket.id);

    try {
      const history = await Message.find({ room: safeRoom })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      
      const currentOccupants = getUsersInRoom(safeRoom);

      socket.emit("spectate_history", {
        room: safeRoom,
        messages: history.reverse(),
        occupants: currentOccupants,
      });
    } catch (err) {
      console.error("Failed to load spectate history:", err);
      socket.emit("spectate_history", { room: safeRoom, messages: [], occupants: [] });
    }
  });

  // Exit Ghost Spectator Mode cleanly
  socket.on("admin_leave_spectate", async ({ room }) => {
    const sess = await getSocketSession(socket);
    if (!sess || !sess.isAdmin) return;

    if (room) {
      const safeRoom = String(room || "").toUpperCase().slice(0, 12);
      socket.leave(safeRoom);
    }
    spectators.delete(socket.id);
  });

  socket.on("join_room", async ({ room }) => {
    const identity = await resolveIdentity(socket);
    if (!identity) {
      socket.emit("auth_error", "Please sign in again.");
      return;
    }

    const safeRoom = String(room || "").toUpperCase().slice(0, 12);

    socket.join(safeRoom);
    activeUsers[socket.id] = {
      username: identity.username,
      room: safeRoom,
      isGuest: identity.isGuest,
    };

    // Load persistent history from MongoDB
    try {
      const history = await Message.find({ room: safeRoom })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      socket.emit("room_history", history.reverse());
    } catch (err) {
      console.error("Failed to load history:", err);
      socket.emit("room_history", []);
    }

    io.to(safeRoom).emit("system_message", `${identity.username} joined the room.`);
    io.to(safeRoom).emit("user_list", getUsersInRoom(safeRoom));

    // Notify admin channel
    io.to("admin_channel").emit("admin_live_event", {
      type: "user_joined",
      user: identity.username,
      room: safeRoom,
      isGuest: identity.isGuest,
      time: new Date(),
    });
  });

  socket.on("leave_room", () => {
    const user = activeUsers[socket.id];
    if (user) {
      socket.leave(user.room);
      io.to(user.room).emit("system_message", `${user.username} left the room.`);
      io.to("admin_channel").emit("admin_live_event", {
        type: "user_left",
        user: user.username,
        room: user.room,
        time: new Date(),
      });
      delete activeUsers[socket.id];
      io.to(user.room).emit("user_list", getUsersInRoom(user.room));
    }
  });

  socket.on("send_message", async (text) => {
    const user = activeUsers[socket.id];
    if (!user || !text) return;

    const cleanText = String(text).slice(0, 1000);

    try {
      const saved = await Message.create({
        room: user.room,
        username: user.username,
        text: cleanText,
      });

      const messagePayload = {
        id: socket.id,
        messageId: String(saved._id),
        user: saved.username,
        text: saved.text,
        time: saved.createdAt,
      };

      io.to(user.room).emit("receive_message", messagePayload);

      // Broadcast to admin live stream
      io.to("admin_channel").emit("admin_live_event", {
        type: user.isGuest ? "guest_message" : "user_message",
        messageId: String(saved._id),
        user: saved.username,
        room: user.room,
        text: saved.text,
        time: saved.createdAt,
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  });

  socket.on("typing", () => {
    const user = activeUsers[socket.id];
    if (!user) return;
    socket.to(user.room).emit("display_typing", user.username);
  });

  socket.on("disconnect", () => {
    spectators.delete(socket.id);
    const user = activeUsers[socket.id];
    if (user) {
      io.to(user.room).emit("system_message", `${user.username} left the room.`);
      io.to("admin_channel").emit("admin_live_event", {
        type: "user_disconnect",
        user: user.username,
        room: user.room,
        time: new Date(),
      });
      delete activeUsers[socket.id];
      io.to(user.room).emit("user_list", getUsersInRoom(user.room));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chatroom server running on port ${PORT}`);
});
