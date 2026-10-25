"""
Reusable FastAPI dependencies: current user extraction, role guards.
"""
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token
from app.db.firestore_service import get_user_by_id
from app.models.user import RoleEnum, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user_optional(token: str = Depends(oauth2_scheme)) -> Optional[User]:
    if not token:
        return None
    try:
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if user_id is None:
            return None
        resolved_id = int(user_id) if str(user_id).isdigit() else str(user_id)
        return get_user_by_id(resolved_id)
    except Exception:
        return None


def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        resolved_id = int(user_id) if str(user_id).isdigit() else str(user_id)
        user = get_user_by_id(resolved_id)
    except Exception:
        raise credentials_exception

    if user is None:
        raise credentials_exception

    return user


def require_role(*roles: RoleEnum):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (
            current_user.role.value.lower()
            if hasattr(current_user.role, "value")
            else str(current_user.role).lower()
        )
        role_vals = [r.value.lower() if hasattr(r, "value") else str(r).lower() for r in roles]
        if user_role not in role_vals:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        # Admin accounts are always approved and bypass approval requirement
        if user_role == "admin":
            return current_user

        if getattr(current_user, "is_deleted", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_REMOVED",
            )

        # Enforce strict approval status for non-admin roles
        raw_st = getattr(current_user, "approval_status", None)
        approval_st = str(raw_st or "PENDING").upper().strip()
        if approval_st in ("ACTIVE", "APPROVED"):
            return current_user

        if approval_st in ("PENDING", "PENDING_FACULTY_APPROVAL", "PENDING_ADMIN_APPROVAL"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_PENDING_APPROVAL",
            )
        elif approval_st == "REJECTED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_REJECTED",
            )
        elif approval_st in ("REMOVED", "DELETED"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_REMOVED",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCOUNT_PENDING_APPROVAL",
            )

    return role_checker


def get_current_approved_user(current_user: User = Depends(get_current_user)) -> User:
    user_role = (
        current_user.role.value.lower()
        if hasattr(current_user.role, "value")
        else str(current_user.role).lower()
    )
    # Admin accounts are always approved and bypass approval requirement
    if user_role == "admin":
        return current_user

    if getattr(current_user, "is_deleted", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCOUNT_REMOVED",
        )

    # Enforce strict approval status for non-admin roles
    raw_st = getattr(current_user, "approval_status", None)
    approval_st = str(raw_st or "PENDING").upper().strip()
    if approval_st in ("ACTIVE", "APPROVED"):
        return current_user

    if approval_st in ("PENDING", "PENDING_FACULTY_APPROVAL", "PENDING_ADMIN_APPROVAL"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCOUNT_PENDING_APPROVAL",
        )
    elif approval_st == "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCOUNT_REJECTED",
        )
    elif approval_st in ("REMOVED", "DELETED"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCOUNT_REMOVED",
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCOUNT_PENDING_APPROVAL",
        )


def get_client_ip(request: Request) -> str:
    if not request:
        return "unknown"
    headers = getattr(request, "headers", None)
    if headers:
        forwarded = headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    client = getattr(request, "client", None)
    if client and hasattr(client, "host"):
        return client.host
    return "unknown"
