import express from "express";
import {
  registerExecutive,
  loginExecutive,
  registerHR,
  getAllHRs,
} from "../controllers/executiveController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { verifyRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Only Executives can register HRs
router.post("/register-hr", verifyToken, verifyRole(["Executive"]), registerHR);

// Executives can view all HRs
router.get("/hrs", verifyToken, verifyRole(["Executive"]), getAllHRs);

// Common routes
router.post("/register", registerExecutive); // used for initial setup
router.post("/login", loginExecutive);

export default router;
