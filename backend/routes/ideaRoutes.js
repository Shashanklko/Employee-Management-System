import express from "express";
import {
  submitIdea,
  getAllIdeas,
  getIdeaById,
  upvoteIdea,
  removeUpvote,
  reviewIdea,
  getInnovationLeaderboard,
} from "../controllers/ideaController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(checkBlockedStatus);

// Submit idea (all authenticated users)
router.post("/", submitIdea);

// Get all ideas (all authenticated users)
router.get("/", getAllIdeas);

// Get innovation leaderboard (all authenticated users)
router.get("/leaderboard", getInnovationLeaderboard);

// Get idea by ID (all authenticated users)
router.get("/:id", getIdeaById);

// Upvote idea (all authenticated users)
router.post("/:id/upvote", upvoteIdea);

// Remove upvote (all authenticated users)
router.delete("/:id/upvote", removeUpvote);

// Review idea (HR/Executive/System Admin only)
router.post("/:id/review", requireHR, reviewIdea);

export default router;

