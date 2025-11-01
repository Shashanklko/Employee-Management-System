import express from "express";
import {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication and check blocked status
router.use(authenticate);
router.use(checkBlockedStatus);

// Get all announcements (all authenticated users can view)
router.get("/", getAllAnnouncements);

// Get announcement by ID (all authenticated users can view)
router.get("/:id", getAnnouncementById);

// Create announcement (System Admin, Executive, HR only)
router.post("/", requireHR, createAnnouncement);

// Update announcement (System Admin, Executive, HR only)
router.put("/:id", requireHR, updateAnnouncement);

// Delete announcement (System Admin, Executive, HR only)
router.delete("/:id", requireHR, deleteAnnouncement);

export default router;

