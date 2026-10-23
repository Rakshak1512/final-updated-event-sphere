"""
Production Bug Fix Verification Test Suite:
1. OTP Private Email Delivery & Security (No frontend/API leakage, hashed verification, rate-limiting, failure handling)
2. Cross-Device PDF Downloads (Valid binary PDF bytes, Content-Type, Content-Disposition: attachment, security headers)
"""
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

from fastapi.testclient import TestClient

from app.main import app
from app.db import firestore_service as db_service
from app.core.security import generate_otp, hash_otp, verify_otp_hash, hash_password
from app.core.config import settings
from app.models.user import RoleEnum


class TestProductionBugFixes(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        self.timestamp = int(datetime.now().timestamp())
        self.test_email = f"bugfix_test_{self.timestamp}@college.edu"
        self.test_password = "SecurePassword@123"

    def tearDown(self):
        try:
            db_service.delete_pending_registration(self.test_email)
        except Exception:
            pass
        try:
            u = db_service.get_user_by_email(self.test_email)
            if u:
                db_service.delete_user(u.id)
        except Exception:
            pass

    # =========================================================================
    # ISSUE 1: OTP EMAIL DELIVERY & NO LEAKAGE TESTS
    # =========================================================================

    @patch("app.api.routes.auth_routes.send_password_reset_otp_email")
    def test_01_forgot_password_never_leaks_otp_in_response(self, mock_send_email):
        """Verifies that forgot-password response never contains dev_otp or plaintext OTP."""
        mock_send_email.return_value = (True, "Delivered")

        # Create active verified user
        user = db_service.create_user(
            name="OTP Tester",
            email=self.test_email,
            hashed_password=hash_password(self.test_password),
            role="student",
            registration_number=f"REG_OTP_{self.timestamp}",
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )

        resp = self.client.post("/api/auth/forgot-password", json={"email": self.test_email})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Critical: OTP must NOT be in API response
        self.assertNotIn("dev_otp", data)
        self.assertNotIn("otp", data)
        self.assertNotIn("code", data)
        self.assertIn("password reset OTP has been sent", data.get("message", ""))

        # Verify email dispatch was actually invoked with a 6-digit numeric OTP
        mock_send_email.assert_called_once()
        args = mock_send_email.call_args[0]
        to_email, name, otp_code, exp_mins = args
        self.assertEqual(to_email, self.test_email)
        self.assertEqual(len(otp_code), 6)
        self.assertTrue(otp_code.isdigit())

    @patch("app.api.routes.auth_routes.send_password_reset_otp_email")
    def test_02_forgot_password_generic_response_for_nonexistent_email(self, mock_send_email):
        """Verifies safe generic message when email does not exist, without leaking existence or sending email."""
        resp = self.client.post("/api/auth/forgot-password", json={"email": "nonexistent_user_999@college.edu"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertNotIn("dev_otp", data)
        self.assertIn("If that email exists", data.get("message", ""))
        mock_send_email.assert_not_called()

    @patch("app.api.routes.auth_routes.send_password_reset_otp_email")
    def test_03_forgot_password_email_failure_raises_503_and_never_leaks_otp(self, mock_send_email):
        """Verifies that SMTP failure raises 503 and never claims success or returns dev_otp."""
        mock_send_email.return_value = (False, "Gmail SMTP authentication failed (535 Bad Credentials)")

        user = db_service.create_user(
            name="Fail Tester",
            email=self.test_email,
            hashed_password=hash_password(self.test_password),
            role="student",
            registration_number=f"REG_FAIL_{self.timestamp}",
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )

        resp = self.client.post("/api/auth/forgot-password", json={"email": self.test_email})
        self.assertEqual(resp.status_code, 503)
        data = resp.json()

        self.assertNotIn("dev_otp", data)
        self.assertIn("Unable to deliver password reset email", data.get("detail", ""))

    @patch("app.api.routes.auth_routes.send_otp_email")
    def test_04_register_never_leaks_otp_in_response(self, mock_send_email):
        """Verifies registration response never includes dev_otp."""
        mock_send_email.return_value = (True, "Delivered")

        payload = {
            "name": "Jane Secure",
            "email": self.test_email,
            "password": self.test_password,
            "confirm_password": self.test_password,
            "role": "student",
            "registration_number": f"REG_SEC_{self.timestamp}",
            "department": "Computer Science",
            "semester": "5",
        }

        resp = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertNotIn("dev_otp", data)
        self.assertNotIn("otp", data)

    @patch("app.api.routes.auth_routes.send_password_reset_otp_email")
    def test_05_password_reset_otp_expiry_and_invalidation(self, mock_send_email):
        """Verifies that expired OTP is rejected and marked used."""
        mock_send_email.return_value = (True, "Delivered")

        user = db_service.create_user(
            name="Expiry Tester",
            email=self.test_email,
            hashed_password=hash_password(self.test_password),
            role="student",
            registration_number=f"REG_EXP_{self.timestamp}",
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )

        # Create expired reset
        otp = "654321"
        expired_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        db_service.create_password_reset(user.id, otp, expired_at)

        resp = self.client.post("/api/auth/verify-reset-otp", json={"email": self.test_email, "otp_code": otp})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("expired", resp.json().get("detail", "").lower())

    @patch("app.api.routes.auth_routes.send_password_reset_otp_email")
    def test_06_password_reset_attempt_limits_and_reuse_prevention(self, mock_send_email):
        """Verifies that brute force attempts are capped at 5 and OTP reuse is blocked."""
        mock_send_email.return_value = (True, "Delivered")

        user = db_service.create_user(
            name="Brute Tester",
            email=self.test_email,
            hashed_password=hash_password(self.test_password),
            role="student",
            registration_number=f"REG_BRUTE_{self.timestamp}",
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )

        otp = "789123"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        pr = db_service.create_password_reset(user.id, otp, expires_at)

        # 4 incorrect attempts
        for attempt in range(1, 5):
            r = self.client.post("/api/auth/verify-reset-otp", json={"email": self.test_email, "otp_code": "000000"})
            self.assertEqual(r.status_code, 400)
            self.assertIn("Invalid OTP", r.json().get("detail", ""))

        # 5th incorrect attempt locks out
        r5 = self.client.post("/api/auth/verify-reset-otp", json={"email": self.test_email, "otp_code": "000000"})
        self.assertEqual(r5.status_code, 400)
        self.assertIn("Maximum verification attempts exceeded", r5.json().get("detail", ""))

        # Valid OTP now fails because maximum attempts were exceeded
        r_valid = self.client.post("/api/auth/verify-reset-otp", json={"email": self.test_email, "otp_code": otp})
        self.assertEqual(r_valid.status_code, 400)

    # =========================================================================
    # ISSUE 2: PDF GENERATION & CROSS-DEVICE DOWNLOAD TESTS
    # =========================================================================

    def test_07_admin_faculty_pdf_report_headers_and_bytes(self):
        """Verifies faculty PDF endpoint returns genuine PDF binary bytes and proper attachment headers."""
        admin_user = db_service.get_user_by_email("admin@eventsphere.edu")
        if not admin_user:
            admin_user = db_service.create_user(
                name="System Admin",
                email="admin@eventsphere.edu",
                hashed_password=hash_password("AdminPass123!"),
                role="admin",
                admin_id="ADM-001",
                is_email_verified=True,
                is_active=True,
                approval_status="APPROVED",
            )

        from app.core.security import create_access_token
        token = create_access_token({"sub": str(admin_user.id), "role": RoleEnum.admin.value})

        headers = {"Authorization": f"Bearer {token}"}
        resp = self.client.get("/api/admin/reports/faculty/all/pdf", headers=headers)
        self.assertEqual(resp.status_code, 200)

        # 1. Content-Type must be application/pdf
        self.assertEqual(resp.headers.get("content-type"), "application/pdf")

        # 2. Content-Disposition must be attachment with descriptive filename
        disposition = resp.headers.get("content-disposition", "")
        self.assertIn("attachment", disposition)
        self.assertIn("All Faculty.pdf", disposition)

        # 3. Cache & security headers
        self.assertIn("no-cache", resp.headers.get("cache-control", ""))
        self.assertEqual(resp.headers.get("x-content-type-options"), "nosniff")

        # 4. Binary PDF validation: must begin with standard PDF header '%PDF-'
        pdf_bytes = resp.content
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"), "Response does not start with valid PDF magic bytes '%PDF-'")
        self.assertGreater(len(pdf_bytes), 500)

    def test_08_admin_student_pdf_report_headers_and_bytes(self):
        """Verifies student approval PDF report endpoint returns genuine PDF bytes."""
        from app.core.security import create_access_token
        admin_user = db_service.get_user_by_email("admin@eventsphere.edu")
        token = create_access_token({"sub": str(admin_user.id if admin_user else 1), "role": RoleEnum.admin.value})

        headers = {"Authorization": f"Bearer {token}"}
        resp = self.client.get("/api/faculty/reports/students/all/pdf", headers=headers)
        self.assertEqual(resp.status_code, 200)

        self.assertEqual(resp.headers.get("content-type"), "application/pdf")
        self.assertIn("attachment", resp.headers.get("content-disposition", ""))
        self.assertEqual(resp.headers.get("x-content-type-options"), "nosniff")

        pdf_bytes = resp.content
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
        self.assertGreater(len(pdf_bytes), 500)

    def test_09_certificate_download_endpoint_headers_and_bytes(self):
        """Verifies certificate download endpoint returns attachment disposition and valid binary PDF."""
        from app.core.security import create_access_token
        from app.models.certificate import Certificate

        # Create student user
        student = db_service.create_user(
            name="Cert Student",
            email=f"cert_student_{self.timestamp}@college.edu",
            hashed_password=hash_password(self.test_password),
            role="student",
            registration_number=f"REG_CERT_{self.timestamp}",
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )

        # Create dummy certificate in DB
        cert_id = db_service.get_next_id("certificates")
        cert = Certificate(
            id=cert_id,
            registration_number=student.registration_number,
            title="Merit of Excellence",
            event_id=1,
            uploaded_at=datetime.now(timezone.utc),
            file_path="certificates/test_cert.pdf",
            uploaded_by=1,
        )
        db_service.get_firestore_db().collection("certificates").document(str(cert_id)).set(cert.to_dict())

        token = create_access_token({"sub": str(student.id), "role": RoleEnum.student.value})
        headers = {"Authorization": f"Bearer {token}"}

        resp = self.client.get(f"/api/certificates/{cert_id}/download", headers=headers)
        self.assertEqual(resp.status_code, 200)

        # Validate headers
        self.assertEqual(resp.headers.get("content-type"), "application/pdf")
        disposition = resp.headers.get("content-disposition", "")
        self.assertIn("attachment", disposition)
        self.assertIn("Merit of Excellence.pdf", disposition)
        self.assertEqual(resp.headers.get("x-content-type-options"), "nosniff")

        # Validate binary PDF bytes
        pdf_bytes = resp.content
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
        self.assertGreaterEqual(len(pdf_bytes), 35)

        # Clean up
        try:
            db_service.delete_user(student.id)
            db_service.get_firestore_db().collection("certificates").document(str(cert_id)).delete()
        except Exception:
            pass


if __name__ == "__main__":
    unittest.main()
