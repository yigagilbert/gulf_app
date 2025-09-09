#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class PhoneAuthTester:
    def __init__(self, base_url="https://consultportal.preview.emergentagent.com/api"):
        self.base_url = base_url
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

    def test_phone_based_authentication_system(self):
        """Test the new phone-based client authentication system"""
        print("\n📱 PHONE-BASED CLIENT AUTHENTICATION SYSTEM TESTS")
        print("-" * 60)
        
        # Test data as specified in the review request
        test_client_data = {
            "phone_number": "1234567890",
            "first_name": "Test",
            "last_name": "Client", 
            "password": "testpassword123",
            "email": "test@example.com"  # Optional
        }
        
        admin_credentials = {
            "email": "admin@example.com",
            "password": "admin123"
        }
        
        # Step 1: Test Client Registration with Phone Number
        print("🔍 Step 1: Testing client registration with phone number...")
        
        success, registration_response = self.run_test(
            "Client Registration (Phone-based)",
            "POST",
            "auth/register/client",
            200,
            data=test_client_data
        )
        
        registration_success = success
        if success:
            print(f"   ✅ Client registration successful")
            print(f"      Client ID: {registration_response.get('id', 'N/A')}")
            print(f"      Phone Number: {registration_response.get('phone_number', 'N/A')}")
            print(f"      Email: {registration_response.get('email', 'N/A')}")
            print(f"      Role: {registration_response.get('role', 'N/A')}")
        else:
            print("❌ Client registration failed")
        
        registered_client_id = registration_response.get('id') if success else None
        
        # Step 2: Test Client Login with Phone Number
        print("\n🔍 Step 2: Testing client login with phone number...")
        
        client_login_data = {
            "phone_number": test_client_data["phone_number"],
            "password": test_client_data["password"]
        }
        
        success, login_response = self.run_test(
            "Client Login (Phone-based)",
            "POST", 
            "auth/login/client",
            200,
            data=client_login_data
        )
        
        client_login_success = success
        if success:
            print(f"   ✅ Client login successful")
            print(f"      Access Token: {login_response.get('access_token', 'N/A')[:20]}...")
            print(f"      Token Type: {login_response.get('token_type', 'N/A')}")
            
            client_user_info = login_response.get('user', {})
            print(f"      User ID: {client_user_info.get('id', 'N/A')}")
            print(f"      Phone Number: {client_user_info.get('phone_number', 'N/A')}")
            print(f"      Role: {client_user_info.get('role', 'N/A')}")
        else:
            print("❌ Client login failed")
        
        client_token = login_response.get('access_token') if success else None
        
        # Step 3: Test Admin Login (Email-based - should still work)
        print("\n🔍 Step 3: Testing admin login with email...")
        
        success, admin_login_response = self.run_test(
            "Admin Login (Email-based)",
            "POST",
            "auth/login/admin", 
            200,
            data=admin_credentials
        )
        
        admin_login_success = success
        if success:
            print(f"   ✅ Admin login successful")
            print(f"      Access Token: {admin_login_response.get('access_token', 'N/A')[:20]}...")
            
            admin_user_info = admin_login_response.get('user', {})
            print(f"      User ID: {admin_user_info.get('id', 'N/A')}")
            print(f"      Email: {admin_user_info.get('email', 'N/A')}")
            print(f"      Role: {admin_user_info.get('role', 'N/A')}")
        else:
            print("❌ Admin login failed")
        
        admin_token = admin_login_response.get('access_token') if success else None
        
        # Step 4: Test Admin Client Creation
        print("\n🔍 Step 4: Testing admin client creation...")
        
        admin_created_client_data = {
            "phone_number": "9876543210",
            "first_name": "Admin",
            "last_name": "Created",
            "password": "admincreated123",
            "email": "admincreated@example.com"
        }
        
        admin_create_success = False
        if admin_token:
            admin_headers = {'Authorization': f'Bearer {admin_token}'}
            
            success, admin_create_response = self.run_test(
                "Admin Client Creation",
                "POST",
                "admin/clients/create",
                200,
                data=admin_created_client_data,
                headers=admin_headers
            )
            
            admin_create_success = success
            if success:
                print(f"   ✅ Admin client creation successful")
                print(f"      Client ID: {admin_create_response.get('id', 'N/A')}")
                print(f"      Phone Number: {admin_create_response.get('phone_number', 'N/A')}")
                print(f"      Email: {admin_create_response.get('email', 'N/A')}")
                print(f"      Role: {admin_create_response.get('role', 'N/A')}")
            else:
                print("❌ Admin client creation failed")
        else:
            print("❌ No admin token available for client creation test")
        
        # Step 5: Test Password Validation (must be more than 6 characters)
        print("\n🔍 Step 5: Testing password validation...")
        
        short_password_data = {
            "phone_number": "5555555555",
            "first_name": "Short",
            "last_name": "Password",
            "password": "123456"  # Exactly 6 characters - should fail
        }
        
        success, validation_response = self.run_test(
            "Password Validation Test (Short Password)",
            "POST",
            "auth/register/client",
            422,  # Should return validation error
            data=short_password_data
        )
        
        password_validation_success = success
        if success:
            print(f"   ✅ Short password properly rejected")
            print(f"      Error: {validation_response.get('detail', 'No detail')}")
        else:
            print(f"   ❌ Short password was not properly rejected")
        
        # Step 6: Test Phone Number Uniqueness
        print("\n🔍 Step 6: Testing phone number uniqueness...")
        
        duplicate_phone_data = {
            "phone_number": test_client_data["phone_number"],  # Same as first registration
            "first_name": "Duplicate",
            "last_name": "Phone",
            "password": "duplicatephone123"
        }
        
        success, duplicate_response = self.run_test(
            "Phone Number Uniqueness Test",
            "POST",
            "auth/register/client",
            400,  # Should return bad request
            data=duplicate_phone_data
        )
        
        phone_uniqueness_success = success
        if success:
            print(f"   ✅ Duplicate phone number properly rejected")
            print(f"      Error: {duplicate_response.get('detail', 'No detail')}")
        else:
            print(f"   ❌ Duplicate phone number was not properly rejected")
        
        # Step 7: Test JWT Token Functionality
        print("\n🔍 Step 7: Testing JWT token functionality...")
        
        jwt_functionality_success = False
        if client_token:
            client_headers = {'Authorization': f'Bearer {client_token}'}
            
            success, profile_response = self.run_test(
                "Client Profile Access with JWT",
                "GET",
                "profile/me",
                200,
                headers=client_headers
            )
            
            jwt_functionality_success = success
            if success:
                print(f"   ✅ Client JWT token working correctly")
                print(f"      Profile ID: {profile_response.get('id', 'N/A')}")
            else:
                print(f"   ❌ Client JWT token not working")
        else:
            print(f"   ❌ No client token available for JWT testing")
        
        # Calculate overall results
        tests_results = [
            registration_success,
            client_login_success,
            admin_login_success,
            admin_create_success,
            password_validation_success,
            phone_uniqueness_success,
            jwt_functionality_success
        ]
        
        print(f"\n📊 PHONE-BASED AUTHENTICATION TEST SUMMARY:")
        print(f"   ✅ Client Registration (Phone): {'PASS' if tests_results[0] else 'FAIL'}")
        print(f"   ✅ Client Login (Phone): {'PASS' if tests_results[1] else 'FAIL'}")
        print(f"   ✅ Admin Login (Email): {'PASS' if tests_results[2] else 'FAIL'}")
        print(f"   ✅ Admin Client Creation: {'PASS' if tests_results[3] else 'FAIL'}")
        print(f"   ✅ Password Validation: {'PASS' if tests_results[4] else 'FAIL'}")
        print(f"   ✅ Phone Number Uniqueness: {'PASS' if tests_results[5] else 'FAIL'}")
        print(f"   ✅ JWT Token Functionality: {'PASS' if tests_results[6] else 'FAIL'}")
        
        overall_success = all(tests_results)
        
        if overall_success:
            print(f"\n🎉 PHONE-BASED AUTHENTICATION SYSTEM: ALL TESTS PASSED")
            print(f"   ✅ Client registration with phone number working")
            print(f"   ✅ Client login with phone number working")
            print(f"   ✅ Admin login with email still working")
            print(f"   ✅ Admin client creation working")
            print(f"   ✅ Password validation enforced (>6 characters)")
            print(f"   ✅ Phone number uniqueness enforced")
            print(f"   ✅ JWT tokens properly generated")
        else:
            print(f"\n⚠️  PHONE-BASED AUTHENTICATION SYSTEM: SOME TESTS FAILED")
            print(f"   ⚠️  Review failed tests above for issues that need attention")
        
        return overall_success

def main():
    print("🚀 Phone-Based Authentication System Tests")
    print("🌐 Testing Backend URL: https://consultportal.preview.emergentagent.com/api")
    print("=" * 60)
    
    tester = PhoneAuthTester()
    
    # Run phone-based authentication tests
    phone_auth_success = tester.test_phone_based_authentication_system()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if phone_auth_success:
        print("\n🎉 ALL PHONE-BASED AUTHENTICATION TESTS PASSED!")
        print("The new phone-based client authentication system is working correctly.")
    else:
        print("\n⚠️  SOME PHONE-BASED AUTHENTICATION TESTS FAILED!")
        print("Please review the failed tests above.")

if __name__ == "__main__":
    main()