from fastapi import APIRouter, Depends

from app.db import firestore_service as db_service
from app.dependencies import require_role
from app.models.user import RoleEnum, User
from app.schemas.analytics_schema import FacultyAnalytics, StudentAnalytics

from typing import Optional

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/student", response_model=StudentAnalytics)
def student_analytics(
    current_user: User = Depends(require_role(RoleEnum.student)),
):
    data = db_service.get_student_analytics(
        student_id=current_user.id,
        registration_number=current_user.registration_number,
    )
    return StudentAnalytics(**data)


@router.get("/faculty", response_model=FacultyAnalytics)
def faculty_analytics(
    current_user: User = Depends(require_role(RoleEnum.faculty, RoleEnum.admin)),
):
    data = db_service.get_faculty_analytics(
        faculty_id=current_user.id,
    )
    return FacultyAnalytics(**data)


@router.get("/admin")
def admin_analytics(
    time_range: Optional[str] = None,
    event_id: Optional[int] = None,
    category: Optional[str] = None,
    registration_status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    data = db_service.get_admin_analytics(
        time_range=time_range,
        event_id=event_id,
        category=category,
        registration_status=registration_status,
        date_from=date_from,
        date_to=date_to,
    )
    return data

