import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";

const Notification = neonDB.define("Notification", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "User who should receive this notification",
  },
  user_type: {
    type: DataTypes.ENUM("System Admin", "Executive", "HR", "Employee", "Intern"),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(
      "Payroll",
      "Leave",
      "Attendance",
      "Message",
      "Report",
      "Announcement",
      "General"
    ),
    defaultValue: "General",
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  entity_type: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "e.g., Leave, Payroll, Message",
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "ID of related entity",
  },
  action_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "URL to navigate when notification is clicked",
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
      fields: ["user_id", "is_read"],
    },
  ],
});

// Sync model
Notification.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Notification model:", err);
});

export default Notification;

