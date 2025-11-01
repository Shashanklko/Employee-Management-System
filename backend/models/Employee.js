import { DataTypes } from "sequelize";
import {neonDB} from "../config/neonClient.js";

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
        type: DataTypes.ENUM("Employee", "Intern"),
        defaultValue: "Employee",
    },
    department: {
        type: DataTypes.STRING,
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
});

Employee.sync();

export default Employee;