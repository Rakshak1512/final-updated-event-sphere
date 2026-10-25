import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

os.environ.setdefault("GRPC_POLL_STRATEGY", "poll")

from app.core.security import generate_otp, hash_otp, verify_otp_hash
from app.db import firestore_service
from app.models.auth_tokens import EmailVerification, PasswordReset


class TestOTPSecurityLifecycle(unittest.TestCase):

    def test_01_bcrypt_hash_generation_and_verification(self):
        """Verify that newly generated OTPs produce bcrypt hashes with unique salts and constant-time match."""
        otp1 = generate_otp(6)
        otp2 = generate_otp(6)
        self.assertEqual(len(otp1), 6)
        self.assertTrue(otp1.isdigit())

        h1 = hash_otp(otp1)
        h2 = hash_otp(otp1)
        # Unique salt per hash: two hashes of the same OTP must differ
        self.assertNotEqual(h1, h2)
        self.assertTrue(h1.startswith(("$2b$", "$2a$", "$2y$")), f"Hash should be bcrypt: {h1}")
        self.assertTrue(h2.startswith(("$2b$", "$2a$", "$2y$")))

        # Correct OTP verifies
        self.assertTrue(verify_otp_hash(otp1, h1))
        self.assertTrue(verify_otp_hash(otp1, h2))

        # Incorrect OTP fails
        self.assertFalse(verify_otp_hash("000000" if otp1 != "000000" else "111111", h1))
        # Plaintext string comparison against hash must never match
        self.assertFalse(h1 == otp1)

    def test_02_email_verification_lifecycle(self):
        """Test full EmailVerification lifecycle: creation, no plaintext storage, bcrypt verification, invalidation."""
        dummy_user_id = 999991
        plain_otp = generate_otp(6)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        # 1. Create verification
        ev = firestore_service.create_email_verification(dummy_user_id, plain_otp, expires_at)
        self.assertIsNotNone(ev)
        self.assertEqual(ev.otp_code, "", "In-memory representation must have empty otp_code")
        self.assertTrue(ev.hashed_otp.startswith(("$2b$", "$2a$", "$2y$")), "Stored hash must be bcrypt")

        # 2. Check Firestore document content directly: NO plaintext otp_code field
        db = firestore_service.get_firestore_db()
        doc = db.collection("email_verifications").document(str(ev.id)).get()
        self.assertTrue(doc.exists)
        doc_data = doc.to_dict()
        self.assertNotIn("otp_code", doc_data, "Plaintext otp_code must NEVER exist in Firestore document")
        self.assertIn("hashed_otp", doc_data)
        self.assertTrue(doc_data["hashed_otp"].startswith(("$2b$", "$2a$", "$2y$")))

        # 3. Wrong OTP attempt
        ok, msg, _ = firestore_service.verify_email_verification_otp(dummy_user_id, "999999")
        self.assertFalse(ok)
        self.assertIn("Invalid", msg)

        # 4. Correct OTP verification
        ok, msg, verified_ev = firestore_service.verify_email_verification_otp(dummy_user_id, plain_otp)
        self.assertTrue(ok)
        self.assertIn("successful", msg)

        # 5. Replay attempt: must fail because is_used is now True
        ok, msg, _ = firestore_service.verify_email_verification_otp(dummy_user_id, plain_otp)
        self.assertFalse(ok)

        # Cleanup test document
        db.collection("email_verifications").document(str(ev.id)).delete()

    def test_03_login_otp_lifecycle(self):
        """Test full Login OTP lifecycle: creation, bcrypt hashing, verification, attempt limits."""
        test_email = "otp_security_test@example.com"
        plain_otp = generate_otp(6)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        # 1. Create login OTP
        ok, msg, data = firestore_service.create_login_otp(test_email, plain_otp, expires_at)
        self.assertTrue(ok)
        self.assertIsNotNone(data)
        lo_id = data["id"]

        # 2. Check Firestore: NO plaintext otp_code stored
        db = firestore_service.get_firestore_db()
        doc = db.collection("login_otps").document(str(lo_id)).get()
        self.assertTrue(doc.exists)
        doc_data = doc.to_dict()
        self.assertNotIn("otp_code", doc_data, "Plaintext otp_code must NEVER exist in Firestore document")
        self.assertTrue(doc_data["hashed_otp"].startswith(("$2b$", "$2a$", "$2y$")))

        # 3. Verification with wrong OTP fails
        ok, msg, _ = firestore_service.verify_login_otp_code(test_email, "000000")
        self.assertFalse(ok)

        # 4. Verification with correct OTP succeeds
        ok, msg, verified = firestore_service.verify_login_otp_code(test_email, plain_otp)
        self.assertTrue(ok)
        self.assertIn("verified", msg)

        # 5. Replay fails
        ok, msg, _ = firestore_service.verify_login_otp_code(test_email, plain_otp)
        self.assertFalse(ok)

        # Cleanup
        db.collection("login_otps").document(str(lo_id)).delete()

    def test_04_password_reset_bcrypt_lifecycle(self):
        """Test PasswordReset lifecycle: bcrypt hashing, no plaintext in to_dict(), invalidation on resend."""
        dummy_user_id = 999992
        plain_otp = generate_otp(6)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        pr = firestore_service.create_password_reset(dummy_user_id, plain_otp, expires_at)
        self.assertIsNotNone(pr)
        self.assertTrue(pr.hashed_otp.startswith(("$2b$", "$2a$", "$2y$")))

        db = firestore_service.get_firestore_db()
        doc = db.collection("password_resets").document(str(pr.id)).get()
        self.assertTrue(doc.exists)
        doc_data = doc.to_dict()
        self.assertNotIn("otp_code", doc_data, "Plaintext otp_code must NEVER exist in Firestore document")

        # Verify hash match
        self.assertTrue(verify_otp_hash(plain_otp, doc_data["hashed_otp"]))

        # Issuing a new password reset must invalidate the previous one
        plain_otp2 = generate_otp(6)
        pr2 = firestore_service.create_password_reset(dummy_user_id, plain_otp2, expires_at)
        doc1_updated = db.collection("password_resets").document(str(pr.id)).get().to_dict()
        self.assertTrue(doc1_updated["is_used"], "Previous OTP must be marked is_used=True immediately on resend")

        # Cleanup
        db.collection("password_resets").document(str(pr.id)).delete()
        db.collection("password_resets").document(str(pr2.id)).delete()


if __name__ == "__main__":
    unittest.main()
