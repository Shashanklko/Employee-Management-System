import express from "express";
import {
  register,
  login,
  getProfile,
  changePassword,
  checkBlockStatus,
  submitBlockAppeal,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Public routes for blocked users (no authentication required)
router.post("/check-block-status", checkBlockStatus); // Check if account is blocked
router.post("/submit-appeal", submitBlockAppeal); // Submit appeal for blocked account

// Protected routes - check authentication and blocked status
router.get("/profile", authenticate, checkBlockedStatus, getProfile);
router.post("/change-password", authenticate, checkBlockedStatus, changePassword);

export default router;

