import express from "express";
import cors from "cors"; // enables frontend and backend communication
import dotenv from "dotenv"; // load environment variable from .env files
import { connectMongo } from "./config/mongoClient.js";
import { connectNeon } from "./config/neonClient.js";

// import all ROUTES (Handle API endpoints)
import authRoutes from "./routes/authRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import executiveRoutes from "./routes/executiveRoutes.js";
import hrRoutes from "./routes/hrRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import timesheetRoutes from "./routes/timesheetRoutes.js";
import ideaRoutes from "./routes/ideaRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";

dotenv.config(); // Initialize environment variables
const app = express(); // create an express application instance

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions)); //enables CORS with security

app.use(express.json({ limit: "10mb" })); //parsing incoming json automatically with size limit
app.use(express.urlencoded({ extended: true, limit: "10mb" })); //parse URL-encoded bodies

// Initialize database connections
connectMongo();
connectNeon();

// Defines ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/executives", executiveRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/admin", adminRoutes); // System Admin routes
app.use("/api/departments", departmentRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/timesheets", timesheetRoutes);
app.use("/api/ideas", ideaRoutes);
app.use("/api/calendar", calendarRoutes);

app.get("/", (req, res) => {
  res.send("Employee Management Backend Running Successfully!");
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
