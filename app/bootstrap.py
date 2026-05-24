import os
import uuid
from contextlib import closing
from datetime import datetime

from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import User, UserRole
from app.utils import get_password_hash


def ensure_auth_schema(engine) -> None:
    inspector = inspect(engine)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    columns_to_add = []
    dialect = engine.dialect.name
    timestamp_type = "TIMESTAMP" if dialect == "postgresql" else "DATETIME"
    false_default = "FALSE" if dialect == "postgresql" else "0"

    if "must_change_password" not in existing_columns:
        columns_to_add.append(
            f"ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT {false_default}"
        )
    if "password_changed_at" not in existing_columns:
        columns_to_add.append(f"ALTER TABLE users ADD COLUMN password_changed_at {timestamp_type}")
    if "last_login_at" not in existing_columns:
        columns_to_add.append(f"ALTER TABLE users ADD COLUMN last_login_at {timestamp_type}")

    if not columns_to_add:
        return

    with engine.begin() as connection:
        for statement in columns_to_add:
            connection.execute(text(statement))


def ensure_platform_schema(engine) -> None:
    inspector = inspect(engine)
    dialect = engine.dialect.name
    timestamp_type = "TIMESTAMP" if dialect == "postgresql" else "DATETIME"
    false_default = "FALSE" if dialect == "postgresql" else "0"

    profile_columns = {column["name"] for column in inspector.get_columns("client_profiles")}
    document_columns = {column["name"] for column in inspector.get_columns("documents")}
    chat_columns = {column["name"] for column in inspector.get_columns("chat_messages")}

    profile_statements = []
    document_statements = []
    chat_statements = []

    if "application_status" not in profile_columns:
        profile_statements.append(
            "ALTER TABLE client_profiles ADD COLUMN application_status VARCHAR(64) NOT NULL DEFAULT 'draft'"
        )
    if "application_status_updated_at" not in profile_columns:
        profile_statements.append(
            f"ALTER TABLE client_profiles ADD COLUMN application_status_updated_at {timestamp_type}"
        )
    if "application_status_updated_by" not in profile_columns:
        profile_statements.append("ALTER TABLE client_profiles ADD COLUMN application_status_updated_by VARCHAR")
    if "application_status_notes" not in profile_columns:
        profile_statements.append("ALTER TABLE client_profiles ADD COLUMN application_status_notes TEXT")
    if "client_lifecycle_status" not in profile_columns:
        profile_statements.append(
            "ALTER TABLE client_profiles ADD COLUMN client_lifecycle_status VARCHAR(64) NOT NULL DEFAULT 'new_lead'"
        )
    if "lifecycle_status_updated_at" not in profile_columns:
        profile_statements.append(
            f"ALTER TABLE client_profiles ADD COLUMN lifecycle_status_updated_at {timestamp_type}"
        )
    if "lifecycle_status_updated_by" not in profile_columns:
        profile_statements.append("ALTER TABLE client_profiles ADD COLUMN lifecycle_status_updated_by VARCHAR")
    if "lifecycle_status_notes" not in profile_columns:
        profile_statements.append("ALTER TABLE client_profiles ADD COLUMN lifecycle_status_notes TEXT")
    if "created_by_admin" not in profile_columns:
        profile_statements.append(
            f"ALTER TABLE client_profiles ADD COLUMN created_by_admin BOOLEAN NOT NULL DEFAULT {false_default}"
        )
    if "onboarding_completed_at" not in profile_columns:
        profile_statements.append(f"ALTER TABLE client_profiles ADD COLUMN onboarding_completed_at {timestamp_type}")

    if "application_id" not in document_columns:
        document_statements.append("ALTER TABLE documents ADD COLUMN application_id VARCHAR")
    if "uploaded_by" not in document_columns:
        document_statements.append("ALTER TABLE documents ADD COLUMN uploaded_by VARCHAR")
    if "uploaded_by_role" not in document_columns:
        document_statements.append(
            "ALTER TABLE documents ADD COLUMN uploaded_by_role VARCHAR(64) NOT NULL DEFAULT 'client'"
        )
    if "visibility" not in document_columns:
        document_statements.append(
            "ALTER TABLE documents ADD COLUMN visibility VARCHAR(64) NOT NULL DEFAULT 'client_visible'"
        )
    if "access_level" not in document_columns:
        document_statements.append(
            "ALTER TABLE documents ADD COLUMN access_level VARCHAR(64) NOT NULL DEFAULT 'download_allowed'"
        )
    if "status" not in document_columns:
        document_statements.append(
            "ALTER TABLE documents ADD COLUMN status VARCHAR(64) NOT NULL DEFAULT 'pending'"
        )
    if "archived_at" not in document_columns:
        document_statements.append(f"ALTER TABLE documents ADD COLUMN archived_at {timestamp_type}")
    if "created_at" not in document_columns:
        document_statements.append(f"ALTER TABLE documents ADD COLUMN created_at {timestamp_type}")
    if "updated_at" not in document_columns:
        document_statements.append(f"ALTER TABLE documents ADD COLUMN updated_at {timestamp_type}")

    if "client_id" not in chat_columns:
        chat_statements.append("ALTER TABLE chat_messages ADD COLUMN client_id VARCHAR")
    if "sender_role" not in chat_columns:
        chat_statements.append(
            "ALTER TABLE chat_messages ADD COLUMN sender_role VARCHAR(64) NOT NULL DEFAULT 'client'"
        )
    if "read_at" not in chat_columns:
        chat_statements.append(f"ALTER TABLE chat_messages ADD COLUMN read_at {timestamp_type}")

    status_history_table = inspector.has_table("status_history")
    status_history_statement = None
    if not status_history_table:
        status_history_statement = f"""
        CREATE TABLE status_history (
            id VARCHAR NOT NULL PRIMARY KEY,
            client_id VARCHAR NOT NULL,
            previous_status VARCHAR,
            new_status VARCHAR NOT NULL,
            status_type VARCHAR NOT NULL,
            changed_by VARCHAR NOT NULL,
            notes TEXT,
            created_at {timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """

    with engine.begin() as connection:
        for statement in profile_statements + document_statements + chat_statements:
            connection.execute(text(statement))
        if status_history_statement:
            connection.execute(text(status_history_statement))


def ensure_default_super_admin() -> None:
    default_email = os.getenv("DEFAULT_ADMIN_EMAIL")
    default_password = os.getenv("DEFAULT_ADMIN_PASSWORD")
    if not default_email or not default_password:
        print("Default admin credentials not configured; skipping default admin creation")
        return

    with closing(next(get_db())) as db:
        existing_admin = (
            db.query(User)
            .filter(User.role.in_([UserRole.admin, UserRole.super_admin]))
            .first()
        )
        if existing_admin:
            print("Admin account already exists; skipping default admin creation")
            return

        admin = db.query(User).filter(User.email == default_email).first()
        if not admin:
            admin = User(
                id=str(uuid.uuid4()),
                email=default_email,
                password_hash=get_password_hash(default_password),
                role=UserRole.super_admin,
                is_active=True,
                email_verified=True,
                must_change_password=True,
            )
            db.add(admin)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
            else:
                print(f"Default admin created: {default_email}")
            return
        admin.role = UserRole.super_admin
        admin.email_verified = True
        admin.must_change_password = True
        if admin.updated_at is None:
            admin.updated_at = datetime.utcnow()
        db.add(admin)
        db.commit()
        print(f"Default admin ensured: {default_email}")
