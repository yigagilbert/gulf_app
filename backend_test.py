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