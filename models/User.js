const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String },
  displayName: { type: String }, // their real Google name, shown as a label
  username: { type: String, unique: true, required: true }, // permanent chat identity, e.g. User48213
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
