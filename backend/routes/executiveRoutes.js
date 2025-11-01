import express from "express";
import {
  getAllExecutives,
  createExecutive,
  updateExecutive,
} from "../controllers/executiveController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireSystemAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes require System Admin
router.use(authenticate);
router.use(requireSystemAdmin);

router.get("/", getAllExecutives);
router.post("/", createExecutive);
router.put("/:id", updateExecutive);

export default router;
