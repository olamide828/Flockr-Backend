const express = require("express");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    // if (!req.body) {
    //   return res.status(400).json({ message: "Request body missing" });
    // }

    let { email, firstName, lastName, password } = req.body;
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ message: "All fields are Required" });
    }

    email = email.trim().toLowerCase();
    firstName = firstName.trim();
    lastName = lastName.trim();

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and Password is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_TOKEN_SECRET,
      { expiresIn: "1h" },
    );

    res.json({ token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
