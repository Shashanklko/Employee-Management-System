import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";

const Department = neonDB.define("Department", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Employees",
      key: "id",
    },
  },
  manager_type: {
    type: DataTypes.ENUM("Employee", "HR", "Executive"),
    allowNull: true,
  },
  parent_department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "Departments",
      key: "id",
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.INTEGER,
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
Department.belongsTo(Department, {
  as: "parent",
  foreignKey: "parent_department_id",
});

Department.hasMany(Department, {
  as: "children",
  foreignKey: "parent_department_id",
});

// Note: Manager associations are handled dynamically in controller since manager can be Employee, HR, or Executive

// Sync model with database
Department.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Department model:", err);
});

export default Department;

