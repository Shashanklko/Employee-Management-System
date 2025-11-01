import express from "express";
import {
  getTeamHierarchy,
  getDepartmentTeam,
  getOrgChart,
} from "../controllers/teamHierarchyController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { checkBlockedStatus } from "../middleware/blockCheckMiddleware.js";

const router = express.Router();

// All routes require authentication and check blocked status
router.use(authenticate);
router.use(checkBlockedStatus);

// Get team hierarchy - reporting structure (all authenticated users)
router.get("/hierarchy", getTeamHierarchy);

// Get department team structure (all authenticated users)
router.get("/department", getDepartmentTeam);

// Get organization chart - complete hierarchy (all authenticated users)
router.get("/org-chart", getOrgChart);

export default router;

