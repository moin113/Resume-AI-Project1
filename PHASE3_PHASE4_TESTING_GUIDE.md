# Phase 3 & 4 Testing Guide
# Complete verification checklist for Resume Upload and Job Description Input

## ✅ PHASE 3.0 — PRE-CONDITIONS

### Test Health Endpoints

```powershell
# Test /health
curl http://localhost:5000/health

# Expected: {"service":"resume-doctor-ai","status":"ok","timestamp":"..."}
```

```powershell
# Test /api/ping
curl http://localhost:5000/api/ping

# Expected: {"message":"API is alive"}
```

---

## ✅ PHASE 3.1 — AUTH FLOW

### 3.1.1 Register User

```powershell
curl -X POST http://localhost:5000/api/register `
  -H "Content-Type: application/json" `
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "confirm_password": "TestPass123!"
  }'

# Expected: 201 Created
# Response includes: user object with id, email, etc.
```

### 3.1.2 Login

```powershell
curl -X POST http://localhost:5000/api/login `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Expected: 200 OK
# Response MUST include:
# {
#   "success": true,
#   "tokens": {
#     "access_token": "...",
#     "refresh_token": "...",
#     "token_type": "Bearer",
#     "expires_in": 3600
#   }
# }
```

**IMPORTANT:** Save the `access_token` from the response. You'll need it for all subsequent requests.

### 3.1.3 Token Validation

```powershell
# Replace YOUR_TOKEN_HERE with the actual access_token from login
curl -X GET http://localhost:5000/api/profile `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: 200 OK
# Response:
# {
#   "success": true,
#   "user": { ... user details ... }
# }
```

**❌ If this fails → STOP. Do NOT proceed to upload tests.**

---

## ✅ PHASE 3.2 — RESUME UPLOAD API

### 3.2.1 & 3.2.2 Upload Resume

First, create a test resume file (`test_resume.txt`):

```text
John Doe
Software Engineer

SKILLS:
- Python, Flask, Django
- JavaScript, React
- SQL, PostgreSQL
- AWS, Docker
- Git, CI/CD

EXPERIENCE:
Senior Backend Developer at Tech Corp (2020-2023)
- Developed REST APIs using Flask
- Managed PostgreSQL databases
- Deployed applications on AWS

EDUCATION:
Bachelor of Computer Science
```

Upload the resume:

```powershell
curl -X POST http://localhost:5000/api/upload_resume `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -F "resume=@test_resume.txt" `
  -F "title=My Test Resume"

# Expected: 201 Created
# Response MUST include:
# {
#   "success": true,
#   "resume": {
#     "id": 1,
#     "original_filename": "test_resume.txt",
#     "upload_status": "completed",
#     "keywords_extracted": true,
#     "keyword_count": > 0,
#     "file_size": > 0
#   }
# }
```

**Save the resume `id` from the response.**

### 3.2.4 Security Tests

```powershell
# Test: Upload without token (should fail)
curl -X POST http://localhost:5000/api/upload_resume `
  -F "resume=@test_resume.txt"

# Expected: 401 Unauthorized
```

```powershell
# Test: Upload with invalid token (should fail)
curl -X POST http://localhost:5000/api/upload_resume `
  -H "Authorization: Bearer invalid_token" `
  -F "resume=@test_resume.txt"

# Expected: 401 or 422
```

---

## ✅ PHASE 3.3 — RESUME FETCH APIs

### 3.3.1 List Resumes

```powershell
curl -X GET http://localhost:5000/api/resumes `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: 200 OK
# Response:
# {
#   "success": true,
#   "resumes": [ ... array of resumes ... ],
#   "count": 1
# }
```

### 3.3.2 Resume Details

```powershell
# Replace RESUME_ID with the actual resume id
curl -X GET http://localhost:5000/api/resumes/RESUME_ID `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: 200 OK
# Response MUST include:
# {
#   "success": true,
#   "resume": {
#     "id": ...,
#     "extracted_text": "...",  # MUST be present
#     "text_length": > 0
#   }
# }
```

### 3.3.3 Delete Resume (Optional)

```powershell
curl -X DELETE http://localhost:5000/api/resumes/RESUME_ID `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: 200 OK
# File should be deleted from disk
```

---

## ✅ PHASE 4.1 — JD CREATE

### 4.1.1 & 4.1.2 Create Job Description

```powershell
curl -X POST http://localhost:5000/api/jd `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -H "Content-Type: application/json" `
  -d '{
    "title": "Backend Developer",
    "company_name": "ABC Corp",
    "job_text": "We are looking for an experienced Backend Developer. Required Skills: Python, Flask, Django, REST API, SQL, AWS, Git. Soft Skills: Communication, Team collaboration, Problem-solving. Experience: 3+ years in backend development."
  }'

# Expected: 201 Created
# Response MUST include:
# {
#   "success": true,
#   "job_description": {
#     "id": 1,
#     "title": "Backend Developer",
#     "company_name": "ABC Corp",
#     "word_count": > 0,
#     "keywords_extracted": true,
#     "keyword_count": > 0
#   }
# }
```

**Save the JD `id` from the response.**

### 4.1.3 Security Test

```powershell
# Test: Create JD without token (should fail)
curl -X POST http://localhost:5000/api/jd `
  -H "Content-Type: application/json" `
  -d '{"title":"Test","job_text":"Some text here that is long enough to pass validation requirements for the job description."}'

# Expected: 401 Unauthorized
```

---

## ✅ PHASE 4.2 — FETCH LATEST JD

```powershell
curl -X GET http://localhost:5000/api/jd/latest `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: 200 OK
# Response MUST include:
# {
#   "success": true,
#   "job_description": {
#     "id": ...,
#     "title": "Backend Developer",
#     "word_count": > 0,
#     "keyword_count": > 0
#   }
# }
```

---

## ✅ PHASE 4.3 — VALIDATION TESTS

### Test: Missing Title

```powershell
curl -X POST http://localhost:5000/api/jd `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -H "Content-Type: application/json" `
  -d '{"job_text":"Some text"}'

# Expected: 400 Bad Request
# Error: "Job title is required"
```

### Test: Text Too Short

```powershell
curl -X POST http://localhost:5000/api/jd `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -H "Content-Type: application/json" `
  -d '{"title":"Test","job_text":"Short"}'

# Expected: 400 Bad Request
# Error: "Job description must be at least 50 characters long"
```

---

## 🎯 DEPLOYMENT TO ELASTIC BEANSTALK

### Prerequisites
1. All local tests pass ✅
2. Code committed to git
3. EB CLI installed

### Deploy Commands

```powershell
# Initialize EB (if not already done)
eb init -p python-3.11 resume-doctor-ai --region us-east-1

# Create environment (if not already created)
eb create resume-doctor-env

# Deploy latest changes
eb deploy

# Check status
eb status

# View logs
eb logs

# Open in browser
eb open
```

### Post-Deployment Verification

After deployment, run ALL the tests above again, but replace `http://localhost:5000` with your EB URL:

```powershell
# Get your EB URL
eb status

# Example EB URL: http://resume-doctor-env.us-east-1.elasticbeanstalk.com
```

Then test:
- `/health`
- `/api/ping`
- Complete auth flow
- Resume upload
- JD creation

---

## 🚨 TROUBLESHOOTING

### Issue: 401 Unauthorized on protected routes
**Solution:** Check that you're including the Bearer token correctly:
```
Authorization: Bearer YOUR_ACTUAL_TOKEN
```

### Issue: Resume upload fails
**Check:**
1. File is being sent as form-data, not JSON
2. Field name is exactly `resume`
3. Token is valid and not expired

### Issue: Keywords not extracted
**Check:**
1. Backend logs for keyword extraction errors
2. Ensure nltk data is downloaded
3. Check that text was successfully extracted from file

### Issue: Database errors
**Check:**
1. Database tables created: `python -c "from backend.app import create_app; app = create_app(); app.app_context().push(); from backend.models import db; db.create_all()"`
2. Check app.db file exists in backend/

---

## ✅ SUCCESS CRITERIA

Phase 3 & 4 are COMPLETE when:

- [ ] `/health` returns 200 OK
- [ ] `/api/ping` returns 200 OK
- [ ] User can register successfully
- [ ] User can login and receive tokens
- [ ] Token works on `/api/profile`
- [ ] Resume upload works with valid token
- [ ] Resume upload blocked without token
- [ ] Uploaded resume has `keywords_extracted: true`
- [ ] Can fetch list of resumes
- [ ] Can fetch individual resume with extracted text
- [ ] Can delete resume (file + DB)
- [ ] Can create JD with valid data
- [ ] JD creation blocked without token
- [ ] JD validation rejects invalid data
- [ ] Can fetch latest JD
- [ ] All tests pass on EB deployment

---

## 📝 NEXT STEPS

Once all checks pass:

1. ✅ Mark Phase 3 as COMPLETE
2. ✅ Mark Phase 4 as COMPLETE
3. 🚀 Proceed to Phase 5 (AI Scan)

**DO NOT START PHASE 5 UNTIL ALL PHASE 3 & 4 TESTS PASS!**
