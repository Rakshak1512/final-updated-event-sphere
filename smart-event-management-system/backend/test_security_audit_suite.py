import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

os.environ.setdefault("GRPC_POLL_STRATEGY", "poll")

from app.core.config import settings
from app.core.security import create_access_token, generate_otp, hash_otp, hash_password, verify_otp_hash
from app.db import firestore_service as db_service
from app.main import app
from app.models.user import RoleEnum, User


class TestSecurityAuditSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.ts = int(datetime.now(timezone.utc).timestamp())

    # -------------------------------------------------------------------------
    # TEST 1: Registering without verifying an OTP (no user in permanent collection)
    # -------------------------------------------------------------------------
    @patch("app.api.routes.auth_routes.send_otp_email")
    def test_01_register_without_otp_never_creates_permanent_user(self, mock_mail):
        mock_mail.return_value = (True, "Delivered")
        email = f"unverified_{self.ts}@eventsphere.edu"
        reg_payload = {
            "name": "Unverified Test User",
            "email": email,
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!",
            "role": "student",
            "registration_number": f"REG-UNV-{self.ts}",
            "department": "Computer Science",
            "semester": "6",
        }

        res = self.client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.json().get("is_email_verified"))

        # Verify staged in pending_registrations
        pending = db_service.get_pending_registration(email)
        self.assertIsNotNone(pending)
        self.assertNotIn("otp_code", pending)
        self.assertIn("hashed_otp", pending)

        # Verify NOT in permanent users collection
        user_in_db = db_service.get_user_by_email(email)
        self.assertIsNone(user_in_db, "User must NOT exist in permanent users collection before OTP verification")

        # Cleanup
        db_service.delete_pending_registration(email)

    # -------------------------------------------------------------------------
    # TEST 2: Direct API attempts to create a verified account (rejected)
    # -------------------------------------------------------------------------
    def test_02_direct_api_unauthorized_user_creation_rejected(self):
        # Attempt to bypass OTP via /api/auth/firebase/register with invalid token
        res = self.client.post("/api/auth/firebase/register", json={
            "id_token": "fake_forged_token_without_verification",
            "name": "Attacker",
            "role": "student",
            "registration_number": f"REG-ATK-{self.ts}",
        })
        self.assertEqual(res.status_code, 401)

        # Attempt to call verify-email with empty OTP
        res2 = self.client.post("/api/auth/verify-email", json={
            "email": f"attacker_{self.ts}@eventsphere.edu",
            "otp_code": "",
        })
        self.assertEqual(res2.status_code, 400)

    # -------------------------------------------------------------------------
    # TEST 3: Submitting an incorrect or expired OTP (rejected, attempt increments)
    # -------------------------------------------------------------------------
    def test_03_incorrect_or_expired_otp_handling(self):
        email = f"otp_fail_{self.ts}@eventsphere.edu"
        plain_otp = "123456"
        hashed = hash_otp(plain_otp)
        pending_data = {
            "name": "OTP Test User",
            "email": email,
            "hashed_password": hash_password("Password123!"),
            "role": "student",
            "registration_number": f"REG-FAIL-{self.ts}",
            "department": "Computer Science",
            "semester": "4",
            "hashed_otp": hashed,
            "attempts": 0,
            "max_attempts": 5,
            "last_sent_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
            "created_at": datetime.now(timezone.utc),
        }
        db_service.save_pending_registration(pending_data)

        # Incorrect OTP
        res = self.client.post("/api/auth/verify-email", json={"email": email, "otp_code": "999999"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid OTP", res.json().get("detail", ""))

        # Check attempt was incremented in Firestore
        updated_pending = db_service.get_pending_registration(email)
        self.assertEqual(updated_pending.get("attempts"), 1)

        # Test expired OTP
        updated_pending["expires_at"] = datetime.now(timezone.utc) - timedelta(minutes=1)
        db_service.save_pending_registration(updated_pending)

        res_expired = self.client.post("/api/auth/verify-email", json={"email": email, "otp_code": plain_otp})
        self.assertEqual(res_expired.status_code, 400)
        self.assertIn("expired", res_expired.json().get("detail", "").lower())

        # Cleanup
        db_service.delete_pending_registration(email)

    # -------------------------------------------------------------------------
    # TEST 4: Reusing an OTP after successful verification (rejected)
    # -------------------------------------------------------------------------
    def test_04_reuse_otp_after_verification_rejected(self):
        email = f"reuse_otp_{self.ts}@eventsphere.edu"
        plain_otp = "852963"
        hashed = hash_otp(plain_otp)
        pending_data = {
            "name": "One Time Test",
            "email": email,
            "hashed_password": hash_password("Password123!"),
            "role": "student",
            "registration_number": f"REG-REUSE-{self.ts}",
            "department": "Computer Science",
            "semester": "5",
            "hashed_otp": hashed,
            "attempts": 0,
            "max_attempts": 5,
            "last_sent_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
            "created_at": datetime.now(timezone.utc),
        }
        db_service.save_pending_registration(pending_data)

        # First verification succeeds
        res1 = self.client.post("/api/auth/verify-email", json={"email": email, "otp_code": plain_otp})
        self.assertEqual(res1.status_code, 200)

        # Second verification with same OTP code MUST be rejected (one-time-use consumed)
        res2 = self.client.post("/api/auth/verify-email", json={"email": email, "otp_code": plain_otp})
        self.assertEqual(res2.status_code, 400)

        # Cleanup
        user = db_service.get_user_by_email(email)
        if user:
            db_service.delete_user(user.id)

    # -------------------------------------------------------------------------
    # TEST 5: Requesting multiple OTPs and attempting to use an invalidated code
    # -------------------------------------------------------------------------
    def test_05_invalidated_prior_otp_rejected(self):
        email = f"multi_otp_{self.ts}@eventsphere.edu"
        otp1 = "111111"
        otp2 = "222222"

        pending_data = {
            "name": "Multi OTP User",
            "email": email,
            "hashed_password": hash_password("Password123!"),
            "role": "student",
            "registration_number": f"REG-MULTI-{self.ts}",
            "department": "Mechanical",
            "semester": "3",
            "hashed_otp": hash_otp(otp1),
            "attempts": 0,
            "max_attempts": 5,
            "last_sent_at": datetime.now(timezone.utc) - timedelta(seconds=70),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
            "created_at": datetime.now(timezone.utc),
        }
        db_service.save_pending_registration(pending_data)

        # Re-issue new OTP (invalidates otp1)
        pending_data["hashed_otp"] = hash_otp(otp2)
        pending_data["last_sent_at"] = datetime.now(timezone.utc)
        db_service.save_pending_registration(pending_data)

        # Attempt to use older invalidated otp1 fails
        res_old = self.client.post("/api/auth/verify-email", json={"email": email, "otp_code": otp1})
        self.assertEqual(res_old.status_code, 400)

        # Attempt with latest otp2 succeeds
        res_new = self.client.post("/api/auth/verify-email", json={"email": email, "otp_code": otp2})
        self.assertEqual(res_new.status_code, 200)

        # Cleanup
        user = db_service.get_user_by_email(email)
        if user:
            db_service.delete_user(user.id)

    # -------------------------------------------------------------------------
    # TEST 6: Creating duplicate accounts concurrently / duplicate email
    # -------------------------------------------------------------------------
    def test_06_duplicate_account_creation_blocked(self):
        email = f"dup_test_{self.ts}@eventsphere.edu"
        user1 = db_service.create_user(
            name="Original User",
            email=email,
            hashed_password=hash_password("Pass123!"),
            role=RoleEnum.student,
            registration_number=f"REG-ORIG-{self.ts}",
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )

        # Attempting create_user again with same email returns existing user without duplicating
        user2 = db_service.create_user(
            name="Duplicate User",
            email=email,
            hashed_password=hash_password("Pass123!"),
            role=RoleEnum.student,
            registration_number=f"REG-DUP-{self.ts}",
        )
        self.assertEqual(user1.id, user2.id, "create_user must prevent duplicate accounts for identical email")

        # Attempting API registration with existing email rejected
        res = self.client.post("/api/auth/register", json={
            "name": "Clone User",
            "email": email,
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "student",
            "registration_number": f"REG-DUP2-{self.ts}",
            "department": "CS",
            "semester": "1",
        })
        self.assertEqual(res.status_code, 400)

        # Cleanup
        db_service.delete_user(user1.id)

    # -------------------------------------------------------------------------
    # TEST 7: Attempting to assign an Admin role from the frontend/API (blocked)
    # -------------------------------------------------------------------------
    def test_07_self_assignment_of_admin_role_strictly_forbidden(self):
        email = f"hacker_admin_{self.ts}@eventsphere.edu"
        res = self.client.post("/api/auth/register", json={
            "name": "Fake Admin",
            "email": email,
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "admin",
            "admin_id": "ADM-HACK-001",
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("forbidden", res.json().get("detail", "").lower())

    # -------------------------------------------------------------------------
    # TEST 8: Accessing protected endpoints without authentication (HTTP 401)
    # -------------------------------------------------------------------------
    def test_08_unauthenticated_protected_endpoint_rejected(self):
        res = self.client.get("/api/users/me")
        self.assertEqual(res.status_code, 401)

        res2 = self.client.get("/api/admin/faculty")
        self.assertEqual(res2.status_code, 401)

    # -------------------------------------------------------------------------
    # TEST 9: Unverified accounts cannot access protected resources
    # -------------------------------------------------------------------------
    def test_09_unverified_account_blocked_from_protected_endpoints(self):
        email = f"unverified_jwt_{self.ts}@eventsphere.edu"
        user = db_service.create_user(
            name="Unverified JWT User",
            email=email,
            hashed_password=hash_password("Pass123!"),
            role=RoleEnum.student,
            registration_number=f"REG-UNV-JWT-{self.ts}",
            is_email_verified=False,
            is_active=False,
            approval_status="PENDING",
        )
        token = create_access_token({"sub": str(user.id), "role": "student"})

        # Try accessing /api/users/me with token of unverified user
        res = self.client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 403)
        self.assertIn("verify your email", res.json().get("detail", "").lower())

        # Cleanup
        db_service.delete_user(user.id)

    # -------------------------------------------------------------------------
    # TEST 10: Explicit logout invalidates active session token
    # -------------------------------------------------------------------------
    def test_10_explicit_logout_revokes_session(self):
        email = f"logout_test_{self.ts}@eventsphere.edu"
        user = db_service.create_user(
            name="Logout User",
            email=email,
            hashed_password=hash_password("Pass123!"),
            role=RoleEnum.student,
            registration_number=f"REG-LOGOUT-{self.ts}",
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )
        token = create_access_token({"sub": str(user.id), "role": "student"})

        # Valid before logout
        res_before = self.client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_before.status_code, 200)

        # Call /api/auth/logout
        res_logout = self.client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_logout.status_code, 200)

        # Access with previous token now rejected (session invalidated)
        res_after = self.client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_after.status_code, 401)

        # Cleanup
        db_service.delete_user(user.id)

    # -------------------------------------------------------------------------
    # TEST 11: OTP storage confirmation — bcrypt only, never plaintext
    # -------------------------------------------------------------------------
    def test_11_otp_storage_strictly_bcrypt_never_plaintext(self):
        test_otp = generate_otp(6)
        hashed = hash_otp(test_otp)
        self.assertTrue(hashed.startswith(("$2b$", "$2a$", "$2y$")))
        self.assertNotEqual(test_otp, hashed)
        self.assertTrue(verify_otp_hash(test_otp, hashed))
        self.assertFalse(verify_otp_hash("000000" if test_otp != "000000" else "111111", hashed))

    # -------------------------------------------------------------------------
    # TEST 12: Account approval workflow enforcement
    # -------------------------------------------------------------------------
    def test_12_pending_approval_restrictions(self):
        email = f"pending_appr_{self.ts}@eventsphere.edu"
        user = db_service.create_user(
            name="Pending Student",
            email=email,
            hashed_password=hash_password("Pass123!"),
            role=RoleEnum.student,
            registration_number=f"REG-PEND-{self.ts}",
            is_email_verified=True,
            is_active=False,
            approval_status="PENDING",
        )
        token = create_access_token({"sub": str(user.id), "role": "student"})

        # Attempt to access events creation or restricted actions
        res = self.client.post("/api/events", json={"title": "Unauthorized Event"}, headers={"Authorization": f"Bearer {token}"})
        self.assertIn(res.status_code, [401, 403])

        # Cleanup
        db_service.delete_user(user.id)


if __name__ == "__main__":
    unittest.main()
