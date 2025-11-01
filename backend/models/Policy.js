import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";

const Policy = neonDB.define("Policy", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(
      "HR",
      "IT",
      "Finance",
      "Code of Conduct",
      "Health & Safety",
      "Leave Policy",
      "Other"
    ),
    defaultValue: "HR",
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  version: {
    type: DataTypes.STRING,
    defaultValue: "1.0",
  },
  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  created_by_type: {
    type: DataTypes.ENUM("System Admin", "Executive", "HR"),
    allowNull: false,
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

// Sync model
Policy.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Policy model:", err);
});

export default Policy;
