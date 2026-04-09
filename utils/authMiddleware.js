const jwt = require("jsonwebtoken");

/**
 * JWT authentication middleware.
 * Extracts and verifies the token from the Authorization header.
 * Attaches `req.userId` on success.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET || "bharatpulse-demo-secret-key-2026";
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Session expired. Please log in again.",
      });
    }
    return res.status(401).json({
      success: false,
      error: "Invalid token. Please log in again.",
    });
  }
}

module.exports = authMiddleware;
