from fastapi import APIRouter, Depends

from app.db import firestore_service as db_service
from app.dependencies import require_role
from app.models.user import RoleEnum, User
from app.schemas.analytics_schema import FacultyAnalytics, StudentAnalytics

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
    current_user: User = Depends(require_role(RoleEnum.admin)),
):
    data = db_service.get_admin_analytics()
    return data

