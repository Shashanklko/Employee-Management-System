import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";

const Employee = neonDB.define("Employee", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM(
      "System Admin",
      "HR",
      "Executive",
      "Employee",
      "Intern"
    ),
    defaultValue: "Employee",
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_blocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  blocked_until: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  block_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  blocked_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Direct manager/reporting manager ID",
  },
  current_salary: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  bonus: {
    type: DataTypes.FLOAT,
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
Employee.belongsTo(Employee, {
  as: "manager",
  foreignKey: "manager_id",
});

Employee.hasMany(Employee, {
  as: "direct_reports",
  foreignKey: "manager_id",
});

// Sync model with database (run in production with caution)
Employee.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Employee model:", err);
});

export default Employee;
