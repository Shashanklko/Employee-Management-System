import express from "express";
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(checkBlockedStatus);

// Get all tasks (filtered by user role)
router.get("/", getAllTasks);

// Get task by ID
router.get("/:id", getTaskById);

// Create task (HR/Executive/System Admin only)
router.post("/", requireHR, createTask);

// Update task (assigned employee or admin)
router.put("/:id", updateTask);

// Delete task (HR/Executive/System Admin only)
router.delete("/:id", requireHR, deleteTask);

export default router;

