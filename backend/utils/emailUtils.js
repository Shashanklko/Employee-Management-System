import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Create email transporter
 */
const createTransporter = () => {
  // For production, configure with your SMTP settings
  // For development, you can use Gmail, SendGrid, etc.
  
  if (process.env.EMAIL_SERVICE === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Generic SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Skip sending in development if email not configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("📧 Email not configured. Would send to:", to);
      console.log("Subject:", subject);
      return { success: true, message: "Email service not configured (dev mode)" };
    }

    const transporter = createTransporter();

    // Configure sender email and name
    // EMAIL_USER is the email address that sends emails
    // EMAIL_FROM_NAME is optional - display name for the sender
    const fromEmail = process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || "Employee Management System";
    const fromAddress = process.env.EMAIL_FROM_NAME 
      ? `"${fromName}" <${fromEmail}>`
      : fromEmail;

    const mailOptions = {
      from: fromAddress, // Sender email (configured in EMAIL_USER)
      to,
      subject,
      html,
      text: text || html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send welcome email to new employee or intern
 * @param {string} employeeEmail - Employee/Intern email
 * @param {string} employeeName - Employee/Intern full name
 * @param {string} password - Temporary password
 * @param {string} role - Employee role (Employee, Intern, etc.)
 * @param {string} department - Department name (optional)
 */
export const sendWelcomeEmail = async (employeeEmail, employeeName, password, role = "Employee", department = null) => {
  const userType = role === "Intern" ? "Intern" : "Employee";
  const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .credentials { background-color: #fff3cd; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }
        .steps { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2196F3; }
        .security { background-color: #f3e5f5; padding: 15px; margin: 15px 0; border-left: 4px solid #9c27b0; }
        .footer { background-color: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .password { font-size: 18px; font-weight: bold; color: #d32f2f; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Employee Management System!</h1>
        </div>
        
        <div class="content">
          <h2>Hello ${employeeName}!</h2>
          ${department ? `<p>We're thrilled to have you on board in the <strong>${department}</strong> department!` : '<p>We\'re thrilled to have you on board!'}
          Your account has been successfully created as an <strong>${role}</strong>.</p>

          <div class="credentials">
            <h3>🔐 Your Login Credentials</h3>
            <p><strong>Email:</strong> ${employeeEmail}</p>
            <p><strong>Temporary Password:</strong> <span class="password">${password}</span></p>
            <p><em>Please keep these credentials secure and change your password after your first login.</em></p>
          </div>

          <div class="steps">
            <h3>📝 Next Steps - Change Your Password</h3>
            <ol>
              <li>Go to the login page: <a href="${loginUrl}">${loginUrl}</a></li>
              <li>Log in using your email and temporary password above</li>
              <li>Navigate to your profile settings</li>
              <li>Click on "Change Password"</li>
              <li>Enter your current password and choose a new secure password</li>
              <li>Make sure your new password is at least 6 characters long</li>
            </ol>
            <p><a href="${loginUrl}" class="button">Login Now</a></p>
          </div>

          <div class="security">
            <h3>🔒 Security Reminder</h3>
            <ul>
              <li>Keep your password confidential - never share it with anyone</li>
              <li>Choose a strong, unique password that you don't use elsewhere</li>
              <li>Change your password regularly for better security</li>
              <li>If you suspect your account is compromised, contact HR immediately</li>
            </ul>
          </div>

          <p>If you have any questions, please contact the HR team.</p>
          <p>Best regards,<br>HR Team</p>
        </div>

        <div class="footer">
          <p>This is an automated message from Employee Management System</p>
          <p>Please do not reply to this email</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textVersion = `
🎉 Welcome to Employee Management System!

Hello ${employeeName}!

${department ? `We're thrilled to have you on board in the ${department} department!` : "We're thrilled to have you on board!"}
Your account has been successfully created as an ${role}.

🔐 Your Login Credentials
Email: ${employeeEmail}
Temporary Password: ${password}

Please keep these credentials secure and change your password after your first login.

📝 Next Steps - Change Your Password
1. Go to the login page: ${loginUrl}
2. Log in using your email and temporary password above
3. Navigate to your profile settings
4. Click on "Change Password"
5. Enter your current password and choose a new secure password
6. Make sure your new password is at least 6 characters long

🔒 Security Reminder
- Keep your password confidential
- Choose a strong, unique password
- Change your password regularly
- If you suspect your account is compromised, contact HR immediately

If you have any questions, please contact the HR team.

Best regards,
HR Team
  `;

  return sendEmail({
    to: employeeEmail,
    subject: `Welcome ${employeeName}! Your ${role} Account is Ready`,
    html,
    text: textVersion,
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
  
  const html = `
    <h2>Password Reset Request</h2>
    <p>You requested to reset your password.</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  return sendEmail({
    to: email,
    subject: "Password Reset Request",
    html,
  });
};

/**
 * Send payroll notification email
 */
export const sendPayrollEmail = async (employeeEmail, employeeName, payrollData) => {
  const html = `
    <h2>Payroll Notification</h2>
    <p>Hello ${employeeName},</p>
    <p>Your payroll has been processed:</p>
    <ul>
      <li><strong>Salary:</strong> $${payrollData.salary}</li>
      <li><strong>Bonus:</strong> $${payrollData.bonus || 0}</li>
      <li><strong>Total:</strong> $${payrollData.total}</li>
      <li><strong>Period:</strong> ${payrollData.period}</li>
    </ul>
    <p>Best regards,<br>HR Team</p>
  `;

  return sendEmail({
    to: employeeEmail,
    subject: "Payroll Notification",
    html,
  });
};

