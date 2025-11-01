import express from "express";
import {
  getAllHR,
  createHR,
  updateHR,
} from "../controllers/hrController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireSystemAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes require System Admin
router.use(authenticate);
router.use(requireSystemAdmin);

router.get("/", getAllHR);
router.post("/", createHR);
router.put("/:id", updateHR);

export default router;

