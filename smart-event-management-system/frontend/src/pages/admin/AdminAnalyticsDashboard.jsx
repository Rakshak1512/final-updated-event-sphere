import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiUsers,
  FiCalendar,
  FiCheckSquare,
  FiAward,
  FiTrendingUp,
  FiRefreshCw,
  FiShield,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiFileText,
  FiFilter,
  FiArrowUpRight,
} from "react-icons/fi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import PageTransition from "../../components/common/PageTransition.jsx";
import { analyticsService, adminService, eventService } from "../../api/services.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useRealtime } from "../../context/RealtimeContext.jsx";
import { formatDate } from "../../utils/format.js";
import EventReportModal from "../../components/events/EventReportModal.jsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export default function AdminAnalyticsDashboard() {
  const { user } = useAuth();
  const { addListener } = useRealtime();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedEventReport, setSelectedEventReport] = useState(null);
  const [timeRange, setTimeRange] = useState("all");

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const { data } = await analyticsService.admin();
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load admin analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Real-time polling every 25 seconds as backup
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // Reactive real-time websocket synchronization
  useEffect(() => {
    const remove = addListener((msg) => {
      if (
        msg.type === "REGISTRATION_CREATED" ||
        msg.type === "REGISTRATION_STATUS_CHANGED" ||
        msg.type === "ATTENDANCE_CHECKED_IN" ||
        msg.type === "REGISTRATION_CANCELLED" ||
        msg.type === "EVENT_UPDATED" ||
        msg.type === "EVENT_CREATED"
      ) {
        fetchAnalytics();
      }
    });
    return () => remove();
  }, [addListener]);

  const overview = analytics?.overview || {};
  const roleDistribution = analytics?.role_distribution || [];
  const attendanceComposition = analytics?.attendance_composition || [];
  const popularEvents = analytics?.popular_events || [];
  const categories = analytics?.category_analytics || [];
  const registrationGrowth = analytics?.registration_growth || [];
  const userGrowth = analytics?.user_growth || [];
  const certificateBreakdown = analytics?.certificate_breakdown || [];
  const systemHealth = analytics?.system_health || {};

  // Glassmorphic styling constants matching EventSphere branding
  const glassPanelStyle = {
    background: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "20px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    padding: "22px 24px",
    position: "relative",
    overflow: "hidden",
  };

  // Chart Styling & Options
  const chartTextColor = "#94a3b8";
  const chartGridColor = "rgba(148, 163, 184, 0.08)";

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: { color: chartTextColor, font: { family: "Inter", size: 12 }, boxWidth: 12, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        titleColor: "#ffffff",
        bodyColor: "#cbd5e1",
        borderColor: "rgba(255, 255, 255, 0.15)",
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
      },
    },
    scales: {
      x: { ticks: { color: chartTextColor, font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: chartTextColor, font: { size: 11 } }, grid: { color: chartGridColor }, beginAtZero: true },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: chartTextColor, font: { family: "Inter", size: 11 }, padding: 12, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(255, 255, 255, 0.15)",
        borderWidth: 1,
        padding: 10,
      },
    },
    cutout: "68%",
  };

  // Data for Registration & Growth Timeline
  const timelineLabels = registrationGrowth.map((t) => t.date);
  const timelineData = {
    labels: timelineLabels.length ? timelineLabels : ["Day 1", "Day 2", "Day 3", "Day 4"],
    datasets: [
      {
        label: "New Registrations",
        data: timelineLabels.length ? registrationGrowth.map((t) => t.new_registrations) : [0, 0, 0, 0],
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.15)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#8b5cf6",
        pointBorderColor: "#ffffff",
        pointRadius: 4,
      },
    ],
  };

  // Data for User Roles Donut
  const roleLabels = roleDistribution.length ? roleDistribution.map((r) => r.role) : ["Students", "Faculty", "Volunteers", "Admins"];
  const roleData = {
    labels: roleLabels,
    datasets: [
      {
        data: roleDistribution.length ? roleDistribution.map((r) => r.count) : [0, 0, 0, 0],
        backgroundColor: ["#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b"],
        borderWidth: 2,
        borderColor: "#0f172a",
        hoverOffset: 6,
      },
    ],
  };

  // Data for Attendance Composition Donut
  const attendanceLabels = attendanceComposition.length ? attendanceComposition.map((a) => a.label) : ["Present Attendees", "Absent / Unchecked"];
  const attendanceData = {
    labels: attendanceLabels,
    datasets: [
      {
        data: attendanceComposition.length ? attendanceComposition.map((a) => a.value) : [0, 0],
        backgroundColor: ["#10b981", "rgba(148, 163, 184, 0.25)"],
        borderWidth: 2,
        borderColor: "#0f172a",
        hoverOffset: 6,
      },
    ],
  };

  // Data for Category Analytics Bar
  const categoryLabels = categories.map((c) => c.category);
  const categoryChartData = {
    labels: categoryLabels.length ? categoryLabels : ["Technical", "Cultural", "Sports", "Workshop"],
    datasets: [
      {
        label: "Registered Attendees",
        data: categoryLabels.length ? categories.map((c) => c.total_registrations) : [0, 0, 0, 0],
        backgroundColor: "#6366f1",
        borderRadius: 8,
        maxBarThickness: 32,
      },
      {
        label: "Total Capacity",
        data: categoryLabels.length ? categories.map((c) => c.total_capacity) : [0, 0, 0, 0],
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        borderRadius: 8,
        maxBarThickness: 32,
      },
    ],
  };

  return (
    <PageTransition>
      {/* Liquid Glass Header Banner */}
      <div
        style={{
          ...glassPanelStyle,
          background: "linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)",
          borderColor: "rgba(139, 92, 246, 0.35)",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: "rgba(139, 92, 246, 0.15)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "#c084fc",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                <FiActivity className="animate-pulse" /> Live Institutional Analytics
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "12px",
                  color: "#94a3b8",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                Real-Time Firestore Sync
              </span>
            </div>
            <h1 className="page-title" style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>
              EventSphere Executive Intelligence
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", margin: "4px 0 0" }}>
              Live aggregate metrics, attendance check-ins, registration health, and institutional audit rosters.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {lastUpdated && (
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Synced: <strong style={{ color: "#e2e8f0" }}>{lastUpdated.toLocaleTimeString()}</strong>
              </span>
            )}
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="btn btn-outline btn-sm"
              style={{
                borderRadius: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                borderColor: "rgba(255, 255, 255, 0.15)",
                color: "#e2e8f0",
                background: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} size={14} />
              {refreshing ? "Syncing..." : "Live Refresh"}
            </button>
            <Link
              to="/admin/reports"
              className="btn btn-primary btn-sm"
              style={{
                borderRadius: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                boxShadow: "0 8px 20px rgba(139, 92, 246, 0.35)",
              }}
            >
              <FiFileText size={14} /> PDF & Reports Center
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (Platform Overview) */}
      <div className="grid-cards-4" style={{ marginBottom: 24 }}>
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.15 }}
          style={{
            ...glassPanelStyle,
            borderLeft: "4px solid #06b6d4",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Total Registered Users</span>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.total_users ?? 0}
              </h2>
              <span style={{ fontSize: "12px", color: "#38bdf8" }}>
                {roles.students ?? 0} students · {roles.faculty ?? 0} faculty
              </span>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(6, 182, 212, 0.15)",
                color: "#06b6d4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              <FiUsers />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.15 }}
          style={{
            ...glassPanelStyle,
            borderLeft: "4px solid #8b5cf6",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Total Campus Events</span>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.total_events ?? 0}
              </h2>
              <span style={{ fontSize: "12px", color: "#c084fc" }}>
                {overview.published_events ?? 0} published · {overview.completed_events ?? 0} completed
              </span>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(139, 92, 246, 0.15)",
                color: "#a855f7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              <FiCalendar />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.15 }}
          style={{
            ...glassPanelStyle,
            borderLeft: "4px solid #ec4899",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Total Registrations</span>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.total_registrations ?? 0}
              </h2>
              <span style={{ fontSize: "12px", color: "#f472b6" }}>
                {overview.confirmed_registrations ?? 0} confirmed seats
              </span>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(236, 72, 153, 0.15)",
                color: "#ec4899",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              <FiCheckSquare />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.15 }}
          style={{
            ...glassPanelStyle,
            borderLeft: "4px solid #10b981",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Attendance & Certificates</span>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#ffffff", margin: "6px 0 2px" }}>
                {overview.attendance_rate ?? 0}%
              </h2>
              <span style={{ fontSize: "12px", color: "#34d399" }}>
                {overview.present_attendance ?? 0} attended · {overview.certificates_count ?? 0} certs
              </span>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              <FiAward />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 2: Charts (Registration Trends & User Role Distribution) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Timeline Chart */}
        <div style={{ ...glassPanelStyle, gridColumn: "span 2", minHeight: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Registration Inflow & Timeline Trends
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
                Daily registration volume recorded across campus events
              </p>
            </div>
            <span
              style={{
                fontSize: 12,
                color: "#c084fc",
                background: "rgba(139, 92, 246, 0.15)",
                padding: "3px 10px",
                borderRadius: "12px",
                fontWeight: 600,
              }}
            >
              Active Stream
            </span>
          </div>
          <div style={{ height: 260 }}>
            <Line data={timelineData} options={lineChartOptions} />
          </div>
        </div>

        {/* User Role Distribution Donut */}
        <div style={{ ...glassPanelStyle, minHeight: 360 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
              User Composition by Role
            </h3>
            <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
              Distribution of authenticated users in Firestore
            </p>
          </div>
          <div style={{ height: 250, position: "relative" }}>
            <Doughnut data={roleData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Row 3: Category Capacities Bar & Attendance Composition Donut */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Category Breakdown Bar Chart */}
        <div style={{ ...glassPanelStyle, gridColumn: "span 2", minHeight: 350 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Event Category Demand vs. Allocated Capacity
              </h3>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
                Comparing registered participant count against venue capacity
              </p>
            </div>
          </div>
          <div style={{ height: 250 }}>
            <Bar data={categoryChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Attendance Check-in Donut */}
        <div style={{ ...glassPanelStyle, minHeight: 350 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
              Attendance Check-In Composition
            </h3>
            <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "2px 0 0" }}>
              Verified QR attendee scans vs. registered non-attendees
            </p>
          </div>
          <div style={{ height: 240, position: "relative" }}>
            <Doughnut data={attendanceData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Row 4: Popular Events Ranking Table with Direct PDF Report Action */}
      <div style={glassPanelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#ffffff", margin: 0 }}>
              Top Campus Events by Participation
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>
              Inspect individual event records, attendance ratios, and download official PDF reports.
            </p>
          </div>
          <Link to="/admin/events" className="btn btn-outline btn-sm" style={{ borderRadius: 10 }}>
            Manage All Events &rarr;
          </Link>
        </div>

        <div className="table-wrap" style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <table className="data-table">
            <thead>
              <tr style={{ background: "rgba(15, 23, 42, 0.85)" }}>
                <th>Event Title</th>
                <th>Category</th>
                <th>Organizer</th>
                <th>Date</th>
                <th>Registrations</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {popularEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 28, color: "#94a3b8" }}>
                    No events registered yet in the database.
                  </td>
                </tr>
              ) : (
                popularEvents.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <td style={{ fontWeight: 600, color: "#ffffff" }}>{ev.title}</td>
                    <td>
                      <span className="badge badge-info">{ev.category || "General"}</span>
                    </td>
                    <td style={{ color: "#cbd5e1" }}>{ev.organizer || "Faculty Coordinator"}</td>
                    <td style={{ color: "#94a3b8", fontSize: "12.5px" }}>{ev.date ? formatDate(ev.date) : "TBD"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, color: "#38bdf8" }}>{ev.registrations}</span>
                        <span style={{ fontSize: "11.5px", color: "#64748b" }}>/ {ev.capacity || "—"} seats</span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedEventReport(ev)}
                        className="btn btn-outline btn-sm"
                        style={{
                          borderRadius: "8px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          borderColor: "rgba(168, 85, 247, 0.4)",
                          color: "#c084fc",
                        }}
                      >
                        <FiFileText size={12} /> View Report & PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Event Executive Report & PDF Modal */}
      <EventReportModal
        isOpen={Boolean(selectedEventReport)}
        eventId={selectedEventReport?.id}
        eventTitle={selectedEventReport?.title}
        onClose={() => setSelectedEventReport(null)}
      />
    </PageTransition>
  );
}
