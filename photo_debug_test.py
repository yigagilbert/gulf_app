#!/usr/bin/env python3

import requests
import sys
import json
import base64
import os
from datetime import datetime

class PhotoUploadDebugTester:
    def __init__(self, base_url="https://consultportal.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
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
            print(f"   Admin Token: {self.admin_token[:20]}...")
        return success

    def test_photo_upload_debug_investigation(self):
        """Debug investigation for photo upload and serving issue"""
        print("\n🔍 PHOTO UPLOAD DEBUG INVESTIGATION")
        print("-" * 60)
        
        if not self.admin_token:
            print("❌ No admin token available for photo upload debug")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Step 1: Get client list to find a test client
        print("🔍 Step 1: Getting client list to find test client...")
        success, clients_list = self.run_test(
            "Get Client List for Photo Debug",
            "GET",
            "admin/clients",
            200,
            headers=headers
        )
        
        if not success or not clients_list:
            print("❌ Could not retrieve client list for photo debug")
            return False
        
        # Find a client to test with
        test_client_id = None
        if clients_list:
            test_client_id = clients_list[0]['id']
            client_name = f"{clients_list[0].get('first_name', '')} {clients_list[0].get('last_name', '')}".strip()
            print(f"✅ Using client: {client_name} (ID: {test_client_id})")
        
        if not test_client_id:
            print("❌ No clients available for photo debug")
            return False
        
        # Step 2: Check existing profile photo URL
        print(f"\n🔍 Step 2: Checking existing profile photo URL...")
        success, client_details = self.run_test(
            "Get Client Profile Before Upload",
            "GET",
            f"admin/clients/{test_client_id}",
            200,
            headers=headers
        )
        
        if success:
            existing_photo_url = client_details.get('profile_photo_url')
            print(f"   Existing photo URL: {existing_photo_url}")
        else:
            print("❌ Could not get client profile")
            return False
        
        # Step 3: Upload a test photo and capture exact response
        print(f"\n🔍 Step 3: Uploading test photo and capturing response...")
        
        # Create a minimal PNG image (1x1 pixel)
        png_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8'
            'IQAAAAABJRU5ErkJggg=='
        )
        
        url = f"{self.base_url}/admin/clients/{test_client_id}/photo"
        files = {'file': ('test_debug_photo.png', png_data, 'image/png')}
        
        print(f"   Upload URL: {url}")
        
        try:
            response = requests.post(
                url,
                files=files,
                headers={'Authorization': f'Bearer {self.admin_token}'}
            )
            
            print(f"   Upload Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Photo upload successful")
                try:
                    upload_response = response.json()
                    print(f"   📋 EXACT UPLOAD RESPONSE:")
                    print(f"      profile_photo_url: {upload_response.get('profile_photo_url')}")
                    print(f"      message: {upload_response.get('message')}")
                    
                    uploaded_photo_url = upload_response.get('profile_photo_url')
                    upload_success = True
                except Exception as e:
                    print(f"   ❌ Could not parse upload response: {e}")
                    print(f"   Raw response: {response.text}")
                    upload_success = False
                    uploaded_photo_url = None
            else:
                print(f"❌ Photo upload failed: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw error: {response.text}")
                upload_success = False
                uploaded_photo_url = None
                
        except Exception as e:
            print(f"❌ Upload request failed: {e}")
            upload_success = False
            uploaded_photo_url = None
        
        if not upload_success:
            return False
        
        # Step 4: Verify client profile was updated with photo URL
        print(f"\n🔍 Step 4: Verifying client profile update...")
        success, updated_client_details = self.run_test(
            "Get Client Profile After Upload",
            "GET",
            f"admin/clients/{test_client_id}",
            200,
            headers=headers
        )
        
        if success:
            profile_photo_url = updated_client_details.get('profile_photo_url')
            print(f"   📋 CLIENT PROFILE PHOTO URL: {profile_photo_url}")
            
            if profile_photo_url == uploaded_photo_url:
                print("✅ Client profile correctly updated with photo URL")
                profile_update_success = True
            else:
                print(f"❌ Profile photo URL mismatch!")
                print(f"   Expected: {uploaded_photo_url}")
                print(f"   Got: {profile_photo_url}")
                profile_update_success = False
        else:
            print("❌ Could not get updated client profile")
            profile_update_success = False
        
        # Step 5: Test static file serving - try accessing photo URL directly
        print(f"\n🔍 Step 5: Testing static file serving...")
        
        if uploaded_photo_url:
            # Construct full URL for photo access
            if uploaded_photo_url.startswith('/'):
                # Remove /api prefix if present and construct full URL
                photo_access_url = f"{self.base_url.replace('/api', '')}{uploaded_photo_url}"
            else:
                photo_access_url = uploaded_photo_url
            
            print(f"   Photo access URL: {photo_access_url}")
            
            try:
                photo_response = requests.get(photo_access_url)
                print(f"   Photo access status: {photo_response.status_code}")
                print(f"   Content-Type: {photo_response.headers.get('content-type', 'Unknown')}")
                print(f"   Content-Length: {photo_response.headers.get('content-length', 'Unknown')}")
                
                if photo_response.status_code == 200:
                    print("✅ Photo is accessible via static file serving")
                    static_serving_success = True
                else:
                    print(f"❌ Photo not accessible: {photo_response.status_code}")
                    try:
                        error_data = photo_response.json()
                        print(f"   Error: {error_data}")
                    except:
                        print(f"   Raw response: {photo_response.text[:200]}")
                    static_serving_success = False
                    
            except Exception as e:
                print(f"❌ Photo access request failed: {e}")
                static_serving_success = False
        else:
            print("❌ No photo URL to test")
            static_serving_success = False
        
        # Step 6: Check URL format compatibility
        print(f"\n🔍 Step 6: Analyzing URL format...")
        
        if uploaded_photo_url:
            print(f"   📋 URL FORMAT ANALYSIS:")
            print(f"      Returned URL: {uploaded_photo_url}")
            print(f"      Starts with '/': {uploaded_photo_url.startswith('/')}")
            print(f"      Contains '/uploads/': {'/uploads/' in uploaded_photo_url}")
            print(f"      Contains '/profile_photos/': {'/profile_photos/' in uploaded_photo_url}")
            
            # Check if URL matches expected pattern
            expected_pattern = "/uploads/profile_photos/"
            if expected_pattern in uploaded_photo_url:
                print("✅ URL format matches expected pattern")
                url_format_correct = True
            else:
                print(f"❌ URL format doesn't match expected pattern: {expected_pattern}")
                url_format_correct = False
        else:
            print("❌ No URL to analyze")
            url_format_correct = False
        
        # Step 7: Check if the uploaded file exists on filesystem
        print(f"\n🔍 Step 7: Checking filesystem...")
        
        if uploaded_photo_url:
            # Extract filename from URL
            filename = uploaded_photo_url.split('/')[-1]
            file_path = f"/app/uploads/profile_photos/{filename}"
            
            print(f"   Expected file path: {file_path}")
            
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                print(f"✅ File exists on filesystem (size: {file_size} bytes)")
                filesystem_check = True
            else:
                print("❌ File does not exist on filesystem")
                filesystem_check = False
        else:
            print("❌ No URL to check filesystem")
            filesystem_check = False
        
        # Step 8: Test with the specific uploaded file mentioned in review
        print(f"\n🔍 Step 8: Testing existing uploaded file...")
        
        existing_file = "73bd1398-0aa5-4811-8019-2ee59df1a713_cbbe6c3a1538435ea0248cc99e527f08.jpeg"
        existing_file_url = f"/uploads/profile_photos/{existing_file}"
        existing_file_access_url = f"{self.base_url.replace('/api', '')}{existing_file_url}"
        
        print(f"   Existing file URL: {existing_file_access_url}")
        
        try:
            existing_response = requests.get(existing_file_access_url)
            print(f"   Existing file access status: {existing_response.status_code}")
            
            if existing_response.status_code == 200:
                print("✅ Existing uploaded file is accessible")
                existing_file_accessible = True
            else:
                print(f"❌ Existing uploaded file not accessible: {existing_response.status_code}")
                existing_file_accessible = False
                
        except Exception as e:
            print(f"❌ Existing file access failed: {e}")
            existing_file_accessible = False
        
        # Summary
        print(f"\n📊 PHOTO UPLOAD DEBUG SUMMARY:")
        print(f"   ✅ Photo Upload: {'PASS' if upload_success else 'FAIL'}")
        print(f"   ✅ Profile Update: {'PASS' if profile_update_success else 'FAIL'}")
        print(f"   ✅ Static File Serving: {'PASS' if static_serving_success else 'FAIL'}")
        print(f"   ✅ URL Format: {'PASS' if url_format_correct else 'FAIL'}")
        print(f"   ✅ Filesystem Check: {'PASS' if filesystem_check else 'FAIL'}")
        print(f"   ✅ Existing File Access: {'PASS' if existing_file_accessible else 'FAIL'}")
        
        # Identify the issue
        if upload_success and profile_update_success and not static_serving_success:
            print(f"\n🚨 ISSUE IDENTIFIED:")
            print(f"   - Photo upload works correctly")
            print(f"   - Client profile is updated with photo URL")
            print(f"   - BUT static file serving is not working")
            print(f"   - This suggests a static file serving configuration issue")
        elif upload_success and not profile_update_success:
            print(f"\n🚨 ISSUE IDENTIFIED:")
            print(f"   - Photo upload works")
            print(f"   - BUT client profile is not being updated correctly")
            print(f"   - This suggests a database update issue")
        elif not upload_success:
            print(f"\n🚨 ISSUE IDENTIFIED:")
            print(f"   - Photo upload is failing")
            print(f"   - This suggests an endpoint or permission issue")
        else:
            print(f"\n✅ NO ISSUES DETECTED:")
            print(f"   - All components are working correctly")
            print(f"   - The issue may be frontend-specific or resolved")
        
        overall_success = (
            upload_success and 
            profile_update_success and 
            static_serving_success and 
            url_format_correct and 
            filesystem_check
        )
        
        return overall_success

if __name__ == "__main__":
    tester = PhotoUploadDebugTester()
    
    print("🚀 Starting Photo Upload Debug Investigation")
    print("=" * 60)
    
    # Test admin login first
    auth_success = tester.test_admin_login()
    
    if not auth_success:
        print("❌ Authentication failed - cannot proceed with photo upload debug")
        sys.exit(1)
    
    # Run the photo upload debug investigation
    debug_success = tester.test_photo_upload_debug_investigation()
    
    # Summary
    print("\n" + "=" * 60)
    print("🏁 DEBUG INVESTIGATION SUMMARY")
    print("=" * 60)
    
    if debug_success:
        print("✅ Photo upload system is working correctly")
        print("   The issue may be frontend-specific or already resolved")
    else:
        print("❌ Photo upload system has issues")
        print("   Check the detailed analysis above for root cause")
    
    sys.exit(0 if debug_success else 1)