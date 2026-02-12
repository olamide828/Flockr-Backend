const express = require("express");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const crypto = require("crypto");
// const nodemailer = require("nodemailer");
const { Resend } = require("resend");

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/register", async (req, res) => {
  try {
    let { email, firstName, lastName, password, termsAndConditions } = req.body;

    if (!email || !firstName || !lastName || !password || !termsAndConditions) {
      return res.status(400).json({ message: "All fields are required" });
    }

    email = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "buyer",
      isVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: Date.now() + 1000 * 60 * 60 * 24,
    });

    const verifyLink = `https://flockr.netlify.app/verify-email/${verificationToken}`;

    try {
      await resend.emails.send({
        from: "Flockr <onboarding@resend.dev>",
        to: email,
        subject: "Verify your Flockr account",
        html: `
          <h2>Hello ${firstName}</h2>
          <p>Click below to verify your account:</p>
          <a href="${verifyLink}">Verify Email</a>
          <p>This link expires in 24 hours.</p>
        `,
      });
    } catch (mailError) {
      await User.deleteOne({ _id: user._id });
      return res.status(500).json({ message: "Failed to send verification email. Try again." });
    }

    res.status(201).json({
      message: "Registration successful. Check your email to verify your account.",
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: error.message });
  }
});


router.get("/verify-email/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: req.params.token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully! You can now login." });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email first." });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_TOKEN_SECRET,
      { expiresIn: "1h" },
    );

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
