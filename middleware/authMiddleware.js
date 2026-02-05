const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
    req.user = decoded; // contains id, email, role
    next();
  } catch (error) {
    console.error("JWT verification error:", error.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticate;
