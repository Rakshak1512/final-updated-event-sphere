import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiCalendar,
  FiUsers,
  FiAward,
  FiPlusSquare,
  FiArrowRight,
  FiCheckCircle,
  FiX,
  FiAlertCircle,
  FiClock,
  FiXCircle,
  FiClipboard,
  FiUploadCloud,
  FiRefreshCw,
  FiEdit2,
} from "react-icons/fi";
import toast from "react-hot-toast";
import StatCard from "../../components/dashboard/StatCard.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { analyticsService, eventService, facultyApprovalService, volunteerApprovalService } from "../../api/services.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useRealtime } from "../../context/RealtimeContext.jsx";
import { formatDate } from "../../utils/format.js";

export default function FacultyDashboard() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return null;

  const userRole = (user?.role || "").toLowerCase().trim();
  if (!user || userRole !== "faculty") {
    const target =
      userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "volunteer"
        ? "/volunteer/dashboard"
        : userRole === "student"
        ? "/student/dashboard"
        : "/login";
    return <Navigate to={target} replace />;
  }

  const { addListener } = useRealtime();
  const [analytics, setAnalytics] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [studentStats, setStudentStats] = useState({
    total_count: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
  });
  const [volunteerStats, setVolunteerStats] = useState({
    total_count: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
  });
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      analyticsService.faculty().then(({ data }) => data).catch(() => null),
      eventService.list({ page: 1, page_size: 5, sort_by: "created_at", sort_order: "desc" }).then(({ data }) => data.items || []).catch(() => []),
      facultyApprovalService.studentApprovals().then(({ data }) => data).catch(() => null),
      volunteerApprovalService.volunteerApprovals().then(({ data }) => data).catch(() => null),
    ]).then(([a, ev, sData, vData]) => {
      setAnalytics(a);
      setRecentEvents(ev);
      if (sData) {
        setStudentStats({
          total_count: sData.total_count ?? 0,
          pending_count: sData.pending_count ?? 0,
          approved_count: sData.approved_count ?? 0,
          rejected_count: sData.rejected_count ?? 0,
        });
        const pending = (sData.students || []).filter(
          (s) => (s.approval_status || "PENDING").toUpperCase() === "PENDING"
        );
        setPendingStudents(pending);
      }
      if (vData) {
        setVolunteerStats({
          total_count: vData.total_count ?? 0,
          pending_count: vData.pending_count ?? 0,
          approved_count: vData.approved_count ?? 0,
          rejected_count: vData.rejected_count ?? 0,
        });
      }
      setLoading(false);
    });
  };

  const handleApproveStudent = async (studentId, studentName) => {
    setApprovingId(studentId);
    try {
      await facultyApprovalService.approveStudent(studentId);
      toast.success(`Student account for ${studentName} approved!`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to approve student.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectStudent = async (studentId, studentName) => {
    if (!window.confirm(`Reject registration for ${studentName}?`)) return;
    setRejectingId(studentId);
    try {
      await facultyApprovalService.rejectStudent(studentId, "Academic registration details could not be validated.");
      toast.success(`Student registration for ${studentName} rejected.`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reject student.");
    } finally {
      setRejectingId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time synchronization for faculty dashboard counters
  useEffect(() => {
    const remove = addListener((msg) => {
      if (
        msg.type === "REGISTRATION_CREATED" ||
        msg.type === "REGISTRATION_STATUS_CHANGED" ||
        msg.type === "ATTENDANCE_CHECKED_IN" ||
        msg.type === "REGISTRATION_CANCELLED" ||
        msg.type === "EVENT_UPDATED"
      ) {
        loadData();
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
          background: "var(--gradient-soft)",
          boxShadow: "0 10px 30px rgba(139, 92, 246, 0.08)",
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
              color: "#8b5cf6",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            <FiCheckCircle size={14} /> Faculty & Organizer Portal
          </span>
          <h1 style={{ fontSize: "clamp(20px, 3.5vw, 28px)", marginBottom: 6 }}>
            Welcome, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14.5 }}>{user?.department || "Department Administrator"}</p>
        </div>
        <div className="btn-group" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link to="/faculty/student-approvals" className="btn btn-primary btn-sm">
            <FiUsers /> Student Approvals
          </Link>
          <Link to="/faculty/volunteer-approvals" className="btn btn-outline btn-sm">
            <FiAward /> Volunteer Approvals
          </Link>
          <Link to="/faculty/events" className="btn btn-outline btn-sm">
            <FiPlusSquare /> Manage Events
          </Link>
          <Link to="/faculty/registrations" className="btn btn-outline btn-sm">
            <FiClipboard /> Registrations
          </Link>
          <Link to="/faculty/certificates" className="btn btn-outline btn-sm">
            <FiUploadCloud /> Issue Certificates
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              loadData();
              toast.success("Dashboard refreshed");
            }}
            disabled={loading}
            title="Refresh dashboard data"
          >
            <FiRefreshCw className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Student Approval Statistics (Live database counters) */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <FiUsers color="#6366f1" /> Student Approval Statistics
          </h2>
          <Link
            to="/faculty/student-approvals"
            style={{ fontSize: "0.85rem", color: "var(--color-primary, #6366f1)", fontWeight: 600, textDecoration: "none" }}
          >
            Manage Student Approvals &rarr;
          </Link>
        </div>
        {loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid-cards-4">
            <Link to="/faculty/student-approvals" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <StatCard
                icon={<FiUsers />}
                label="Total Students"
                value={studentStats.total_count}
                accent="#8b5cf6"
              />
            </Link>
            <Link to="/faculty/student-approvals" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <StatCard
                icon={<FiClock />}
                label="Pending Students"
                value={studentStats.pending_count}
                accent="#f59e0b"
              />
            </Link>
            <Link to="/faculty/student-approvals" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <StatCard
                icon={<FiCheckCircle />}
                label="Approved Students"
                value={studentStats.approved_count}
                accent="#10b981"
              />
            </Link>
            <Link to="/faculty/student-approvals" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <StatCard
                icon={<FiXCircle />}
                label="Rejected Students"
                value={studentStats.rejected_count}
                accent="#ef4444"
              />
            </Link>
          </div>
        )}
      </div>

      {/* Volunteer Approval Statistics (Live database counters) */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <FiAward color="#0d9488" /> Volunteer Approval Statistics
          </h2>
          <Link
            to="/faculty/volunteer-approvals"
            style={{ fontSize: "0.85rem", color: "#0d9488", fontWeight: 600, textDecoration: "none" }}
          >
            Manage Volunteer Approvals &rarr;
          </Link>
        </div>
        {loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid-cards-4">
            <Link to="/faculty/volunteer-approvals" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <StatCard
                icon={<FiUsers />}
                label="Total Volunteers"
                value={volunteerStats.total_count}
                accent="#0d9488"
              />
            </Link>
            <Link to="/faculty/volunteer-approvals" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <StatCard
                icon={<FiClock />}
                label="Pending Volunteers"
                value={volunteerStats.pending_count}
                accent="#f59e0b"
              />
            </Link>
            <Link to="/faculty/volunteer-approvals" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <StatCard
                icon={<FiCheckCircle />}
                label="Approved Volunteers"
                value={volunteerStats.approved_count}
                accent="#10b981"
              />
            </Link>
            <Link to="/faculty/volunteer-approvals" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <StatCard
                icon={<FiXCircle />}
                label="Rejected Volunteers"
                value={volunteerStats.rejected_count}
                accent="#ef4444"
              />
            </Link>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonGrid count={4} />
      ) : (
        <div className="grid-cards-4" style={{ marginBottom: 28 }}>
          <Link to="/faculty/events" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <StatCard icon={<FiCalendar />} label="Events Created" value={analytics?.total_events_created ?? 0} accent="#6366f1" />
          </Link>
          <Link to="/faculty/registrations" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <StatCard icon={<FiUsers />} label="Total Registrations" value={analytics?.total_registrations_received ?? 0} accent="#0ea5e9" />
          </Link>
          <Link to="/faculty/certificates" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <StatCard icon={<FiAward />} label="Certificates Issued" value={analytics?.total_certificates_issued ?? 0} accent="#d946ef" />
          </Link>
          <Link to="/faculty/registrations" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <StatCard
              icon={<FiArrowRight />}
              label="Avg. Registrations / Event"
              value={
                analytics?.total_events_created
                  ? Math.round((analytics.total_registrations_received / analytics.total_events_created) * 10) / 10
                  : 0
              }
              accent="#22c55e"
            />
          </Link>
        </div>
      )}

      {/* Pending Student Approvals Section */}
      {pendingStudents.length > 0 && (
        <div
          style={{
            marginBottom: 28,
            padding: "20px 24px",
            background: "rgba(99, 102, 241, 0.08)",
            borderRadius: 16,
            border: "1px solid rgba(99, 102, 241, 0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#6366f1",
                  boxShadow: "0 0 8px #6366f1",
                }}
              />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#818cf8" }}>
                Pending Student Registrations Awaiting Faculty Verification ({pendingStudents.length})
              </h3>
            </div>
            <span style={{ fontSize: 12.5, color: "#94a3b8" }}>
              Approve students to unlock their event registration & QR pass access
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {pendingStudents.map((stu) => (
              <div
                key={stu.id}
                style={{
                  background: "var(--bg-card, #1e293b)",
                  border: "1px solid var(--border-color, #334155)",
                  borderRadius: 12,
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#ffffff" }}>
                      {stu.name}
                    </h4>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "rgba(99, 102, 241, 0.2)",
                        color: "#a5b4fc",
                        fontWeight: 600,
                      }}
                    >
                      Awaiting Approval
                    </span>
                  </div>
                  {stu.registration_number && (
                    <p style={{ margin: "2px 0", fontSize: 13, color: "#94a3b8" }}>
                      <strong>Register No:</strong> <span style={{ fontFamily: "monospace", color: "#38bdf8" }}>{stu.registration_number}</span>
                    </p>
                  )}
                  <p style={{ margin: "2px 0", fontSize: 13, color: "#94a3b8" }}>
                    <strong>Email:</strong> {stu.email}
                  </p>
                  <p style={{ margin: "2px 0", fontSize: 13, color: "#94a3b8" }}>
                    <strong>Department:</strong> {stu.department || "General"} {stu.semester ? `(Sem ${stu.semester})` : ""}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#64748b" }}>
                    Registered: {formatDate(stu.created_at)}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => handleApproveStudent(stu.id, stu.name)}
                    disabled={approvingId === stu.id || rejectingId === stu.id}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: approvingId === stu.id ? 0.7 : 1,
                    }}
                  >
                    <FiCheckCircle size={14} />
                    {approvingId === stu.id ? "Approving..." : "Approve Student"}
                  </button>
                  <button
                    onClick={() => handleRejectStudent(stu.id, stu.name)}
                    disabled={approvingId === stu.id || rejectingId === stu.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      background: "transparent",
                      color: "#ef4444",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: rejectingId === stu.id ? 0.7 : 1,
                    }}
                  >
                    <FiX size={14} />
                    {rejectingId === stu.id ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Created Events Table */}
      <div className="section-head">
        <h2 style={{ fontSize: 19 }}>Recently Created Events</h2>
        <Link to="/faculty/events" style={{ fontSize: 13.5, fontWeight: 600, color: "#8b5cf6" }}>
          Manage all events
        </Link>
      </div>

      <div className="glass-card table-wrap" style={{ borderRadius: "18px" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Event Date</th>
              <th>Venue</th>
              <th>Registrations</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--text-secondary)" }}>
                  No events created yet. Click "Manage Events" above to create your first event.
                </td>
              </tr>
            ) : (
              recentEvents.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{ev.title}</td>
                  <td>
                    <span className="badge badge-info">{ev.category || "General"}</span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(ev.event_date)}</td>
                  <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{ev.venue}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: ev.available_seats <= 0 ? "var(--danger)" : "var(--success)" }}>
                      {ev.total_seats - ev.available_seats} / {ev.total_seats}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <Link
                        to="/faculty/registrations"
                        state={{ eventId: ev.id }}
                        className="btn btn-outline btn-sm"
                        style={{ padding: "4px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <FiUsers size={12} /> Regs
                      </Link>
                      <Link
                        to="/faculty/events"
                        className="btn btn-outline btn-sm"
                        style={{ padding: "4px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <FiEdit2 size={12} /> Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .welcome-banner .btn-group {
            width: 100%;
          }
          .welcome-banner .btn-group a {
            flex: 1 1 calc(50% - 6px);
            text-align: center;
            justify-content: center;
          }
        }
        @media (max-width: 420px) {
          .welcome-banner .btn-group a {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </PageTransition>
  );
}
