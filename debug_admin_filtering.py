#!/usr/bin/env python3

import requests
import json

def debug_admin_filtering():
    """Debug admin client filtering issue"""
    base_url = "https://onboard-gulf.preview.emergentagent.com/api"
    
    # Login as admin
    print("🔐 Logging in as admin...")
    login_response = requests.post(f"{base_url}/auth/login", json={
        "email": "admin@example.com",
        "password": "admin123"
    })
    
    if login_response.status_code != 200:
        print("❌ Admin login failed")
        return
    
    admin_token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {admin_token}'}
    
    # Get client list
    print("📋 Getting client list...")
    clients_response = requests.get(f"{base_url}/admin/clients", headers=headers)
    
    if clients_response.status_code != 200:
        print("❌ Failed to get client list")
        return
    
    clients = clients_response.json()
    print(f"📊 Found {len(clients)} clients in the list")
    
    # Analyze each client
    print("\n🔍 Analyzing client list for admin users:")
    admin_users_found = []
    
    for i, client in enumerate(clients):
        email = client.get('user_email', '')
        name = f"{client.get('first_name', '')} {client.get('last_name', '')}"
        status = client.get('status', '')
        
        print(f"   {i+1}. {email} - {name.strip()} - Status: {status}")
        
        # Check if this looks like an admin email
        if 'admin' in email.lower():
            admin_users_found.append({
                'email': email,
                'name': name.strip(),
                'status': status,
                'client_id': client.get('id')
            })
    
    if admin_users_found:
        print(f"\n❌ ISSUE FOUND: {len(admin_users_found)} admin-like users in client list:")
        for admin_user in admin_users_found:
            print(f"   - {admin_user['email']} ({admin_user['name']}) - ID: {admin_user['client_id']}")
            
            # Get detailed info about this client
            client_detail_response = requests.get(
                f"{base_url}/admin/clients/{admin_user['client_id']}", 
                headers=headers
            )
            
            if client_detail_response.status_code == 200:
                client_detail = client_detail_response.json()
                print(f"     User ID: {client_detail.get('user_id')}")
                print(f"     Status: {client_detail.get('status')}")
                print(f"     Created: {client_detail.get('created_at')}")
    else:
        print("\n✅ No admin users found in client list - filtering working correctly")
    
    return len(admin_users_found) == 0

if __name__ == "__main__":
    debug_admin_filtering()