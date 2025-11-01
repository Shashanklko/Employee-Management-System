import express from "express";
import {
  getMyMessages,
  getSentMessages,
  sendMessage,
  markAsRead,
  archiveMessage,
  deleteMessage,
  escalateAppeal,
} from "../controllers/messageController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get inbox messages
router.get("/inbox", getMyMessages);

// Get sent messages
router.get("/sent", getSentMessages);

// Send message
router.post("/", sendMessage);

// Mark message as read
router.patch("/:id/read", markAsRead);

// Archive message
router.patch("/:id/archive", archiveMessage);

// Delete message
router.delete("/:id", deleteMessage);

// Escalate appeal to Executive (HR only)
router.post("/escalate", escalateAppeal);

export default router;

