#!/usr/bin/env python3

import requests
import json

def test_specific_admin_exclusion():
    """Test that the specific admin user (admin@example.com) is excluded from client list"""
    base_url = "https://onboard-gulf.preview.emergentagent.com/api"
    
    # Login as admin
    print("🔐 Logging in as admin...")
    login_response = requests.post(f"{base_url}/auth/login", json={
        "email": "admin@example.com",
        "password": "admin123"
    })
    
    if login_response.status_code != 200:
        print("❌ Admin login failed")
        return False
    
    admin_token = login_response.json().get('access_token')
    admin_user_data = login_response.json().get('user', {})
    admin_email = admin_user_data.get('email')
    admin_role = admin_user_data.get('role')
    
    print(f"✅ Admin login successful")
    print(f"   Email: {admin_email}")
    print(f"   Role: {admin_role}")
    
    headers = {'Authorization': f'Bearer {admin_token}'}
    
    # Get client list
    print("\n📋 Getting client list...")
    clients_response = requests.get(f"{base_url}/admin/clients", headers=headers)
    
    if clients_response.status_code != 200:
        print("❌ Failed to get client list")
        return False
    
    clients = clients_response.json()
    print(f"📊 Found {len(clients)} clients in the list")
    
    # Check if admin@example.com is in the client list
    print(f"\n🔍 Checking if {admin_email} appears in client list...")
    
    admin_in_client_list = False
    for client in clients:
        client_email = client.get('user_email', '')
        if client_email.lower() == admin_email.lower():
            admin_in_client_list = True
            print(f"❌ CRITICAL: Admin user {admin_email} found in client list!")
            print(f"   Client ID: {client.get('id')}")
            print(f"   Name: {client.get('first_name')} {client.get('last_name')}")
            print(f"   Status: {client.get('status')}")
            break
    
    if not admin_in_client_list:
        print(f"✅ PASS: Admin user {admin_email} correctly excluded from client list")
    
    # Also check for any other admin-role users in the client list
    print(f"\n🔍 Checking for other admin-like emails in client list...")
    suspicious_emails = []
    
    for client in clients:
        email = client.get('user_email', '')
        # Check for admin-like patterns but exclude legitimate client emails
        if ('admin' in email.lower() and 
            email.lower() != 'admin@example.com' and 
            not email.startswith('test_client_')):
            suspicious_emails.append(email)
    
    if suspicious_emails:
        print(f"⚠️  Found {len(suspicious_emails)} suspicious admin-like emails:")
        for email in suspicious_emails:
            print(f"   - {email}")
        print("   Note: These might be legitimate clients with admin-like email addresses")
    else:
        print("✅ No suspicious admin-like emails found")
    
    # Summary
    print(f"\n📋 SUMMARY:")
    print(f"   Admin user exclusion: {'PASS' if not admin_in_client_list else 'FAIL'}")
    print(f"   Total clients returned: {len(clients)}")
    print(f"   Suspicious emails: {len(suspicious_emails)}")
    
    return not admin_in_client_list

if __name__ == "__main__":
    success = test_specific_admin_exclusion()
    exit(0 if success else 1)