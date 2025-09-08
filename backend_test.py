#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class JobPlacementAPITester:
    def __init__(self, base_url="https://onboard-gulf.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.client_token = None
        self.admin_token = None
        self.client_user_id = None
        self.admin_user_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_client_registration(self):
        """Test client registration"""
        test_email = f"test_client_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "Client Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "testpassword123"
            }
        )
        if success:
            self.client_user_id = response.get('id')
            print(f"   Client ID: {self.client_user_id}")
        return success, test_email

    def test_client_login(self, email, password="testpassword123"):
        """Test client login"""
        success, response = self.run_test(
            "Client Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": email,
                "password": password
            }
        )
        if success:
            self.client_token = response.get('access_token')
            self.client_user_id = response.get('user', {}).get('id')
            print(f"   Client Token: {self.client_token[:20]}...")
        return success

    def test_admin_login(self):
        """Test admin login with default credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": "admin@example.com",
                "password": "admin123"
            }
        )
        if success:
            self.admin_token = response.get('access_token')
            self.admin_user_id = response.get('user', {}).get('id')
            print(f"   Admin Token: {self.admin_token[:20]}...")
        return success

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        if success:
            print(f"   Health Status: {response.get('status', 'Unknown')}")
        return success

    def test_authentication_endpoints(self):
        """Test authentication endpoints specifically"""
        print("\n🔐 AUTHENTICATION ENDPOINT TESTS")
        print("-" * 40)
        
        # Test client registration
        reg_success, client_email = self.test_client_registration()
        if not reg_success:
            print("❌ Registration endpoint failed")
            return False
        
        # Test client login
        login_success = self.test_client_login(client_email)
        if not login_success:
            print("❌ Login endpoint failed")
            return False
        
        # Test admin login with provided credentials
        admin_success = self.test_admin_login()
        if not admin_success:
            print("❌ Admin login failed")
            return False
        
        return True

    def test_profile_endpoints(self):
        """Test profile endpoints specifically"""
        print("\n👤 PROFILE ENDPOINT TESTS")
        print("-" * 40)
        
        if not self.client_token:
            print("❌ No client token available for profile tests")
            return False
        
        headers = {'Authorization': f'Bearer {self.client_token}'}
        
        # Test /api/profile/me
        success1, _ = self.run_test(
            "GET Profile Me",
            "GET",
            "profile/me",
            200,
            headers=headers
        )
        
        # Test /api/profile/me/onboarding-status
        success2, _ = self.run_test(
            "GET Onboarding Status",
            "GET",
            "profile/me/onboarding-status",
            200,
            headers=headers
        )
        
        return success1 and success2

    def test_admin_endpoints_specific(self):
        """Test admin endpoints specifically"""
        print("\n🔧 ADMIN ENDPOINT TESTS")
        print("-" * 40)
        
        if not self.admin_token:
            print("❌ No admin token available for admin tests")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test /api/admin/clients
        success, _ = self.run_test(
            "GET Admin Clients",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        return success

    def test_jwt_validation(self):
        """Test JWT token validation"""
        print("\n🔑 JWT TOKEN VALIDATION TESTS")
        print("-" * 40)
        
        # Test with invalid token
        invalid_headers = {'Authorization': 'Bearer invalid_token_here'}
        
        success1, _ = self.run_test(
            "Invalid Token Test",
            "GET",
            "profile/me",
            401,  # Should return 401 for invalid token
            headers=invalid_headers
        )
        
        # Test without token
        success2, _ = self.run_test(
            "No Token Test",
            "GET",
            "profile/me",
            401  # Should return 401 for missing token
        )
        
        # Test with valid token (should work)
        if self.client_token:
            valid_headers = {'Authorization': f'Bearer {self.client_token}'}
            success3, _ = self.run_test(
                "Valid Token Test",
                "GET",
                "profile/me",
                200,
                headers=valid_headers
            )
        else:
            success3 = False
            print("❌ No valid token available for testing")
        
        return success1 and success2 and success3
        """Test client profile endpoints"""
        if not self.client_token:
            print("❌ No client token available for profile test")
            return False

        headers = {'Authorization': f'Bearer {self.client_token}'}
        
        # Test get profile
        success, profile = self.run_test(
            "Get Client Profile",
            "GET",
            "profile/me",
            200,
            headers=headers
        )
        
        if not success:
            return False

        # Test update profile
        success, _ = self.run_test(
            "Update Client Profile",
            "PUT",
            "profile/me",
            200,
            data={
                "first_name": "Test",
                "last_name": "User",
                "phone": "+1234567890"
            },
            headers=headers
        )
        
        return success

    def test_chat_functionality(self):
        """Test chat endpoints"""
        if not self.client_token or not self.admin_token:
            print("❌ Missing tokens for chat test")
            return False

        client_headers = {'Authorization': f'Bearer {self.client_token}'}
        admin_headers = {'Authorization': f'Bearer {self.admin_token}'}

        # Client sends message to admin
        success, message = self.run_test(
            "Client Send Message",
            "POST",
            "chat/send",
            200,
            data={
                "receiver_id": self.admin_user_id,
                "content": "Hello admin, this is a test message"
            },
            headers=client_headers
        )

        if not success:
            return False

        # Admin checks inbox
        success, inbox = self.run_test(
            "Admin Check Inbox",
            "GET",
            "chat/admin/inbox",
            200,
            headers=admin_headers
        )

        if not success:
            return False

        # Test chat history
        success, history = self.run_test(
            "Get Chat History",
            "GET",
            f"chat/history?with_user_id={self.admin_user_id}",
            200,
            headers=client_headers
        )

        return success

    def test_jobs_endpoints(self):
        """Test jobs-related endpoints"""
        if not self.client_token:
            print("❌ No client token for jobs test")
            return False

        headers = {'Authorization': f'Bearer {self.client_token}'}
        
        # Test get jobs
        success, jobs = self.run_test(
            "Get Jobs List",
            "GET",
            "jobs",
            200,
            headers=headers
        )
        
        return success

    def test_documents_endpoints(self):
        """Test documents endpoints"""
        if not self.client_token:
            print("❌ No client token for documents test")
            return False

        headers = {'Authorization': f'Bearer {self.client_token}'}
        
        # Test get documents
        success, docs = self.run_test(
            "Get Client Documents",
            "GET",
            "documents/me",
            200,
            headers=headers
        )
        
        return success

    def test_admin_endpoints(self):
        """Test admin-specific endpoints"""
        if not self.admin_token:
            print("❌ No admin token for admin endpoints test")
            return False

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test get clients
        success, clients = self.run_test(
            "Admin Get Clients",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )

        if not success:
            return False

        # Test get applications
        success, apps = self.run_test(
            "Admin Get Applications",
            "GET",
            "admin/applications",
            200,
            headers=headers
        )

        return success

def main():
    print("🚀 Gulf Consultants Job Placement API Tests")
    print("🌐 Testing Backend URL: https://onboard-gulf.preview.emergentagent.com/api")
    print("=" * 60)
    
    tester = JobPlacementAPITester()
    
    # Test sequence focusing on review request requirements
    print("\n🏥 HEALTH CHECK TEST")
    print("-" * 30)
    health_success = tester.test_health_check()
    
    print("\n🔐 AUTHENTICATION ENDPOINT TESTS")
    print("-" * 40)
    auth_success = tester.test_authentication_endpoints()
    
    print("\n👤 PROFILE ENDPOINT TESTS")
    print("-" * 40)
    profile_success = tester.test_profile_endpoints()
    
    print("\n🔧 ADMIN ENDPOINT TESTS")
    print("-" * 40)
    admin_success = tester.test_admin_endpoints_specific()
    
    print("\n🔑 JWT TOKEN VALIDATION TESTS")
    print("-" * 40)
    jwt_success = tester.test_jwt_validation()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    # Detailed results
    print("\n📋 TEST SUMMARY:")
    print(f"   ✅ Health Check: {'PASS' if health_success else 'FAIL'}")
    print(f"   ✅ Authentication: {'PASS' if auth_success else 'FAIL'}")
    print(f"   ✅ Profile Endpoints: {'PASS' if profile_success else 'FAIL'}")
    print(f"   ✅ Admin Endpoints: {'PASS' if admin_success else 'FAIL'}")
    print(f"   ✅ JWT Validation: {'PASS' if jwt_success else 'FAIL'}")
    
    if success_rate >= 80:
        print("\n🎉 Overall: EXCELLENT - Gulf Consultants API is working properly")
        return 0
    elif success_rate >= 60:
        print("\n⚠️  Overall: GOOD - Minor issues found")
        return 1
    else:
        print("\n❌ Overall: POOR - Major issues found")
        return 1

if __name__ == "__main__":
    sys.exit(main())