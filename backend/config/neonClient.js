import {Sequelize} from "sequelize";
import dotenv from "dotenv";

dotenv.config();

export const neonDB = new Sequelize({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT || 5432,
    dialect: "postgres",
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
            },
    },
    logging: false,
});

export const connectNeon = async () => {
    try {
        await neonDB.authenticate();
        console.log("Connected to Neon PostgresSQL successfully!");
        } catch(err){
            console.err("Error connecting to Neon PostgresSQL:", err.message);
        }
};
