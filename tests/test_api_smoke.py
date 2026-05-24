import os
import unittest
import uuid
from pathlib import Path


TEST_DB_PATH = Path(__file__).with_name("test_api_smoke.db")
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["SECRET_KEY"] = "test-secret-key-12345678901234567890"
os.environ["ALGORITHM"] = "HS256"
os.environ["DEFAULT_ADMIN_EMAIL"] = "admin@example.com"
os.environ["DEFAULT_ADMIN_PASSWORD"] = "admin12345"
os.environ["STORAGE_PROVIDER"] = "local"
os.environ["UPLOAD_DIR"] = "uploads"

from fastapi.testclient import TestClient

import main


client = TestClient(main.app)


class APISmokeTests(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()

    def _login_super_admin(self):
        for password in ("admin12345", "AdminChanged123"):
            response = client.post(
                "/api/auth/login",
                json={"identifier": "admin@example.com", "password": password},
            )
            if response.status_code == 200:
                body = response.json()
                if body["user"]["must_change_password"]:
                    change_response = client.post(
                        "/api/auth/change-password",
                        json={"current_password": password, "new_password": "AdminChanged123"},
                        headers={"Authorization": f"Bearer {body['access_token']}"},
                    )
                    self.assertEqual(change_response.status_code, 200)
                    refreshed = client.post(
                        "/api/auth/login",
                        json={"identifier": "admin@example.com", "password": "AdminChanged123"},
                    )
                    self.assertEqual(refreshed.status_code, 200)
                    return refreshed.json()["access_token"]
                return body["access_token"]
        self.fail("Unable to log in as super admin")

    def test_health_check(self):
        response = client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    def test_client_registration_and_login(self):
        phone_number = f"2567{uuid.uuid4().int % 1_000_0000:07d}"
        password = "Client123"
        registration_payload = {
            "first_name": "Test",
            "last_name": "Client",
            "phone_number": phone_number,
            "password": password,
            "email": f"{phone_number}@example.com",
        }

        registration_response = client.post("/api/auth/register/client", json=registration_payload)
        self.assertEqual(registration_response.status_code, 200)
        registration_body = registration_response.json()
        self.assertEqual(registration_body["user"]["phone_number"], phone_number)
        self.assertEqual(registration_body["user"]["role"], "client")
        self.assertIn("access_token", registration_body)

        login_response = client.post("/api/auth/login", json={"identifier": phone_number, "password": password})
        self.assertEqual(login_response.status_code, 200)
        login_body = login_response.json()
        self.assertEqual(login_body["user"]["phone_number"], phone_number)
        self.assertEqual(login_body["user"]["role"], "client")
        self.assertFalse(login_body["user"]["must_change_password"])
        self.assertIn("access_token", login_body)

    def test_public_admin_registration_is_blocked(self):
        response = client.post(
            "/api/auth/register/admin",
            json={"email": "blocked@example.com", "password": "Blocked123"},
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Public admin registration is disabled")

    def test_a_admin_password_change_and_management_flow(self):
        login_response = client.post("/api/auth/login", json={"identifier": "admin@example.com", "password": "admin12345"})
        self.assertEqual(login_response.status_code, 200)
        login_body = login_response.json()
        self.assertEqual(login_body["user"]["role"], "super_admin")
        self.assertTrue(login_body["user"]["must_change_password"])
        access_token = login_body["access_token"]

        blocked_response = client.get(
            "/api/admin/users",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        self.assertEqual(blocked_response.status_code, 403)
        self.assertIn("Password change required", blocked_response.json()["detail"])

        change_password_response = client.post(
            "/api/auth/change-password",
            json={"current_password": "admin12345", "new_password": "AdminChanged123"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        self.assertEqual(change_password_response.status_code, 200)
        self.assertFalse(change_password_response.json()["must_change_password"])

        refreshed_login_response = client.post(
            "/api/auth/login",
            json={"identifier": "admin@example.com", "password": "AdminChanged123"},
        )
        self.assertEqual(refreshed_login_response.status_code, 200)
        refreshed_body = refreshed_login_response.json()
        self.assertFalse(refreshed_body["user"]["must_change_password"])
        refreshed_token = refreshed_body["access_token"]

        list_admins_response = client.get(
            "/api/admin/users",
            headers={"Authorization": f"Bearer {refreshed_token}"},
        )
        self.assertEqual(list_admins_response.status_code, 200)
        self.assertGreaterEqual(len(list_admins_response.json()), 1)

        new_admin_email = f"admin-{uuid.uuid4().hex[:8]}@example.com"
        create_admin_response = client.post(
            "/api/admin/users",
            json={"email": new_admin_email, "password": "TempAdmin123", "role": "admin"},
            headers={"Authorization": f"Bearer {refreshed_token}"},
        )
        self.assertEqual(create_admin_response.status_code, 201)
        created_admin = create_admin_response.json()
        self.assertEqual(created_admin["email"], new_admin_email)
        self.assertTrue(created_admin["must_change_password"])

        reset_password_response = client.post(
            f"/api/admin/users/{created_admin['id']}/reset-password",
            json={"new_temporary_password": "ResetAdmin123"},
            headers={"Authorization": f"Bearer {refreshed_token}"},
        )
        self.assertEqual(reset_password_response.status_code, 200)
        self.assertTrue(reset_password_response.json()["must_change_password"])

        phone_number = f"2567{uuid.uuid4().int % 1_000_0000:07d}"
        create_response = client.post(
            "/api/admin/clients/create",
            json={
                "first_name": "Admin",
                "last_name": "Created",
                "phone_number": phone_number,
                "password": "Created123",
                "email": f"{phone_number}@example.com",
            },
            headers={"Authorization": f"Bearer {refreshed_token}"},
        )
        self.assertEqual(create_response.status_code, 200)
        create_body = create_response.json()
        self.assertEqual(create_body["phone_number"], phone_number)
        self.assertEqual(create_body["role"], "client")
        self.assertTrue(create_body["must_change_password"])

    def test_b_admin_can_update_application_and_lifecycle_status(self):
        refreshed_token = self._login_super_admin()

        phone_number = f"2567{uuid.uuid4().int % 1_000_0000:07d}"
        create_response = client.post(
            "/api/admin/clients/create",
            json={
                "first_name": "Workflow",
                "last_name": "Client",
                "phone_number": phone_number,
                "password": "Created123",
                "email": f"{phone_number}@example.com",
                "interested_job_category": "Nurse",
            },
            headers={"Authorization": f"Bearer {refreshed_token}"},
        )
        self.assertEqual(create_response.status_code, 200)

        clients_response = client.get(
            "/api/admin/clients",
            headers={"Authorization": f"Bearer {refreshed_token}"},
        )
        created_client = next(client_item for client_item in clients_response.json() if client_item["phone_number"] == phone_number)

        application_response = client.put(
            f"/api/admin/clients/{created_client['id']}/application-status",
            json={"status": "under_review", "notes": "Ready for review"},
            headers={"Authorization": f"Bearer {refreshed_token}"},
        )
        self.assertEqual(application_response.status_code, 200)
        self.assertEqual(application_response.json()["new_status"], "under_review")

        lifecycle_response = client.put(
            f"/api/admin/clients/{created_client['id']}/lifecycle-status",
            json={"status": "visa_processing", "notes": "Documents submitted"},
            headers={"Authorization": f"Bearer {refreshed_token}"},
        )
        self.assertEqual(lifecycle_response.status_code, 200)
        self.assertEqual(lifecycle_response.json()["new_status"], "visa_processing")


if __name__ == "__main__":
    unittest.main()
