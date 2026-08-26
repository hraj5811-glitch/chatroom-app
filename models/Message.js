const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  username: { type: String, required: true, index: true },
  text: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Compound index for fast room message fetching and sorting
messageSchema.index({ room: 1, createdAt: -1 });
// Compound index for fast user messages in specific room
messageSchema.index({ username: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);

