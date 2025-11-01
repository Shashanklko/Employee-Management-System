import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";
import Employee from "./Employee.js";

const Leave = neonDB.define("Leave", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Employees",
      key: "id",
    },
  },
  leave_type: {
    type: DataTypes.ENUM(
      "Sick Leave",
      "Casual Leave",
      "Earned Leave",
      "Compensatory Off",
      "Maternity Leave",
      "Paternity Leave",
      "Bereavement Leave",
      "Unpaid Leave",
      "Other"
    ),
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  total_days: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: "Total number of leave days",
  },
  is_extra_leave: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "True if leave requested exceeds available balance",
  },
  status: {
    type: DataTypes.ENUM("Pending", "Approved", "Rejected", "Cancelled"),
    defaultValue: "Pending",
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  applied_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Employee who applied (usually same as employee_id)",
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  approved_by_type: {
    type: DataTypes.ENUM("System Admin", "Executive", "HR"),
    allowNull: true,
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approved_at: {
    type: DataTypes.DATE,
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

// Define associations
Leave.belongsTo(Employee, {
  foreignKey: "employee_id",
  as: "employee",
});

Employee.hasMany(Leave, {
  foreignKey: "employee_id",
  as: "leaves",
});

// Sync model with database
Leave.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Leave model:", err);
});

export default Leave;

