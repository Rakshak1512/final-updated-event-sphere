import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import firestore_service as db_service
from app.dependencies import require_role
from app.models.notification import NotificationType
from app.models.user import RoleEnum, User
from app.schemas.volunteer_schema import (
    TicketVerifyRequest,
    AttendeeVerificationOut,
    AttendanceConfirmRequest,
    AttendanceConfirmResponse,
    VolunteerDashboardStats,
)
from app.services.websocket_manager import notify_clients_sync
from app.services.email_service import (
    send_attendance_confirmed_student_email,
    send_attendance_confirmed_faculty_email,
)

logger = logging.getLogger("app.volunteer")
router = APIRouter(prefix="/api/volunteer", tags=["Volunteer"])


@router.get("/dashboard", response_model=VolunteerDashboardStats)
def get_volunteer_dashboard(
    current_user: User = Depends(require_role(RoleEnum.volunteer)),
):
    """
    Get stats, assigned events, and recent scans for the volunteer dashboard.
    """
    return db_service.get_volunteer_dashboard_data(current_user)


@router.post("/verify-ticket", response_model=AttendeeVerificationOut)
def verify_ticket(
    payload: TicketVerifyRequest,
    current_user: User = Depends(require_role(RoleEnum.volunteer, RoleEnum.faculty, RoleEnum.admin)),
):
    """
    Step 1 of QR Scanning: Verifies ticket without modifying attendance.
    Returns attendee verification details for visual confirmation.
    """
    ticket_payload = payload.ticket_code or payload.qr_payload or ""
    ok, msg, attendee_info = db_service.verify_ticket_for_volunteer(
        volunteer_user=current_user,
        ticket_code_or_payload=ticket_payload,
        event_id=payload.event_id,
    )
    if not ok:
        if attendee_info and attendee_info.get("already_attended"):
            # Return attendee verification details with already_attended=True for visual inspection and UI disabling
            return AttendeeVerificationOut(**attendee_info)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    return AttendeeVerificationOut(**attendee_info)


@router.post("/confirm-attendance", response_model=AttendanceConfirmResponse)
def confirm_attendance(
    payload: AttendanceConfirmRequest,
    current_user: User = Depends(require_role(RoleEnum.volunteer, RoleEnum.faculty, RoleEnum.admin)),
):
    """
    Step 2 of QR Scanning: Atomically marks attendance, prevents duplicate check-ins,
    and sends Web Notifications + SMTP Emails to student and faculty organizer.
    """
    ok, msg, reg, event, student = db_service.confirm_attendance_atomic(
        volunteer_user=current_user,
        registration_id=payload.registration_id,
        event_id=payload.event_id,
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p")
    vol_name = current_user.name or f"Volunteer #{current_user.id}"
    event_title = event.title if event else "Campus Event"
    event_date_str = str(event.event_date) if event else "Today"

    # 1. Student Web Notification
    if student:
        db_service.create_notification(
            user_id=student.id,
            title="Attendance Confirmed",
            message=f"You attended {event_title}. Checked in by {vol_name} at {now_str}.",
            type=NotificationType.general,
        )

        # 2. Student Email
        try:
            send_attendance_confirmed_student_email(
                to_email=student.email,
                student_name=student.name,
                event_title=event_title,
                event_date=event_date_str,
                attendance_time=now_str,
                volunteer_name=vol_name,
            )
        except Exception as e:
            logger.error("[EMAIL ERROR] Exception sending student attendance email: %s", e)

    # 3. Faculty Web Notification
    if event and event.created_by:
        db_service.create_notification(
            user_id=event.created_by,
            title="Student Attendance Confirmed",
            message=f"{student.name if student else 'Student'} ({student.registration_number if student else 'N/A'}) has attended {event_title}. Checked in by {vol_name}.",
            type=NotificationType.general,
        )

        # 4. Faculty Email
        faculty_user = db_service.get_user_by_id(event.created_by)
        if faculty_user and faculty_user.email:
            try:
                send_attendance_confirmed_faculty_email(
                    to_email=faculty_user.email,
                    faculty_name=faculty_user.name,
                    student_name=student.name if student else "Student",
                    registration_number=student.registration_number if student else "N/A",
                    event_title=event_title,
                    attendance_time=now_str,
                    volunteer_name=vol_name,
                )
            except Exception as e:
                logger.error("[EMAIL ERROR] Exception sending faculty attendance notification email: %s", e)

    # Real-time WebSocket broadcast: attendance checked in
    notify_clients_sync({
        "type": "ATTENDANCE_CHECKED_IN",
        "registration_id": payload.registration_id,
        "event_id": reg.event_id,
        "student_id": reg.student_id,
        "status": "attended",
        "checked_in_at": now_str,
        "checked_in_by": vol_name,
        "ticket_code": reg.ticket_code,
    }, event_id=reg.event_id)

    return AttendanceConfirmResponse(
        message="Attendance Confirmed",
        registration_id=payload.registration_id,
        student_name=student.name if student else "Student",
        registration_number=student.registration_number if student else None,
        event_title=event_title,
        status="Present",
        checked_in_by=vol_name,
        checked_in_at=now_str,
    )
