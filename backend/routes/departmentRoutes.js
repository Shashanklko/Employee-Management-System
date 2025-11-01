import express from "express";
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentHierarchy,
} from "../controllers/departmentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR, requireSystemAdmin } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication and check blocked status
router.use(authenticate);
router.use(checkBlockedStatus);

// Get all departments (all authenticated users can view)
router.get("/", getAllDepartments);

// Get department hierarchy tree (all authenticated users)
router.get("/hierarchy", getDepartmentHierarchy);

// Get department by ID (all authenticated users can view)
router.get("/:id", getDepartmentById);

// Create department (System Admin, Executive, HR only)
router.post("/", requireHR, createDepartment);

// Update department (System Admin, Executive, HR only)
router.put("/:id", requireHR, updateDepartment);

// Delete department (System Admin only)
router.delete("/:id", requireSystemAdmin, deleteDepartment);

export default router;

