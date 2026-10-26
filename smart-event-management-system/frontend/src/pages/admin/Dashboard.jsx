import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiUsers,
  FiCalendar,
  FiCheckSquare,
  FiAward,
  FiDownload,
  FiShield,
  FiPlus,
  FiArrowRight,
  FiRefreshCw,
  FiLayers,
  FiClock,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import StatCard from "../../components/dashboard/StatCard.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { adminService, eventService } from "../../api/services.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useRealtime } from "../../context/RealtimeContext.jsx";
import { formatDate } from "../../utils/format.js";
import AdminAnalyticsDashboard from "./AdminAnalyticsDashboard.jsx";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return null;

  const userRole = (user?.role || "").toLowerCase().trim();
  if (!user || userRole !== "admin") {
    const target =
      userRole === "faculty"
        ? "/faculty/dashboard"
        : userRole === "volunteer"
        ? "/volunteer/dashboard"
        : userRole === "student"
        ? "/student/dashboard"
        : "/login";
    return <Navigate to={target} replace />;
  }

  const { addListener } = useRealtime();
  const [summary, setSummary] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [facultyApprovalsData, setFacultyApprovalsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [sumRes, facRes, evRes, appRes] = await Promise.all([
        adminService.reportsSummary().then(({ data }) => data).catch(() => null),
        adminService.facultyList().then(({ data }) => data || []).catch(() => []),
        eventService.list({ page: 1, page_size: 5, sort_by: "created_at", sort_order: "desc" }).then(({ data }) => data.items || []).catch(() => []),
        adminService.facultyApprovals().then(({ data }) => data).catch(() => null),
      ]);
      setSummary(sumRes);
      setFacultyList(facRes);
      setRecentEvents(evRes);
      setFacultyApprovalsData(appRes);
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(true);
  }, []);

  // Real-time synchronization for admin dashboard counters
  useEffect(() => {
    const remove = addListener((msg) => {
      if (
        msg.type === "REGISTRATION_CREATED" ||
        msg.type === "REGISTRATION_STATUS_CHANGED" ||
        msg.type === "ATTENDANCE_CHECKED_IN" ||
        msg.type === "REGISTRATION_CANCELLED" ||
        msg.type === "EVENT_UPDATED"
      ) {
        fetchDashboard(false);
      }
    });
    return () => remove();
  }, [addListener]);

  return (
    <PageTransition>
      {/* Welcome Banner */}
      <div
        className="glass-card welcome-banner"
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(168, 85, 247, 0.12) 100%)",
          border: "1.5px solid rgba(139, 92, 246, 0.3)",
          boxShadow: "0 14px 35px rgba(139, 92, 246, 0.12)",
        }}
      >
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#a5b4fc",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            <FiShield size={14} /> Principal & Administrative Command
          </span>
          <h1 style={{ fontSize: "clamp(20px, 3.5vw, 28px)", marginBottom: 6 }}>
            Welcome, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14.5, margin: 0 }}>
            Oversee campus faculty coordination, task allocations, and institutional event reports.
          </p>
        </div>

        <div className="btn-group" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            to="/admin/analytics"
            className="btn btn-sm"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              color: "#ffffff",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FiAward /> Live Analytics
          </Link>
          <Link to="/admin/faculty-approvals" className="btn btn-primary btn-sm">
            <FiShield /> Faculty Approvals
          </Link>
          <Link to="/admin/assignments" className="btn btn-outline btn-sm">
            <FiPlus /> Assign Work
          </Link>
          <Link to="/admin/reports" className="btn btn-outline btn-sm">
            <FiDownload /> Download Reports
          </Link>
          <button
            className="icon-btn"
            onClick={() => fetchDashboard(true)}
            title="Refresh dashboard"
          >
            <FiRefreshCw className={loading ? "spin" : ""} size={16} />
          </button>
        </div>
      </div>

      {/* Pending Faculty Approvals Banner */}
      {facultyApprovalsData?.pending_count > 0 && (
        <div
          className="glass-card"
          style={{
            marginBottom: 24,
            padding: "18px 22px",
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(245, 158, 11, 0.04))",
            borderRadius: 16,
            border: "1px solid rgba(245, 158, 11, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            boxShadow: "0 6px 24px rgba(245, 158, 11, 0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(245, 158, 11, 0.2)",
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 19,
                boxShadow: "0 0 12px rgba(245, 158, 11, 0.25)",
              }}
            >
              {facultyApprovalsData.pending_count}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fbbf24" }}>
                Faculty Registrations Pending Admin Approval
              </h3>
              <p style={{ margin: "3px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
                {facultyApprovalsData.pending_count} new faculty coordinator{facultyApprovalsData.pending_count === 1 ? " is" : "s are"} waiting for your authorization.
              </p>
            </div>
          </div>
          <Link
            to="/admin/faculty-approvals"
            className="btn btn-primary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10 }}
          >
            <FiShield size={14} /> Review Approvals ({facultyApprovalsData.pending_count}) &rarr;
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXECUTIVE COMMAND CENTER: LIVE ANALYTICS OVERVIEW                        */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: 32 }}>
        <AdminAnalyticsDashboard embedded={true} />
      </div>

      {/* Faculty Approval Statistics (Live database counters) */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <FiShield color="#8b5cf6" /> Faculty Approval Statistics
          </h2>
          <Link
            to="/admin/faculty-approvals"
            style={{ fontSize: "0.85rem", color: "var(--color-primary, #8b5cf6)", fontWeight: 600, textDecoration: "none" }}
          >
            Manage Faculty Approvals &rarr;
          </Link>
        </div>
        {loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid-cards-4">
            <StatCard
              icon={<FiUsers />}
              label="Total Faculty"
              value={facultyApprovalsData?.total_count ?? 0}
              accent="#8b5cf6"
            />
            <StatCard
              icon={<FiClock />}
              label="Pending Faculty"
              value={facultyApprovalsData?.pending_count ?? 0}
              accent="#f59e0b"
            />
            <StatCard
              icon={<FiCheckCircle />}
              label="Approved Faculty"
              value={facultyApprovalsData?.approved_count ?? 0}
              accent="#10b981"
            />
            <StatCard
              icon={<FiXCircle />}
              label="Rejected Faculty"
              value={facultyApprovalsData?.rejected_count ?? 0}
              accent="#ef4444"
            />
          </div>
        )}
      </div>

      {/* KPI Stats */}
      {loading ? (
        <SkeletonGrid count={4} />
      ) : (
        <div className="grid-cards-4" style={{ marginBottom: 28 }}>
          <StatCard
            icon={<FiUsers />}
            label="Faculty Members"
            value={summary?.total_faculty ?? facultyList.length}
            accent="#8b5cf6"
          />
          <StatCard
            icon={<FiCalendar />}
            label="Events"
            value={summary?.total_events ?? 0}
            accent="#0ea5e9"
          />
          <StatCard
            icon={<FiCheckSquare />}
            label="Work Assignments"
            value={summary?.total_assignments ?? 0}
            accent="#22c55e"
          />
          <StatCard
            icon={<FiAward />}
            label="Event Registrations"
            value={summary?.total_registrations ?? 0}
            accent="#f59e0b"
          />
        </div>
      )}

      {/* Active Faculty Directory Grid */}
      <div style={{ marginBottom: 32 }}>
        <div className="section-head" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 19, display: "flex", alignItems: "center", gap: 8 }}>
            <FiUsers color="#8b5cf6" /> Faculty Coordinators ({facultyList.length})
          </h2>
          <Link to="/admin/faculty" style={{ fontSize: 13.5, fontWeight: 600, color: "#8b5cf6" }}>
            View full directory &rarr;
          </Link>
        </div>

        {loading ? (
          <SkeletonGrid count={3} />
        ) : facultyList.length === 0 ? (
          <div className="glass-card" style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>
            No registered faculty members found in the system yet.
          </div>
        ) : (
          <div className="grid-cards">
            {facultyList.slice(0, 6).map((fac) => (
              <div
                key={fac.id}
                className="glass-card float-card"
                style={{
                  padding: "20px",
                  borderRadius: "18px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "var(--gradient-primary)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {fac.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{fac.name}</h3>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{fac.email}</span>
                    </div>
                  </div>
                  <span className="badge badge-info">{fac.department || "General"}</span>
                </div>

                <div
                  style={{
                    background: "var(--bg-glass)",
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontSize: 12.5,
                    color: "var(--text-secondary)",
                    margin: "10px 0 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <span>Active Tasks: <strong style={{ color: "#f59e0b" }}>{fac.active_tasks_count || 0}</strong></span>
                  <span>Events: <strong style={{ color: "#8b5cf6" }}>{fac.events_organized_count || 0}</strong></span>
                </div>

                <Link
                  to="/admin/assignments"
                  state={{ prefillFacultyId: fac.id }}
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: "auto", width: "100%", justifyContent: "center" }}
                >
                  <FiPlus size={13} /> Assign Task
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Events Table */}
      <div>
        <div className="section-head" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 19, display: "flex", alignItems: "center", gap: 8 }}>
            <FiCalendar color="#0ea5e9" /> Events Master
          </h2>
          <Link to="/admin/events" style={{ fontSize: 13.5, fontWeight: 600, color: "#8b5cf6" }}>
            Browse all events &rarr;
          </Link>
        </div>

        <div className="glass-card table-wrap" style={{ borderRadius: "20px" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Title</th>
                <th>Category</th>
                <th>Organizer</th>
                <th>Date & Venue</th>
                <th>Registrations</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>
                    No events registered yet.
                  </td>
                </tr>
              ) : (
                recentEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{ev.title}</td>
                    <td>
                      <span className="badge badge-info">{ev.category || "General"}</span>
                    </td>
                    <td>{ev.organizer_name || "Faculty Coordinator"}</td>
                    <td>
                      <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                        {formatDate(ev.event_date)} · {ev.venue || "Venue"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: ev.available_seats <= 0 ? "var(--danger)" : "var(--success)" }}>
                        {ev.total_seats - ev.available_seats} / {ev.total_seats}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
}
