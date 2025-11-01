import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";
import Employee from "./Employee.js";

const LeaveBalance = neonDB.define("LeaveBalance", {
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
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
      "Unpaid Leave"
    ),
    allowNull: false,
  },
  total_allocated: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: "Total leaves allocated for this type in the year",
  },
  used: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: "Leaves used/approved",
  },
  pending: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: "Leaves pending approval",
  },
  balance: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: "Available balance (total - used - pending)",
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ["employee_id", "year", "leave_type"],
      name: "unique_leave_balance",
    },
  ],
});

// Define associations
LeaveBalance.belongsTo(Employee, {
  foreignKey: "employee_id",
  as: "employee",
});

Employee.hasMany(LeaveBalance, {
  foreignKey: "employee_id",
  as: "leaveBalances",
});

// Sync model
LeaveBalance.sync({ alter: false }).catch((err) => {
  console.error("Error syncing LeaveBalance model:", err);
});

export default LeaveBalance;

