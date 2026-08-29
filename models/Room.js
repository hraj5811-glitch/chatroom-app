const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true, index: true },
  name: { type: String, trim: true, maxlength: 50, default: "" },
  description: { type: String, trim: true, maxlength: 200, default: "" },
  category: {
    type: String,
    enum: ["General", "Tech", "Gaming", "Study", "Music", "Movies", "Casual"],
    default: "General",
    index: true,
  },
  isPublic: { type: Boolean, default: true, index: true },
  isPasswordProtected: { type: Boolean, default: false },
  passwordHash: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null if a guest created it
  creatorUsername: { type: String, default: "" },
  moderators: [{ type: String }],
  pinnedMessage: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    text: { type: String, default: "" },
    username: { type: String, default: "" },
    pinnedAt: { type: Date, default: null },
  },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Compound index for fast Discover queries
roomSchema.index({ isPublic: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model("Room", roomSchema);
