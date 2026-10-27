import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiCheckSquare,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiClock,
  FiUser,
  FiCalendar,
  FiSearch,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
  FiFilter,
  FiX,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Modal from "../../components/ui/Modal.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { adminService, eventService } from "../../api/services.js";
import { formatDate } from "../../utils/format.js";
import { generateCustomReportPDF } from "../../utils/pdfReportGenerator.js";

const PRIORITY_COLORS = {
  urgent: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
  high: { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316", border: "rgba(249, 115, 22, 0.3)" },
  medium: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  low: { bg: "rgba(56, 189, 248, 0.15)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" },
};

export default function AdminAssignments() {
  const location = useLocation();
  const [assignments, setAssignments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [form, setForm] = useState({
    faculty_id: "",
    title: "",
    description: "",
    event_id: "",
    priority: "medium",
    deadline: "",
    status: "pending",
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [tasksRes, facRes, evRes] = await Promise.all([
        adminService.assignments().then(({ data }) => data || []),
        adminService.facultyList().then(({ data }) => data || []),
        eventService.list({ page: 1, page_size: 100 }).then(({ data }) => data.items || []),
      ]);
      setAssignments(tasksRes);
      setFaculty(facRes);
      setEvents(evRes);
    } catch (err) {
      console.error("Assignments load error:", err);
      if (showLoader) toast.error("Could not load work assignments");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Handle prefill faculty from navigation state
  useEffect(() => {
    if (location.state?.prefillFacultyId && faculty.length > 0) {
      openCreateModal(String(location.state.prefillFacultyId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faculty]);

  const openCreateModal = (prefillFacId = "") => {
    setEditingAssignment(null);
    setForm({
      faculty_id: prefillFacId || (faculty[0] ? String(faculty[0].id) : ""),
      title: "",
      description: "",
      event_id: "",
      priority: "medium",
      deadline: "",
      status: "pending",
    });
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingAssignment(task);
    setForm({
      faculty_id: String(task.faculty_id),
      title: task.title,
      description: task.description,
      event_id: task.event_id ? String(task.event_id) : "",
      priority: task.priority || "medium",
      deadline: task.deadline || "",
      status: task.status || "pending",
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.faculty_id) return toast.error("Select a faculty member");
    setSubmitting(true);
    try {
      if (editingAssignment) {
        await adminService.updateAssignment(editingAssignment.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          event_id: form.event_id ? parseInt(form.event_id) : null,
          priority: form.priority,
          deadline: form.deadline || null,
          status: form.status,
        });
        toast.success("Assignment updated successfully");
      } else {
        await adminService.createAssignment({
          faculty_id: parseInt(form.faculty_id),
          title: form.title.trim(),
          description: form.description.trim(),
          event_id: form.event_id ? parseInt(form.event_id) : null,
          priority: form.priority,
          deadline: form.deadline || null,
        });
        toast.success("Work assignment created & faculty notified via email!");
      }

      setModalOpen(false);
      loadData(false);
    } catch (err) {
      console.error("Assignment save error:", err);
      toast.error(err.response?.data?.detail || "Could not save assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteAssignment(deleteTarget.id);
      toast.success("Assignment removed successfully");
      setDeleteTarget(null);
      loadData(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not delete assignment");
    }
  };

  const filteredAssignments = assignments.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (facultyFilter !== "all" && String(t.faculty_id) !== String(facultyFilter)) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.faculty_name?.toLowerCase().includes(q) ||
      t.faculty_email?.toLowerCase().includes(q) ||
      t.faculty_department?.toLowerCase().includes(q) ||
      t.priority?.toLowerCase().includes(q) ||
      t.event_title?.toLowerCase().includes(q)
    );
  });

  const handleExportPDF = async () => {
    if (!assignments || assignments.length === 0) {
      toast.error("No assignment records available to export");
      return;
    }

    const filename = `EventSphere_Faculty_Assignments_${new Date().toISOString().split("T")[0]}.pdf`;
    const pendingCount = assignments.filter((t) => t.status === "pending").length;
    const progressCount = assignments.filter((t) => t.status === "in_progress").length;
    const completedCount = assignments.filter((t) => t.status === "completed").length;

    const reportColumns = [
      { key: "taskId", header: "Task ID" },
      { key: "title", header: "Directive Title" },
      { key: "faculty", header: "Assigned Faculty" },
      { key: "department", header: "Department" },
      { key: "priority", header: "Priority" },
      { key: "status", header: "Status" },
      { key: "deadline", header: "Deadline" },
      { key: "event", header: "Event Context" },
      { key: "assignedBy", header: "Assigned By" },
    ];

    const reportData = assignments.map((t) => ({
      taskId: `TASK-${t.id}`,
      title: t.title || "N/A",
      faculty: t.faculty_name || "N/A",
      department: t.faculty_department || "General",
      priority: (t.priority || "medium").toUpperCase(),
      status: (t.status || "pending").replace("_", " ").toUpperCase(),
      deadline: t.deadline || "None",
      event: t.event_title || "General",
      assignedBy: t.assigned_by_name || "Admin",
    }));

    try {
      await generateCustomReportPDF({
      title: "Faculty Assignments & Institutional Directives",
      subtitle: "Official Task Delegation, Deliverable Tracking & Completion Audit",
      filename,
      orientation: "landscape",
      metadata: [
        { label: "Generated Date", value: new Date().toLocaleDateString() },
        { label: "Total Tasks", value: `${assignments.length} Directives` },
        { label: "Completed", value: `${completedCount} Delivered` },
      ],
      summaryMetrics: [
        { label: "Total Tasks", value: assignments.length },
        { label: "Pending", value: pendingCount },
        { label: "In Progress", value: progressCount },
        { label: "Completed", value: completedCount },
      ],
      columns: reportColumns,
      data: reportData,
      });
      toast.success(`Exported ${assignments.length} assignments to PDF`);
    } catch (err) {
      console.error("Assignment PDF export failed:", err);
      toast.error(err?.message || "Could not download assignments PDF.");
    }
  };

  return (
    <PageTransition>
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Work Assignments & Directives</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Allocate, edit, track progress, and coordinate faculty responsibilities institutional-wide.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <FiDownload size={14} /> Download Assignments PDF
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => openCreateModal("")}>
            <FiPlus size={14} /> Assign Work
          </button>
          <button
            className="icon-btn"
            onClick={() => loadData(true)}
            disabled={loading}
            title="Refresh assignments"
          >
            <FiRefreshCw className={loading ? "spin" : ""} size={16} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", background: "var(--bg-elevated)", borderRadius: 10, padding: 3 }}>
            {["all", "pending", "in_progress", "completed"].map((st) => (
              <button
                key={st}
                type="button"
                className="btn btn-sm"
                style={{
                  background: statusFilter === st ? "var(--gradient-primary)" : "transparent",
                  color: statusFilter === st ? "#fff" : "var(--text-secondary)",
                  borderRadius: 8,
                  fontSize: 12,
                  padding: "5px 12px",
                  textTransform: "capitalize",
                }}
                onClick={() => setStatusFilter(st)}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          <select
            className="form-select"
            style={{ width: 200, padding: "6px 12px", fontSize: 12.5 }}
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
          >
            <option value="all">All Faculty ({faculty.length})</option>
            {faculty.map((f) => (
              <option key={f.id} value={String(f.id)}>
                Prof. {f.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ position: "relative", minWidth: 0, width: "100%", maxWidth: 360 }}>
          <input
            className="form-input"
            style={{ padding: "7px 32px 7px 32px", fontSize: 13 }}
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <FiSearch
            size={14}
            style={{
              position: "absolute",
              left: 10,
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
                right: 10,
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
      </div>

      {/* Assignments Grid */}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={<FiCheckSquare />}
          title="No assignments found"
          message={
            searchQuery || statusFilter !== "all" || facultyFilter !== "all"
              ? "No assignments match your search filter."
              : "No tasks have been assigned to faculty members yet."
          }
          action={
            <button className="btn btn-primary btn-sm" onClick={() => openCreateModal("")}>
              <FiPlus /> Assign First Task
            </button>
          }
        />
      ) : (
        <div className="grid-cards">
          {filteredAssignments.map((t, i) => {
            const pStyle = PRIORITY_COLORS[t.priority?.toLowerCase()] || PRIORITY_COLORS.medium;
            const isCompleted = t.status === "completed";

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
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
                    {t.priority}
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
                    marginBottom: 4,
                    color: "var(--text-primary)",
                    textDecoration: isCompleted ? "line-through" : "none",
                  }}
                >
                  {t.title}
                </h3>

                <div style={{ fontSize: 12.5, color: "#8b5cf6", fontWeight: 600, marginBottom: 10 }}>
                  Assigned to: Prof. {t.faculty_name} ({t.faculty_department || "Faculty"})
                </div>

                <p
                  style={{
                    fontSize: 13,
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
                  <span>Assigned: {formatDate(t.created_at)}</span>
                  {t.deadline && (
                    <span style={{ color: "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <FiClock size={12} /> Due: {t.deadline}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => openEditModal(t)}
                  >
                    <FiEdit2 size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: "rgba(220,38,38,0.12)", color: "var(--danger)" }}
                    onClick={() => setDeleteTarget(t)}
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ASSIGNMENT MODAL */}
      <Modal
        open={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editingAssignment ? "Edit Work Assignment" : "Assign Work to Faculty"}
        width={520}
      >
        <form onSubmit={handleFormSubmit}>
          {!editingAssignment && (
            <div className="form-group">
              <label className="form-label">Assign to Faculty Member</label>
              <select
                className="form-select"
                value={form.faculty_id}
                onChange={(e) => setForm((f) => ({ ...f, faculty_id: e.target.value }))}
                required
              >
                <option value="">Select Faculty</option>
                {faculty.map((fac) => (
                  <option key={fac.id} value={String(fac.id)}>
                    Prof. {fac.name} ({fac.department || "Faculty"}) · {fac.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Task Title</label>
            <input
              className="form-input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Coordinate Stage Lighting & Audio for Cultural Fest"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Task Instructions & Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Detailed instructions for the faculty member..."
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Deadline (Optional)</label>
              <input
                type="date"
                className="form-input"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>

          {editingAssignment && (
            <div className="form-group">
              <label className="form-label">Task Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Associated Event (Optional)</label>
            <select
              className="form-select"
              value={form.event_id}
              onChange={(e) => setForm((f) => ({ ...f, event_id: e.target.value }))}
            >
              <option value="">None (General Duty)</option>
              {events.map((ev) => (
                <option key={ev.id} value={String(ev.id)}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
            {submitting ? "Saving & Notifying..." : editingAssignment ? "Save Changes" : "Assign Task"}
          </button>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Assignment" width={380}>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
          Delete task "{deleteTarget?.title}" assigned to {deleteTarget?.faculty_name}?
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDeleteAssignment}>
            Delete
          </button>
        </div>
      </Modal>
    </PageTransition>
  );
}
