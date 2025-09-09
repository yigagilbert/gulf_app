#!/usr/bin/env python3
"""
Migration script to add phone number authentication for clients
This script will:
1. Add phone_number field to users table
2. Make email nullable for clients
3. Clear existing client accounts (keep admin accounts)
4. Update database constraints
"""

import os
import sys
import sqlite3
from pathlib import Path

# Add the app directory to Python path
sys.path.append('/app')

def migrate_database():
    """Migrate the database for phone number authentication"""
    db_path = '/app/jobplacement.db'
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Starting phone number authentication migration...")
        
        # Step 1: Add phone_number column to users table
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN phone_number VARCHAR UNIQUE")
            print("✅ Added phone_number column to users table")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("⚠️  phone_number column already exists, skipping...")
            else:
                print(f"❌ Error adding phone_number column: {e}")
        
        # Step 2: Make email nullable by creating a new table structure
        print("\n🔄 Restructuring users table to make email nullable...")
        
        # Get current admin users before restructuring
        cursor.execute("SELECT * FROM users WHERE role IN ('admin', 'super_admin')")
        admin_users = cursor.fetchall()
        print(f"Found {len(admin_users)} admin users to preserve")
        
        # Get column info
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print(f"Current users table has {len(columns)} columns")
        
        # Create new users table with updated structure
        cursor.execute("""
            CREATE TABLE users_new (
                id VARCHAR PRIMARY KEY,
                email VARCHAR UNIQUE,
                phone_number VARCHAR UNIQUE,
                password_hash VARCHAR NOT NULL,
                role VARCHAR DEFAULT 'client',
                is_active BOOLEAN DEFAULT 1,
                email_verified BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Created new users table structure")
        
        # Copy admin users to new table
        for admin_user in admin_users:
            # admin_user has 8 values: id, email, password_hash, role, is_active, email_verified, created_at, updated_at
            # We need to insert: id, email, phone_number, password_hash, role, is_active, email_verified, created_at, updated_at
            cursor.execute("""
                INSERT INTO users_new (id, email, phone_number, password_hash, role, is_active, email_verified, created_at, updated_at)
                VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
            """, (admin_user[0], admin_user[1], admin_user[2], admin_user[3], admin_user[4], admin_user[5], admin_user[6], admin_user[7]))
        print(f"✅ Preserved {len(admin_users)} admin users")
        
        # Drop old table and rename new one
        cursor.execute("DROP TABLE users")
        cursor.execute("ALTER TABLE users_new RENAME TO users")
        print("✅ Updated users table structure")
        
        # Step 3: Clean up client profiles for non-admin users
        cursor.execute("""
            DELETE FROM client_profiles 
            WHERE user_id NOT IN (
                SELECT id FROM users WHERE role IN ('admin', 'super_admin')
            )
        """)
        deleted_profiles = cursor.rowcount
        print(f"✅ Cleaned up {deleted_profiles} client profiles")
        
        # Step 4: Clean up related data
        tables_to_clean = [
            'documents', 'education_records', 'employment_records', 
            'job_applications', 'chat_messages'
        ]
        
        for table in tables_to_clean:
            try:
                if table == 'chat_messages':
                    # Chat messages might reference users directly
                    cursor.execute(f"""
                        DELETE FROM {table} 
                        WHERE sender_id NOT IN (
                            SELECT id FROM users WHERE role IN ('admin', 'super_admin')
                        )
                    """)
                else:
                    # Other tables reference client_profiles
                    cursor.execute(f"""
                        DELETE FROM {table} 
                        WHERE client_id NOT IN (
                            SELECT id FROM client_profiles
                        )
                    """)
                deleted_count = cursor.rowcount
                if deleted_count > 0:
                    print(f"✅ Cleaned up {deleted_count} records from {table}")
            except sqlite3.OperationalError:
                print(f"⚠️  Table {table} might not exist, skipping...")
        
        # Step 5: Create indexes for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        print("✅ Created database indexes")
        
        # Step 6: Update any remaining references
        try:
            # Update any documents that might be orphaned
            cursor.execute("""
                DELETE FROM documents 
                WHERE client_id NOT IN (SELECT id FROM client_profiles)
            """)
        except:
            pass
        
        conn.commit()
        print("\n🎉 Migration completed successfully!")
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM users WHERE role IN ('admin', 'super_admin')")
        admin_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'client'")
        client_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM client_profiles")
        profile_count = cursor.fetchone()[0]
        
        print(f"\n📊 Database Summary:")
        print(f"   - Admin users: {admin_count}")
        print(f"   - Client users: {client_count}")
        print(f"   - Client profiles: {profile_count}")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    success = migrate_database()
    if success:
        print("\n✅ Phone number authentication migration completed successfully!")
        print("The application now supports:")
        print("  - Client registration: Names + Phone Number + Password")
        print("  - Client login: Phone Number + Password")
        print("  - Admin login: Email + Password (unchanged)")
        print("  - Email is optional for clients")
        print("  - All existing client accounts have been reset")
        print("  - Admin accounts have been preserved")
    else:
        print("\n❌ Migration failed. Please check the errors above.")
        sys.exit(1)