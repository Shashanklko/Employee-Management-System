import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";
import Employee from "./Employee.js";
import Project from "./Project.js";
import Task from "./Task.js";

const Timesheet = neonDB.define("Timesheet", {
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
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Projects",
      key: "id",
    },
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Tasks",
      key: "id",
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  hours: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
      max: 24,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
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
}, {
  indexes: [
    {
      fields: ["employee_id", "date"],
    },
    {
      fields: ["project_id"],
    },
  ],
});

// Define associations
Timesheet.belongsTo(Employee, {
  foreignKey: "employee_id",
  as: "employee",
});

Timesheet.belongsTo(Project, {
  foreignKey: "project_id",
  as: "project",
});

Timesheet.belongsTo(Task, {
  foreignKey: "task_id",
  as: "task",
});

Employee.hasMany(Timesheet, {
  foreignKey: "employee_id",
  as: "timesheets",
});

Project.hasMany(Timesheet, {
  foreignKey: "project_id",
  as: "timesheets",
});

Task.hasMany(Timesheet, {
  foreignKey: "task_id",
  as: "timesheets",
});

// Sync model
Timesheet.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Timesheet model:", err);
});

export default Timesheet;

