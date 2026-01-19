# Phase 7 & 8 Testing Guide

This guide provides steps to verify the History, Dashboard, and Frontend integration.

## 1. Automated Backend Testing
Run the following script to test the Phase 7 endpoints:
```powershell
python test_phase7.py
```

## 2. Manual Frontend Verification

### Step 1: Login
1. Go to `http://localhost:5000/login`.
2. Login with valid credentials.
3. Verify you are redirected to `/dashboard`.

### Step 2: Dashboard Stats
1. Check the stats cards: "Total Resumes", "Total Job Descriptions", "Total Scans".
2. They should now show real counts (initially 0 if a new user).
3. Check "Available scans" label. It should say "5".

### Step 3: Perform a Scan
1. Upload a resume file.
2. Paste a job description.
3. Click "Scan".
4. You should see a "Scan completed successfully" notification and be redirected to a results page.
5. The URL should contain `?scan_id=...`.

### Step 4: Verify Results
1. On the results page, check the Match Score.
2. Check the "AI Summary" — it should contain text like "This is a [ScoreCategory] match..."
3. Check "Matched Skills" and "Missing Skills".

### Step 5: Scan History
1. Click "Scan History" in the navigation bar.
2. Verify the scan you just performed appears in the list.
3. Click on the scan item or "View Full Analysis".
4. It should take you back to the results for that specific scan.

### Step 6: Scan Limits
1. Perform 5 scans.
2. On the 6th attempt, you should see a warning: "No free scans remaining! Upgrade to premium for unlimited scans."
3. The "Scan" button should result in a 403 error handled by the UI.

## 3. API Verification (via CURL)

### Get Dashboard Summary
```bash
curl -X GET http://localhost:5000/api/dashboard/summary -H "Authorization: Bearer <TOKEN>"
```

### Get History List
```bash
curl -X GET http://localhost:5000/api/scans -H "Authorization: Bearer <TOKEN>"
```

### Get Scan Detail
```bash
curl -X GET http://localhost:5000/api/scan/1 -H "Authorization: Bearer <TOKEN>"
```
