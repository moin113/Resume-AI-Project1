"""
Phase 5 & 6 Testing Script
Tests AI Scan functionality and Free Scan Limits
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"  # Change to your EB URL for production testing
API_URL = f"{BASE_URL}/api"

# Test data
TEST_USER = {
    "first_name": "Scan",
    "last_name": "Tester",
    "email": f"scan_test_{datetime.now().timestamp()}@example.com",
    "password": "TestPass123!",
    "confirm_password": "TestPass123!"
}

TEST_RESUME_TEXT = """
John Doe
Senior Software Engineer

TECHNICAL SKILLS:
- Python, Flask, Django, FastAPI
- JavaScript, React, Node.js
- SQL, PostgreSQL, MongoDB
- AWS, Docker, Kubernetes
- Git, CI/CD, Jenkins

SOFT SKILLS:
- Team Leadership
- Communication
- Problem Solving
- Time Management

EXPERIENCE:
Senior Backend Developer at Tech Corp (2020-2023)
- Developed REST APIs using Flask and Django
- Managed PostgreSQL and MongoDB databases
- Deployed applications on AWS using Docker
- Led a team of 5 developers

Backend Developer at StartupXYZ (2018-2020)
- Built microservices with Python
- Implemented CI/CD pipelines
- Worked with React for frontend integration

EDUCATION:
Bachelor of Computer Science, 2018
"""

TEST_JD = {
    "title": "Senior Backend Developer",
    "company_name": "TechCorp Inc",
    "job_text": """
We are looking for an experienced Senior Backend Developer to join our team.

REQUIRED SKILLS:
- Python (Flask, Django)
- REST API development
- SQL databases (PostgreSQL)
- AWS cloud services
- Docker and Kubernetes
- Git version control

PREFERRED SKILLS:
- React or Vue.js
- MongoDB
- CI/CD experience
- Microservices architecture

SOFT SKILLS:
- Strong communication skills
- Team collaboration
- Leadership abilities
- Problem-solving mindset

EXPERIENCE:
- 5+ years in backend development
- Experience with cloud platforms (AWS/GCP/Azure)
- Team leadership experience preferred

RESPONSIBILITIES:
- Design and develop scalable backend systems
- Lead technical discussions
- Mentor junior developers
- Collaborate with frontend team
"""
}

# Global variables
access_token = None
user_id = None
resume_id = None
jd_id = None

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def print_test(test_name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"    {details}")

def setup_test_user():
    """Setup: Register and login user"""
    global access_token, user_id
    print_section("SETUP - Create Test User")
    
    # Register
    try:
        response = requests.post(f"{API_URL}/register", json=TEST_USER)
        if response.status_code == 201:
            data = response.json()
            user_id = data.get('user', {}).get('id')
            print_test("User registration", True, f"User ID: {user_id}")
        else:
            print_test("User registration", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("User registration", False, f"Error: {str(e)}")
        return False
    
    # Login
    try:
        login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
        response = requests.post(f"{API_URL}/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('tokens', {}).get('access_token')
            print_test("User login", True, f"Token received")
            return True
        else:
            print_test("User login", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("User login", False, f"Error: {str(e)}")
        return False

def upload_test_resume():
    """Upload a test resume"""
    global resume_id
    print_section("SETUP - Upload Test Resume")
    
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Create a test resume file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(TEST_RESUME_TEXT)
            temp_path = f.name
        
        try:
            files = {"resume": open(temp_path, "rb")}
            data = {"title": "Test Resume for Scan"}
            
            response = requests.post(f"{API_URL}/upload_resume", headers=headers, files=files, data=data)
            
            if response.status_code == 201:
                result = response.json()
                resume_id = result.get('resume', {}).get('id')
                print_test("Resume upload", True, f"Resume ID: {resume_id}")
                return True
            else:
                print_test("Resume upload", False, f"Status: {response.status_code}")
                print(f"    Response: {response.text}")
                return False
        finally:
            os.unlink(temp_path)
            
    except Exception as e:
        print_test("Resume upload", False, f"Error: {str(e)}")
        return False

def create_test_jd():
    """Create a test job description"""
    global jd_id
    print_section("SETUP - Create Test JD")
    
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(f"{API_URL}/jd", headers=headers, json=TEST_JD)
        
        if response.status_code == 201:
            data = response.json()
            jd_id = data.get('job_description', {}).get('id')
            print_test("JD creation", True, f"JD ID: {jd_id}")
            return True
        else:
            print_test("JD creation", False, f"Status: {response.status_code}")
            print(f"    Response: {response.text}")
            return False
            
    except Exception as e:
        print_test("JD creation", False, f"Error: {str(e)}")
        return False

def test_phase_5_0_preconditions():
    """PHASE 5.0 - PRE-CONDITIONS"""
    print_section("PHASE 5.0 - PRE-CONDITIONS")
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Check resume exists
    try:
        response = requests.get(f"{API_URL}/resumes", headers=headers)
        resumes = response.json().get('resumes', [])
        print_test("At least 1 resume uploaded", len(resumes) > 0, f"Count: {len(resumes)}")
    except Exception as e:
        print_test("Resume check", False, f"Error: {str(e)}")
    
    # Check JD exists
    try:
        response = requests.get(f"{API_URL}/jd/latest", headers=headers)
        passed = response.status_code == 200
        print_test("At least 1 JD saved", passed)
    except Exception as e:
        print_test("JD check", False, f"Error: {str(e)}")
    
    # Check user logged in
    try:
        response = requests.get(f"{API_URL}/profile", headers=headers)
        passed = response.status_code == 200
        print_test("User logged in (valid JWT)", passed)
    except Exception as e:
        print_test("JWT check", False, f"Error: {str(e)}")

def test_phase_5_1_scan_api():
    """PHASE 5.1 - SCAN API CONTRACT"""
    print_section("PHASE 5.1 - SCAN API CONTRACT")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Test with null IDs (should use latest)
    print("\nTest: Scan with null IDs (use latest)")
    try:
        payload = {
            "resume_id": None,
            "job_description_id": None
        }
        
        response = requests.post(f"{API_URL}/scan", headers=headers, json=payload)
        passed = response.status_code == 200
        print_test("Scan API responds", passed, f"Status: {response.status_code}")
        
        if passed:
            data = response.json()
            
            # Verify response structure
            print_test("Response has 'success'", 'success' in data)
            print_test("Response has 'scan_id'", 'scan_id' in data)
            print_test("Response has 'score'", 'score' in data)
            print_test("Response has 'matched_skills'", 'matched_skills' in data)
            print_test("Response has 'missing_skills'", 'missing_skills' in data)
            print_test("Response has 'summary'", 'summary' in data)
            print_test("Response has 'category_scores'", 'category_scores' in data)
            print_test("Response has 'scan_balance'", 'scan_balance' in data)
            
            # Print results
            print(f"\n    📊 Scan Results:")
            print(f"       Scan ID: {data.get('scan_id')}")
            print(f"       Score: {data.get('score')}%")
            print(f"       Matched Skills: {len(data.get('matched_skills', []))}")
            print(f"       Missing Skills: {len(data.get('missing_skills', []))}")
            print(f"       Summary: {data.get('summary')[:100]}...")
            print(f"       Category Scores: {data.get('category_scores')}")
            print(f"       Scan Balance: {data.get('scan_balance')}")
            
            return data.get('scan_id')
        else:
            print(f"    Response: {response.text}")
            return None
            
    except Exception as e:
        print_test("Scan API", False, f"Error: {str(e)}")
        return None

def test_phase_5_2_validation():
    """PHASE 5.2 - BACKEND VALIDATION RULES"""
    print_section("PHASE 5.2 - BACKEND VALIDATION RULES")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Test without JWT
    print("\nTest: Scan without JWT")
    try:
        response = requests.post(f"{API_URL}/scan", json={})
        passed = response.status_code == 401
        print_test("JWT required", passed, f"Status: {response.status_code}")
    except Exception as e:
        print_test("JWT validation", False, f"Error: {str(e)}")
    
    # Test with invalid resume ID
    print("\nTest: Scan with invalid resume ID")
    try:
        payload = {"resume_id": 99999, "job_description_id": jd_id}
        response = requests.post(f"{API_URL}/scan", headers=headers, json=payload)
        passed = response.status_code == 404
        print_test("Invalid resume rejected", passed, f"Status: {response.status_code}")
    except Exception as e:
        print_test("Resume validation", False, f"Error: {str(e)}")
    
    # Test with invalid JD ID
    print("\nTest: Scan with invalid JD ID")
    try:
        payload = {"resume_id": resume_id, "job_description_id": 99999}
        response = requests.post(f"{API_URL}/scan", headers=headers, json=payload)
        passed = response.status_code == 404
        print_test("Invalid JD rejected", passed, f"Status: {response.status_code}")
    except Exception as e:
        print_test("JD validation", False, f"Error: {str(e)}")

def test_phase_6_scan_limits():
    """PHASE 6 - SCAN LIMITS (FREE = 5)"""
    print_section("PHASE 6 - SCAN LIMITS")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Get initial scan status
    print("\nChecking initial scan status...")
    try:
        response = requests.get(f"{API_URL}/scan_status", headers=headers)
        if response.status_code == 200:
            status = response.json().get('scan_balance', {})
            print(f"    Free scans remaining: {status.get('free_scans_remaining')}")
            print(f"    Total scans used: {status.get('total_scans_used')}")
            print(f"    Can scan: {status.get('can_scan')}")
            initial_remaining = status.get('free_scans_remaining', 0)
        else:
            print(f"    Failed to get status: {response.status_code}")
            initial_remaining = 5
    except Exception as e:
        print(f"    Error: {str(e)}")
        initial_remaining = 5
    
    # Perform scans until limit
    print(f"\nPerforming scans (starting with {initial_remaining} remaining)...")
    scan_count = 0
    max_scans = initial_remaining
    
    for i in range(max_scans + 2):  # Try 2 more than allowed
        scan_num = i + 1
        print(f"\n  Scan #{scan_num}:")
        
        try:
            payload = {"resume_id": None, "job_description_id": None}
            response = requests.post(f"{API_URL}/scan", headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                balance = data.get('scan_balance', {})
                print_test(f"Scan #{scan_num}", True, 
                          f"Score: {data.get('score')}%, Remaining: {balance.get('free_scans_remaining')}")
                scan_count += 1
            elif response.status_code == 403:
                data = response.json()
                print_test(f"Scan #{scan_num} blocked", True, 
                          f"Message: {data.get('message')}")
                print(f"    ✅ Limit enforcement working!")
                break
            else:
                print_test(f"Scan #{scan_num}", False, f"Status: {response.status_code}")
                
        except Exception as e:
            print_test(f"Scan #{scan_num}", False, f"Error: {str(e)}")
    
    # Verify final status
    print("\nFinal scan status:")
    try:
        response = requests.get(f"{API_URL}/scan_status", headers=headers)
        if response.status_code == 200:
            status = response.json().get('scan_balance', {})
            print(f"    Free scans remaining: {status.get('free_scans_remaining')}")
            print(f"    Total scans used: {status.get('total_scans_used')}")
            print(f"    Can scan: {status.get('can_scan')}")
            
            # Verify limit enforcement
            if status.get('free_scans_remaining') == 0:
                print_test("Scan limit reached", True, "free_scans_remaining = 0")
            if not status.get('can_scan'):
                print_test("can_scan = false", True, "User cannot scan anymore")
    except Exception as e:
        print(f"    Error: {str(e)}")

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("  PHASE 5 & 6 COMPREHENSIVE TESTING")
    print("  AI Scan & Free Scan Limits")
    print("="*80)
    print(f"\nTesting against: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Setup
    if not setup_test_user():
        print("\n❌ Setup failed - cannot continue")
        return
    
    if not upload_test_resume():
        print("\n❌ Resume upload failed - cannot continue")
        return
    
    if not create_test_jd():
        print("\n❌ JD creation failed - cannot continue")
        return
    
    # Run Phase 5 tests
    test_phase_5_0_preconditions()
    scan_id = test_phase_5_1_scan_api()
    test_phase_5_2_validation()
    
    # Run Phase 6 tests
    test_phase_6_scan_limits()
    
    # Summary
    print_section("TEST SUMMARY")
    print("\n✅ All Phase 5 & 6 tests completed")
    print("📝 Review the output above for any failures")
    print("\n🎯 VERIFICATION CHECKLIST:")
    print("   ☐ Scan API returns correct structure")
    print("   ☐ Score calculated correctly")
    print("   ☐ Matched/missing skills identified")
    print("   ☐ Scan limits enforced (5 free scans)")
    print("   ☐ Scan blocked after limit")
    print("   ☐ Scan balance included in response")
    print("\n🚀 If all tests pass, Phase 5 & 6 are COMPLETE!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
