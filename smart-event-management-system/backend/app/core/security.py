import hashlib
import hmac
import random
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
import bcrypt
if not hasattr(bcrypt, "__about__"):
    class About:
        __version__ = getattr(bcrypt, "__version__", "4.1.3")
    bcrypt.__about__ = About()

from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    expire = now_utc + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": int(now_utc.timestamp()), "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    expire = now_utc + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "iat": int(now_utc.timestamp()), "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None




def generate_otp(length: int = None) -> str:
    """Generate a cryptographically secure 6-digit numeric OTP using secrets."""
    target_len = length or getattr(settings, "OTP_LENGTH", 6) or 6
    return "".join(secrets.choice(string.digits) for _ in range(target_len))


def hash_otp(otp_code: str) -> str:
    """
    Hash OTP code using bcrypt with a unique salt per generation.
    Never store plaintext OTPs anywhere.
    """
    clean_otp = str(otp_code).strip()
    return pwd_context.hash(clean_otp)


def verify_otp_hash(plain_otp: str, hashed_otp: str) -> bool:
    """
    Verify submitted plain OTP against stored bcrypt hash using constant-time comparison.
    Includes backward-compatible fallback for legacy HMAC-SHA256 hashes during migration.
    """
    if not plain_otp or not hashed_otp:
        return False
    clean_otp = str(plain_otp).strip()
    hash_str = str(hashed_otp).strip()

    # 1. Bcrypt hash check ($2b$, $2a$, $2y$)
    if hash_str.startswith(("$2b$", "$2a$", "$2y$")):
        try:
            return pwd_context.verify(clean_otp, hash_str)
        except Exception:
            return False

    # 2. Legacy HMAC-SHA256 fallback (during migration period)
    try:
        key = (getattr(settings, "SECRET_KEY", None) or "eventsphere-otp-secret").encode("utf-8")
        computed = hmac.new(key, clean_otp.encode("utf-8"), hashlib.sha256).hexdigest()
        if hmac.compare_digest(computed, hash_str):
            return True
    except Exception:
        pass

    return False

