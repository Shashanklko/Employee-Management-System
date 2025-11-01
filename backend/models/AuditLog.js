import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";

const AuditLog = neonDB.define("AuditLog", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "e.g., CREATE_EMPLOYEE, UPDATE_PAYROLL, DELETE_USER",
  },
  entity_type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "e.g., Employee, Payroll, Message, Report",
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "ID of the affected entity",
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "User who performed the action",
  },
  user_type: {
    type: DataTypes.ENUM("System Admin", "Executive", "HR", "Employee", "Intern"),
    allowNull: false,
  },
  user_email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  changes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Before and after values",
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("SUCCESS", "FAILED", "PENDING"),
    defaultValue: "SUCCESS",
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Additional context data",
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Sync model with database
AuditLog.sync({ alter: false }).catch((err) => {
  console.error("Error syncing AuditLog model:", err);
});

export default AuditLog;

