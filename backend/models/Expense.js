import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";
import Employee from "./Employee.js";

const Expense = neonDB.define("Expense", {
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
  category: {
    type: DataTypes.ENUM(
      "Travel",
      "Meals",
      "Office Supplies",
      "Internet/Phone",
      "Training",
      "Medical",
      "Other"
    ),
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  receipt_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "URL or path to receipt document",
  },
  status: {
    type: DataTypes.ENUM("Pending", "Approved", "Rejected", "Paid"),
    defaultValue: "Pending",
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
Expense.belongsTo(Employee, {
  foreignKey: "employee_id",
  as: "employee",
});

Employee.hasMany(Expense, {
  foreignKey: "employee_id",
  as: "expenses",
});

// Sync model
Expense.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Expense model:", err);
});

export default Expense;

