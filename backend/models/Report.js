import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";
import Employee from "./Employee.js";

const Report = neonDB.define("Report", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Nullable for anonymous reports",
  },
  is_anonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "If true, employee_id and created_by will be hidden from HR/Admin",
  },
  report_type: {
    type: DataTypes.ENUM("Attendance", "Performance", "Payroll", "General"),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("Pending", "In Progress", "Resolved", "Rejected"),
    defaultValue: "Pending",
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  created_by_type: {
    type: DataTypes.ENUM("Employee", "HR", "Executive", "System Admin"),
    allowNull: false,
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reviewed_by_type: {
    type: DataTypes.ENUM("HR", "Executive", "System Admin"),
    allowNull: true,
  },
  assigned_to_department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Department assigned to handle this report (by HR)",
  },
  assigned_to_manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Department manager assigned to handle this report",
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "When HR assigned this report to department",
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "HR/Admin who assigned this report",
  },
  resolution_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Define association with Employee (for Sequelize queries)
Report.belongsTo(Employee, {
  foreignKey: "employee_id",
  as: "employee",
});

Report.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Report model:", err);
});

export default Report;
