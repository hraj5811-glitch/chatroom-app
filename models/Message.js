const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  username: { type: String, required: true, index: true },
  text: { type: String, default: "", maxlength: 1000 },
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    username: { type: String, default: "" },
    text: { type: String, default: "" },
  },
  poll: {
    type: Object,
    default: null,
  },
  reactions: [
    {
      emoji: { type: String, required: true },
      count: { type: Number, default: 0 },
      users: [{ type: String }],
    },
  ],
  imageUrl: { type: String, default: null },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Compound index for fast room message fetching and sorting
messageSchema.index({ room: 1, createdAt: -1 });
// Compound index for fast user messages in specific room
messageSchema.index({ username: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
