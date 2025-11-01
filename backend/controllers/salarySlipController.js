import PDFDocument from "pdfkit";
import Employee from "../models/Employee.js";
import { createAuditLog, getClientIP, getUserAgent } from "../utils/auditLogger.js";

/**
 * Generate salary slip PDF for employee
 */
export const generateSalarySlip = async (req, res) => {
  try {
    const { employee_id, month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get employee
    let employee;
    if (employee_id) {
      employee = await Employee.findByPk(employee_id);
    } else {
      // Get own salary slip
      employee = await Employee.findByPk(req.user.id);
    }

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Permission check: Employee can only view own slip, HR/Executive/System Admin can view any
    if (employee_id && employee_id != req.user.id) {
      if (!["HR", "Executive", "System Admin"].includes(req.user.role)) {
        return res.status(403).json({
          error: "You don't have permission to view this salary slip",
        });
      }
    }

    const salary = parseFloat(employee.current_salary || 0);
    const bonus = parseFloat(employee.bonus || 0);
    const grossSalary = salary + bonus;
    
    // Calculate deductions (simplified - you can add more complex tax calculations)
    const taxDeduction = grossSalary * 0.1; // 10% tax (example)
    const providentFund = salary * 0.12; // 12% PF (example)
    const totalDeductions = taxDeduction + providentFund;
    const netSalary = grossSalary - totalDeductions;

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="salary-slip-${employee.full_name.replace(/\s+/g, "-")}-${currentMonth}-${currentYear}.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(20).text("SALARY SLIP", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${getMonthName(currentMonth)} ${currentYear}`, { align: "center" });
    doc.moveDown(2);

    // Company Info (you can customize this)
    doc.fontSize(10).text("Company: Employee Management System", { align: "left" });
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: "left" });
    doc.moveDown();

    // Employee Info
    doc.fontSize(14).text("Employee Information", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Name: ${employee.full_name}`, { indent: 20 });
    doc.text(`Employee ID: ${employee.id}`, { indent: 20 });
    doc.text(`Email: ${employee.email}`, { indent: 20 });
    doc.text(`Department: ${employee.department || "N/A"}`, { indent: 20 });
    doc.text(`Role: ${employee.role}`, { indent: 20 });
    doc.moveDown();

    // Salary Breakdown
    doc.fontSize(14).text("Salary Breakdown", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    let y = doc.y;
    doc.text("Earnings", 50, y);
    doc.text("Amount", 350, y, { align: "right" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    y = doc.y;
    doc.text("Basic Salary", 70, y);
    doc.text(`₹${salary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 350, y, { align: "right" });
    doc.moveDown(0.5);

    y = doc.y;
    doc.text("Bonus", 70, y);
    doc.text(`₹${bonus.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 350, y, { align: "right" });
    doc.moveDown(0.5);

    doc.moveTo(70, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    y = doc.y;
    doc.fontSize(11).font("Helvetica-Bold").text("Gross Salary", 50, y);
    doc.text(`₹${grossSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 350, y, { align: "right" });
    doc.font("Helvetica");
    doc.moveDown();

    // Deductions
    doc.fontSize(14).text("Deductions", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    y = doc.y;
    doc.text("Tax Deduction (10%)", 70, y);
    doc.text(`₹${taxDeduction.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 350, y, { align: "right" });
    doc.moveDown(0.5);

    y = doc.y;
    doc.text("Provident Fund (12%)", 70, y);
    doc.text(`₹${providentFund.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 350, y, { align: "right" });
    doc.moveDown(0.5);

    doc.moveTo(70, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    y = doc.y;
    doc.fontSize(11).font("Helvetica-Bold").text("Total Deductions", 50, y);
    doc.text(`₹${totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 350, y, { align: "right" });
    doc.font("Helvetica");
    doc.moveDown(2);

    // Net Salary
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke({ width: 2 });
    doc.moveDown(0.5);

    y = doc.y;
    doc.fontSize(14).font("Helvetica-Bold").text("Net Salary", 50, y);
    doc.text(`₹${netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 350, y, { align: "right" });
    doc.font("Helvetica");
    doc.moveDown(2);

    // Footer
    doc.fontSize(8).text("This is a system-generated document.", { align: "center" });
    doc.text("For queries, please contact HR department.", { align: "center" });

    // Finalize PDF
    doc.end();

    // Audit log
    await createAuditLog({
      action: "GENERATE_SALARY_SLIP",
      entity_type: "Payroll",
      entity_id: employee.id,
      user_id: req.user.id,
      user_type: req.user.role,
      user_email: req.user.email,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      metadata: { month: currentMonth, year: currentYear, employee_id: employee.id },
    });
  } catch (error) {
    console.error("Generate salary slip error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Helper function to get month name
 */
function getMonthName(monthNumber) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthNumber - 1] || "Unknown";
}

