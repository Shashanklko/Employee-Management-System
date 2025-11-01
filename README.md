# Employee Management System

A comprehensive, secure employee management system with role-based access control (RBAC), built with Node.js, Express, PostgreSQL (Neon), and MongoDB.

## Features

### 🔐 Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt encryption for all passwords
- **Role-Based Access Control (RBAC)**: System Admin, Executive, HR, Employee, and Intern roles
- **Input Validation**: Comprehensive validation for all user inputs
- **CORS Protection**: Configurable CORS with origin whitelisting
- **Rate Limiting**: Protection against brute force attacks
- **SQL Injection Protection**: Sequelize ORM with parameterized queries

### 👥 User Roles

1. **System Admin**: Full system access, can manage all users and settings
2. **Executive**: Can view and manage employees, payroll, reports
3. **HR**: Can manage employees, payroll, and reports
4. **Employee**: Can view own profile, send messages, create reports
5. **Intern**: Limited access similar to Employee

### 📋 Core Features

- **Employee Management**: Create, read, update, deactivate employees
- **Payroll Management**: Process and manage employee salaries and bonuses
- **Messaging System**: Internal messaging between users
- **Report System**: Create and manage reports (Attendance, Performance, Payroll, General)
- **Email Notifications**: Welcome emails, payroll notifications, password reset
- **WhatsApp Integration**: Optional WhatsApp notifications
- **Statistics & Analytics**: Employee statistics and analytics

## Technology Stack

- **Backend**: Node.js, Express.js
- **Databases**: 
  - PostgreSQL (Neon) - Primary database for structured data
  - MongoDB - For document storage (if needed)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Bcrypt for password hashing
- **Email**: Nodemailer
- **ORM**: Sequelize

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL database (Neon or local)
- MongoDB (optional)

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd Employee-Management-System
```

2. **Install dependencies**
```bash
cd backend
npm install
```

3. **Configure environment variables**

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/employee-management

# PostgreSQL (Neon) Configuration
PGHOST=your-neon-host
PGDATABASE=your-database-name
PGUSER=your-username
PGPASSWORD=your-password
PGPORT=5432

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-characters
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# WhatsApp Configuration (Optional)
WHATSAPP_API_KEY=your-whatsapp-api-key
WHATSAPP_API_URL=your-whatsapp-api-url

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

4. **Run the application**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new employee (HR/System Admin only)
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/change-password` - Change password

### Employees (`/api/employees`)
- `GET /api/employees` - Get all employees (HR/Executive/System Admin)
- `GET /api/employees/stats` - Get employee statistics
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create employee (HR/System Admin)
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee (System Admin only)

### Payroll (`/api/payroll`)
- `GET /api/payroll` - Get all payrolls (HR/Executive/System Admin)
- `GET /api/payroll/employee/:employee_id` - Get employee payroll
- `POST /api/payroll/process` - Process payroll for all employees
- `PUT /api/payroll/employee/:employee_id` - Update employee payroll

### Messages (`/api/messages`)
- `GET /api/messages/inbox` - Get received messages
- `GET /api/messages/sent` - Get sent messages
- `POST /api/messages` - Send message
- `PATCH /api/messages/:id/read` - Mark message as read
- `PATCH /api/messages/:id/archive` - Archive message
- `DELETE /api/messages/:id` - Delete message

### Reports (`/api/reports`)
- `GET /api/reports` - Get my reports
- `GET /api/reports/all` - Get all reports (HR/Executive/System Admin)
- `GET /api/reports/:id` - Get report by ID
- `POST /api/reports` - Create report
- `PUT /api/reports/:id` - Update report (HR/Executive/System Admin)
- `DELETE /api/reports/:id` - Delete report

### Executives (`/api/executives`) - System Admin only
- `GET /api/executives` - Get all executives
- `POST /api/executives` - Create executive
- `PUT /api/executives/:id` - Update executive

### HR Staff (`/api/hr`) - System Admin only
- `GET /api/hr` - Get all HR staff
- `POST /api/hr` - Create HR staff
- `PUT /api/hr/:id` - Update HR staff

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Security Best Practices

1. **Change Default JWT Secret**: Always use a strong, random JWT secret in production
2. **Use HTTPS**: Always use HTTPS in production
3. **Environment Variables**: Never commit `.env` files to version control
4. **Rate Limiting**: Implement rate limiting in production
5. **Database Backups**: Regular backups of database
6. **Input Validation**: All inputs are validated and sanitized
7. **Password Policy**: Enforce strong password requirements
8. **CORS Configuration**: Restrict CORS to trusted origins only

## Role Permissions Matrix

| Feature | System Admin | Executive | HR | Employee | Intern |
|---------|--------------|-----------|----|-----------|--------|
| View All Employees | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Employee | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete Employee | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Payroll | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Own Payroll | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Reports | ✅ | ✅ | ✅ | Own Only | Own Only |
| Send Messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Executives | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage HR Staff | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Statistics | ✅ | ✅ | ✅ | ❌ | ❌ |

## Development

### Project Structure

```
backend/
├── config/          # Database configurations
├── controllers/     # Route controllers
├── middleware/      # Custom middleware (auth, roles, validation)
├── models/          # Database models
├── routes/          # API routes
├── utils/           # Utility functions (JWT, email, WhatsApp)
└── server.js         # Application entry point
```

### Code Style

- Use ES6+ features
- Follow async/await pattern
- Use meaningful variable names
- Add comments for complex logic
- Handle errors properly

## Troubleshooting

### Database Connection Issues
- Verify database credentials in `.env`
- Check if database is running
- Ensure SSL is configured for Neon PostgreSQL

### Authentication Issues
- Verify JWT_SECRET is set in `.env`
- Check token expiration
- Ensure token is sent in Authorization header

### Email Not Working
- Verify email credentials in `.env`
- Check SMTP settings
- For Gmail, use App Password instead of regular password

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions, please open an issue on the repository.

---

**Built with ❤️ for secure employee management**

