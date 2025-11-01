import express from "express";
import {
  submitExpense,
  getExpenses,
  approveExpense,
  rejectExpense,
} from "../controllers/expenseController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireHR } from "../middleware/roleMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(checkBlockedStatus);

// Submit expense (all authenticated users)
router.post("/", submitExpense);

// Get expenses
router.get("/", getExpenses);

// Approve expense (HR/Executive/System Admin only)
router.post("/:id/approve", requireHR, approveExpense);

// Reject expense (HR/Executive/System Admin only)
router.post("/:id/reject", requireHR, rejectExpense);

export default router;

