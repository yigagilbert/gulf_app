#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class JobPlacementAPITester:
    def __init__(self, base_url="https://consultportal.preview.emergentagent.com/api"):
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
        
        # Test /api/admin/clients - Client List
        success1, clients_response = self.run_test(
            "GET Admin Clients List",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        if not success1:
            return False
            
        # Verify client list structure
        if isinstance(clients_response, list):
            print(f"   ✅ Client list returned {len(clients_response)} clients")
            if len(clients_response) > 0:
                client = clients_response[0]
                expected_fields = ['id', 'user_email', 'first_name', 'last_name', 'status', 'created_at']
                missing_fields = [field for field in expected_fields if field not in client]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in client list response: {missing_fields}")
                else:
                    print(f"   ✅ Client list structure is correct")
        else:
            print(f"   ❌ Expected list, got {type(clients_response)}")
            
        # Test specific client ID from review request
        specific_client_id = "a434d812-1c6a-4e3d-945a-8153c7088c51"
        success2, client_details = self.run_test(
            f"GET Specific Client Details ({specific_client_id})",
            "GET",
            f"admin/clients/{specific_client_id}",
            200,  # Expecting 200 if client exists, 404 if not
            headers=headers
        )
        
        # If specific client doesn't exist, test with first available client
        if not success2 and isinstance(clients_response, list) and len(clients_response) > 0:
            first_client_id = clients_response[0]['id']
            print(f"   ℹ️  Specific client not found, testing with available client: {first_client_id}")
            success2, client_details = self.run_test(
                f"GET Available Client Details ({first_client_id})",
                "GET",
                f"admin/clients/{first_client_id}",
                200,
                headers=headers
            )
            
        # Verify client details structure
        if success2 and isinstance(client_details, dict):
            expected_detail_fields = [
                'id', 'user_id', 'first_name', 'last_name', 'status', 
                'created_at', 'updated_at'
            ]
            missing_detail_fields = [field for field in expected_detail_fields if field not in client_details]
            if missing_detail_fields:
                print(f"   ⚠️  Missing fields in client details response: {missing_detail_fields}")
            else:
                print(f"   ✅ Client details structure is correct")
                print(f"   ✅ Client status: {client_details.get('status', 'Unknown')}")
        
        return success1 and success2

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
            403  # FastAPI returns 403 for missing token
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

    def test_admin_client_filtering(self):
        """Test admin client list filtering to ensure admin users are excluded"""
        print("\n🔒 ADMIN CLIENT LIST FILTERING TESTS")
        print("-" * 50)
        
        if not self.admin_token:
            print("❌ No admin token available for admin client filtering tests")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test 1: Get client list and verify admin exclusion
        print("🔍 Testing admin client list filtering...")
        success1, clients_list = self.run_test(
            "Admin Client List - Filtering Test",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        if not success1:
            print("❌ Admin client list endpoint failed")
            return False
            
        # Validate client list structure
        if not isinstance(clients_list, list):
            print(f"❌ Expected list, got {type(clients_list)}")
            return False
            
        print(f"✅ Client list endpoint working - Found {len(clients_list)} clients")
        
        # Test 2: Verify admin users are NOT in the client list
        print("🔍 Checking if admin users are excluded from client list...")
        admin_emails_found = []
        client_emails = []
        
        for client in clients_list:
            user_email = client.get('user_email', '')
            client_emails.append(user_email)
            
            # Check if this is an admin email (admin@example.com or similar admin patterns)
            if 'admin' in user_email.lower() or user_email == 'admin@example.com':
                admin_emails_found.append(user_email)
        
        if admin_emails_found:
            print(f"❌ CRITICAL: Admin users found in client list: {admin_emails_found}")
            print("   This violates the filtering requirement!")
            return False
        else:
            print("✅ PASS: No admin users found in client list - filtering working correctly")
        
        # Test 3: Verify legitimate clients are still returned
        print("🔍 Verifying legitimate clients are properly returned...")
        if len(clients_list) == 0:
            print("⚠️  WARNING: No clients found in the list - this might indicate over-filtering")
        else:
            print(f"✅ Found {len(clients_list)} legitimate clients in the list")
            
            # Sample a few client emails to verify they look legitimate
            sample_clients = clients_list[:3]  # First 3 clients
            for i, client in enumerate(sample_clients):
                email = client.get('user_email', 'N/A')
                name = f"{client.get('first_name', '')} {client.get('last_name', '')}"
                print(f"   Client {i+1}: {email} - {name.strip()}")
        
        # Test 4: Verify client count accuracy
        print("🔍 Verifying client count accuracy...")
        total_clients = len(clients_list)
        print(f"✅ Total client count: {total_clients} (excluding admin users)")
        
        # Test 5: Verify all returned clients have proper structure
        print("🔍 Validating client data structure...")
        structure_valid = True
        
        for i, client in enumerate(clients_list):
            required_fields = ['id', 'user_email', 'first_name', 'last_name', 'status', 'created_at']
            missing_fields = [field for field in required_fields if field not in client]
            
            if missing_fields:
                print(f"❌ Client {i+1} missing fields: {missing_fields}")
                structure_valid = False
        
        if structure_valid:
            print("✅ All clients have proper data structure")
        
        # Test 6: Specific check for admin@example.com exclusion
        print("🔍 Specific check: Ensuring admin@example.com is NOT in client list...")
        admin_email_in_list = any(
            client.get('user_email', '').lower() == 'admin@example.com' 
            for client in clients_list
        )
        
        if admin_email_in_list:
            print("❌ CRITICAL FAILURE: admin@example.com found in client list!")
            return False
        else:
            print("✅ PASS: admin@example.com correctly excluded from client list")
        
        return success1 and structure_valid and not admin_emails_found and not admin_email_in_list

    def test_gulf_consultants_admin_client_details(self):
        """Test Gulf Consultants admin client details functionality specifically"""
        print("\n🏢 GULF CONSULTANTS ADMIN CLIENT DETAILS TESTS")
        print("-" * 50)
        
        if not self.admin_token:
            print("❌ No admin token available for Gulf Consultants admin tests")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test 1: Admin client list endpoint
        print("🔍 Testing admin client list endpoint...")
        success1, clients_list = self.run_test(
            "Admin Client List",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        if not success1:
            print("❌ Admin client list endpoint failed")
            return False
            
        # Validate client list structure
        if not isinstance(clients_list, list):
            print(f"❌ Expected list, got {type(clients_list)}")
            return False
            
        print(f"✅ Client list endpoint working - Found {len(clients_list)} clients")
        
        # Test 2: Individual client details with specific ID from review
        specific_client_id = "a434d812-1c6a-4e3d-945a-8153c7088c51"
        print(f"🔍 Testing specific client details for ID: {specific_client_id}")
        
        success2, specific_client = self.run_test(
            f"Specific Client Details",
            "GET",
            f"admin/clients/{specific_client_id}",
            200,  # Will be 404 if client doesn't exist
            headers=headers
        )
        
        # Test 3: If specific client doesn't exist, test with available client
        test_client_id = None
        test_client_details = None
        
        if success2:
            test_client_id = specific_client_id
            test_client_details = specific_client
            print(f"✅ Specific client {specific_client_id} found and accessible")
        elif len(clients_list) > 0:
            # Use first available client for testing
            test_client_id = clients_list[0]['id']
            print(f"ℹ️  Specific client not found, testing with available client: {test_client_id}")
            
            success2, test_client_details = self.run_test(
                f"Available Client Details",
                "GET",
                f"admin/clients/{test_client_id}",
                200,
                headers=headers
            )
        
        if not success2:
            print("❌ Could not retrieve any client details")
            return False
            
        # Test 4: Validate client data structure for frontend consumption
        print("🔍 Validating client data structure for frontend...")
        
        # Check client list item structure
        if len(clients_list) > 0:
            list_item = clients_list[0]
            required_list_fields = ['id', 'user_email', 'first_name', 'last_name', 'status', 'created_at']
            missing_list_fields = [field for field in required_list_fields if field not in list_item]
            
            if missing_list_fields:
                print(f"⚠️  Client list missing fields: {missing_list_fields}")
            else:
                print("✅ Client list structure is correct for frontend")
                
        # Check client details structure
        if test_client_details:
            required_detail_fields = [
                'id', 'user_id', 'first_name', 'last_name', 'status', 
                'created_at', 'updated_at'
            ]
            missing_detail_fields = [field for field in required_detail_fields if field not in test_client_details]
            
            if missing_detail_fields:
                print(f"⚠️  Client details missing fields: {missing_detail_fields}")
            else:
                print("✅ Client details structure is correct for frontend")
                
            # Print sample client data for verification
            print(f"📋 Sample client data:")
            print(f"   ID: {test_client_details.get('id', 'N/A')}")
            print(f"   Name: {test_client_details.get('first_name', '')} {test_client_details.get('last_name', '')}")
            print(f"   Status: {test_client_details.get('status', 'N/A')}")
            print(f"   Created: {test_client_details.get('created_at', 'N/A')}")
        
        return success1 and success2

    def test_admin_document_upload_permissions(self):
        """Test admin document upload permissions - Focus on 403 Forbidden issue"""
        print("\n📄 ADMIN DOCUMENT UPLOAD PERMISSIONS TESTS")
        print("-" * 50)
        
        if not self.admin_token:
            print("❌ No admin token available for document upload tests")
            return False
        
        # Get client list first to find a valid client ID
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, clients_list = self.run_test(
            "Get Clients for Document Upload Test",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        if not success or not clients_list:
            print("❌ Could not retrieve client list for document upload test")
            return False
        
        # Test with specific client ID from review request
        specific_client_id = "a434d812-1c6a-4e3d-945a-8153c7088c51"
        test_client_id = specific_client_id
        
        # Check if specific client exists, otherwise use first available
        client_exists = any(client.get('id') == specific_client_id for client in clients_list)
        if not client_exists and clients_list:
            test_client_id = clients_list[0]['id']
            print(f"ℹ️  Using available client ID: {test_client_id}")
        else:
            print(f"🔍 Testing with specific client ID: {test_client_id}")
        
        # Test 1: Admin authentication verification
        print("🔍 Testing admin authentication for document upload...")
        
        # Create a simple test file content
        test_file_content = b"This is a test PDF document content for admin upload testing."
        
        # Test with multipart/form-data (simulating file upload)
        import requests
        
        url = f"{self.base_url}/admin/clients/{test_client_id}/documents/upload"
        
        # Prepare files and data for multipart upload
        files = {
            'file': ('test_document.pdf', test_file_content, 'application/pdf')
        }
        data = {
            'document_type': 'passport'
        }
        
        print(f"   URL: POST {url}")
        print(f"   Client ID: {test_client_id}")
        print(f"   Admin Token: {self.admin_token[:20]}...")
        
        try:
            # Test admin document upload
            response = requests.post(
                url,
                files=files,
                data=data,
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Admin document upload successful")
                try:
                    response_data = response.json()
                    print(f"   Document ID: {response_data.get('id', 'N/A')}")
                    print(f"   Document Type: {response_data.get('document_type', 'N/A')}")
                    upload_success = True
                except:
                    print(f"   Response: {response.text}")
                    upload_success = True
            elif response.status_code == 403:
                print("❌ CRITICAL: 403 Forbidden - Admin permission denied!")
                try:
                    error_data = response.json()
                    print(f"   Error Detail: {error_data.get('detail', 'No detail provided')}")
                except:
                    print(f"   Error Response: {response.text}")
                upload_success = False
            elif response.status_code == 404:
                print("⚠️  Client not found - trying with different client")
                if clients_list and len(clients_list) > 1:
                    # Try with second client
                    alt_client_id = clients_list[1]['id']
                    alt_url = f"{self.base_url}/admin/clients/{alt_client_id}/documents/upload"
                    alt_response = requests.post(
                        alt_url,
                        files=files,
                        data=data,
                        headers={'Authorization': f'Bearer {self.admin_token}'}
                    )
                    print(f"   Alternative client test - Status: {alt_response.status_code}")
                    upload_success = alt_response.status_code == 200
                else:
                    upload_success = False
            else:
                print(f"❌ Unexpected status code: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text}")
                upload_success = False
                
        except Exception as e:
            print(f"❌ Request failed with error: {str(e)}")
            upload_success = False
        
        # Test 2: Verify admin role and token validity
        print("🔍 Testing admin role verification...")
        
        # Test admin profile access to verify token is valid
        profile_success, profile_data = self.run_test(
            "Admin Token Validation via Profile",
            "GET",
            "profile/me",
            200,
            headers=headers
        )
        
        if profile_success:
            print("✅ Admin token is valid and working")
            # Since profile/me returns ClientProfile, we need to check the admin role differently
            # Let's test admin access to admin endpoints to verify role
            admin_test_success, admin_test_data = self.run_test(
                "Admin Role Verification via Admin Endpoint",
                "GET",
                "admin/clients",
                200,
                headers=headers
            )
            
            if admin_test_success:
                print("✅ Admin role confirmed - can access admin endpoints")
                role_valid = True
            else:
                print("❌ Admin role verification failed - cannot access admin endpoints")
                role_valid = False
        else:
            print("❌ Admin token validation failed")
            role_valid = False
        
        # Test 3: Test with invalid token to ensure endpoint security
        print("🔍 Testing document upload with invalid token...")
        
        invalid_headers = {'Authorization': 'Bearer invalid_token_here'}
        try:
            invalid_response = requests.post(
                url,
                files=files,
                data=data,
                headers=invalid_headers
            )
            
            if invalid_response.status_code == 401:
                print("✅ Invalid token properly rejected (401)")
                security_test = True
            elif invalid_response.status_code == 403:
                print("✅ Invalid token properly rejected (403)")
                security_test = True
            else:
                print(f"⚠️  Unexpected response for invalid token: {invalid_response.status_code}")
                security_test = False
                
        except Exception as e:
            print(f"⚠️  Security test failed: {str(e)}")
            security_test = False
        
        # Test 4: Test without token
        print("🔍 Testing document upload without token...")
        
        try:
            no_token_response = requests.post(
                url,
                files=files,
                data=data
            )
            
            if no_token_response.status_code in [401, 403]:
                print("✅ No token properly rejected")
                no_token_test = True
            else:
                print(f"⚠️  Unexpected response for no token: {no_token_response.status_code}")
                no_token_test = False
                
        except Exception as e:
            print(f"⚠️  No token test failed: {str(e)}")
            no_token_test = False
        
        # Summary
        print("\n📋 DOCUMENT UPLOAD PERMISSIONS TEST SUMMARY:")
        print(f"   ✅ Admin Upload Success: {'PASS' if upload_success else 'FAIL'}")
        print(f"   ✅ Admin Role Valid: {'PASS' if role_valid else 'FAIL'}")
        print(f"   ✅ Security (Invalid Token): {'PASS' if security_test else 'FAIL'}")
        print(f"   ✅ Security (No Token): {'PASS' if no_token_test else 'FAIL'}")
        
        # Critical issue detection
        if not upload_success and role_valid:
            print("\n🚨 CRITICAL ISSUE DETECTED:")
            print("   - Admin has valid token and correct role")
            print("   - But document upload is failing with 403 Forbidden")
            print("   - This indicates a permission issue in the get_admin_user dependency")
            print("   - or in the admin document upload endpoint implementation")
        
    def test_frontend_403_issue_reproduction(self):
        """Reproduce the specific 403 Forbidden issue from frontend"""
        print("\n🚨 FRONTEND 403 FORBIDDEN ISSUE REPRODUCTION")
        print("-" * 50)
        
        if not self.admin_token:
            print("❌ No admin token available for 403 issue reproduction")
            return False
        
        # Test multiple requests to the same endpoint to see if it's intermittent
        specific_client_id = "a434d812-1c6a-4e3d-945a-8153c7088c51"
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        print(f"🔍 Testing multiple requests to reproduce 403 Forbidden issue...")
        print(f"   Client ID: {specific_client_id}")
        print(f"   Admin Token: {self.admin_token[:20]}...")
        
        # Create test file content
        test_file_content = b"Test document content for 403 issue reproduction"
        
        import requests
        
        url = f"{self.base_url}/admin/clients/{specific_client_id}/documents/upload"
        
        files = {
            'file': ('test_document.pdf', test_file_content, 'application/pdf')
        }
        data = {
            'document_type': 'cv'
        }
        
        # Test multiple requests to see if there's inconsistency
        results = []
        for i in range(5):
            try:
                print(f"   Request {i+1}/5...")
                response = requests.post(
                    url,
                    files=files,
                    data=data,
                    headers=headers
                )
                
                status = response.status_code
                results.append(status)
                
                if status == 200:
                    print(f"   ✅ Request {i+1}: SUCCESS (200)")
                elif status == 403:
                    print(f"   ❌ Request {i+1}: FORBIDDEN (403)")
                    try:
                        error_data = response.json()
                        print(f"      Error: {error_data.get('detail', 'No detail')}")
                    except:
                        print(f"      Raw response: {response.text}")
                else:
                    print(f"   ⚠️  Request {i+1}: UNEXPECTED ({status})")
                    
            except Exception as e:
                print(f"   ❌ Request {i+1}: ERROR - {str(e)}")
                results.append(0)  # Error code
        
        # Analyze results
        success_count = results.count(200)
        forbidden_count = results.count(403)
        error_count = len([r for r in results if r not in [200, 403]])
        
        print(f"\n📊 RESULTS ANALYSIS:")
        print(f"   ✅ Successful (200): {success_count}/5")
        print(f"   ❌ Forbidden (403): {forbidden_count}/5")
        print(f"   ⚠️  Other/Errors: {error_count}/5")
        
        # Check for intermittent issues
        if forbidden_count > 0 and success_count > 0:
            print(f"\n🚨 INTERMITTENT ISSUE DETECTED!")
            print(f"   - Same endpoint returns both 200 and 403")
            print(f"   - This suggests a race condition or token validation issue")
            print(f"   - Frontend issue is likely due to this inconsistency")
            intermittent_issue = True
        elif forbidden_count > 0:
            print(f"\n🚨 CONSISTENT 403 FORBIDDEN ISSUE!")
            print(f"   - All requests are being rejected")
            print(f"   - This suggests a permission or authentication issue")
            intermittent_issue = False
        else:
            print(f"\n✅ NO 403 ISSUES DETECTED")
            print(f"   - All requests successful")
            print(f"   - Frontend issue may be resolved or environment-specific")
            intermittent_issue = False
        
        # Test with different document types to see if it's type-specific
        print(f"\n🔍 Testing different document types...")
        
        document_types = ['passport', 'cv', 'certificate', 'other']
        type_results = {}
        
        for doc_type in document_types:
            try:
                type_data = {'document_type': doc_type}
                type_files = {
                    'file': (f'test_{doc_type}.pdf', test_file_content, 'application/pdf')
                }
                
                response = requests.post(
                    url,
                    files=type_files,
                    data=type_data,
                    headers=headers
                )
                
                type_results[doc_type] = response.status_code
                
                if response.status_code == 200:
                    print(f"   ✅ {doc_type}: SUCCESS (200)")
                elif response.status_code == 403:
                    print(f"   ❌ {doc_type}: FORBIDDEN (403)")
                else:
                    print(f"   ⚠️  {doc_type}: {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ {doc_type}: ERROR - {str(e)}")
                type_results[doc_type] = 0
        
        # Check if issue is document-type specific
        forbidden_types = [t for t, s in type_results.items() if s == 403]
        if forbidden_types:
            print(f"\n⚠️  Document types with 403 errors: {forbidden_types}")
        
        return success_count > 0 and forbidden_count == 0

    def test_gulf_consultants_status_management(self):
        """Test Gulf Consultants client status management system"""
        print("\n🏢 GULF CONSULTANTS CLIENT STATUS MANAGEMENT TESTS")
        print("-" * 60)
        
        if not self.admin_token:
            print("❌ No admin token available for status management tests")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Step 1: Get client list to find a test client
        print("🔍 Step 1: Getting client list to find test client...")
        success, clients_list = self.run_test(
            "Get Client List for Status Testing",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        if not success or not clients_list:
            print("❌ Could not retrieve client list for status testing")
            return False
        
        # Find a client to test with (prefer specific client ID from review request)
        test_client_id = None
        specific_client_id = "a434d812-1c6a-4e3d-945a-8153c7088c51"
        
        # Check if specific client exists
        for client in clients_list:
            if client.get('id') == specific_client_id:
                test_client_id = specific_client_id
                print(f"✅ Found specific client from review request: {test_client_id}")
                break
        
        # If specific client not found, use first available client
        if not test_client_id and clients_list:
            test_client_id = clients_list[0]['id']
            print(f"ℹ️  Using first available client: {test_client_id}")
        
        if not test_client_id:
            print("❌ No clients available for status testing")
            return False
        
        # Step 2: Get initial client status
        print(f"\n🔍 Step 2: Getting initial status for client {test_client_id}...")
        success, client_details = self.run_test(
            "Get Initial Client Status",
            "GET",
            f"admin/clients/{test_client_id}",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Could not retrieve client details")
            return False
        
        initial_status = client_details.get('status', 'unknown')
        print(f"   Initial Status: {initial_status}")
        
        # Step 3: Test status workflow transitions
        print(f"\n🔍 Step 3: Testing status workflow transitions...")
        
        # Define the status workflow to test
        status_transitions = [
            ("new", "Update client to 'new' status"),
            ("verified", "Update client to 'verified' status"),
            ("traveled", "Update client to 'traveled' status"),
            ("returned", "Update client to 'returned' status")
        ]
        
        transition_results = []
        
        for new_status, description in status_transitions:
            print(f"\n   🔄 Testing: {description}")
            
            success, response = self.run_test(
                f"Status Update: {new_status}",
                "PUT",
                f"admin/clients/{test_client_id}/status",
                200,
                data={"status": new_status},
                headers=headers
            )
            
            if success:
                print(f"   ✅ Successfully updated to '{new_status}'")
                print(f"      Response: {response.get('message', 'No message')}")
                print(f"      Updated by: {response.get('updated_by', 'Unknown')}")
                transition_results.append(True)
                
                # Verify the status was actually updated
                verify_success, verify_details = self.run_test(
                    f"Verify Status Update: {new_status}",
                    "GET",
                    f"admin/clients/{test_client_id}",
                    200,
                    headers=headers
                )
                
                if verify_success:
                    actual_status = verify_details.get('status')
                    if actual_status == new_status:
                        print(f"   ✅ Status verification successful: {actual_status}")
                    else:
                        print(f"   ❌ Status verification failed: expected '{new_status}', got '{actual_status}'")
                        transition_results[-1] = False
                else:
                    print(f"   ❌ Could not verify status update")
                    transition_results[-1] = False
            else:
                print(f"   ❌ Failed to update to '{new_status}'")
                transition_results.append(False)
        
        # Step 4: Test invalid status rejection
        print(f"\n🔍 Step 4: Testing invalid status rejection...")
        
        invalid_statuses = ["invalid_status", "pending", "completed", "cancelled", ""]
        invalid_status_results = []
        
        for invalid_status in invalid_statuses:
            print(f"\n   🚫 Testing invalid status: '{invalid_status}'")
            
            success, response = self.run_test(
                f"Invalid Status Test: {invalid_status}",
                "PUT",
                f"admin/clients/{test_client_id}/status",
                400,  # Should return 400 Bad Request
                data={"status": invalid_status},
                headers=headers
            )
            
            if success:
                print(f"   ✅ Invalid status '{invalid_status}' properly rejected")
                print(f"      Error message: {response.get('detail', 'No detail')}")
                invalid_status_results.append(True)
            else:
                print(f"   ❌ Invalid status '{invalid_status}' was not properly rejected")
                invalid_status_results.append(False)
        
        # Step 5: Test missing status parameter
        print(f"\n🔍 Step 5: Testing missing status parameter...")
        
        success, response = self.run_test(
            "Missing Status Parameter Test",
            "PUT",
            f"admin/clients/{test_client_id}/status",
            400,  # Should return 400 Bad Request
            data={},  # Empty data
            headers=headers
        )
        
        missing_status_test = success
        if success:
            print(f"   ✅ Missing status parameter properly rejected")
            print(f"      Error message: {response.get('detail', 'No detail')}")
        else:
            print(f"   ❌ Missing status parameter was not properly rejected")
        
        # Step 6: Test non-admin access (if we have a client token)
        print(f"\n🔍 Step 6: Testing non-admin access restriction...")
        
        non_admin_test = True
        if self.client_token:
            client_headers = {'Authorization': f'Bearer {self.client_token}'}
            
            success, response = self.run_test(
                "Non-Admin Access Test",
                "PUT",
                f"admin/clients/{test_client_id}/status",
                403,  # Should return 403 Forbidden
                data={"status": "verified"},
                headers=client_headers
            )
            
            if success:
                print(f"   ✅ Non-admin access properly restricted")
                print(f"      Error message: {response.get('detail', 'No detail')}")
                non_admin_test = True
            else:
                print(f"   ❌ Non-admin access was not properly restricted")
                non_admin_test = False
        else:
            print(f"   ℹ️  No client token available for non-admin access test")
        
        # Step 7: Verify client list shows updated status
        print(f"\n🔍 Step 7: Verifying client list shows updated status...")
        
        success, updated_clients_list = self.run_test(
            "Verify Updated Status in Client List",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        client_list_test = False
        if success:
            # Find our test client in the updated list
            for client in updated_clients_list:
                if client.get('id') == test_client_id:
                    list_status = client.get('status')
                    print(f"   ✅ Client found in list with status: {list_status}")
                    client_list_test = True
                    break
            
            if not client_list_test:
                print(f"   ❌ Test client not found in updated client list")
        else:
            print(f"   ❌ Could not retrieve updated client list")
        
        # Calculate overall results
        all_transitions_passed = all(transition_results)
        all_invalid_rejected = all(invalid_status_results)
        
        print(f"\n📊 STATUS MANAGEMENT TEST SUMMARY:")
        print(f"   ✅ Status Transitions: {'PASS' if all_transitions_passed else 'FAIL'} ({sum(transition_results)}/{len(transition_results)})")
        print(f"   ✅ Invalid Status Rejection: {'PASS' if all_invalid_rejected else 'FAIL'} ({sum(invalid_status_results)}/{len(invalid_status_results)})")
        print(f"   ✅ Missing Status Rejection: {'PASS' if missing_status_test else 'FAIL'}")
        print(f"   ✅ Non-Admin Access Restriction: {'PASS' if non_admin_test else 'FAIL'}")
        print(f"   ✅ Client List Status Update: {'PASS' if client_list_test else 'FAIL'}")
        
        # Overall success
        overall_success = (
            all_transitions_passed and 
            all_invalid_rejected and 
            missing_status_test and 
            non_admin_test and 
            client_list_test
        )
        
        if overall_success:
            print(f"\n🎉 GULF CONSULTANTS STATUS MANAGEMENT: ALL TESTS PASSED")
        else:
            print(f"\n⚠️  GULF CONSULTANTS STATUS MANAGEMENT: SOME TESTS FAILED")
        
        return overall_success

    def test_gulf_consultants_client_deletion(self):
        """Test Gulf Consultants client deletion functionality"""
        print("\n🗑️  GULF CONSULTANTS CLIENT DELETION TESTS")
        print("-" * 60)
        
        if not self.admin_token:
            print("❌ No admin token available for client deletion tests")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Step 1: Get initial client list to find a test client
        print("🔍 Step 1: Getting initial client list...")
        success, initial_clients_list = self.run_test(
            "Get Initial Client List",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        if not success or not initial_clients_list:
            print("❌ Could not retrieve initial client list for deletion testing")
            return False
        
        initial_client_count = len(initial_clients_list)
        print(f"   Initial client count: {initial_client_count}")
        
        # Find a client to delete (prefer specific client ID from review request)
        test_client_id = None
        test_client_info = None
        specific_client_id = "a434d812-1c6a-4e3d-945a-8153c7088c51"
        
        # Check if specific client exists
        for client in initial_clients_list:
            if client.get('id') == specific_client_id:
                test_client_id = specific_client_id
                test_client_info = client
                print(f"✅ Found specific client from review request: {test_client_id}")
                break
        
        # If specific client not found, use first available client
        if not test_client_id and initial_clients_list:
            test_client_id = initial_clients_list[0]['id']
            test_client_info = initial_clients_list[0]
            print(f"ℹ️  Using first available client: {test_client_id}")
        
        if not test_client_id:
            print("❌ No clients available for deletion testing")
            return False
        
        client_name = f"{test_client_info.get('first_name', '')} {test_client_info.get('last_name', '')}".strip()
        client_email = test_client_info.get('user_email', 'Unknown')
        print(f"   Target client: {client_name} ({client_email})")
        
        # Step 2: Get client details before deletion
        print(f"\n🔍 Step 2: Getting client details before deletion...")
        success, client_details = self.run_test(
            "Get Client Details Before Deletion",
            "GET",
            f"admin/clients/{test_client_id}",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Could not retrieve client details before deletion")
            return False
        
        print(f"   Client status: {client_details.get('status', 'Unknown')}")
        print(f"   Client created: {client_details.get('created_at', 'Unknown')}")
        
        # Step 3: Check for associated documents (optional)
        print(f"\n🔍 Step 3: Checking for associated documents...")
        success, client_documents = self.run_test(
            "Get Client Documents Before Deletion",
            "GET",
            f"admin/clients/{test_client_id}/documents",
            200,
            headers=headers
        )
        
        if success:
            doc_count = len(client_documents) if isinstance(client_documents, list) else 0
            print(f"   Associated documents: {doc_count}")
        else:
            print("   Could not retrieve document count (may not exist)")
        
        # Step 4: Test non-admin access (403 Forbidden)
        print(f"\n🔍 Step 4: Testing non-admin access restriction...")
        
        non_admin_test = True
        if self.client_token:
            client_headers = {'Authorization': f'Bearer {self.client_token}'}
            
            success, response = self.run_test(
                "Non-Admin Client Deletion Test",
                "DELETE",
                f"admin/clients/{test_client_id}",
                403,  # Should return 403 Forbidden
                headers=client_headers
            )
            
            if success:
                print(f"   ✅ Non-admin access properly restricted (403)")
                print(f"      Error message: {response.get('detail', 'No detail')}")
                non_admin_test = True
            else:
                print(f"   ❌ Non-admin access was not properly restricted")
                non_admin_test = False
        else:
            print(f"   ℹ️  No client token available for non-admin access test")
        
        # Step 5: Test deletion of non-existent client (404)
        print(f"\n🔍 Step 5: Testing deletion of non-existent client...")
        
        fake_client_id = "00000000-0000-0000-0000-000000000000"
        success, response = self.run_test(
            "Non-Existent Client Deletion Test",
            "DELETE",
            f"admin/clients/{fake_client_id}",
            404,  # Should return 404 Not Found
            headers=headers
        )
        
        non_existent_test = success
        if success:
            print(f"   ✅ Non-existent client deletion properly handled (404)")
            print(f"      Error message: {response.get('detail', 'No detail')}")
        else:
            print(f"   ❌ Non-existent client deletion was not properly handled")
        
        # Step 6: Perform actual client deletion
        print(f"\n🔍 Step 6: Performing actual client deletion...")
        print(f"   🚨 DELETING CLIENT: {client_name} ({client_email})")
        
        success, deletion_response = self.run_test(
            "Admin Client Deletion",
            "DELETE",
            f"admin/clients/{test_client_id}",
            200,  # Should return 200 OK
            headers=headers
        )
        
        deletion_success = success
        if success:
            print(f"   ✅ Client deletion successful")
            print(f"      Message: {deletion_response.get('message', 'No message')}")
            print(f"      Deleted by: {deletion_response.get('deleted_by', 'Unknown')}")
            print(f"      Deleted at: {deletion_response.get('deleted_at', 'Unknown')}")
            
            # Verify response format
            deleted_client_info = deletion_response.get('deleted_client', {})
            if deleted_client_info:
                print(f"      Deleted client info:")
                print(f"        ID: {deleted_client_info.get('id', 'N/A')}")
                print(f"        Name: {deleted_client_info.get('name', 'N/A')}")
                print(f"        Email: {deleted_client_info.get('email', 'N/A')}")
            
            # Validate response structure
            required_response_fields = ['message', 'deleted_client', 'deleted_by', 'deleted_at']
            missing_fields = [field for field in required_response_fields if field not in deletion_response]
            
            if missing_fields:
                print(f"   ⚠️  Missing response fields: {missing_fields}")
            else:
                print(f"   ✅ Response format is complete and correct")
        else:
            print(f"   ❌ Client deletion failed")
        
        # Step 7: Verify client no longer appears in client list
        print(f"\n🔍 Step 7: Verifying client removal from client list...")
        
        success, updated_clients_list = self.run_test(
            "Get Updated Client List After Deletion",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        client_list_verification = False
        if success:
            updated_client_count = len(updated_clients_list)
            print(f"   Updated client count: {updated_client_count}")
            
            # Check if deleted client is still in the list
            deleted_client_found = any(
                client.get('id') == test_client_id 
                for client in updated_clients_list
            )
            
            if deleted_client_found:
                print(f"   ❌ CRITICAL: Deleted client still appears in client list!")
                client_list_verification = False
            else:
                print(f"   ✅ Deleted client successfully removed from client list")
                
                # Verify count decreased by 1
                if updated_client_count == initial_client_count - 1:
                    print(f"   ✅ Client count correctly decreased by 1")
                    client_list_verification = True
                else:
                    print(f"   ⚠️  Client count mismatch: expected {initial_client_count - 1}, got {updated_client_count}")
                    client_list_verification = False
        else:
            print(f"   ❌ Could not retrieve updated client list for verification")
            client_list_verification = False
        
        # Step 8: Verify client details endpoint returns 404
        print(f"\n🔍 Step 8: Verifying deleted client details return 404...")
        
        success, response = self.run_test(
            "Deleted Client Details Verification",
            "GET",
            f"admin/clients/{test_client_id}",
            404,  # Should return 404 Not Found
            headers=headers
        )
        
        client_details_verification = success
        if success:
            print(f"   ✅ Deleted client details properly return 404")
            print(f"      Error message: {response.get('detail', 'No detail')}")
        else:
            print(f"   ❌ Deleted client details do not return 404 as expected")
        
        # Step 9: Test cascading deletion verification (documents endpoint)
        print(f"\n🔍 Step 9: Verifying cascading deletion of associated data...")
        
        success, response = self.run_test(
            "Deleted Client Documents Verification",
            "GET",
            f"admin/clients/{test_client_id}/documents",
            404,  # Should return 404 since client no longer exists
            headers=headers
        )
        
        cascading_deletion_verification = success
        if success:
            print(f"   ✅ Associated documents endpoint properly returns 404")
            print(f"      Error message: {response.get('detail', 'No detail')}")
        else:
            print(f"   ❌ Associated documents endpoint does not return 404 as expected")
        
        # Calculate overall results
        print(f"\n📊 CLIENT DELETION TEST SUMMARY:")
        print(f"   ✅ Non-Admin Access Restriction: {'PASS' if non_admin_test else 'FAIL'}")
        print(f"   ✅ Non-Existent Client Handling: {'PASS' if non_existent_test else 'FAIL'}")
        print(f"   ✅ Client Deletion Success: {'PASS' if deletion_success else 'FAIL'}")
        print(f"   ✅ Client List Removal: {'PASS' if client_list_verification else 'FAIL'}")
        print(f"   ✅ Client Details 404: {'PASS' if client_details_verification else 'FAIL'}")
        print(f"   ✅ Cascading Deletion: {'PASS' if cascading_deletion_verification else 'FAIL'}")
        
        # Overall success
        overall_success = (
            non_admin_test and 
            non_existent_test and 
            deletion_success and 
            client_list_verification and 
            client_details_verification and 
            cascading_deletion_verification
        )
        
        if overall_success:
            print(f"\n🎉 GULF CONSULTANTS CLIENT DELETION: ALL TESTS PASSED")
            print(f"   ✅ Client deletion functionality is working correctly and safely")
            print(f"   ✅ All associated data properly cleaned up")
            print(f"   ✅ Proper authentication and authorization enforced")
            print(f"   ✅ Error handling working correctly")
        else:
            print(f"\n⚠️  GULF CONSULTANTS CLIENT DELETION: SOME TESTS FAILED")
            print(f"   ⚠️  Review failed tests above for issues that need attention")
        
        return overall_success

    def test_admin_client_profile_photo_upload(self):
        """Test admin client profile photo upload endpoint"""
        print("\n📸 ADMIN CLIENT PROFILE PHOTO UPLOAD TESTS")
        print("-" * 60)
        
        if not self.admin_token:
            print("❌ No admin token available for photo upload tests")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Step 1: Get client list to find a test client
        print("🔍 Step 1: Getting client list to find test client...")
        success, clients_list = self.run_test(
            "Get Client List for Photo Upload Test",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        if not success or not clients_list:
            print("❌ Could not retrieve client list for photo upload testing")
            return False
        
        # Find a client to test with (prefer specific client ID from review request)
        test_client_id = None
        specific_client_id = "a434d812-1c6a-4e3d-945a-8153c7088c51"
        
        # Check if specific client exists
        for client in clients_list:
            if client.get('id') == specific_client_id:
                test_client_id = specific_client_id
                print(f"✅ Found specific client from review request: {test_client_id}")
                break
        
        # If specific client not found, use first available client
        if not test_client_id and clients_list:
            test_client_id = clients_list[0]['id']
            print(f"ℹ️  Using first available client: {test_client_id}")
        
        if not test_client_id:
            print("❌ No clients available for photo upload testing")
            return False
        
        # Step 2: Create a simple test image file
        print(f"\n🔍 Step 2: Creating test image file...")
        
        # Create a minimal PNG image (1x1 pixel)
        import base64
        
        # Minimal PNG image data (1x1 transparent pixel)
        png_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8'
            'IQAAAAABJRU5ErkJggg=='
        )
        
        print(f"   ✅ Created test PNG image ({len(png_data)} bytes)")
        
        # Step 3: Test valid admin photo upload
        print(f"\n🔍 Step 3: Testing valid admin photo upload...")
        
        import requests
        
        url = f"{self.base_url}/admin/clients/{test_client_id}/photo"
        
        files = {
            'file': ('test_profile_photo.png', png_data, 'image/png')
        }
        
        print(f"   URL: POST {url}")
        print(f"   Client ID: {test_client_id}")
        print(f"   Admin Token: {self.admin_token[:20]}...")
        
        try:
            response = requests.post(
                url,
                files=files,
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Admin photo upload successful")
                try:
                    response_data = response.json()
                    profile_photo_url = response_data.get('profile_photo_url')
                    message = response_data.get('message')
                    
                    print(f"   Profile Photo URL: {profile_photo_url}")
                    print(f"   Message: {message}")
                    
                    # Verify response structure
                    if profile_photo_url and message:
                        print("   ✅ Response structure is correct")
                        upload_success = True
                        uploaded_photo_url = profile_photo_url
                    else:
                        print("   ❌ Response missing required fields")
                        upload_success = False
                        uploaded_photo_url = None
                except Exception as e:
                    print(f"   ❌ Could not parse response JSON: {e}")
                    print(f"   Response: {response.text}")
                    upload_success = False
                    uploaded_photo_url = None
            else:
                print(f"❌ Photo upload failed with status {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error Detail: {error_data.get('detail', 'No detail provided')}")
                except:
                    print(f"   Error Response: {response.text}")
                upload_success = False
                uploaded_photo_url = None
                
        except Exception as e:
            print(f"❌ Photo upload request failed: {str(e)}")
            upload_success = False
            uploaded_photo_url = None
        
        # Step 4: Verify client profile is updated with new photo URL
        print(f"\n🔍 Step 4: Verifying client profile is updated with new photo URL...")
        
        if upload_success and uploaded_photo_url:
            success, updated_client = self.run_test(
                "Get Updated Client Profile",
                "GET",
                f"admin/clients/{test_client_id}",
                200,
                headers=headers
            )
            
            if success:
                client_photo_url = updated_client.get('profile_photo_url')
                if client_photo_url == uploaded_photo_url:
                    print(f"   ✅ Client profile updated with correct photo URL")
                    print(f"      Photo URL: {client_photo_url}")
                    profile_update_success = True
                else:
                    print(f"   ❌ Client profile photo URL mismatch")
                    print(f"      Expected: {uploaded_photo_url}")
                    print(f"      Actual: {client_photo_url}")
                    profile_update_success = False
            else:
                print(f"   ❌ Could not retrieve updated client profile")
                profile_update_success = False
        else:
            print(f"   ⚠️  Skipping profile update verification (upload failed)")
            profile_update_success = False
        
        # Step 5: Test with invalid client ID (404)
        print(f"\n🔍 Step 5: Testing with invalid client ID...")
        
        fake_client_id = "00000000-0000-0000-0000-000000000000"
        fake_url = f"{self.base_url}/admin/clients/{fake_client_id}/photo"
        
        try:
            response = requests.post(
                fake_url,
                files=files,
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            if response.status_code == 404:
                print("   ✅ Invalid client ID properly returns 404")
                try:
                    error_data = response.json()
                    print(f"      Error message: {error_data.get('detail', 'No detail')}")
                except:
                    print(f"      Response: {response.text}")
                invalid_client_test = True
            else:
                print(f"   ❌ Invalid client ID returned {response.status_code} instead of 404")
                invalid_client_test = False
                
        except Exception as e:
            print(f"   ❌ Invalid client ID test failed: {str(e)}")
            invalid_client_test = False
        
        # Step 6: Test with non-admin user (403)
        print(f"\n🔍 Step 6: Testing with non-admin user...")
        
        non_admin_test = True
        if self.client_token:
            client_headers = {'Authorization': f'Bearer {self.client_token}'}
            
            try:
                response = requests.post(
                    url,
                    files=files,
                    headers=client_headers
                )
                
                if response.status_code == 403:
                    print("   ✅ Non-admin user properly restricted (403)")
                    try:
                        error_data = response.json()
                        print(f"      Error message: {error_data.get('detail', 'No detail')}")
                    except:
                        print(f"      Response: {response.text}")
                    non_admin_test = True
                else:
                    print(f"   ❌ Non-admin user returned {response.status_code} instead of 403")
                    non_admin_test = False
                    
            except Exception as e:
                print(f"   ❌ Non-admin user test failed: {str(e)}")
                non_admin_test = False
        else:
            print(f"   ℹ️  No client token available for non-admin test")
        
        # Step 7: Test with invalid file type (400)
        print(f"\n🔍 Step 7: Testing with invalid file type...")
        
        # Create a text file instead of image
        invalid_files = {
            'file': ('test_document.txt', b'This is not an image file', 'text/plain')
        }
        
        try:
            response = requests.post(
                url,
                files=invalid_files,
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            if response.status_code == 400:
                print("   ✅ Invalid file type properly rejected (400)")
                try:
                    error_data = response.json()
                    print(f"      Error message: {error_data.get('detail', 'No detail')}")
                except:
                    print(f"      Response: {response.text}")
                invalid_file_test = True
            else:
                print(f"   ❌ Invalid file type returned {response.status_code} instead of 400")
                invalid_file_test = False
                
        except Exception as e:
            print(f"   ❌ Invalid file type test failed: {str(e)}")
            invalid_file_test = False
        
        # Step 8: Test old photo deletion (upload another photo)
        print(f"\n🔍 Step 8: Testing old photo deletion by uploading new photo...")
        
        if upload_success:
            # Create a different test image
            jpg_data = base64.b64decode(
                '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB'
                'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEB'
                'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIA'
                'AhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QA'
                'FQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCd'
                'AB8A'
            )
            
            new_files = {
                'file': ('new_profile_photo.jpg', jpg_data, 'image/jpeg')
            }
            
            try:
                response = requests.post(
                    url,
                    files=new_files,
                    headers={'Authorization': f'Bearer {self.admin_token}'}
                )
                
                if response.status_code == 200:
                    print("   ✅ Second photo upload successful")
                    try:
                        response_data = response.json()
                        new_photo_url = response_data.get('profile_photo_url')
                        
                        if new_photo_url and new_photo_url != uploaded_photo_url:
                            print(f"   ✅ New photo URL is different from old one")
                            print(f"      Old URL: {uploaded_photo_url}")
                            print(f"      New URL: {new_photo_url}")
                            old_photo_deletion_test = True
                        else:
                            print(f"   ⚠️  New photo URL same as old or missing")
                            old_photo_deletion_test = False
                    except Exception as e:
                        print(f"   ❌ Could not parse second upload response: {e}")
                        old_photo_deletion_test = False
                else:
                    print(f"   ❌ Second photo upload failed: {response.status_code}")
                    old_photo_deletion_test = False
                    
            except Exception as e:
                print(f"   ❌ Second photo upload test failed: {str(e)}")
                old_photo_deletion_test = False
        else:
            print(f"   ⚠️  Skipping old photo deletion test (first upload failed)")
            old_photo_deletion_test = False
        
        # Calculate overall results
        print(f"\n📊 ADMIN CLIENT PROFILE PHOTO UPLOAD TEST SUMMARY:")
        print(f"   ✅ Valid Admin Photo Upload: {'PASS' if upload_success else 'FAIL'}")
        print(f"   ✅ Client Profile Update: {'PASS' if profile_update_success else 'FAIL'}")
        print(f"   ✅ Invalid Client ID (404): {'PASS' if invalid_client_test else 'FAIL'}")
        print(f"   ✅ Non-Admin Access (403): {'PASS' if non_admin_test else 'FAIL'}")
        print(f"   ✅ Invalid File Type (400): {'PASS' if invalid_file_test else 'FAIL'}")
        print(f"   ✅ Old Photo Deletion: {'PASS' if old_photo_deletion_test else 'FAIL'}")
        
        # Overall success
        overall_success = (
            upload_success and 
            profile_update_success and 
            invalid_client_test and 
            non_admin_test and 
            invalid_file_test and 
            old_photo_deletion_test
        )
        
        if overall_success:
            print(f"\n🎉 ADMIN CLIENT PROFILE PHOTO UPLOAD: ALL TESTS PASSED")
            print(f"   ✅ Photo upload functionality working correctly")
            print(f"   ✅ Proper response structure with profile_photo_url")
            print(f"   ✅ Client profile updated with new photo URL")
            print(f"   ✅ Old photos deleted when new ones uploaded")
            print(f"   ✅ Proper error handling for all edge cases")
        else:
            print(f"\n⚠️  ADMIN CLIENT PROFILE PHOTO UPLOAD: SOME TESTS FAILED")
            print(f"   ⚠️  Review failed tests above for issues that need attention")
        
        return overall_success

    def test_comprehensive_client_profile_functionality(self):
        """Test comprehensive client profile functionality as requested in review"""
        print("\n🏢 COMPREHENSIVE CLIENT PROFILE FUNCTIONALITY TESTS")
        print("-" * 70)
        
        if not self.admin_token:
            print("❌ No admin token available for comprehensive client profile tests")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Step 1: Get client list to find a test client
        print("🔍 Step 1: Getting client list to find test client...")
        success, clients_list = self.run_test(
            "Get Client List for Comprehensive Profile Test",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        if not success or not clients_list:
            print("❌ Could not retrieve client list for comprehensive profile testing")
            return False
        
        # Find a client to test with (prefer specific client ID from review request)
        test_client_id = None
        specific_client_id = "a434d812-1c6a-4e3d-945a-8153c7088c51"
        
        # Check if specific client exists
        for client in clients_list:
            if client.get('id') == specific_client_id:
                test_client_id = specific_client_id
                print(f"✅ Found specific client from review request: {test_client_id}")
                break
        
        # If specific client not found, use first available client
        if not test_client_id and clients_list:
            test_client_id = clients_list[0]['id']
            print(f"ℹ️  Using first available client: {test_client_id}")
        
        if not test_client_id:
            print("❌ No clients available for comprehensive profile testing")
            return False
        
        # Step 2: Test Client Profile Retrieval - GET /api/admin/clients/{client_id}
        print(f"\n🔍 Step 2: Testing comprehensive client profile retrieval...")
        print(f"   Testing GET /api/admin/clients/{test_client_id}")
        
        success, client_profile = self.run_test(
            "Comprehensive Client Profile Retrieval",
            "GET",
            f"admin/clients/{test_client_id}",
            200,
            headers=headers
        )
        
        if not success:
            print("❌ Could not retrieve client profile")
            return False
        
        print(f"✅ Client profile retrieved successfully")
        
        # Step 3: Verify System-Generated Fields
        print(f"\n🔍 Step 3: Verifying system-generated fields...")
        
        system_generated_fields = ['serial_number', 'registration_number', 'registration_date']
        system_fields_present = []
        system_fields_missing = []
        
        for field in system_generated_fields:
            if field in client_profile and client_profile[field] is not None:
                system_fields_present.append(field)
                print(f"   ✅ {field}: {client_profile[field]}")
            else:
                system_fields_missing.append(field)
                print(f"   ❌ {field}: Missing or null")
        
        system_fields_test = len(system_fields_missing) == 0
        
        # Step 4: Verify New Comprehensive Field Structure
        print(f"\n🔍 Step 4: Verifying comprehensive field structure...")
        
        # Define all comprehensive field categories
        comprehensive_fields = {
            "Form Registration Details": [
                'registration_date', 'serial_number', 'registration_number'
            ],
            "Expanded Bio Data": [
                'age', 'tribe', 'contact_1', 'contact_2', 'place_of_birth', 
                'present_address', 'subcounty', 'district', 'marital_status', 
                'number_of_kids', 'height', 'weight', 'position_applied_for', 'religion'
            ],
            "Next of Kin Fields": [
                'next_of_kin_name', 'next_of_kin_contact_1', 'next_of_kin_contact_2',
                'next_of_kin_address', 'next_of_kin_subcounty', 'next_of_kin_district',
                'next_of_kin_relationship', 'next_of_kin_age'
            ],
            "Parent's Details - Father": [
                'father_name', 'father_contact_1', 'father_contact_2',
                'father_address', 'father_subcounty', 'father_district'
            ],
            "Parent's Details - Mother": [
                'mother_name', 'mother_contact_1', 'mother_contact_2',
                'mother_address', 'mother_subcounty', 'mother_district'
            ],
            "Agent Information": [
                'agent_name', 'agent_contact'
            ]
        }
        
        field_structure_results = {}
        total_fields_present = 0
        total_fields_expected = 0
        
        for category, fields in comprehensive_fields.items():
            present_fields = []
            missing_fields = []
            
            for field in fields:
                total_fields_expected += 1
                if field in client_profile:
                    present_fields.append(field)
                    total_fields_present += 1
                else:
                    missing_fields.append(field)
            
            field_structure_results[category] = {
                'present': present_fields,
                'missing': missing_fields,
                'success': len(missing_fields) == 0
            }
            
            print(f"   📋 {category}:")
            print(f"      ✅ Present: {len(present_fields)}/{len(fields)} fields")
            if missing_fields:
                print(f"      ❌ Missing: {missing_fields}")
        
        field_structure_test = total_fields_present == total_fields_expected
        print(f"\n   📊 Overall Field Structure: {total_fields_present}/{total_fields_expected} fields present")
        
        # Step 5: Test Profile Update with New Fields
        print(f"\n🔍 Step 5: Testing profile update with comprehensive fields...")
        
        # Create comprehensive update data with realistic values
        update_data = {
            # Bio Data updates
            "age": 28,
            "tribe": "Baganda",
            "contact_1": "+256701234567",
            "contact_2": "+256702345678",
            "place_of_birth": "Kampala",
            "present_address": "Plot 123, Nakawa Division",
            "subcounty": "Nakawa",
            "district": "Kampala",
            "marital_status": "Single",
            "number_of_kids": 0,
            "height": "5'8\"",
            "weight": "70kg",
            "position_applied_for": "Construction Worker",
            "religion": "Christian",
            
            # Next of Kin updates
            "next_of_kin_name": "Sarah Nakato",
            "next_of_kin_contact_1": "+256703456789",
            "next_of_kin_relationship": "Sister",
            "next_of_kin_age": 25,
            
            # Parent's Details updates
            "father_name": "John Mukasa",
            "father_contact_1": "+256704567890",
            "mother_name": "Mary Nakato",
            "mother_contact_1": "+256705678901",
            
            # Agent Information updates
            "agent_name": "Gulf Consultants Agent",
            "agent_contact": "+256706789012"
        }
        
        # Test profile update using the onboard endpoint (which handles comprehensive updates)
        success, updated_profile = self.run_test(
            "Comprehensive Profile Update",
            "PUT",
            f"admin/clients/{test_client_id}/onboard",
            200,
            data=update_data,
            headers=headers
        )
        
        profile_update_test = success
        if success:
            print(f"✅ Profile update successful")
            
            # Verify some of the updated fields
            verification_fields = ['age', 'tribe', 'contact_1', 'next_of_kin_name', 'father_name', 'agent_name']
            verified_updates = []
            failed_updates = []
            
            for field in verification_fields:
                if field in updated_profile and updated_profile[field] == update_data[field]:
                    verified_updates.append(field)
                    print(f"      ✅ {field}: {updated_profile[field]}")
                else:
                    failed_updates.append(field)
                    print(f"      ❌ {field}: Expected {update_data[field]}, got {updated_profile.get(field, 'None')}")
            
            if failed_updates:
                print(f"   ⚠️  Some field updates failed: {failed_updates}")
                profile_update_test = False
        else:
            print(f"❌ Profile update failed")
        
        # Step 6: Verify Updated Profile Retrieval
        print(f"\n🔍 Step 6: Verifying updated profile retrieval...")
        
        success, final_profile = self.run_test(
            "Verify Updated Profile Retrieval",
            "GET",
            f"admin/clients/{test_client_id}",
            200,
            headers=headers
        )
        
        final_verification_test = success
        if success:
            print(f"✅ Updated profile retrieved successfully")
            
            # Verify persistence of updates
            persistent_updates = []
            non_persistent_updates = []
            
            for field, expected_value in update_data.items():
                if field in final_profile and final_profile[field] == expected_value:
                    persistent_updates.append(field)
                else:
                    non_persistent_updates.append(field)
            
            print(f"   ✅ Persistent updates: {len(persistent_updates)}/{len(update_data)} fields")
            if non_persistent_updates:
                print(f"   ⚠️  Non-persistent updates: {non_persistent_updates[:5]}...")  # Show first 5
        else:
            print(f"❌ Could not verify updated profile")
        
        # Step 7: Test Backward Compatibility
        print(f"\n🔍 Step 7: Testing backward compatibility...")
        
        # Check that legacy fields are still present
        legacy_fields = ['first_name', 'last_name', 'status', 'created_at', 'updated_at']
        legacy_compatibility = []
        legacy_missing = []
        
        for field in legacy_fields:
            if field in client_profile:
                legacy_compatibility.append(field)
            else:
                legacy_missing.append(field)
        
        backward_compatibility_test = len(legacy_missing) == 0
        
        if backward_compatibility_test:
            print(f"   ✅ All legacy fields present: {legacy_compatibility}")
        else:
            print(f"   ❌ Missing legacy fields: {legacy_missing}")
        
        # Calculate overall results
        print(f"\n📊 COMPREHENSIVE CLIENT PROFILE TEST SUMMARY:")
        print(f"   ✅ Profile Retrieval: {'PASS' if success else 'FAIL'}")
        print(f"   ✅ System-Generated Fields: {'PASS' if system_fields_test else 'FAIL'}")
        print(f"   ✅ Comprehensive Field Structure: {'PASS' if field_structure_test else 'FAIL'}")
        print(f"   ✅ Profile Update: {'PASS' if profile_update_test else 'FAIL'}")
        print(f"   ✅ Updated Profile Verification: {'PASS' if final_verification_test else 'FAIL'}")
        print(f"   ✅ Backward Compatibility: {'PASS' if backward_compatibility_test else 'FAIL'}")
        
        # Overall success
        overall_success = (
            success and 
            system_fields_test and 
            field_structure_test and 
            profile_update_test and 
            final_verification_test and 
            backward_compatibility_test
        )
        
        if overall_success:
            print(f"\n🎉 COMPREHENSIVE CLIENT PROFILE FUNCTIONALITY: ALL TESTS PASSED")
            print(f"   ✅ Client profile retrieval working with all comprehensive fields")
            print(f"   ✅ System-generated fields (serial_number, registration_number) populated")
            print(f"   ✅ All comprehensive field categories present in response")
            print(f"   ✅ Profile updates working with new comprehensive field structure")
            print(f"   ✅ Backward compatibility maintained with existing fields")
        else:
            print(f"\n⚠️  COMPREHENSIVE CLIENT PROFILE FUNCTIONALITY: SOME TESTS FAILED")
            print(f"   ⚠️  Review failed tests above for issues that need attention")
        
        return overall_success

def main():
    print("🚀 Gulf Consultants Job Placement API Tests")
    print("🌐 Testing Backend URL: https://consultportal.preview.emergentagent.com/api")
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
    
    print("\n🔒 ADMIN CLIENT LIST FILTERING TESTS")
    print("-" * 50)
    admin_filtering_success = tester.test_admin_client_filtering()
    
    print("\n🏢 GULF CONSULTANTS ADMIN CLIENT DETAILS TESTS")
    print("-" * 50)
    gulf_admin_success = tester.test_gulf_consultants_admin_client_details()
    
    print("\n📄 ADMIN DOCUMENT UPLOAD PERMISSIONS TESTS")
    print("-" * 50)
    document_upload_success = tester.test_admin_document_upload_permissions()
    
    print("\n🚨 FRONTEND 403 FORBIDDEN ISSUE REPRODUCTION")
    print("-" * 50)
    frontend_403_success = tester.test_frontend_403_issue_reproduction()
    
    print("\n🏢 GULF CONSULTANTS CLIENT STATUS MANAGEMENT TESTS")
    print("-" * 60)
    status_management_success = tester.test_gulf_consultants_status_management()
    
    print("\n🗑️  GULF CONSULTANTS CLIENT DELETION TESTS")
    print("-" * 60)
    client_deletion_success = tester.test_gulf_consultants_client_deletion()
    
    print("\n📸 ADMIN CLIENT PROFILE PHOTO UPLOAD TESTS")
    print("-" * 60)
    photo_upload_success = tester.test_admin_client_profile_photo_upload()
    
    print("\n🏢 COMPREHENSIVE CLIENT PROFILE FUNCTIONALITY TESTS")
    print("-" * 70)
    comprehensive_profile_success = tester.test_comprehensive_client_profile_functionality()
    
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
    print(f"   ✅ Admin Client Filtering: {'PASS' if admin_filtering_success else 'FAIL'}")
    print(f"   ✅ Gulf Admin Client Details: {'PASS' if gulf_admin_success else 'FAIL'}")
    print(f"   ✅ Admin Document Upload: {'PASS' if document_upload_success else 'FAIL'}")
    print(f"   ✅ Frontend 403 Issue Test: {'PASS' if frontend_403_success else 'FAIL'}")
    print(f"   ✅ Status Management System: {'PASS' if status_management_success else 'FAIL'}")
    print(f"   ✅ Client Deletion System: {'PASS' if client_deletion_success else 'FAIL'}")
    print(f"   ✅ Admin Photo Upload System: {'PASS' if photo_upload_success else 'FAIL'}")
    
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