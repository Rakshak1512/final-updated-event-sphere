import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiCalendar, FiClipboard, FiAward, FiClock, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import StatCard from "../../components/dashboard/StatCard.jsx";
import EventCard from "../../components/dashboard/EventCard.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { analyticsService, eventService, registrationService } from "../../api/services.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useRealtime } from "../../context/RealtimeContext.jsx";
import { formatDate, statusBadgeClass } from "../../utils/format.js";

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return null;

  const userRole = (user?.role || "").toLowerCase().trim();
  if (!user || userRole !== "student") {
    const target =
      userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "faculty"
        ? "/faculty/dashboard"
        : userRole === "volunteer"
        ? "/volunteer/dashboard"
        : "/login";
    return <Navigate to={target} replace />;
  }

  const { addListener } = useRealtime();
  const [analytics, setAnalytics] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [myRegs, setMyRegs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      analyticsService.student().then(({ data }) => data).catch(() => null),
      eventService.list({ page: 1, page_size: 4, sort_by: "event_date", sort_order: "asc" }).then(({ data }) => data.items || []).catch(() => []),
      registrationService.my().then(({ data }) => data || []).catch(() => []),
    ]).then(([a, ev, regs]) => {
      setAnalytics(a);
      setUpcoming(ev);
      setMyRegs(regs.slice(0, 4));
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time synchronization for student dashboard counters and registrations
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

  const today = new Date().toDateString();
  const todaysEvents = upcoming.filter((e) => new Date(e.event_date).toDateString() === today);

  return (
    <PageTransition>
      {/* Welcome Hero Banner */}
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
            <FiCheckCircle size={14} /> Student Dashboard
          </span>
          <h1 style={{ fontSize: "clamp(20px, 3.5vw, 28px)", marginBottom: 6 }}>
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14.5 }}>
            {user?.department} {user?.semester && `· Semester ${user.semester}`} {user?.registration_number && `· ${user.registration_number}`}
          </p>
        </div>
        <div className="btn-group" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/student/events" className="btn btn-primary btn-sm">
            Browse Events <FiArrowRight />
          </Link>
          <Link to="/student/certificates" className="btn btn-outline btn-sm">
            My Certificates
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-cards-4" style={{ marginBottom: 28 }}>
        <StatCard icon={<FiClipboard />} label="Total Registrations" value={analytics?.total_registrations ?? 0} accent="#6366f1" />
        <StatCard icon={<FiCalendar />} label="Upcoming Events" value={analytics?.upcoming_events ?? 0} accent="#0ea5e9" />
        <StatCard icon={<FiClock />} label="Completed Events" value={analytics?.completed_events ?? 0} accent="#22c55e" />
        <StatCard icon={<FiAward />} label="Certificates" value={analytics?.total_certificates ?? 0} accent="#d946ef" />
      </div>

      {/* Split View: Upcoming Events & My Registrations */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }} className="dash-grid">
        {/* Left Column: Upcoming Events */}
        <div>
          <div className="section-head">
            <h2 style={{ fontSize: 19 }}>
              Featured Upcoming Events {todaysEvents.length > 0 && <span className="badge badge-warning">{todaysEvents.length} today</span>}
            </h2>
            <Link to="/student/events" style={{ fontSize: 13.5, fontWeight: 600, color: "#8b5cf6" }}>
              See all
            </Link>
          </div>
          {loading ? (
            <SkeletonGrid count={2} />
          ) : upcoming.length ? (
            <div className="grid-cards-2">
              {upcoming.slice(0, 2).map((ev, i) => (
                <EventCard key={ev.id} event={ev} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState title="No upcoming events" message="Check back soon or browse all events." />
          )}
        </div>

        {/* Right Column: Recent Registrations */}
        <div>
          <div className="section-head">
            <h2 style={{ fontSize: 19 }}>My Registrations</h2>
            <Link to="/student/my-registrations" style={{ fontSize: 13.5, fontWeight: 600, color: "#8b5cf6" }}>
              View all
            </Link>
          </div>
          <div className="glass-card" style={{ padding: "10px 14px", borderRadius: "18px" }}>
            {myRegs.length === 0 ? (
              <div style={{ padding: 24 }}>
                <EmptyState title="No registrations yet" message="Register for an event to see it here." />
              </div>
            ) : (
              myRegs.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 12px",
                    borderBottom: "1px solid var(--border-color)",
                    transition: "background 0.15s ease",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ paddingRight: 10 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)" }}>
                      {r.event?.title || "Event"}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                      {formatDate(r.event?.event_date)}
                    </div>
                  </div>
                  <span className={statusBadgeClass(r.status)}>{r.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1000px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </PageTransition>
  );
}
