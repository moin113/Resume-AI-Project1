"""
Phase 3 & 4 Testing Script
Tests all requirements for Resume Upload (Phase 3) and Job Description Input (Phase 4)
"""

import requests
import json
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"  # Change to your EB URL for production testing
API_URL = f"{BASE_URL}/api"

# Test data
TEST_USER = {
    "first_name": "Test",
    "last_name": "User",
    "email": f"test_{datetime.now().timestamp()}@example.com",
    "password": "TestPass123!",
    "confirm_password": "TestPass123!"
}

TEST_JD = {
    "title": "Backend Developer",
    "company_name": "ABC Corp",
    "job_text": """
    We are looking for an experienced Backend Developer to join our team.
    
    Required Skills:
    - Python, Flask, Django
    - REST API development
    - SQL and NoSQL databases
    - AWS cloud services
    - Git version control
    
    Soft Skills:
    - Strong communication skills
    - Team collaboration
    - Problem-solving abilities
    - Time management
    
    Experience: 3+ years in backend development
    """
}

# Global variables to store test data
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

def test_health_endpoints():
    """PHASE 3.0 - PRE-CONDITIONS"""
    print_section("PHASE 3.0 - PRE-CONDITIONS")
    
    # Test /health
    try:
        response = requests.get(f"{BASE_URL}/health")
        passed = response.status_code == 200
        print_test("/health endpoint", passed, f"Status: {response.status_code}")
        if passed:
            print(f"    Response: {response.json()}")
    except Exception as e:
        print_test("/health endpoint", False, f"Error: {str(e)}")
    
    # Test /api/ping
    try:
        response = requests.get(f"{API_URL}/ping")
        passed = response.status_code == 200
        print_test("/api/ping endpoint", passed, f"Status: {response.status_code}")
        if passed:
            print(f"    Response: {response.json()}")
    except Exception as e:
        print_test("/api/ping endpoint", False, f"Error: {str(e)}")

def test_auth_flow():
    """PHASE 3.1 - AUTH FLOW"""
    global access_token, user_id
    print_section("PHASE 3.1 - AUTH FLOW")
    
    # 3.1.1 Register
    print("\n3.1.1 - REGISTER")
    try:
        response = requests.post(f"{API_URL}/register", json=TEST_USER)
        passed = response.status_code == 201
        print_test("User registration", passed, f"Status: {response.status_code}")
        if passed:
            data = response.json()
            user_id = data.get('user', {}).get('id')
            print(f"    User ID: {user_id}")
            print(f"    Email: {data.get('user', {}).get('email')}")
    except Exception as e:
        print_test("User registration", False, f"Error: {str(e)}")
        return False
    
    # 3.1.2 Login
    print("\n3.1.2 - LOGIN")
    try:
        login_data = {
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
        response = requests.post(f"{API_URL}/login", json=login_data)
        passed = response.status_code == 200
        print_test("User login", passed, f"Status: {response.status_code}")
        
        if passed:
            data = response.json()
            tokens = data.get('tokens', {})
            access_token = tokens.get('access_token')
            refresh_token = tokens.get('refresh_token')
            
            print_test("Access token received", bool(access_token))
            print_test("Refresh token received", bool(refresh_token))
            print(f"    Token type: {tokens.get('token_type')}")
            print(f"    Expires in: {tokens.get('expires_in')} seconds")
    except Exception as e:
        print_test("User login", False, f"Error: {str(e)}")
        return False
    
    # 3.1.3 Token Validation
    print("\n3.1.3 - TOKEN VALIDATION")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{API_URL}/profile", headers=headers)
        passed = response.status_code == 200
        print_test("Token validation on protected route", passed, f"Status: {response.status_code}")
        
        if passed:
            data = response.json()
            print_test("Profile data received", data.get('success', False))
            print(f"    User: {data.get('user', {}).get('email')}")
    except Exception as e:
        print_test("Token validation", False, f"Error: {str(e)}")
        return False
    
    return True

def test_resume_upload():
    """PHASE 3.2 - RESUME UPLOAD API"""
    global resume_id
    print_section("PHASE 3.2 - RESUME UPLOAD API")
    
    if not access_token:
        print("❌ Cannot test resume upload - no access token")
        return False
    
    # Create a test resume file
    test_resume_path = "test_resume.txt"
    with open(test_resume_path, "w") as f:
        f.write("""
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
        """)
    
    # 3.2.1 & 3.2.2 - Upload Resume
    print("\n3.2.1 & 3.2.2 - UPLOAD RESUME")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        files = {"resume": open(test_resume_path, "rb")}
        data = {"title": "My Test Resume"}
        
        response = requests.post(f"{API_URL}/upload_resume", headers=headers, files=files, data=data)
        passed = response.status_code == 201
        print_test("Resume upload", passed, f"Status: {response.status_code}")
        
        if passed:
            result = response.json()
            resume_id = result.get('resume', {}).get('id')
            resume_data = result.get('resume', {})
            
            print_test("Resume ID assigned", bool(resume_id), f"ID: {resume_id}")
            print_test("Upload status completed", resume_data.get('upload_status') == 'completed')
            print_test("Keywords extracted", resume_data.get('keywords_extracted', False))
            print_test("File size stored", resume_data.get('file_size', 0) > 0)
            print(f"    Filename: {resume_data.get('original_filename')}")
            print(f"    Keyword count: {resume_data.get('keyword_count', 0)}")
    except Exception as e:
        print_test("Resume upload", False, f"Error: {str(e)}")
    finally:
        # Clean up test file
        if os.path.exists(test_resume_path):
            os.remove(test_resume_path)
    
    # Test upload without token
    print("\n3.2.4 - SECURITY TEST: Upload without token")
    try:
        response = requests.post(f"{API_URL}/upload_resume")
        passed = response.status_code == 401
        print_test("Upload blocked without token", passed, f"Status: {response.status_code}")
    except Exception as e:
        print_test("Security test", False, f"Error: {str(e)}")

def test_resume_fetch():
    """PHASE 3.3 - RESUME FETCH APIs"""
    print_section("PHASE 3.3 - RESUME FETCH APIs")
    
    if not access_token:
        print("❌ Cannot test resume fetch - no access token")
        return False
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 3.3.1 - List Resumes
    print("\n3.3.1 - LIST RESUMES")
    try:
        response = requests.get(f"{API_URL}/resumes", headers=headers)
        passed = response.status_code == 200
        print_test("List resumes", passed, f"Status: {response.status_code}")
        
        if passed:
            data = response.json()
            resumes = data.get('resumes', [])
            print_test("Resumes returned", len(resumes) > 0, f"Count: {len(resumes)}")
    except Exception as e:
        print_test("List resumes", False, f"Error: {str(e)}")
    
    # 3.3.2 - Resume Details
    if resume_id:
        print("\n3.3.2 - RESUME DETAILS")
        try:
            response = requests.get(f"{API_URL}/resumes/{resume_id}", headers=headers)
            passed = response.status_code == 200
            print_test("Get resume details", passed, f"Status: {response.status_code}")
            
            if passed:
                data = response.json()
                resume = data.get('resume', {})
                print_test("Extracted text present", bool(resume.get('extracted_text')))
                print(f"    Text length: {resume.get('text_length', 0)} characters")
        except Exception as e:
            print_test("Get resume details", False, f"Error: {str(e)}")

def test_jd_create():
    """PHASE 4.1 - JD CREATE"""
    global jd_id
    print_section("PHASE 4.1 - JD CREATE")
    
    if not access_token:
        print("❌ Cannot test JD create - no access token")
        return False
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # 4.1.1 & 4.1.2 - Create JD
    print("\n4.1.1 & 4.1.2 - CREATE JD")
    try:
        response = requests.post(f"{API_URL}/jd", headers=headers, json=TEST_JD)
        passed = response.status_code == 201
        print_test("JD creation", passed, f"Status: {response.status_code}")
        
        if passed:
            data = response.json()
            jd_data = data.get('job_description', {})
            jd_id = jd_data.get('id')
            
            print_test("JD ID assigned", bool(jd_id), f"ID: {jd_id}")
            print_test("Title stored", jd_data.get('title') == TEST_JD['title'])
            print_test("Company name stored", jd_data.get('company_name') == TEST_JD['company_name'])
            print_test("Word count calculated", jd_data.get('word_count', 0) > 0)
            print_test("Keywords extracted", jd_data.get('keywords_extracted', False))
            print(f"    Word count: {jd_data.get('word_count')}")
            print(f"    Keyword count: {jd_data.get('keyword_count', 0)}")
    except Exception as e:
        print_test("JD creation", False, f"Error: {str(e)}")
    
    # 4.1.3 - Security Test
    print("\n4.1.3 - SECURITY TEST: JD without token")
    try:
        response = requests.post(f"{API_URL}/jd", json=TEST_JD)
        passed = response.status_code == 401
        print_test("JD blocked without login", passed, f"Status: {response.status_code}")
    except Exception as e:
        print_test("Security test", False, f"Error: {str(e)}")

def test_jd_fetch():
    """PHASE 4.2 - FETCH LATEST JD"""
    print_section("PHASE 4.2 - FETCH LATEST JD")
    
    if not access_token:
        print("❌ Cannot test JD fetch - no access token")
        return False
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        response = requests.get(f"{API_URL}/jd/latest", headers=headers)
        passed = response.status_code == 200
        print_test("Fetch latest JD", passed, f"Status: {response.status_code}")
        
        if passed:
            data = response.json()
            jd = data.get('job_description', {})
            
            print_test("Latest JD returned", bool(jd))
            print_test("Only user's JD", jd.get('user_id') == user_id)
            print_test("Includes counts", 'word_count' in jd and 'keyword_count' in jd)
            print(f"    JD ID: {jd.get('id')}")
            print(f"    Title: {jd.get('title')}")
            print(f"    Word count: {jd.get('word_count')}")
    except Exception as e:
        print_test("Fetch latest JD", False, f"Error: {str(e)}")

def test_validation():
    """Additional validation tests"""
    print_section("ADDITIONAL VALIDATION TESTS")
    
    if not access_token:
        print("❌ Cannot test validation - no access token")
        return False
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Test JD with missing title
    print("\nTest: JD with missing title")
    try:
        invalid_jd = {"job_text": "Some text"}
        response = requests.post(f"{API_URL}/jd", headers=headers, json=invalid_jd)
        passed = response.status_code == 400
        print_test("Reject JD without title", passed, f"Status: {response.status_code}")
    except Exception as e:
        print_test("Validation test", False, f"Error: {str(e)}")
    
    # Test JD with text too short
    print("\nTest: JD with text too short")
    try:
        invalid_jd = {"title": "Test", "job_text": "Short"}
        response = requests.post(f"{API_URL}/jd", headers=headers, json=invalid_jd)
        passed = response.status_code == 400
        print_test("Reject JD with short text", passed, f"Status: {response.status_code}")
    except Exception as e:
        print_test("Validation test", False, f"Error: {str(e)}")

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("  PHASE 3 & 4 COMPREHENSIVE TESTING")
    print("  Resume Upload & Job Description Input")
    print("="*80)
    print(f"\nTesting against: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Run all test phases
    test_health_endpoints()
    
    if test_auth_flow():
        test_resume_upload()
        test_resume_fetch()
        test_jd_create()
        test_jd_fetch()
        test_validation()
    else:
        print("\n❌ Auth flow failed - skipping remaining tests")
    
    # Summary
    print_section("TEST SUMMARY")
    print("\n✅ All critical endpoints tested")
    print("📝 Review the output above for any failures")
    print("\n🎯 NEXT STEPS:")
    print("   1. Fix any failed tests")
    print("   2. Deploy to EB if all tests pass")
    print("   3. Run tests again against EB URL")
    print("   4. Proceed to Phase 5 (AI Scan) only after all tests pass")

if __name__ == "__main__":
    main()
