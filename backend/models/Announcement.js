import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";

const Announcement = neonDB.define("Announcement", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(
      "General",
      "HR",
      "IT",
      "Finance",
      "Operations",
      "Important",
      "Event"
    ),
    defaultValue: "General",
  },
  priority: {
    type: DataTypes.ENUM("Low", "Medium", "High", "Urgent"),
    defaultValue: "Medium",
  },
  target_roles: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Array of roles this announcement targets. null = all roles",
  },
  target_departments: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Array of departments this announcement targets. null = all departments",
  },
  is_pinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Announcement expiry date. null = never expires",
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
  views_count: {
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

// Sync model with database
Announcement.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Announcement model:", err);
});

export default Announcement;

