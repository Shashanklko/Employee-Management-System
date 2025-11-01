import { DataTypes } from "sequelize";
import { neonDB } from "../config/neonClient.js";
import Employee from "./Employee.js";

const Attendance = neonDB.define("Attendance", {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  check_in_time: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  check_out_time: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  expected_check_in: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: "09:00:00",
    comment: "Expected check-in time (default 9 AM)",
  },
  expected_check_out: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: "18:00:00",
    comment: "Expected check-out time (default 6 PM)",
  },
  is_late: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "True if check-in is after expected time",
  },
  late_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Minutes late if check-in is late",
  },
  is_early_exit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "True if check-out is before expected time",
  },
  early_exit_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Minutes early if check-out is early",
  },
  status: {
    type: DataTypes.ENUM("Present", "Absent", "Half Day", "Leave", "Holiday"),
    defaultValue: "Absent",
  },
  work_hours: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: "Calculated work hours for the day",
  },
  check_in_location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Location/IP for check-in (optional)",
  },
  check_out_location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Location/IP for check-out (optional)",
  },
  remarks: {
    type: DataTypes.TEXT,
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
      unique: true,
      fields: ["employee_id", "date"],
    },
  ],
});

// Define associations
Attendance.belongsTo(Employee, {
  foreignKey: "employee_id",
  as: "employee",
});

Employee.hasMany(Attendance, {
  foreignKey: "employee_id",
  as: "attendance",
});

// Sync model with database
Attendance.sync({ alter: false }).catch((err) => {
  console.error("Error syncing Attendance model:", err);
});

export default Attendance;

