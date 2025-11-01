import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";
import Employee from "./Employee.js";
import Project from "./Project.js";

const Task = neonDB.define("Task", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Projects",
      key: "id",
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Employees",
      key: "id",
    },
    comment: "Employee assigned to this task",
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Who assigned this task",
  },
  status: {
    type: DataTypes.ENUM("To Do", "In Progress", "Review", "Done", "Blocked"),
    defaultValue: "To Do",
  },
  priority: {
    type: DataTypes.ENUM("Low", "Medium", "High", "Urgent"),
    defaultValue: "Medium",
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  estimated_hours: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  actual_hours: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100,
    },
    comment: "Task completion percentage",
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
Task.belongsTo(Project, {
  foreignKey: "project_id",
  as: "project",
});

Task.belongsTo(Employee, {
  foreignKey: "assigned_to",
  as: "assignedEmployee",
});

Task.belongsTo(Employee, {
  foreignKey: "assigned_by",
  as: "assignedByEmployee",
});

Project.hasMany(Task, {
  foreignKey: "project_id",
  as: "tasks",
});

Employee.hasMany(Task, {
  foreignKey: "assigned_to",
  as: "tasks",
});

// Sync model
Task.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Task model:", err);
});

export default Task;

