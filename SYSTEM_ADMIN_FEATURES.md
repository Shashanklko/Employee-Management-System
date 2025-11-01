# 🔐 System Admin - Complete Feature List

## Overview

System Admin has **FULL ACCESS** to all features in the system. This document lists all capabilities available to System Admin.

---

## 📊 **1. DASHBOARD & STATISTICS**

### Get System Dashboard
**Endpoint**: `GET /api/admin/dashboard`

**Features**:
- ✅ Complete system overview
- ✅ Employee statistics (total, active, blocked, by role)
- ✅ HR statistics (total, active)
- ✅ Executive statistics (total, active)
- ✅ Message statistics (total, unread)
- ✅ Report statistics (total, pending, by type)
- ✅ Recent activity (last 10 messages, last 10 reports)

**Response**: Comprehensive dashboard data with all system metrics

---

### Get System Configuration
**Endpoint**: `GET /api/admin/config`

**Features**:
- ✅ System version and environment
- ✅ Database connection status
- ✅ Feature flags (email, WhatsApp, blocking, etc.)

---

## 👥 **2. USER MANAGEMENT (All User Types)**

### Get All Users
**Endpoint**: `GET /api/admin/users`

**Features**:
- ✅ View ALL users (Employees, HR, Executives) in one place
- ✅ Filter by user_type (Employee, HR, Executive)
- ✅ Search by name or email
- ✅ Pagination support

**Query Parameters**:
- `page` - Page number
- `limit` - Items per page
- `user_type` - Filter by type
- `search` - Search by name/email

---

### Get User by ID
**Endpoint**: `GET /api/admin/users/:id?user_type=Employee`

**Features**:
- ✅ View any user's complete profile
- ✅ Works across all user types
- ✅ Requires `user_type` query parameter

---

### Update Any User
**Endpoint**: `PUT /api/admin/users/:id`

**Features**:
- ✅ Update ANY user (Employee, HR, Executive)
- ✅ Can change any field
- ✅ Can assign System Admin role
- ✅ Can change roles
- ✅ Can activate/deactivate accounts
- ✅ Cannot deactivate or block own account (protection)

**Body**:
```json
{
  "user_type": "Employee", // Required
  "full_name": "New Name",
  "email": "new@email.com",
  "role": "HR",
  "is_active": true,
  "is_blocked": false,
  "department": "IT",
  "current_salary": 50000,
  "bonus": 5000
}
```

---

### Delete/Deactivate Any User
**Endpoint**: `DELETE /api/admin/users/:id?user_type=Employee`

**Features**:
- ✅ Deactivate ANY user account
- ✅ Works on all user types
- ✅ Cannot delete own account (protection)

---

## 🚫 **3. BLOCKING MANAGEMENT**

### Block Any User
**Endpoint**: `POST /api/admin/users/:id/block`

**Features**:
- ✅ Block ANY user (even System Admins)
- ✅ Temporary or permanent blocking
- ✅ Set block reason
- ✅ Only System Admin can block other System Admins

**Body**:
```json
{
  "user_type": "Employee",
  "duration_days": 7,  // Optional (permanent if omitted)
  "reason": "Policy violation"
}
```

---

### Unblock Any User
**Endpoint**: `POST /api/admin/users/:id/unblock?user_type=Employee`

**Features**:
- ✅ Unblock ANY user
- ✅ Works on all user types
- ✅ Clears all block data

---

## 👑 **4. SYSTEM ADMIN MANAGEMENT**

### Get All System Admins
**Endpoint**: `GET /api/admin/admins`

**Features**:
- ✅ View all System Admin accounts
- ✅ See who has admin access
- ✅ Monitor admin accounts

---

### Create System Admin
**Endpoint**: `POST /api/admin/admins`

**Features**:
- ✅ Create new System Admin user
- ✅ Assign System Admin role
- ✅ Full admin privileges from creation

**Body**:
```json
{
  "full_name": "Admin Name",
  "email": "admin@company.com",
  "password": "secure-password",
  "department": "IT"
}
```

---

## 📧 **5. MESSAGES MANAGEMENT**

### Get All System Messages
**Endpoint**: `GET /api/admin/messages`

**Features**:
- ✅ View ALL messages in the system
- ✅ Not limited to own messages
- ✅ Filter by read/unread status
- ✅ Filter by sender/receiver type
- ✅ Pagination support

**Query Parameters**:
- `page`, `limit` - Pagination
- `is_read` - Filter by read status
- `sender_type` - Filter by sender type
- `receiver_type` - Filter by receiver type

---

### Delete Any Message
**Endpoint**: `DELETE /api/admin/messages/:id`

**Features**:
- ✅ Delete ANY message in the system
- ✅ Override normal message deletion restrictions
- ✅ Useful for moderation/compliance

---

## 📝 **6. REPORTS MANAGEMENT**

### Get All System Reports
**Endpoint**: `GET /api/admin/reports`

**Features**:
- ✅ View ALL reports in the system
- ✅ Filter by status (Pending, In Progress, Resolved, Rejected)
- ✅ Filter by report type
- ✅ Includes employee information
- ✅ Pagination support

---

### Update Any Report
**Endpoint**: `PUT /api/admin/reports/:id`

**Features**:
- ✅ Update ANY report
- ✅ Change status
- ✅ Add resolution notes
- ✅ Override normal report restrictions

---

### Delete Any Report
**Endpoint**: `DELETE /api/admin/reports/:id`

**Features**:
- ✅ Delete ANY report
- ✅ Override normal deletion restrictions
- ✅ Useful for data cleanup/compliance

---

## 💰 **7. PAYROLL MANAGEMENT**

### Get All Payroll Data
**Endpoint**: `GET /api/admin/payroll`

**Features**:
- ✅ Complete payroll overview for all employees
- ✅ Total payroll amount
- ✅ Average salary calculation
- ✅ Department-wise breakdown
- ✅ Role-wise breakdown

**Response Includes**:
- All employee payrolls
- Total payroll amount
- Average salary
- Employee count

---

### Bulk Update Salaries
**Endpoint**: `POST /api/admin/payroll/bulk-update`

**Features**:
- ✅ Update multiple employee salaries at once
- ✅ Update salary and/or bonus
- ✅ Batch processing with success/failure tracking

**Body**:
```json
{
  "updates": [
    {
      "employee_id": 1,
      "salary": 55000,
      "bonus": 5000
    },
    {
      "employee_id": 2,
      "salary": 60000
    }
  ]
}
```

**Response**: Shows which updates succeeded/failed

---

## 🎯 **PERMISSION SUMMARY**

### System Admin Can:
- ✅ **View Everything** - All users, messages, reports, payroll
- ✅ **Modify Everything** - Update any user, message, report
- ✅ **Delete Everything** - Delete any user, message, report
- ✅ **Block Anyone** - Even other System Admins
- ✅ **Create System Admins** - Assign admin role
- ✅ **Access Dashboard** - Complete system overview
- ✅ **Bulk Operations** - Bulk salary updates
- ✅ **System Configuration** - View system settings

### System Admin Cannot:
- ❌ Delete own account (protection)
- ❌ Block own account (protection)
- ❌ Deactivate own account (protection)

---

## 📋 **ALL ENDPOINTS SUMMARY**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/dashboard` | GET | System dashboard with all statistics |
| `/api/admin/config` | GET | System configuration |
| `/api/admin/users` | GET | Get all users (all types) |
| `/api/admin/users/:id` | GET | Get any user by ID |
| `/api/admin/users/:id` | PUT | Update any user |
| `/api/admin/users/:id` | DELETE | Delete/deactivate any user |
| `/api/admin/users/:id/block` | POST | Block any user |
| `/api/admin/users/:id/unblock` | POST | Unblock any user |
| `/api/admin/admins` | GET | Get all System Admins |
| `/api/admin/admins` | POST | Create System Admin |
| `/api/admin/messages` | GET | Get all system messages |
| `/api/admin/messages/:id` | DELETE | Delete any message |
| `/api/admin/reports` | GET | Get all system reports |
| `/api/admin/reports/:id` | PUT | Update any report |
| `/api/admin/reports/:id` | DELETE | Delete any report |
| `/api/admin/payroll` | GET | Get all payroll data |
| `/api/admin/payroll/bulk-update` | POST | Bulk update salaries |

---

## 🔒 **SECURITY**

All System Admin endpoints:
- ✅ Require authentication (JWT token)
- ✅ Require System Admin role (enforced by middleware)
- ✅ Protected against self-harm (cannot delete/block own account)
- ✅ Full audit trail (user actions logged)

---

## 💡 **USE CASES**

### Use Case 1: System Overview
System Admin logs in → Views dashboard → Sees complete system status → Makes decisions

### Use Case 2: User Management
System Admin → Views all users → Finds problematic user → Blocks user → Monitors activity

### Use Case 3: Content Moderation
System Admin → Views all messages → Finds inappropriate message → Deletes message

### Use Case 4: Payroll Management
System Admin → Views all payrolls → Bulk updates salaries → Processes payroll

### Use Case 5: Report Resolution
System Admin → Views all reports → Updates critical report → Resolves issue

---

**System Admin has complete control over the entire system!** 🚀

