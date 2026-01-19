"""
Phase 7 Testing Script
Tests History List, Scan Detail, and Dashboard Summary APIs
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
API_URL = f"{BASE_URL}/api"

# Test data (reusing from previous phases login if needed)
TEST_USER = {
    "first_name": "History",
    "last_name": "Tester",
    "email": f"history_test_{datetime.now().timestamp()}@example.com",
    "password": "TestPass123!",
    "confirm_password": "TestPass123!"
}

# Global variables
access_token = None
user_id = None
scan_id = None

def print_section(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def print_test(test_name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"    {details}")

def setup():
    global access_token, user_id, scan_id
    print_section("SETUP - Create User and Scan")
    
    # Register
    requests.post(f"{API_URL}/register", json=TEST_USER)
    
    # Login
    response = requests.post(f"{API_URL}/login", json={"email": TEST_USER["email"], "password": TEST_USER["password"]})
    access_token = response.json().get('tokens', {}).get('access_token')
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Upload Resume
    import tempfile
    import os
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("Skills: Python, Java, SQL")
        temp_path = f.name
    
    with open(temp_path, "rb") as f:
        requests.post(f"{API_URL}/upload_resume", headers=headers, files={"resume": f}, data={"title": "Test Resume"})
    os.unlink(temp_path)
    
    # Create JD
    requests.post(f"{API_URL}/jd", headers=headers, json={"title": "Dev", "job_text": "Need Python, SQL, and AWS skills for this developer role. Must have 5 years experience."})
    
    # Perform Scan
    scan_resp = requests.post(f"{API_URL}/scan", headers=headers, json={})
    scan_id = scan_resp.json().get('scan_id')
    print(f"Setup complete. Scan ID: {scan_id}")

def test_phase_7_1_history_list():
    print_section("PHASE 7.1 - HISTORY LIST API")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.get(f"{API_URL}/scans", headers=headers)
    passed = response.status_code == 200
    print_test("GET /api/scans responds", passed)
    
    if passed:
        data = response.json()
        print_test("Success is true", data.get('success') is True)
        print_test("Count exists", 'count' in data)
        print_test("Scans list exists", 'scans' in data and len(data['scans']) > 0)
        
        scan = data['scans'][0]
        print_test("Scan has id", 'id' in scan)
        print_test("Scan has score", 'score' in scan)
        print_test("Scan has score_category", 'score_category' in scan)
        print_test("Scan has resume_title", 'resume_title' in scan)
        print_test("Scan has job_title", 'job_title' in scan)

def test_phase_7_2_scan_detail():
    print_section("PHASE 7.2 - SINGLE SCAN DETAIL API")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.get(f"{API_URL}/scan/{scan_id}", headers=headers)
    passed = response.status_code == 200
    print_test(f"GET /api/scan/{scan_id} responds", passed)
    
    if passed:
        data = response.json()
        print_test("Success is true", data.get('success') is True)
        scan = data.get('scan', {})
        print_test("Score exists", 'score' in scan)
        print_test("Category scores exists", 'category_scores' in scan)
        print_test("Matched skills exists", 'matched_skills' in scan)
        print_test("Missing skills exists", 'missing_skills' in scan)
        print_test("Summary exists", 'summary' in scan)

def test_phase_7_3_dashboard_summary():
    print_section("PHASE 7.3 - DASHBOARD SUMMARY API")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.get(f"{API_URL}/dashboard/summary", headers=headers)
    passed = response.status_code == 200
    print_test("GET /api/dashboard/summary responds", passed)
    
    if passed:
        data = response.json()
        print_test("Total scans exists", 'total_scans' in data)
        print_test("Average score exists", 'average_score' in data)
        print_test("Last scan score exists", 'last_scan_score' in data)
        print_test("Scan balance exists", 'scan_balance' in data)

def test_phase_7_4_security():
    print_section("PHASE 7.4 - SECURITY & EDGE CASES")
    
    # Create another user
    other_user = {"first_name": "Other", "last_name": "User", "email": "other@example.com", "password": "Password123!", "confirm_password": "Password123!"}
    requests.post(f"{API_URL}/register", json=other_user)
    login_resp = requests.post(f"{API_URL}/login", json={"email": "other@example.com", "password": "Password123!"})
    other_token = login_resp.json().get('tokens', {}).get('access_token')
    
    headers = {"Authorization": f"Bearer {other_token}"}
    
    # Try to access first user's scan
    response = requests.get(f"{API_URL}/scan/{scan_id}", headers=headers)
    print_test("Cannot access others' scans", response.status_code == 404)

if __name__ == "__main__":
    setup()
    test_phase_7_1_history_list()
    test_phase_7_2_scan_detail()
    test_phase_7_3_dashboard_summary()
    test_phase_7_4_security()
