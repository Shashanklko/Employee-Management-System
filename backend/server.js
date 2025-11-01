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

dotenv.config(); // Initialize environment variables
const app = express(); // creaate an express applicaiton instance

app.use(cors()); //enables CORS for all incoming requests

app.use(express.json()); //parsing incoming json automatically

connectMongo();
connectNeon();

// Defines ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  res.send("Employee Management Backend Running Successfully!");
});

const PORT = Process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
