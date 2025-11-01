import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";

export const Executive = neonDB.define("Executive", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: "Executive" },
  department: { type: DataTypes.STRING },
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

// Sync model with database (run in production with caution)
Executive.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Executive model:", err);
});
