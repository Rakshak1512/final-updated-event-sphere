import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiCheckSquare,
  FiClock,
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiRefreshCw,
  FiUser,
  FiLayers,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { motion } from "framer-motion";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { facultyTaskService } from "../../api/services.js";
import { formatDate } from "../../utils/format.js";

const PRIORITY_COLORS = {
  urgent: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
  high: { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316", border: "rgba(249, 115, 22, 0.3)" },
  medium: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  low: { bg: "rgba(56, 189, 248, 0.15)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" },
};

export default function AssignedTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchTasks = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const { data } = await facultyTaskService.myTasks();
      setTasks(data || []);
    } catch (err) {
      console.error("Failed to load faculty tasks:", err);
      toast.error("Could not load assigned tasks");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(true);
  }, []);

  const handleUpdateStatus = async (taskId, newStatus) => {
    setUpdatingId(taskId);
    try {
      await facultyTaskService.updateStatus(taskId, newStatus);
      toast.success(`Task marked as ${newStatus.replace("_", " ")}`);
      fetchTasks(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not update task status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const title = (t.title || "").toLowerCase();
    const desc = (t.description || "").toLowerCase();
    const priority = (t.priority || "").toLowerCase();
    const deadline = (t.deadline || "").toLowerCase();
    const evTitle = (t.event_title || "").toLowerCase();

    return (
      title.includes(q) ||
      desc.includes(q) ||
      priority.includes(q) ||
      deadline.includes(q) ||
      evTitle.includes(q)
    );
  });

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <PageTransition>
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Assigned Work & Tasks</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Academic administration tasks, event responsibilities, and directives assigned by the Principal/Admin.
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={() => fetchTasks(true)}
          disabled={loading}
          title="Refresh tasks"
        >
          <FiRefreshCw className={loading ? "spin" : ""} size={16} />
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div
          className="glass-card"
          role="button"
          tabIndex={0}
          aria-label={`Show total tasks tasks`}
          onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStatusFilter("all"); setSearchQuery(""); } }}
          style={{
            padding: "16px 20px",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderLeft: "4px solid #8b5cf6",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(139, 92, 246, 0.15)",
              color: "#8b5cf6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiLayers size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Total Tasks
            </div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{tasks.length}</div>
          </div>
        </div>

        <div
          className="glass-card"
          role="button"
          tabIndex={0}
          aria-label={`Show pending tasks`}
          onClick={() => { setStatusFilter("pending"); setSearchQuery(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStatusFilter("pending"); setSearchQuery(""); } }}
          style={{
            padding: "16px 20px",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderLeft: "4px solid #f59e0b",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(245, 158, 11, 0.15)",
              color: "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiClock size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Pending
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{pendingCount}</div>
          </div>
        </div>

        <div
          className="glass-card"
          role="button"
          tabIndex={0}
          aria-label={`Show in progress tasks`}
          onClick={() => { setStatusFilter("in_progress"); setSearchQuery(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStatusFilter("in_progress"); setSearchQuery(""); } }}
          style={{
            padding: "16px 20px",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderLeft: "4px solid #0ea5e9",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(14, 165, 233, 0.15)",
              color: "#0ea5e9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiCheckSquare size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              In Progress
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0ea5e9" }}>{inProgressCount}</div>
          </div>
        </div>

        <div
          className="glass-card"
          role="button"
          tabIndex={0}
          aria-label={`Show completed tasks`}
          onClick={() => { setStatusFilter("completed"); setSearchQuery(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStatusFilter("completed"); setSearchQuery(""); } }}
          style={{
            padding: "16px 20px",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderLeft: "4px solid #22c55e",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(34, 197, 94, 0.15)",
              color: "#22c55e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiCheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Completed
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)" }}>{completedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "var(--bg-elevated)",
            padding: 4,
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            width: "fit-content",
          }}
        >
          {["all", "pending", "in_progress", "completed"].map((st) => (
            <button
              key={st}
              type="button"
              className="btn btn-sm"
              style={{
                background: statusFilter === st ? "var(--gradient-primary)" : "transparent",
                color: statusFilter === st ? "#fff" : "var(--text-secondary)",
                borderRadius: 8,
                fontSize: 12.5,
                textTransform: "capitalize",
                padding: "6px 14px",
              }}
              onClick={() => setStatusFilter(st)}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        {tasks.length > 0 && (
          <div style={{ position: "relative", minWidth: 0, width: "100%", maxWidth: 360 }}>
            <input
              className="form-input"
              style={{ padding: "8px 34px 8px 34px", fontSize: 13 }}
              placeholder="Search tasks by title, priority, deadline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FiSearch
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 2,
                }}
                title="Clear search"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tasks Grid */}
      {loading ? (
        <SkeletonGrid count={4} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={<FiCheckSquare />}
          title="No tasks found"
          message={
            statusFilter !== "all"
              ? `No ${statusFilter.replace("_", " ")} tasks right now.`
              : "You have no assigned tasks from the administration."
          }
        />
      ) : (
        <div className="grid-cards">
          {filteredTasks.map((t, i) => {
            const pStyle = PRIORITY_COLORS[t.priority.toLowerCase()] || PRIORITY_COLORS.medium;
            const isCompleted = t.status === "completed";

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card float-card"
                style={{
                  padding: "22px",
                  borderRadius: "20px",
                  display: "flex",
                  flexDirection: "column",
                  opacity: isCompleted ? 0.85 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 700,
                      background: pStyle.bg,
                      color: pStyle.text,
                      border: `1px solid ${pStyle.border}`,
                      textTransform: "uppercase",
                    }}
                  >
                    {t.priority} Priority
                  </span>

                  <span
                    className={
                      t.status === "completed"
                        ? "badge badge-success"
                        : t.status === "in_progress"
                        ? "badge badge-info"
                        : "badge badge-warning"
                    }
                    style={{ textTransform: "capitalize" }}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    marginBottom: 6,
                    color: "var(--text-primary)",
                    textDecoration: isCompleted ? "line-through" : "none",
                  }}
                >
                  {t.title}
                </h3>

                <p
                  style={{
                    fontSize: 13.5,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    marginBottom: 16,
                    flex: 1,
                  }}
                >
                  {t.description}
                </p>

                {t.event_title && (
                  <div
                    style={{
                      background: "var(--bg-glass)",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#a5b4fc",
                      marginBottom: 12,
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FiCalendar size={13} />
                    <span>Event: {t.event_title}</span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 16,
                  }}
                >
                  <span>Assigned by {t.assigned_by_name || "Admin"}</span>
                  {t.deadline && (
                    <span style={{ color: "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <FiClock size={12} /> Due: {t.deadline}
                    </span>
                  )}
                </div>

                {/* Status Toggle Actions */}
                <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                  {t.status !== "in_progress" && t.status !== "completed" && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      disabled={updatingId === t.id}
                      onClick={() => handleUpdateStatus(t.id, "in_progress")}
                    >
                      Start Task
                    </button>
                  )}

                  {t.status !== "completed" ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      disabled={updatingId === t.id}
                      onClick={() => handleUpdateStatus(t.id, "completed")}
                    >
                      <FiCheckCircle size={14} /> Mark Completed
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      disabled={updatingId === t.id}
                      onClick={() => handleUpdateStatus(t.id, "in_progress")}
                    >
                      Re-open Task
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageTransition>
  );
}
