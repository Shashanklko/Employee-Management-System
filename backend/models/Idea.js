import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";
import Employee from "./Employee.js";

const Idea = neonDB.define("Idea", {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(
      "Process Improvement",
      "Technology",
      "Cost Reduction",
      "Employee Engagement",
      "Customer Experience",
      "Innovation",
      "Other"
    ),
    defaultValue: "Other",
  },
  status: {
    type: DataTypes.ENUM("Submitted", "Under Review", "Approved", "Rejected", "Implemented"),
    defaultValue: "Submitted",
  },
  impact_level: {
    type: DataTypes.ENUM("Low", "Medium", "High", "Very High"),
    defaultValue: "Medium",
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reviewed_by_type: {
    type: DataTypes.ENUM("System Admin", "Executive", "HR"),
    allowNull: true,
  },
  review_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  upvotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
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
Idea.belongsTo(Employee, {
  foreignKey: "employee_id",
  as: "employee",
});

Employee.hasMany(Idea, {
  foreignKey: "employee_id",
  as: "ideas",
});

// Sync model
Idea.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Idea model:", err);
});

export default Idea;

