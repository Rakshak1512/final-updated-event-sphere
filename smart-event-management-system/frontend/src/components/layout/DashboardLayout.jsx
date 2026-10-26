import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  FiHome,
  FiCalendar,
  FiClipboard,
  FiAward,
  FiBell,
  FiUser,
  FiSettings,
  FiPlusSquare,
  FiUsers,
  FiUploadCloud,
  FiCheckSquare,
  FiFileText,
  FiShield,
} from "react-icons/fi";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import EventSphereAIChatbot from "../chatbot/EventSphereAIChatbot.jsx";

const studentItems = (base) => [
  { to: `${base}/dashboard`, label: "Home", icon: FiHome, end: true },
  { to: `${base}/events`, label: "Events", icon: FiCalendar },
  { to: `${base}/my-registrations`, label: "My Registrations", icon: FiClipboard },
  { to: `${base}/certificates`, label: "Certificates", icon: FiAward },
  { to: `${base}/notifications`, label: "Notifications", icon: FiBell },
  { to: `${base}/profile`, label: "Profile", icon: FiUser },
  { to: `${base}/settings`, label: "Settings", icon: FiSettings },
];

const facultyItems = (base) => [
  { to: `${base}/dashboard`, label: "Home", icon: FiHome, end: true },
  { to: `${base}/student-approvals`, label: "Student Approvals", icon: FiShield },
  { to: `${base}/volunteer-approvals`, label: "Volunteer Approvals", icon: FiAward },
  { to: `${base}/events`, label: "Manage Events", icon: FiPlusSquare },
  { to: `${base}/registrations`, label: "Registrations", icon: FiClipboard },
  { to: `${base}/registration-reports`, label: "Registration Reports", icon: FiUsers },
  { to: `${base}/results`, label: "Results", icon: FiAward },
  { to: `${base}/certificates`, label: "Certificates", icon: FiUploadCloud },
  { to: `${base}/tasks`, label: "Assigned Work", icon: FiCheckSquare },
  { to: `${base}/notifications`, label: "Notifications", icon: FiBell },
  { to: `${base}/profile`, label: "Profile", icon: FiUser },
  { to: `${base}/settings`, label: "Settings", icon: FiSettings },
];

const adminItems = (base) => [
  { to: `${base}/dashboard`, label: "Overview", icon: FiHome, end: true },
  { to: `${base}/analytics`, label: "Live Analytics", icon: FiUploadCloud },
  { to: `${base}/faculty-approvals`, label: "Faculty Approvals", icon: FiShield },
  { to: `${base}/faculty`, label: "Faculty Directory", icon: FiUsers },
  { to: `${base}/assignments`, label: "Work Assignments", icon: FiCheckSquare },
  { to: `${base}/events`, label: "Events", icon: FiCalendar },
  { to: `${base}/registrations`, label: "Manage Registrations", icon: FiClipboard },
  { to: `${base}/reports`, label: "Reports & Exports", icon: FiFileText },
  { to: `${base}/notifications`, label: "Notifications", icon: FiBell },
  { to: `${base}/profile`, label: "Profile", icon: FiUser },
  { to: `${base}/settings`, label: "Settings", icon: FiSettings },
];

const volunteerItems = (base) => [
  { to: `${base}/dashboard`, label: "Dashboard", icon: FiHome, end: true },
  { to: `${base}/events`, label: "Browse Events", icon: FiCalendar },
  { to: `${base}/notifications`, label: "Notifications", icon: FiBell },
  { to: `${base}/profile`, label: "Profile", icon: FiUser },
  { to: `${base}/settings`, label: "Settings", icon: FiSettings },
];

export default function DashboardLayout({ role }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = (user?.role || "").toLowerCase();
  if (userRole && userRole !== role.toLowerCase()) {
    const dest =
      userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "faculty"
        ? "/faculty/dashboard"
        : userRole === "volunteer"
        ? "/volunteer/dashboard"
        : "/student/dashboard";
    return <Navigate to={dest} replace />;
  }

  const basePath =
    role === "admin"
      ? "/admin"
      : role === "faculty"
      ? "/faculty"
      : role === "volunteer"
      ? "/volunteer"
      : "/student";

  const items =
    role === "admin"
      ? adminItems(basePath)
      : role === "faculty"
      ? facultyItems(basePath)
      : role === "volunteer"
      ? volunteerItems(basePath)
      : studentItems(basePath);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100dvh",
        background: "var(--bg-base)",
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        overflowX: "clip",
      }}
    >
      {/* Ambient Lighting Orbs - Confined to non-scrolling container */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -100,
            left: 100,
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: "var(--gradient-primary)",
            opacity: 0.08,
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            right: 50,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(99, 102, 241, 0.06)",
            filter: "blur(100px)",
          }}
        />
      </div>

      {/* Glass Sidebar */}
      <Sidebar
        items={items}
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Dashboard Content Area */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} basePath={basePath} />
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>

      {/* Project-Specific AI Assistant */}
      <EventSphereAIChatbot />
    </div>
  );
}
