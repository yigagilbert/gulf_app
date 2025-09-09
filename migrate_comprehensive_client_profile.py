#!/usr/bin/env python3
"""
Migration script to add comprehensive client profile fields
This script will add all the new fields to the existing client_profiles table
and create new tables for education_records and employment_records
"""

import os
import sys
import sqlite3
from pathlib import Path

# Add the app directory to Python path
sys.path.append('/app')

def migrate_database():
    """Migrate the database to add comprehensive client profile fields"""
    db_path = '/app/jobplacement.db'
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Starting comprehensive client profile migration...")
        
        # Add new columns to client_profiles table
        new_columns = [
            # Form Registration Details
            ('registration_date', 'DATETIME'),
            ('serial_number', 'VARCHAR UNIQUE'),
            ('registration_number', 'VARCHAR UNIQUE'),
            
            # Bio Data - Additional fields
            ('age', 'INTEGER'),
            ('tribe', 'VARCHAR'),
            ('contact_1', 'VARCHAR'),
            ('contact_2', 'VARCHAR'),
            ('place_of_birth', 'VARCHAR'),
            ('present_address', 'TEXT'),
            ('subcounty', 'VARCHAR'),
            ('district', 'VARCHAR'),
            ('marital_status', 'VARCHAR'),
            ('number_of_kids', 'INTEGER'),
            ('height', 'VARCHAR'),
            ('weight', 'VARCHAR'),
            ('position_applied_for', 'VARCHAR'),
            ('religion', 'VARCHAR'),
            
            # Next of Kin
            ('next_of_kin_name', 'VARCHAR'),
            ('next_of_kin_contact_1', 'VARCHAR'),
            ('next_of_kin_contact_2', 'VARCHAR'),
            ('next_of_kin_address', 'TEXT'),
            ('next_of_kin_subcounty', 'VARCHAR'),
            ('next_of_kin_district', 'VARCHAR'),
            ('next_of_kin_relationship', 'VARCHAR'),
            ('next_of_kin_age', 'INTEGER'),
            
            # Father's Information
            ('father_name', 'VARCHAR'),
            ('father_contact_1', 'VARCHAR'),
            ('father_contact_2', 'VARCHAR'),
            ('father_address', 'TEXT'),
            ('father_subcounty', 'VARCHAR'),
            ('father_district', 'VARCHAR'),
            
            # Mother's Information
            ('mother_name', 'VARCHAR'),
            ('mother_contact_1', 'VARCHAR'),
            ('mother_contact_2', 'VARCHAR'),
            ('mother_address', 'TEXT'),
            ('mother_subcounty', 'VARCHAR'),
            ('mother_district', 'VARCHAR'),
            
            # Agent Information
            ('agent_name', 'VARCHAR'),
            ('agent_contact', 'VARCHAR'),
        ]
        
        # Add each column if it doesn't exist
        for column_name, column_type in new_columns:
            try:
                cursor.execute(f"ALTER TABLE client_profiles ADD COLUMN {column_name} {column_type}")
                print(f"✅ Added column: {column_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"⚠️  Column {column_name} already exists, skipping...")
                else:
                    print(f"❌ Error adding column {column_name}: {e}")
        
        # Create education_records table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS education_records (
                id VARCHAR PRIMARY KEY,
                client_id VARCHAR NOT NULL,
                school_name VARCHAR NOT NULL,
                year VARCHAR,
                qualification VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES client_profiles (id) ON DELETE CASCADE
            )
        """)
        print("✅ Created education_records table")
        
        # Create employment_records table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS employment_records (
                id VARCHAR PRIMARY KEY,
                client_id VARCHAR NOT NULL,
                employer VARCHAR NOT NULL,
                position VARCHAR,
                country VARCHAR,
                period VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES client_profiles (id) ON DELETE CASCADE
            )
        """)
        print("✅ Created employment_records table")
        
        # Create indexes for better performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_education_client_id ON education_records(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_employment_client_id ON employment_records(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_client_serial_number ON client_profiles(serial_number)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_client_registration_number ON client_profiles(registration_number)")
        print("✅ Created database indexes")
        
        # Set default registration_date for existing clients
        cursor.execute("""
            UPDATE client_profiles 
            SET registration_date = created_at 
            WHERE registration_date IS NULL
        """)
        
        # Generate serial numbers and registration numbers for existing clients
        cursor.execute("SELECT id, created_at FROM client_profiles WHERE serial_number IS NULL ORDER BY created_at")
        existing_clients = cursor.fetchall()
        
        for i, (client_id, created_at) in enumerate(existing_clients, 1):
            # Parse created_at and generate serial number
            import datetime
            if created_at:
                try:
                    dt = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    date_part = dt.strftime("%Y%m%d")
                except:
                    date_part = datetime.datetime.now().strftime("%Y%m%d")
            else:
                date_part = datetime.datetime.now().strftime("%Y%m%d")
            
            serial_number = f"SN-{date_part}-{i:04d}"
            registration_number = f"REG-{datetime.datetime.now().year}-{i:07d}"
            
            cursor.execute("""
                UPDATE client_profiles 
                SET serial_number = ?, registration_number = ?
                WHERE id = ?
            """, (serial_number, registration_number, client_id))
        
        if existing_clients:
            print(f"✅ Generated serial numbers and registration numbers for {len(existing_clients)} existing clients")
        
        conn.commit()
        print("\n🎉 Migration completed successfully!")
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
        print("\n✅ Database migration completed successfully!")
        print("The application now supports comprehensive client profiles with:")
        print("  - Form Registration Details (Serial Number, Registration Number)")
        print("  - Expanded Bio Data (Personal Information)")
        print("  - Next of Kin Information")
        print("  - Parent's Details (Father & Mother)")
        print("  - Agent Information")
        print("  - Education Records (separate table)")
        print("  - Employment Records (separate table)")
    else:
        print("\n❌ Migration failed. Please check the errors above.")
        sys.exit(1)