const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },
    termsAndConditions: { type: Boolean, required: true, default: false },
    role: { type: String, enum: ["buyer", "seller"], default: "buyer" },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
