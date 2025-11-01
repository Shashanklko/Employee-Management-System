# What Can a Blocked User Do?

## ❌ **What Blocked Users CANNOT Do:**

1. **Cannot Login**

   - Login attempts will fail with detailed block information
   - No authentication token is issued

2. **Cannot Access Protected Routes**

   - All API endpoints that require authentication are blocked
   - Middleware automatically rejects all protected requests
   - Returns 403 Forbidden with block details

3. **Cannot Perform Any Actions**
   - Cannot view profile
   - Cannot change password
   - Cannot access employee data
   - Cannot send messages
   - Cannot view payroll
   - Cannot create reports
   - Cannot access any system features

## ✅ **What Blocked Users CAN Do:**

### 1. **Check Block Status** (NEW)

**Endpoint**: `POST /api/auth/check-block-status`

**Description**: Blocked users can check their account status without authentication

**Request**:

```json
{
  "email": "employee@example.com"
}
```

**Response** (If Blocked):

```json
{
  "is_blocked": true,
  "blocked_until": "2024-01-15T10:30:00.000Z",
  "block_reason": "Policy violation - under investigation",
  "days_remaining": 5,
  "message": "Your account is blocked until 1/15/2024, 10:30:00 AM. Reason: Policy violation - under investigation",
  "canAppeal": true
}
```

**Response** (If Not Blocked):

```json
{
  "is_blocked": false,
  "message": "Your account is not blocked. You can login normally."
}
```

**Use Case**:

- User can check their status even if they don't remember the exact reason
- Frontend can display block information before login attempt
- Users can verify if their block has expired

---

### 2. **Submit Appeal** (NEW)

**Endpoint**: `POST /api/auth/submit-appeal`

**Description**: Blocked users can submit an appeal to HR/Executive for review

**Request**:

```json
{
  "email": "employee@example.com",
  "appeal_message": "I believe the block was made in error. I have not violated any policies. Please review my case.",
  "contact_preference": "Email"
}
```

**Response**:

```json
{
  "message": "Appeal submitted successfully. HR/Executive will review your appeal and contact you.",
  "appeal_id": "APPEAL-1705315200000",
  "contact_info": "hr@company.com"
}
```

**How It Works**:

1. User submits appeal with their email and message
2. System verifies user is actually blocked
3. System finds an active HR or Executive
4. Creates a message/notification to HR/Executive
5. HR/Executive receives the appeal in their inbox
6. HR/Executive can then review and unblock if needed

**Benefits**:

- Blocked users have a way to communicate
- Transparent appeal process
- HR/Executive gets notification automatically
- No need to contact support separately

---

## 📋 **Block Information Available to Users:**

When a user is blocked, they receive detailed information:

1. **Block Reason**: Why they were blocked
2. **Block Duration**:
   - Temporary: Until specific date/time
   - Permanent: No expiration (requires manual unblock)
3. **Days Remaining**: For temporary blocks
4. **Block Expiration**: Exact date/time when block expires

---

## 🔄 **Automatic Unblocking:**

Users are automatically unblocked when:

1. **Temporary Block Expires**:

   - User tries to login → System checks date → Auto-unblock if expired
   - User makes any request → Middleware checks → Auto-unblock if expired
   - Statistics are retrieved → System cleans up expired blocks

2. **How User Knows**:
   - Can check status using `/check-block-status` endpoint
   - Will see "Your block has expired" message
   - Can login normally after expiration

---

## 🎯 **User Flow for Blocked Users:**

### Scenario 1: User Tries to Login

```
1. User enters email/password
2. System checks account → Blocked!
3. System returns error with:
   - Block reason
   - Expiration date (if temporary)
   - Option to submit appeal
4. User can:
   - Check status again later
   - Submit an appeal
   - Wait for block to expire (if temporary)
```

### Scenario 2: User Wants to Check Status

```
1. User calls /api/auth/check-block-status
2. Provides their email
3. System returns:
   - Block status
   - Reason
   - Days remaining
   - Appeal option
4. User can then decide to submit appeal or wait
```

### Scenario 3: User Wants to Appeal

```
1. User calls /api/auth/submit-appeal
2. Provides email and appeal message
3. System:
   - Verifies user is blocked
   - Finds HR/Executive
   - Creates appeal message
4. HR/Executive receives appeal in inbox
5. HR/Executive can review and unblock
```

---

## 📱 **Frontend Implementation Suggestions:**

### Block Status Page (Unauthenticated)

```javascript
// Page accessible without login
// Shows block status, reason, expiration
// Has "Submit Appeal" button
// Has "Check Status" button

function BlockStatusPage() {
  const [blockInfo, setBlockInfo] = useState(null);

  const checkStatus = async (email) => {
    const response = await fetch("/api/auth/check-block-status", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    setBlockInfo(data);
  };

  const submitAppeal = async (email, message) => {
    await fetch("/api/auth/submit-appeal", {
      method: "POST",
      body: JSON.stringify({ email, appeal_message: message }),
      headers: { "Content-Type": "application/json" },
    });
  };

  return (
    <div>
      {blockInfo?.is_blocked && (
        <>
          <h2>Account Blocked</h2>
          <p>Reason: {blockInfo.block_reason}</p>
          {blockInfo.blocked_until && (
            <p>
              Blocked until:{" "}
              {new Date(blockInfo.blocked_until).toLocaleString()}
            </p>
          )}
          {blockInfo.days_remaining && (
            <p>Days remaining: {blockInfo.days_remaining}</p>
          )}
          <AppealForm onSubmit={submitAppeal} />
        </>
      )}
    </div>
  );
}
```

### Login Error Display

```javascript
// When login fails due to block
if (error.error === "Account Blocked") {
  // Show block information
  // Show "Submit Appeal" button
  // Show "Check Status" link
}
```

---

## 🔒 **Security Considerations:**

1. **Email Verification**:

   - Users must provide correct email to check status
   - System doesn't reveal if email doesn't exist (security)

2. **Appeal Verification**:

   - Only blocked users can submit appeals
   - System verifies block status before processing

3. **No Authentication Bypass**:
   - Checking status doesn't grant access
   - Submitting appeal doesn't grant access
   - Only HR/Executive/System Admin can unblock

---

## 📊 **Summary:**

| Action                  | Blocked User Can Do? | Authentication Required? |
| ----------------------- | -------------------- | ------------------------ |
| Login                   | ❌ No                | N/A                      |
| Access Protected Routes | ❌ No                | Yes                      |
| Check Block Status      | ✅ Yes               | ❌ No                    |
| Submit Appeal           | ✅ Yes               | ❌ No                    |
| View Profile            | ❌ No                | Yes                      |
| Change Password         | ❌ No                | Yes                      |
| Send Messages           | ❌ No                | Yes                      |
| View Payroll            | ❌ No                | Yes                      |
| Wait for Auto-Unblock   | ✅ Yes (Automatic)   | N/A                      |

---

## 🎯 **Key Points:**

1. ✅ **Blocked users CAN check their status** without authentication
2. ✅ **Blocked users CAN submit appeals** to HR/Executive
3. ✅ **Automatic unblocking** when temporary blocks expire
4. ❌ **No access** to any protected system features
5. ✅ **Clear communication** about why they're blocked and when it expires
6. ✅ **Appeal process** for users who believe block is wrong

---

**Bottom Line**: Blocked users have limited but important capabilities:

- They can check their status and understand why they're blocked
- They can submit appeals for review
- They are automatically unblocked when temporary blocks expire
- But they cannot access any system features until unblocked
