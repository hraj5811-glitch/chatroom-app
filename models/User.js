const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String },
  displayName: { type: String }, // their real Google name, shown as a label
  username: { type: String, unique: true, required: true }, // permanent chat identity, e.g. User48213
  avatarUrl: { type: String, default: null },
  bio: { type: String, maxlength: 160, default: "" },
  college: { type: String, maxlength: 100, default: "" },
  interests: [{ type: String }],
  isPublicProfile: { type: Boolean, default: true },
  isOnboarded: { type: Boolean, default: false },
  friends: [
    {
      username: { type: String, required: true },
      status: { type: String, enum: ["pending", "accepted", "outgoing", "incoming", "sent"], default: "incoming" },
      addedAt: { type: Date, default: Date.now },
    },
  ],
  joinedRooms: [
    {
      roomId: { type: String },
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  status: {
    type: String,
    enum: ["Online", "Studying", "Gaming", "Chilling", "Listening", "DND"],
    default: "Online",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
