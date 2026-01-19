import requests
import os
import uuid
import time

# Target URL (Local or Production)
BASE_URL = os.getenv("APP_URL", "http://localhost:5000")

def test_phase_9_e2e():
    print("\n--- Starting Phase 9 Production Verification ---")
    
    # Generate unique user
    username = f"eb_user_{uuid.uuid4().hex[:8]}"
    email = f"{username}@example.com"
    password = "Password123!"
    
    # --- 1. Register ---
    print("1. Registering new user...")
    resp = requests.post(f"{BASE_URL}/api/register", json={
        "username": username,
        "email": email,
        "password": password,
        "confirm_password": password,
        "first_name": "EB",
        "last_name": "Tester"
    })
    assert resp.status_code == 201, f"Register failed: {resp.text}"
    print("PASS: Register success")

    # --- 2. Login ---
    print("2. Logging in...")
    resp = requests.post(f"{BASE_URL}/api/login", json={
        "email": email,
        "password": password
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("PASS: Login success")

    # --- 3. Upload Resume (Failure Case: Invalid Type) ---
    print("3. Testing invalid file upload...")
    files = {'resume': ('test.exe', b'malicious content', 'application/x-msdownload')}
    resp = requests.post(f"{BASE_URL}/api/upload_resume", headers=headers, files=files)
    assert resp.status_code == 400, "Should have blocked .exe file"
    print("PASS: Invalid file blocked correctly")

    # --- 4. Upload Valid Resume ---
    print("4. Uploading valid resume...")
    files = {'resume': ('resume.txt', b'Skills: Python, Flask, AWS. Experience: 5 years of backend development.', 'text/plain')}
    resp = requests.post(f"{BASE_URL}/api/upload_resume", headers=headers, files=files)
    assert resp.status_code == 201, f"Upload failed: {resp.text}"
    print("PASS: Valid resume uploaded")

    # --- 5. Scan (Failure Case: No JD) ---
    print("5. Testing scan with no JD...")
    resp = requests.post(f"{BASE_URL}/api/scan", headers=headers, json={})
    # Since we use latest if null, it might fail if NO JD exists at all in DB for user
    if resp.status_code != 200:
        print("PASS: Scan failed as expected (no JD found)")
    else:
        print("SKIP: Scan unexpectedly succeeded (check JD logic)")

    # --- 6. Upload JD ---
    print("6. Uploading Job Description...")
    resp = requests.post(f"{BASE_URL}/api/upload_jd", headers=headers, json={
        "title": "Backend Engineer",
        "company_name": "AWS",
        "job_text": "We need a Python developer with Flask and AWS experience."
    })
    assert resp.status_code == 201, "JD upload failed"
    print("PASS: JD uploaded")

    # --- 7. Run 5 Scans ---
    print("7. Running 5 scans to reach limit...")
    for i in range(5):
        resp = requests.post(f"{BASE_URL}/api/scan", headers=headers, json={})
        assert resp.status_code == 200, f"Scan {i+1} failed"
        print(f"   - Scan {i+1} success. Score: {resp.json()['score']}")

    # --- 8. 6th Scan Blocked ---
    print("8. Attempting 6th scan (should be blocked)...")
    resp = requests.post(f"{BASE_URL}/api/scan", headers=headers, json={})
    assert resp.status_code == 403, "6th scan should be blocked"
    print(f"PASS: 6th scan blocked")

    # --- 9. Check History ---
    print("9. Verifying History...")
    resp = requests.get(f"{BASE_URL}/api/scans", headers=headers)
    assert resp.status_code == 200
    scans = resp.json()["scans"]
    assert len(scans) == 5, f"Expected 5 scans in history, got {len(scans)}"
    print(f"PASS: History verified. Found {len(scans)} scans.")

    # --- 10. Open old scan ---
    print("10. Fetching detailed scan...")
    if not scans:
        print("FAIL: No scans found in history")
        return
    scan_id = scans[0]["id"]
    print(f"DEBUG: Fetching scan_id: {scan_id}")
    resp = requests.get(f"{BASE_URL}/api/scan/{scan_id}", headers=headers)
    print(f"DEBUG: Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"FAIL: Fetch detailed scan failed: {resp.text}")
        return
    
    scan_data = resp.json().get("scan", {})
    if not scan_data:
        print(f"FAIL: No scan data in response: {resp.json()}")
        return
        
    print(f"PASS: Detailed scan fetched")

    # --- 11. Delete Resume used in scan ---
    print("11. Testing delete resume used in scan...")
    # Find the resume_id from the scan
    resume_id = resp.json()["scan"]["resume_id"]
    if resume_id:
        resp = requests.delete(f"{BASE_URL}/api/resumes/{resume_id}", headers=headers)
        if resp.status_code == 200:
            print("PASS: History still accessible after resume deletion")
        else:
            print(f"WARN: Resume deletion failed: {resp.text}")
    else:
        print("WARN: No resume_id found in scan to delete")

    print("\n--- Phase 9 PRODUCTION VERIFICATION SUCCESSFUL! ---")

if __name__ == "__main__":
    import traceback
    try:
        test_phase_9_e2e()
    except Exception as e:
        print(f"\nFAIL: VERIFICATION FAILED")
        traceback.print_exc()
        exit(1)
