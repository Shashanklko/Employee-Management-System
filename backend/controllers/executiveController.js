import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {Executive}  from "../models/Executive";
import dotenv from "dotenv";

dotenv.config();

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            role: user.role,
            email: user.email,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
};

// register Executive

export const registerExecutive = async (req, res) => {
    try{
        const { name, email, password, department} = req.body;
        // check if executive already exists
        const existing = await Executive.findOne({ where: { email}});
        if(existing) return res.status(400).json({message: "Executive already exists"});

        const hashedPassword = await bcrypt.hash(password, 10);
        const newExec = await Executive.create({
            name, 
            email,
            password: hashedPassword,
            department,
            role: "Executive",
        });

        res.status(201).json({
            message: "Exective registered Successfully",
            executive: newExec,
        });
    } catch(err){
        console.error("Error registering executive:", err);
        res.status(500).json({ message: "Server error"});
    }
};

// Executive login

export const loginExecutive = async (req, res) => {
    try{
        const{ email, password } = req.body;
        const user = await Executive.findOne({where: { email }});
        // check user existing or not 
        if(!user) return res.status(404).json({message: "User not found"});
        // vaildating password
        const vaildPassword = await bcrypt.compare(password, user.password);
        if(!vaildPassword) return res.status(401).json({ message: "Invalid credentials"});
        const token = generateToken(user);
        res.status(200).json({
            message: "Login successful",
            token,
            role: user.role,
        });
    } catch(err){
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error"});
    }
};

export const registerHR = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    // Check for duplicate email
    const existing = await Executive.findOne({ where: { email } });
    if (existing)
      return res.status(400).json({ message: "HR with this email already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create HR entry (stored in same table as Executives but role = HR)
    const hr = await Executive.create({
      name,
      email,
      password: hashedPassword,
      department,
      role: "HR",
    });

    res.status(201).json({
      message: "HR registered successfully",
      hr,
    });
  } catch (err) {
    console.error("Error registering HR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllHRs = async (req, res) => {
  try {
    const hrList = await Executive.findAll({
      where: { role: "HR" },
      attributes: ["id", "name", "email", "department"],
    });

    res.status(200).json({
      message: "HR list fetched successfully",
      hrList,
    });
  } catch (err) {
    console.error("Error fetching HRs:", err);
    res.status(500).json({ message: "Server error" });
  }
};