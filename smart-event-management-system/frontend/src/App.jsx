import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import Loader from "./components/ui/Loader.jsx";
import PullToRefresh from "./components/common/PullToRefresh.jsx";

// Core landing & auth pages loaded directly for instant initial paint
import Home from "./pages/landing/Home.jsx";
import EventsBrowse from "./pages/landing/EventsBrowse.jsx";
import EventDetail from "./pages/landing/EventDetail.jsx";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import VerifyEmail from "./pages/auth/VerifyEmail.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import AwaitingApproval from "./pages/auth/AwaitingApproval.jsx";

// Dashboards and feature workspaces lazily loaded on demand
const StudentDashboard = lazy(() => import("./pages/student/Dashboard.jsx"));
const MyRegistrations = lazy(() => import("./pages/student/MyRegistrations.jsx"));
const StudentCertificates = lazy(() => import("./pages/student/Certificates.jsx"));

const FacultyDashboard = lazy(() => import("./pages/faculty/Dashboard.jsx"));
const FacultyStudentApprovals = lazy(() => import("./pages/faculty/StudentApprovals.jsx"));
const FacultyVolunteerApprovals = lazy(() => import("./pages/faculty/VolunteerApprovals.jsx"));
const ManageEvents = lazy(() => import("./pages/faculty/ManageEvents.jsx"));
const FacultyRegistrations = lazy(() => import("./pages/faculty/Registrations.jsx"));
const ManageRegistrations = lazy(() => import("./pages/faculty/ManageRegistrations.jsx"));
const ManageCertificates = lazy(() => import("./pages/faculty/ManageCertificates.jsx"));
const FacultyResults = lazy(() => import("./pages/faculty/Results.jsx"));
const AssignedTasks = lazy(() => import("./pages/faculty/AssignedTasks.jsx"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const AdminAnalyticsDashboard = lazy(() => import("./pages/admin/AdminAnalyticsDashboard.jsx"));
const AdminFacultyApprovals = lazy(() => import("./pages/admin/FacultyApprovals.jsx"));
const FacultyList = lazy(() => import("./pages/admin/FacultyList.jsx"));
const AdminAssignments = lazy(() => import("./pages/admin/Assignments.jsx"));
const AdminReports = lazy(() => import("./pages/admin/Reports.jsx"));

const VolunteerDashboard = lazy(() => import("./pages/volunteer/VolunteerDashboard.jsx"));

const Notifications = lazy(() => import("./pages/shared/Notifications.jsx"));
const Profile = lazy(() => import("./pages/shared/Profile.jsx"));
const Settings = lazy(() => import("./pages/shared/Settings.jsx"));

export default function App() {
  return (
    <>
      <PullToRefresh />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            fontSize: "14px",
          },
        }}
      />
      <Suspense fallback={<Loader />}>
      <Routes>
        {/* Continuous Single-Page Landing Experience */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<Navigate to="/#about" replace />} />
        <Route path="/features" element={<Navigate to="/#features" replace />} />
        <Route path="/events" element={<EventsBrowse />} />
        <Route path="/events/:id" element={<EventDetail />} />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
        <Route path="/awaiting-approval" element={<AwaitingApproval />} />

        {/* Student routes (Analytics completely removed) */}
        <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
          <Route path="/student" element={<DashboardLayout role="student" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="events" element={<EventsBrowse embedded={true} />} />
            <Route path="events/:id" element={<EventDetail embedded={true} />} />
            <Route path="my-registrations" element={<MyRegistrations />} />
            <Route path="certificates" element={<StudentCertificates />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Faculty routes */}
        <Route element={<ProtectedRoute allowedRoles={["faculty"]} />}>
          <Route path="/faculty" element={<DashboardLayout role="faculty" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<FacultyDashboard />} />
            <Route path="student-approvals" element={<FacultyStudentApprovals />} />
            <Route path="volunteer-approvals" element={<FacultyVolunteerApprovals />} />
            <Route path="approvals" element={<FacultyStudentApprovals />} />
            <Route path="events" element={<ManageEvents />} />
            <Route path="events/:id" element={<EventDetail embedded={true} />} />
            <Route path="registrations" element={<FacultyRegistrations />} />
            <Route path="registration-reports" element={<ManageRegistrations />} />
            <Route path="reports" element={<ManageRegistrations />} />
            <Route path="results" element={<FacultyResults />} />
            <Route path="certificates" element={<ManageCertificates />} />
            <Route path="tasks" element={<AssignedTasks />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Admin / Principal routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<DashboardLayout role="admin" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminAnalyticsDashboard />} />
            <Route path="faculty-approvals" element={<AdminFacultyApprovals />} />
            <Route path="approvals" element={<AdminFacultyApprovals />} />
            <Route path="faculty" element={<FacultyList />} />
            <Route path="assignments" element={<AdminAssignments />} />
            <Route path="events" element={<ManageEvents />} />
            <Route path="events/:id" element={<EventDetail embedded={true} />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Volunteer routes */}
        <Route element={<ProtectedRoute allowedRoles={["volunteer"]} />}>
          <Route path="/volunteer" element={<DashboardLayout role="volunteer" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<VolunteerDashboard />} />
            <Route path="events" element={<EventsBrowse embedded={true} />} />
            <Route path="events/:id" element={<EventDetail embedded={true} />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}
