const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  username: { type: String, required: true },
  text: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);
