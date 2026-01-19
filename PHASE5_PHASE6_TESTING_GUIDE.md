# Phase 5 & 6 Testing Guide
# AI Scan and Free Scan Limits

## ✅ PHASE 5.0 — PRE-CONDITIONS

Before testing scan functionality, ensure:

```powershell
# 1. Check resume exists
curl -X GET http://localhost:5000/api/resumes `
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: At least 1 resume in the list
```

```powershell
# 2. Check JD exists
curl -X GET http://localhost:5000/api/jd/latest `
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 OK with JD data
```

```powershell
# 3. Verify user is logged in
curl -X GET http://localhost:5000/api/profile `
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 OK with user data
```

---

## ✅ PHASE 5.1 — SCAN API CONTRACT

### Endpoint
```
POST /api/scan
```

### Request Body
```json
{
  "resume_id": null,
  "job_description_id": null
}
```
**Note:** If IDs are null, backend uses latest resume & JD

### Test: Scan with Latest Resume & JD

```powershell
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "resume_id": null,
    "job_description_id": null
  }'
```

### Expected Response Structure

```json
{
  "success": true,
  "scan_id": 12,
  "score": 72.5,
  "matched_skills": ["python", "flask", "sql", "aws"],
  "missing_skills": ["kubernetes", "react"],
  "summary": "Good match! Your resume covers most requirements...",
  "category_scores": {
    "technical": 70.0,
    "soft_skills": 75.0
  },
  "scan_balance": {
    "free_scans_remaining": 4,
    "total_scans_used": 1,
    "can_scan": true,
    "is_premium": false
  }
}
```

### Verify Response Fields

- [x] `success` - Boolean
- [x] `scan_id` - Integer (saved in scan_history table)
- [x] `score` - Float (0-100)
- [x] `matched_skills` - Array of strings
- [x] `missing_skills` - Array of strings
- [x] `summary` - String (user-friendly message)
- [x] `category_scores` - Object with technical, soft_skills
- [x] `scan_balance` - Object with scan limit info

---

## ✅ PHASE 5.2 — BACKEND VALIDATION RULES

### Test: Scan without JWT (should fail)

```powershell
curl -X POST http://localhost:5000/api/scan `
  -H "Content-Type: application/json" `
  -d '{}'

# Expected: 401 Unauthorized
```

### Test: Scan with invalid resume ID

```powershell
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "resume_id": 99999,
    "job_description_id": null
  }'

# Expected: 404 Not Found
# Message: "Resume not found"
```

### Test: Scan with invalid JD ID

```powershell
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "resume_id": null,
    "job_description_id": 99999
  }'

# Expected: 404 Not Found
# Message: "Job description not found"
```

### Test: Scan when no resume uploaded

```powershell
# First, delete all resumes, then try to scan
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{}'

# Expected: 404 Not Found
# Message: "No resume found. Please upload a resume first."
```

---

## ✅ PHASE 5.3 — DATA COLLECTION

### Verify Logs

When you run a scan, check the backend logs for:

```
📊 Scan request received for user <user_id>
📄 Resume ID: <resume_id>, JD ID: <jd_id>
📄 Using latest resume ID: <id>
📄 Using latest JD ID: <id>
📄 Resume ID: <id>
📄 JD ID: <id>
📄 Resume text length: <length>
📄 JD text length: <length>
✅ Free scan used. Remaining: <count>
✅ Scan completed. ID: <scan_id>, Score: <score>%
```

---

## ✅ PHASE 5.4 — AI / MATCHING LOGIC (MVP)

The current implementation uses **keyword-based matching**:

### Algorithm:
```
matched_skills = resume_keywords ∩ jd_keywords
missing_skills = jd_keywords - resume_keywords
score = (len(matched_skills) / len(jd_keywords)) * 100
```

### Category Scores:
- **Technical Score**: Match between technical skills
- **Soft Skills Score**: Match between soft skills

### Verify:
- [x] Score is between 0-100
- [x] Matched skills are correctly identified
- [x] Missing skills are correctly identified
- [x] Category scores calculated

---

## ✅ PHASE 5.5 — RESULT STORAGE

### Verify Database Storage

After a scan, check the `scan_history` table:

```sql
SELECT * FROM scan_history ORDER BY created_at DESC LIMIT 1;
```

**Required Fields:**
- [x] `user_id` - Matches logged-in user
- [x] `resume_id` - Matches used resume
- [x] `job_description_id` - Matches used JD
- [x] `overall_match_score` - Score value
- [x] `category_scores` - JSON with technical, soft_skills
- [x] `detailed_analysis` - JSON with matched/missing skills
- [x] `scan_duration` - Time taken to process
- [x] `scan_type` - 'stored'
- [x] `algorithm_used` - 'keyword_overlap'

---

## ✅ PHASE 5.6 — RESPONSE RETURN

Verify response is:
- [x] Structured JSON (not raw AI output)
- [x] Clean and frontend-ready
- [x] No internal error messages exposed
- [x] All fields properly formatted

---

## ✅ PHASE 5.7 — SECURITY

### Test: Scan blocked without login
```powershell
curl -X POST http://localhost:5000/api/scan

# Expected: 401 Unauthorized
```

### Test: Scan blocked without resume
```powershell
# Create user without uploading resume
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{}'

# Expected: 404 Not Found
# Message: "No resume found..."
```

### Test: Scan blocked without JD
```powershell
# Create user, upload resume, but no JD
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{}'

# Expected: 404 Not Found
# Message: "No job description found..."
```

### Test: Users cannot scan others' data
```powershell
# User A creates resume with ID 1
# User B tries to scan with resume_id: 1

curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer USER_B_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "resume_id": 1,
    "job_description_id": null
  }'

# Expected: 404 Not Found (resume not found for User B)
```

---

## ✅ PHASE 6.1 — DATA MODEL

User model already has:
- `free_scans_remaining` (default: 5)
- `total_scans_used` (default: 0)

### Verify Default Values

```powershell
# Register new user and check profile
curl -X GET http://localhost:5000/api/profile `
  -H "Authorization: Bearer YOUR_TOKEN"

# Response should show user with free_scans_remaining: 5
```

---

## ✅ PHASE 6.2 — PRE-SCAN CHECK

### Check Scan Status

```powershell
curl -X GET http://localhost:5000/api/scan_status `
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Response:
{
  "success": true,
  "scan_balance": {
    "free_scans_remaining": 5,
    "total_scans_used": 0,
    "can_scan": true,
    "is_premium": false
  }
}
```

### Test: Scan when limit exceeded

```powershell
# After using 5 scans, try scan #6
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{}'

# Expected: 403 Forbidden
{
  "success": false,
  "message": "Free scan limit exceeded. Upgrade to continue.",
  "scan_balance": {
    "free_scans_remaining": 0,
    "total_scans_used": 5,
    "can_scan": false,
    "is_premium": false
  }
}
```

**CRITICAL:** Scan must NOT run when limit is exceeded!

---

## ✅ PHASE 6.3 — DECREMENT LOGIC

### Test Scan Counter Decrement

```powershell
# Check initial status
curl -X GET http://localhost:5000/api/scan_status `
  -H "Authorization: Bearer YOUR_TOKEN"
# Note: free_scans_remaining = 5

# Perform scan #1
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{}'

# Check status again
curl -X GET http://localhost:5000/api/scan_status `
  -H "Authorization: Bearer YOUR_TOKEN"
# Verify: free_scans_remaining = 4, total_scans_used = 1
```

### Verify Atomic Transaction

If scan fails, counter should NOT decrement:
- Scan starts → counter decrements
- Scan fails → counter restored
- Database transaction rolled back

---

## ✅ PHASE 6.4 — LIMIT ENFORCEMENT TESTS

### Test Case 1: Scan #1
```powershell
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{}'

# Expected: 200 OK, free_scans_remaining = 4
```

### Test Case 2: Scan #5
```powershell
# After 4 more scans...
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{}'

# Expected: 200 OK, free_scans_remaining = 0
```

### Test Case 3: Scan #6 (should be blocked)
```powershell
curl -X POST http://localhost:5000/api/scan `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{}'

# Expected: 403 Forbidden
# Message: "Free scan limit exceeded..."
```

### Verify in Database

```sql
SELECT free_scans_remaining, total_scans_used 
FROM users 
WHERE id = <user_id>;

-- Expected after 5 scans:
-- free_scans_remaining = 0
-- total_scans_used = 5
```

---

## ✅ PHASE 6.5 — PREMIUM OVERRIDE

### Test: Premium user bypass

```powershell
# Upgrade user to premium (manually in DB or via admin endpoint)
# Then perform 10+ scans

# All scans should succeed regardless of free_scans_remaining
```

**Premium users:**
- `user.role = 'premium'` or `'admin'`
- `can_perform_scan()` always returns `true`
- No scan limit enforcement

---

## ✅ PHASE 6.6 — API RESPONSE ENHANCEMENT

Every scan response includes `scan_balance`:

```json
{
  "success": true,
  "scan_id": 12,
  "score": 72.5,
  ...
  "scan_balance": {
    "free_scans_remaining": 2,
    "total_scans_used": 3,
    "can_scan": true,
    "is_premium": false
  }
}
```

---

## 🧪 Automated Testing

### Run Full Test Suite

```powershell
# Install requests if not already installed
pip install requests

# Run tests
python test_phase5_phase6.py
```

This will:
1. Create a test user
2. Upload a test resume
3. Create a test JD
4. Run Phase 5 tests (scan API, validation)
5. Run Phase 6 tests (scan limits)
6. Verify all requirements

---

## 📊 FINAL VERIFICATION CHECKLIST

### Phase 5
- [ ] `/api/scan` endpoint works
- [ ] Response structure matches spec
- [ ] Score calculated correctly (0-100)
- [ ] Matched skills identified
- [ ] Missing skills identified
- [ ] Summary generated
- [ ] Category scores calculated
- [ ] Results stored in scan_history table
- [ ] JWT required
- [ ] Resume validation works
- [ ] JD validation works
- [ ] User isolation enforced

### Phase 6
- [ ] New users have 5 free scans
- [ ] Scan counter decrements after each scan
- [ ] Scan #6 is blocked
- [ ] Error message shown when limit exceeded
- [ ] `scan_balance` included in response
- [ ] Premium users bypass limit
- [ ] Admin users bypass limit
- [ ] Counter restoration on scan failure

---

## 🎯 SUCCESS CRITERIA

Phase 5 & 6 are **COMPLETE** when:

✅ All tests in `test_phase5_phase6.py` pass
✅ Scan API returns correct structure
✅ Matching logic works (keyword-based)
✅ Results stored in database
✅ Free scan limit enforced (5 scans)
✅ Scan #6 blocked with proper message
✅ Premium users can scan unlimited
✅ All security checks pass

---

## 🚀 DEPLOYMENT

After local testing passes:

```powershell
# Deploy to EB
eb deploy

# Test against EB URL
# Update BASE_URL in test_phase5_phase6.py to your EB URL
python test_phase5_phase6.py
```

---

## 📝 NEXT STEPS

Once Phase 5 & 6 pass:

1. ✅ Mark Phase 5 as COMPLETE
2. ✅ Mark Phase 6 as COMPLETE
3. 🎉 Core AI Scan feature is LIVE!
4. 🚀 Can proceed to Phase 7 (if any)

**DO NOT PROCEED UNTIL ALL PHASE 5 & 6 TESTS PASS!**
