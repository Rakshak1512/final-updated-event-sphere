"""
One-time database migration and audit script:
1. Validates and enforces that no plaintext OTPs exist across pending_registrations, email_verifications, login_otps, and password_resets.
2. Removes any legacy plaintext otp_code fields.
3. Invalidates expired or dangling OTPs.
4. Generates a secure audit summary.
"""
import os
import sys
from datetime import datetime, timezone

os.environ.setdefault("GRPC_POLL_STRATEGY", "poll")

from app.db.firestore_service import get_firestore_db

def migrate_and_clean_otps():
    db = get_firestore_db()
    stats = {
        "pending_registrations_cleaned": 0,
        "email_verifications_cleaned": 0,
        "login_otps_cleaned": 0,
        "password_resets_cleaned": 0,
        "plaintext_otps_found": 0,
    }

    # 1. Clean pending_registrations
    for doc in db.collection("pending_registrations").stream():
        data = doc.to_dict() or {}
        if "otp_code" in data:
            stats["plaintext_otps_found"] += 1
            doc.reference.update({"otp_code": None})
            stats["pending_registrations_cleaned"] += 1

    # 2. Clean email_verifications
    for doc in db.collection("email_verifications").stream():
        data = doc.to_dict() or {}
        updates = {}
        if data.get("otp_code"):
            stats["plaintext_otps_found"] += 1
            updates["otp_code"] = ""
        # Ensure is_used is set if expired
        exp = data.get("expires_at")
        if isinstance(exp, datetime):
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < datetime.now(timezone.utc) and not data.get("is_used"):
                updates["is_used"] = True
        if updates:
            doc.reference.update(updates)
            stats["email_verifications_cleaned"] += 1

    # 3. Clean login_otps
    for doc in db.collection("login_otps").stream():
        data = doc.to_dict() or {}
        updates = {}
        if data.get("otp_code"):
            stats["plaintext_otps_found"] += 1
            updates["otp_code"] = ""
        exp = data.get("expires_at")
        if isinstance(exp, datetime):
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < datetime.now(timezone.utc) and not data.get("is_used"):
                updates["is_used"] = True
        if updates:
            doc.reference.update(updates)
            stats["login_otps_cleaned"] += 1

    # 4. Clean password_resets
    for doc in db.collection("password_resets").stream():
        data = doc.to_dict() or {}
        updates = {}
        if data.get("otp_code"):
            stats["plaintext_otps_found"] += 1
            updates["otp_code"] = ""
        exp = data.get("expires_at")
        if isinstance(exp, datetime):
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < datetime.now(timezone.utc) and not data.get("is_used"):
                updates["is_used"] = True
        if updates:
            doc.reference.update(updates)
            stats["password_resets_cleaned"] += 1

    print("Migration & OTP Cleanup Summary:", stats)
    return stats

if __name__ == "__main__":
    migrate_and_clean_otps()
