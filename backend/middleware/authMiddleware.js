import { verifyToken } from "../utils/jwtUtils.js";

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "No token provided. Please provide a valid authentication token.",
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token is required",
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      userType: decoded.userType,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Unauthorized",
      message: error.message || "Invalid or expired token",
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token, but attaches user if token is valid
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        userType: decoded.userType,
      };
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

