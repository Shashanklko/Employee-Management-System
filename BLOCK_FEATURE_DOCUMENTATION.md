# Employee Blocking Feature Documentation

## Overview

HR and Executive users can **block employee accounts on their own** - **NO System Admin approval needed**. This feature allows temporary or permanent blocking of employee accounts with reason tracking.

## Key Features

✅ **HR and Executive can block employees independently**  
✅ **Time-based blocking** (temporary blocks with automatic unblock)  
✅ **Permanent blocking** (until manually unblocked)  
✅ **Block reason tracking**  
✅ **Automatic unblocking** when duration expires  
✅ **Block prevention** for System Admins (only System Admin can block other System Admins)  
✅ **Self-block prevention** (users cannot block themselves)  

## API Endpoints

### Block Employee
```
POST /api/employees/:id/block
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "duration_days": 7,  // Optional: Number of days to block (permanent if not provided)
  "reason": "Violation of company policy"  // Required: Reason for blocking
}
```

**Permissions**: HR, Executive, System Admin

**Response**:
```json
{
  "message": "Employee blocked successfully until 2024-01-15T10:30:00.000Z",
  "employee": { ... },
  "blocked_until": "2024-01-15T10:30:00.000Z"
}
```

### Unblock Employee
```
POST /api/employees/:id/unblock
Authorization: Bearer <token>
```

**Permissions**: HR, Executive, System Admin

**Response**:
```json
{
  "message": "Employee unblocked successfully",
  "employee": { ... }
}
```

## Database Schema Changes

The `Employee` model now includes:

```javascript
{
  is_blocked: Boolean (default: false),
  blocked_until: Date (nullable),
  block_reason: Text (nullable),
  blocked_by: Integer (nullable) - ID of user who blocked
}
```

## Permission Rules

### Who Can Block?
- ✅ **HR** - Can block any Employee or Intern
- ✅ **Executive** - Can block any Employee or Intern  
- ✅ **System Admin** - Can block anyone (including other System Admins)

### Who CANNOT Be Blocked?
- ❌ **System Admins** - Cannot be blocked by HR or Executive (only by System Admin)
- ❌ **Yourself** - Users cannot block their own account

### Who Can Unblock?
- ✅ **HR** - Can unblock any Employee or Intern
- ✅ **Executive** - Can unblock any Employee or Intern
- ✅ **System Admin** - Can unblock anyone

### Who CANNOT Be Unblocked by HR/Executive?
- ❌ **System Admins** - Only System Admin can unblock System Admins

## Block Types

### 1. Temporary Block (Time-Based)
```json
{
  "duration_days": 7,
  "reason": "Temporary suspension for review"
}
```
- Account is blocked for specified number of days
- Automatically unblocked when `blocked_until` date passes
- User cannot login until block expires

### 2. Permanent Block (Manual Unblock Required)
```json
{
  "reason": "Serious policy violation"
}
```
- Account is blocked indefinitely
- `blocked_until` is set to `null`
- Requires manual unblock by HR/Executive/System Admin

## Automatic Unblocking

The system automatically unblocks accounts when:
1. User tries to login and `blocked_until` date has passed
2. User makes any API request and block has expired
3. Statistics are retrieved and expired blocks are found

## Block Status Check

### During Login
- Login fails if account is blocked
- Returns detailed error message with:
  - Block reason
  - Block expiration date (if temporary)
  - Clear message explaining the block

### During API Requests
- All protected routes check block status via `checkBlockedStatus` middleware
- Blocked users receive 403 Forbidden response
- Auto-unblocking happens if block has expired

## Example Use Cases

### Use Case 1: Temporary Suspension (7 days)
**HR wants to suspend employee for policy review**

```javascript
POST /api/employees/123/block
{
  "duration_days": 7,
  "reason": "Under investigation for policy violation. Account will be reviewed after 7 days."
}
```

**Result**: Employee cannot login for 7 days, then automatically unblocked.

### Use Case 2: Permanent Block (Pending Review)
**Executive needs to block account until investigation completes**

```javascript
POST /api/employees/123/block
{
  "reason": "Serious misconduct reported. Account blocked pending HR review."
}
```

**Result**: Employee blocked indefinitely until manually unblocked.

### Use Case 3: Auto-Unblock After Duration
**Employee blocked for 3 days, time has passed**

- Employee tries to login
- System checks `blocked_until` date
- Date has passed → Auto-unblock
- Employee can login normally

## Statistics

Employee statistics now include:
- `blockedEmployees`: Count of currently blocked employees
- `autoUnblocked`: Number of employees auto-unblocked during stats retrieval

## Security Features

1. **Reason Required**: Cannot block without providing a reason
2. **Self-Protection**: Users cannot block themselves
3. **System Admin Protection**: Only System Admin can block/unblock System Admins
4. **Audit Trail**: `blocked_by` field tracks who performed the block
5. **Automatic Cleanup**: Expired blocks are automatically cleared

## Integration with Existing Features

- **Login**: Checks block status during authentication
- **All Protected Routes**: Middleware checks block status
- **Employee List**: Can filter by `is_blocked` status
- **Employee Stats**: Includes blocked employee count

## Frontend Integration

### Display Block Status
```javascript
// Employee object now includes:
{
  is_blocked: true,
  blocked_until: "2024-01-15T10:30:00.000Z",
  block_reason: "Policy violation",
  blocked_by: 5
}
```

### UI Recommendations
1. Show block badge/indicator on employee list
2. Display block reason in employee detail view
3. Show countdown for temporary blocks
4. Enable unblock button for HR/Executive/System Admin

## Error Messages

### Account Blocked Error
```json
{
  "error": "Account Blocked",
  "message": "Account is blocked until 1/15/2024, 10:30:00 AM. Reason: Policy violation",
  "blocked_until": "2024-01-15T10:30:00.000Z",
  "block_reason": "Policy violation"
}
```

### Permission Error (Blocking System Admin)
```json
{
  "error": "Forbidden",
  "message": "Only System Admin can block other System Admins"
}
```

### Self-Block Prevention
```json
{
  "error": "Bad request",
  "message": "You cannot block your own account"
}
```

---

## Summary

**Answer to your question**: 

✅ **HR and Executive CAN block employees on their own** - **NO System Admin needed**

The only restrictions are:
- They cannot block System Admins (only System Admin can)
- They cannot block themselves
- They must provide a reason for blocking

This allows HR and Executive to manage employee accounts independently while maintaining security for System Admin accounts.

