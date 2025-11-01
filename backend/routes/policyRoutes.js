import express from "express";
import {
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
} from "../controllers/policyController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(checkBlockedStatus);

// Get all policies (all authenticated users can view)
router.get("/", getAllPolicies);

// Get policy by ID (all authenticated users can view)
router.get("/:id", getPolicyById);

// Create policy (HR/Executive/System Admin only)
router.post("/", requireHR, createPolicy);

// Update policy (HR/Executive/System Admin only)
router.put("/:id", requireHR, updatePolicy);

// Delete policy (HR/Executive/System Admin only)
router.delete("/:id", requireHR, deletePolicy);

export default router;

