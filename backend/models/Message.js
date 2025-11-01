import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";

const Message = neonDB.define("Message", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sender_type: {
    type: DataTypes.ENUM("Employee", "HR", "Executive", "System Admin"),
    allowNull: false,
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  receiver_type: {
    type: DataTypes.ENUM("Employee", "HR", "Executive", "System Admin"),
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
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

Message.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Message model:", err);
});

export default Message;
