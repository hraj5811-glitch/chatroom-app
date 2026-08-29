const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true }, // e.g. "Alice::Bob" (alphabetically sorted)
  sender: { type: String, required: true, index: true },
  recipient: { type: String, required: true, index: true },
  text: { type: String, trim: true, maxlength: 1000, default: "" },
  imageUrl: { type: String, default: null },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
});

directMessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model("DirectMessage", directMessageSchema);
