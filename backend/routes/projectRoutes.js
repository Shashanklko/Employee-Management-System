import express from "express";
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(checkBlockedStatus);

// Get all projects (all authenticated users can view)
router.get("/", getAllProjects);

// Get project by ID (all authenticated users can view)
router.get("/:id", getProjectById);

// Create project (HR/Executive/System Admin only)
router.post("/", requireHR, createProject);

// Update project (HR/Executive/System Admin only)
router.put("/:id", requireHR, updateProject);

// Delete project (HR/Executive/System Admin only)
router.delete("/:id", requireHR, deleteProject);

export default router;

