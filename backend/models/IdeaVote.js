import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";

const IdeaVote = neonDB.define("IdeaVote", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  idea_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Ideas",
      key: "id",
    },
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Employees",
      key: "id",
    },
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ["idea_id", "employee_id"],
      name: "unique_vote",
    },
  ],
});

// Sync model
IdeaVote.sync({ alter: false }).catch((err) => {
  console.error("Error syncing IdeaVote model:", err);
});

export default IdeaVote;

