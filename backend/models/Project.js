import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";

const Project = neonDB.define("Project", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  project_manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Employee ID who manages this project",
  },
  status: {
    type: DataTypes.ENUM("Planning", "Active", "On Hold", "Completed", "Cancelled"),
    defaultValue: "Planning",
  },
  priority: {
    type: DataTypes.ENUM("Low", "Medium", "High", "Urgent"),
    defaultValue: "Medium",
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  budget: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: "Project budget in currency",
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  created_by_type: {
    type: DataTypes.ENUM("System Admin", "Executive", "HR"),
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
Project.belongsTo(Employee, {
  foreignKey: "project_manager_id",
  as: "projectManager",
});

Employee.hasMany(Project, {
  foreignKey: "project_manager_id",
  as: "managedProjects",
});

// Sync model
Project.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Project model:", err);
});

export default Project;

