import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiDownload,
  FiRefreshCw,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUsers,
  FiCheckCircle,
  FiClock as FiPendingClock,
  FiAward,
  FiSearch,
  FiStar,
  FiUser,
  FiFileText,
  FiTrendingUp,
} from "react-icons/fi";
import toast from "react-hot-toast";
import PageTransition from "../../components/common/PageTransition.jsx";
import { SkeletonCard, SkeletonGrid } from "../../components/ui/Loader.jsx";
import { eventService } from "../../api/services.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatDate } from "../../utils/format.js";

export default function EventReviewReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [report, setReport] = useState(null);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const userRole = (user?.role || "").toLowerCase().trim();
  const fallbackPath = userRole === "admin" ? "/admin/events" : "/faculty/events";

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  const loadReport = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await eventService.getReport(id);
      setReport(data);
    } catch (err) {
      console.error("Failed to load event review report:", err);
      toast.error(err?.response?.data?.detail || "Could not load review report for this event.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!id) return;
    setDownloading(true);
    const toastId = toast.loading("Generating official EventSphere PDF report...");
    try {
      await eventService.downloadReportPdf(id, report?.event?.title || "Event");
      toast.success("Event Review Report PDF downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error(err?.response?.data?.detail || "Failed to download PDF report", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const eventData = report?.event || {};
  const summary = report?.summary || {};
  const departmentBreakdown = report?.branch_breakdown || report?.department_breakdown || [];
  const attendees = report?.attendees || [];
  const feedback = report?.feedback;

  const filteredAttendees = attendees.filter((a) => {
    const name = a.student_name || a.user_name || "";
    const email = a.email || a.user_email || "";
    const regNo = a.registration_number || "";
    const dept = a.department || "";

    const matchesSearch =
      !attendeeSearch ||
      name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      email.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      regNo.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      dept.toLowerCase().includes(attendeeSearch.toLowerCase());

    const isAttended = a.attended === true || a.status === "attended" || !!a.checked_in_at;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "attended" && isAttended) ||
      (statusFilter === "pending" && !isAttended);

    return matchesSearch && matchesStatus;
  });

  return (
    <PageTransition>
      <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
        {/* Navigation / Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleBack}
              className="btn btn-outline btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FiArrowLeft size={16} /> Back
            </button>
            <div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#a855f7",
                }}
              >
                Official Event Review Report
              </span>
              <h1 style={{ fontSize: "clamp(20px, 3vw, 26px)", margin: "2px 0 0 0", color: "var(--text-primary)" }}>
                {eventData.title || `Event #${id}`}
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={loadReport}
              disabled={loading}
              title="Refresh report data"
            >
              <FiRefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>

            <button
              className="btn btn-primary"
              onClick={handleDownloadPdf}
              disabled={loading || downloading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                border: "none",
                boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)",
              }}
            >
              <FiDownload size={16} />
              {downloading ? "Generating PDF..." : "Download PDF Report"}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <SkeletonGrid count={3} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Event Profile Card */}
            <div
              className="glass-card"
              style={{
                padding: "22px 26px",
                borderRadius: 18,
                border: "1px solid var(--border-color)",
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.04) 100%)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                  fontSize: 13.5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FiCalendar color="#8b5cf6" size={18} />
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Event Date</div>
                    <div style={{ fontWeight: 600 }}>{formatDate(eventData.event_date)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FiClock color="#8b5cf6" size={18} />
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Time & Venue</div>
                    <div style={{ fontWeight: 600 }}>{eventData.event_time || "TBD"} · {eventData.venue}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FiUser color="#8b5cf6" size={18} />
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Faculty Coordinator</div>
                    <div style={{ fontWeight: 600 }}>{eventData.organizer_name || "Faculty Coordinator"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FiAward color="#8b5cf6" size={18} />
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Category & Status</div>
                    <div style={{ fontWeight: 600, textTransform: "capitalize" }}>
                      {eventData.category || "General"} · {eventData.status || "Completed"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Primary KPI Summary Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {/* Total Registrations */}
              <div
                className="glass-card"
                style={{
                  padding: "20px 22px",
                  borderRadius: 16,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Total Registered</span>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(139, 92, 246, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#8b5cf6",
                    }}
                  >
                    <FiUsers size={18} />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
                  {summary.total_registrations ?? 0}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Capacity: {eventData.total_seats || "Unlimited"} seats
                </div>
              </div>

              {/* Checked-In Attendance */}
              <div
                className="glass-card"
                style={{
                  padding: "20px 22px",
                  borderRadius: 16,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Checked In</span>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(16, 185, 129, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#10b981",
                    }}
                  >
                    <FiCheckCircle size={18} />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#10b981" }}>
                  {summary.attended_count ?? summary.checked_in_count ?? 0}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Verified Gate Check-ins
                </div>
              </div>

              {/* Pending Check-ins */}
              <div
                className="glass-card"
                style={{
                  padding: "20px 22px",
                  borderRadius: 16,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Pending Entry</span>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(245, 158, 11, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#f59e0b",
                    }}
                  >
                    <FiPendingClock size={18} />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>
                  {summary.pending_count ??
                    Math.max(0, (summary.total_registrations || 0) - (summary.attended_count || 0))}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Awaiting Attendance Scan
                </div>
              </div>

              {/* Turnout Percentage */}
              <div
                className="glass-card"
                style={{
                  padding: "20px 22px",
                  borderRadius: 16,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Turnout Rate</span>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(59, 130, 246, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#3b82f6",
                    }}
                  >
                    <FiTrendingUp size={18} />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#38bdf8" }}>
                  {summary.attendance_rate !== undefined
                    ? `${Number(summary.attendance_rate).toFixed(1)}%`
                    : "0.0%"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Actual Attendance / Registered
                </div>
              </div>
            </div>

            {/* Department Breakdown & Feedback Side-by-Side */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              {/* Department Turnout Breakdown */}
              <div
                className="glass-card"
                style={{
                  padding: 22,
                  borderRadius: 18,
                  border: "1px solid var(--border-color)",
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--text-primary)" }}>
                  Department Turnout Breakdown
                </h3>
                {departmentBreakdown.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: 13 }}>
                    No department breakdown available.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {departmentBreakdown.map((b, idx) => {
                      const count = b.count ?? b.total ?? 0;
                      const attended = b.attended ?? b.attended_count ?? 0;
                      const pct = count > 0 ? Math.round((attended / count) * 100) : 0;
                      return (
                        <div key={idx} style={{ padding: "8px 12px", background: "var(--bg-base)", borderRadius: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>{b.department || b.branch || "General"}</span>
                            <span style={{ color: "var(--text-secondary)" }}>
                              {attended} / {count} ({pct}%)
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: 6,
                              borderRadius: 4,
                              background: "rgba(255,255,255,0.06)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: "var(--gradient-primary)",
                                borderRadius: 4,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Participant Feedback & Sentiment */}
              <div
                className="glass-card"
                style={{
                  padding: 22,
                  borderRadius: 18,
                  border: "1px solid var(--border-color)",
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--text-primary)" }}>
                  Participant Feedback & Ratings
                </h3>
                {feedback && feedback.total_feedbacks > 0 ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: "#facc15" }}>
                        {Number(feedback.average_rating || 0).toFixed(1)}
                      </div>
                      <div>
                        <div style={{ display: "flex", gap: 2, color: "#facc15" }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FiStar
                              key={star}
                              size={16}
                              fill={star <= Math.round(feedback.average_rating || 0) ? "#facc15" : "none"}
                            />
                          ))}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          Based on {feedback.total_feedbacks} verified student review(s)
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 180, overflowY: "auto" }}>
                      {(feedback.recent_reviews || []).map((rev, rIdx) => (
                        <div
                          key={rIdx}
                          style={{
                            padding: "10px 12px",
                            background: "var(--bg-base)",
                            borderRadius: 10,
                            fontSize: 13,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontWeight: 600 }}>{rev.student_name || "Verified Student"}</span>
                            <span style={{ color: "#facc15", fontWeight: 700 }}>★ {rev.rating}</span>
                          </div>
                          <div style={{ color: "var(--text-secondary)", fontSize: 12.5, fontStyle: "italic" }}>
                            "{rev.comment || "Great event!"}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: 13 }}>
                    No participant feedback recorded for this event yet.
                  </div>
                )}
              </div>
            </div>

            {/* Attendee Roster Section */}
            <div
              className="glass-card"
              style={{
                padding: 22,
                borderRadius: 18,
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Event Attendee & Attendance Roster ({filteredAttendees.length} records)
                </h3>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {/* Status Filter */}
                  <select
                    className="form-select form-select-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: "auto" }}
                  >
                    <option value="all">All Registrations</option>
                    <option value="attended">Checked In Only</option>
                    <option value="pending">Pending Check-in</option>
                  </select>

                  {/* Search */}
                  <div style={{ position: "relative" }}>
                    <FiSearch
                      size={14}
                      color="var(--text-muted)"
                      style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
                    />
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      placeholder="Search attendee..."
                      value={attendeeSearch}
                      onChange={(e) => setAttendeeSearch(e.target.value)}
                      style={{ paddingLeft: 30, width: 200 }}
                    />
                  </div>
                </div>
              </div>

              {filteredAttendees.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)" }}>
                  No attendees matching your criteria.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ width: "100%", fontSize: 13.5 }}>
                    <thead>
                      <tr>
                        <th>Attendee Name</th>
                        <th>Reg Number</th>
                        <th>Department</th>
                        <th>Ticket Code</th>
                        <th>Attendance Status</th>
                        <th>Check-in Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendees.map((a, idx) => {
                        const isAttended = a.attended === true || a.status === "attended" || !!a.checked_in_at;
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{a.student_name || a.user_name || "N/A"}</td>
                            <td>{a.registration_number || a.reg_no || "-"}</td>
                            <td>{a.department || "-"}</td>
                            <td>
                              <code style={{ background: "var(--bg-base)", padding: "2px 6px", borderRadius: 4 }}>
                                #{a.ticket_code || "---"}
                              </code>
                            </td>
                            <td>
                              {isAttended ? (
                                <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <FiCheckCircle size={12} /> Checked In
                                </span>
                              ) : (
                                <span className="badge badge-warning" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <FiPendingClock size={12} /> Pending
                                </span>
                              )}
                            </td>
                            <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                              {a.checked_in_at
                                ? new Date(a.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
