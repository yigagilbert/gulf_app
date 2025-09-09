#!/usr/bin/env python3

import requests
import sys
import json
import base64

def test_photo_upload_and_serving():
    """Final comprehensive test of photo upload and serving"""
    print("🔍 FINAL PHOTO UPLOAD AND SERVING TEST")
    print("-" * 50)
    
    base_url = "https://consultportal.preview.emergentagent.com/api"
    
    # Step 1: Admin login
    print("1. Admin login...")
    login_response = requests.post(f"{base_url}/auth/login", json={
        "email": "admin@example.com",
        "password": "admin123"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    admin_token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {admin_token}'}
    print("✅ Admin login successful")
    
    # Step 2: Get client list
    print("2. Getting client list...")
    clients_response = requests.get(f"{base_url}/admin/clients", headers=headers)
    
    if clients_response.status_code != 200:
        print(f"❌ Failed to get clients: {clients_response.status_code}")
        return False
    
    clients = clients_response.json()
    if not clients:
        print("❌ No clients found")
        return False
    
    test_client_id = clients[0]['id']
    client_name = f"{clients[0].get('first_name', '')} {clients[0].get('last_name', '')}".strip()
    print(f"✅ Using client: {client_name} (ID: {test_client_id})")
    
    # Step 3: Upload photo
    print("3. Uploading test photo...")
    
    # Create test image
    png_data = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8'
        'IQAAAAABJRU5ErkJggg=='
    )
    
    files = {'file': ('final_test_photo.png', png_data, 'image/png')}
    upload_response = requests.post(
        f"{base_url}/admin/clients/{test_client_id}/photo",
        files=files,
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    if upload_response.status_code != 200:
        print(f"❌ Photo upload failed: {upload_response.status_code}")
        print(f"   Error: {upload_response.text}")
        return False
    
    upload_data = upload_response.json()
    photo_url = upload_data.get('profile_photo_url')
    print(f"✅ Photo uploaded successfully")
    print(f"   Photo URL: {photo_url}")
    
    # Step 4: Verify client profile update
    print("4. Verifying client profile update...")
    profile_response = requests.get(f"{base_url}/admin/clients/{test_client_id}", headers=headers)
    
    if profile_response.status_code != 200:
        print(f"❌ Failed to get client profile: {profile_response.status_code}")
        return False
    
    profile_data = profile_response.json()
    profile_photo_url = profile_data.get('profile_photo_url')
    
    if profile_photo_url != photo_url:
        print(f"❌ Profile photo URL mismatch!")
        print(f"   Expected: {photo_url}")
        print(f"   Got: {profile_photo_url}")
        return False
    
    print("✅ Client profile correctly updated")
    
    # Step 5: Test photo accessibility
    print("5. Testing photo accessibility...")
    
    if not photo_url:
        print("❌ No photo URL to test")
        return False
    
    # Construct full URL
    if photo_url.startswith('/'):
        full_photo_url = f"https://consultportal.preview.emergentagent.com{photo_url}"
    else:
        full_photo_url = photo_url
    
    photo_access_response = requests.get(full_photo_url)
    
    if photo_access_response.status_code != 200:
        print(f"❌ Photo not accessible: {photo_access_response.status_code}")
        return False
    
    content_type = photo_access_response.headers.get('content-type', '')
    content_length = len(photo_access_response.content)
    
    print(f"✅ Photo is accessible")
    print(f"   Content-Type: {content_type}")
    print(f"   Content-Length: {content_length} bytes")
    
    # Verify it's actually an image, not HTML
    if 'image/' not in content_type:
        print(f"❌ Photo is not being served as an image!")
        print(f"   Content preview: {photo_access_response.text[:100]}")
        return False
    
    print("✅ Photo is correctly served as an image")
    
    # Step 6: Test frontend URL format compatibility
    print("6. Testing frontend URL format compatibility...")
    
    expected_patterns = ['/api/uploads/', '/profile_photos/']
    for pattern in expected_patterns:
        if pattern not in photo_url:
            print(f"❌ Photo URL missing expected pattern: {pattern}")
            return False
    
    print("✅ Photo URL format is correct for frontend")
    
    print("\n🎉 ALL TESTS PASSED!")
    print("   ✅ Photo upload works correctly")
    print("   ✅ Client profile is updated with correct URL")
    print("   ✅ Photo is accessible via static file serving")
    print("   ✅ Photo is served with correct content type")
    print("   ✅ URL format is compatible with frontend")
    
    return True

if __name__ == "__main__":
    success = test_photo_upload_and_serving()
    sys.exit(0 if success else 1)