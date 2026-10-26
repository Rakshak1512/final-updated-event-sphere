import os
import sys
import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

os.environ.setdefault("GRPC_POLL_STRATEGY", "poll")

from app.main import app
from app.core.security import create_access_token, hash_password
from app.models.user import RoleEnum
from app.db import firestore_service as db_service

class TestRoleIsolationSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.ts = int(datetime.now(timezone.utc).timestamp())

        # Create temporary isolated test users for all 4 roles
        cls.admin_user = db_service.create_user(
            name="Iso Admin",
            email=f"iso_admin_{cls.ts}@eventsphere.test",
            hashed_password=hash_password("Pass123!"),
            role=RoleEnum.admin,
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )
        cls.admin_token = create_access_token({"sub": str(cls.admin_user.id), "role": "admin"})

        cls.faculty_user = db_service.create_user(
            name="Iso Faculty",
            email=f"iso_faculty_{cls.ts}@eventsphere.test",
            hashed_password=hash_password("Pass123!"),
            role=RoleEnum.faculty,
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )
        cls.faculty_token = create_access_token({"sub": str(cls.faculty_user.id), "role": "faculty"})

        cls.volunteer_user = db_service.create_user(
            name="Iso Volunteer",
            email=f"iso_vol_{cls.ts}@eventsphere.test",
            hashed_password=hash_password("Pass123!"),
            role=RoleEnum.volunteer,
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )
        cls.volunteer_token = create_access_token({"sub": str(cls.volunteer_user.id), "role": "volunteer"})

        cls.student_user = db_service.create_user(
            name="Iso Student",
            email=f"iso_stu_{cls.ts}@eventsphere.test",
            hashed_password=hash_password("Pass123!"),
            role=RoleEnum.student,
            is_email_verified=True,
            is_active=True,
            approval_status="APPROVED",
        )
        cls.student_token = create_access_token({"sub": str(cls.student_user.id), "role": "student"})

    @classmethod
    def tearDownClass(cls):
        for u in [cls.admin_user, cls.faculty_user, cls.volunteer_user, cls.student_user]:
            if u and getattr(u, "id", None):
                db_service.delete_user(u.id)

    # 1. Admin Analytics endpoint isolation
    def test_01_admin_analytics_strictly_admin_only(self):
        admin_res = self.client.get("/api/analytics/admin", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(admin_res.status_code, 200, "Admin must be authorized for Admin Analytics")

        fac_res = self.client.get("/api/analytics/admin", headers={"Authorization": f"Bearer {self.faculty_token}"})
        self.assertEqual(fac_res.status_code, 403, "Faculty must be forbidden from Admin Analytics")

        vol_res = self.client.get("/api/analytics/admin", headers={"Authorization": f"Bearer {self.volunteer_token}"})
        self.assertEqual(vol_res.status_code, 403, "Volunteer must be forbidden from Admin Analytics")

        stu_res = self.client.get("/api/analytics/admin", headers={"Authorization": f"Bearer {self.student_token}"})
        self.assertEqual(stu_res.status_code, 403, "Student must be forbidden from Admin Analytics")

    # 2. Volunteer Dashboard endpoint isolation
    def test_02_volunteer_dashboard_strictly_volunteer_only(self):
        vol_res = self.client.get("/api/volunteer/dashboard", headers={"Authorization": f"Bearer {self.volunteer_token}"})
        self.assertEqual(vol_res.status_code, 200, "Volunteer must access Volunteer Dashboard")

        admin_res = self.client.get("/api/volunteer/dashboard", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(admin_res.status_code, 403, "Admin must NOT access Volunteer Dashboard")

        fac_res = self.client.get("/api/volunteer/dashboard", headers={"Authorization": f"Bearer {self.faculty_token}"})
        self.assertEqual(fac_res.status_code, 403, "Faculty must NOT access Volunteer Dashboard")

        stu_res = self.client.get("/api/volunteer/dashboard", headers={"Authorization": f"Bearer {self.student_token}"})
        self.assertEqual(stu_res.status_code, 403, "Student must NOT access Volunteer Dashboard")

    # 3. Admin reports summary isolation
    def test_03_admin_reports_summary_isolation(self):
        admin_res = self.client.get("/api/admin/reports/summary", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(admin_res.status_code, 200)

        for token, role_name in [(self.faculty_token, "faculty"), (self.volunteer_token, "volunteer"), (self.student_token, "student")]:
            res = self.client.get("/api/admin/reports/summary", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(res.status_code, 403, f"{role_name} must be forbidden from Admin reports summary")

    # 4. Manage registrations access control
    def test_04_manage_registrations_access_control(self):
        # Event 1 or any event ID
        ev_id = 1
        stu_res = self.client.get(f"/api/registrations/event/{ev_id}", headers={"Authorization": f"Bearer {self.student_token}"})
        self.assertEqual(stu_res.status_code, 403, "Student must NOT manage event registrations")

        vol_res = self.client.get(f"/api/registrations/event/{ev_id}", headers={"Authorization": f"Bearer {self.volunteer_token}"})
        self.assertEqual(vol_res.status_code, 403, "Volunteer must NOT manage event registrations")

    # 5. Event review report security
    def test_05_event_review_report_security(self):
        ev_id = 1
        stu_res = self.client.get(f"/api/events/{ev_id}/report", headers={"Authorization": f"Bearer {self.student_token}"})
        self.assertEqual(stu_res.status_code, 403, "Student must NOT access private event review report")

        vol_res = self.client.get(f"/api/events/{ev_id}/report", headers={"Authorization": f"Bearer {self.volunteer_token}"})
        self.assertEqual(vol_res.status_code, 403, "Volunteer must NOT access private event review report")

if __name__ == "__main__":
    unittest.main()
