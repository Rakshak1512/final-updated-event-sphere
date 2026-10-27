import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  FiUsers,
  FiSearch,
  FiPlus,
  FiMail,
  FiPhone,
  FiCheckSquare,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
  FiBriefcase,
  FiCalendar,
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

export default function FacultyList() {
  const [faculty, setFaculty] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  // Assign Work Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetFaculty, setTargetFaculty] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    event_id: "",
    priority: "medium",
    deadline: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [pendingFaculty, setPendingFaculty] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  // Fetch live faculty list & pending approval requests
  const loadFaculty = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [facRes, pendRes] = await Promise.all([
        adminService.facultyList(),
        adminService.pendingFaculty().catch(() => ({ data: [] })),
      ]);
      setFaculty(facRes.data || []);
      setPendingFaculty(pendRes.data || []);
    } catch (err) {
      console.error("Failed to load faculty directory:", err);
      if (showLoader) toast.error("Could not load faculty directory");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const handleApproveFaculty = async (facultyId, facultyName) => {
    setApprovingId(facultyId);
    try {
      await adminService.approveFaculty(facultyId);
      toast.success(`Faculty account for ${facultyName} has been approved!`);
      loadFaculty(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to approve faculty account.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectFaculty = async (facultyId, facultyName) => {
    if (!window.confirm(`Are you sure you want to reject faculty registration for ${facultyName}?`)) return;
    setRejectingId(facultyId);
    try {
      await adminService.rejectFaculty(facultyId, "Credentials could not be verified by institutional administrator.");
      toast.success(`Faculty registration for ${facultyName} has been rejected.`);
      loadFaculty(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reject faculty account.");
    } finally {
      setRejectingId(null);
    }
  };

  useEffect(() => {
    loadFaculty(true);
    eventService.list({ page: 1, page_size: 100 }).then(({ data }) => setEvents(data.items || [])).catch(() => {});
  }, [loadFaculty]);

  // Real-time synchronization polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadFaculty(false);
      }
    }, 5000);

    const handleFocus = () => loadFaculty(false);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadFaculty]);

  const departments = Array.from(new Set(faculty.map((f) => f.department || "General").filter(Boolean)));

  const filteredFaculty = faculty.filter((f) => {
    const matchesDept = selectedDept === "all" || (f.department || "General") === selectedDept;
    if (!matchesDept) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q) ||
      f.department?.toLowerCase().includes(q) ||
      f.registration_number?.toLowerCase().includes(q)
    );
  });

  const openAssignModal = (fac) => {
    setTargetFaculty(fac);
    setTaskForm({
      title: "",
      description: "",
      event_id: "",
      priority: "medium",
      deadline: "",
    });
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!targetFaculty) return;
    setSubmitting(true);
    try {
      await adminService.createAssignment({
        faculty_id: targetFaculty.id,
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        event_id: taskForm.event_id ? parseInt(taskForm.event_id) : null,
        priority: taskForm.priority,
        deadline: taskForm.deadline || null,
      });

      toast.success(`Work assigned to Prof. ${targetFaculty.name}. In-app & email notifications dispatched!`);
      setAssignModalOpen(false);
      loadFaculty(false);
    } catch (err) {
      console.error("Assign work error:", err);
      toast.error(err.response?.data?.detail || "Could not assign work to faculty.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!faculty || faculty.length === 0) {
      toast.error("No faculty records available to export");
      return;
    }

    const filename = `EventSphere_Faculty_Directory_${new Date().toISOString().split("T")[0]}.pdf`;
    const depts = Array.from(new Set(faculty.map((f) => f.department).filter(Boolean)));
    const totalActiveTasks = faculty.reduce((acc, f) => acc + (Number(f.active_tasks_count) || 0), 0);
    const totalCompletedTasks = faculty.reduce((acc, f) => acc + (Number(f.completed_tasks_count) || 0), 0);
    const totalEvents = faculty.reduce((acc, f) => acc + (Number(f.events_organized_count) || 0), 0);

    const reportColumns = [
      { key: "regNo", header: "Faculty ID" },
      { key: "name", header: "Full Name" },
      { key: "email", header: "Email Address" },
      { key: "department", header: "Department" },
      { key: "phone", header: "Contact No." },
      { key: "activeTasks", header: "Active Tasks" },
      { key: "eventsOrg", header: "Events Org." },
      { key: "joined", header: "Joined Date" },
    ];

    const reportData = faculty.map((f) => ({
      regNo: f.registration_number || `FAC-${f.id}`,
      name: f.name || "N/A",
      email: f.email || "N/A",
      department: f.department || "General",
      phone: f.phone || "N/A",
      activeTasks: String(f.active_tasks_count || 0),
      eventsOrg: String(f.events_organized_count || 0),
      joined: formatDate(f.created_at) || "N/A",
    }));

    try {
      await generateCustomReportPDF({
      title: "Faculty Directory & Academic Staff",
      subtitle: "Official Institutional Roster & Department Task Allocation Records",
      filename,
      orientation: "landscape",
      metadata: [
        { label: "Generated Date", value: new Date().toLocaleDateString() },
        { label: "Total Faculty", value: `${faculty.length} Members` },
        { label: "Departments", value: `${depts.length} Active` },
      ],
      summaryMetrics: [
        { label: "Total Faculty", value: faculty.length },
        { label: "Active Directives", value: totalActiveTasks },
        { label: "Completed Tasks", value: totalCompletedTasks },
        { label: "Events Supervised", value: totalEvents },
      ],
      columns: reportColumns,
      data: reportData,
      });
      toast.success(`Exported ${faculty.length} faculty profiles to PDF`);
    } catch (err) {
      console.error("Faculty directory PDF export failed:", err);
      toast.error(err?.message || "Could not download faculty directory PDF.");
    }
  };

  return (
    <PageTransition>
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Faculty Directory & Management</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Real-time directory of verified faculty members, active directives, and task delegation.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF}>
            <FiDownload size={14} /> Download Directory PDF
          </button>
          <button
            className="icon-btn"
            onClick={() => loadFaculty(true)}
            disabled={loading}
            title="Refresh faculty list"
          >
            <FiRefreshCw className={loading ? "spin" : ""} size={16} />
          </button>
        </div>
      </div>

      {/* Pending Faculty Approvals Section */}
      {pendingFaculty.length > 0 && (
        <div
          style={{
            marginBottom: 28,
            padding: "20px 24px",
            background: "rgba(245, 158, 11, 0.08)",
            borderRadius: 16,
            border: "1px solid rgba(245, 158, 11, 0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#f59e0b",
                  boxShadow: "0 0 8px #f59e0b",
                }}
              />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f59e0b" }}>
                Pending Faculty Registrations Requiring Admin Approval ({pendingFaculty.length})
              </h3>
            </div>
            <span style={{ fontSize: 12.5, color: "#94a3b8" }}>
              Action required to unlock faculty portal access
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {pendingFaculty.map((pf) => (
              <div
                key={pf.id}
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
                      {pf.name}
                    </h4>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "rgba(245, 158, 11, 0.2)",
                        color: "#f59e0b",
                        fontWeight: 600,
                      }}
                    >
                      Awaiting Review
                    </span>
                  </div>
                  <p style={{ margin: "2px 0", fontSize: 13, color: "#94a3b8" }}>
                    <strong>Email:</strong> {pf.email}
                  </p>
                  <p style={{ margin: "2px 0", fontSize: 13, color: "#94a3b8" }}>
                    <strong>Department:</strong> {pf.department || "General"}
                  </p>
                  {pf.admin_id && (
                    <p style={{ margin: "2px 0", fontSize: 13, color: "#94a3b8" }}>
                      <strong>Faculty ID:</strong> <span style={{ fontFamily: "monospace", color: "#818cf8" }}>{pf.admin_id}</span>
                    </p>
                  )}
                  <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#64748b" }}>
                    Registered: {formatDate(pf.created_at)}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => handleApproveFaculty(pf.id, pf.name)}
                    disabled={approvingId === pf.id || rejectingId === pf.id}
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
                      opacity: approvingId === pf.id ? 0.7 : 1,
                    }}
                  >
                    <FiCheckCircle size={14} />
                    {approvingId === pf.id ? "Approving..." : "Approve Faculty"}
                  </button>
                  <button
                    onClick={() => handleRejectFaculty(pf.id, pf.name)}
                    disabled={approvingId === pf.id || rejectingId === pf.id}
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
                      opacity: rejectingId === pf.id ? 0.7 : 1,
                    }}
                  >
                    <FiX size={14} />
                    {rejectingId === pf.id ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Department Filters */}
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
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: selectedDept === "all" ? "var(--gradient-primary)" : "var(--bg-elevated)",
              color: selectedDept === "all" ? "#fff" : "var(--text-secondary)",
              borderRadius: 999,
              fontSize: 12.5,
              padding: "6px 14px",
            }}
            onClick={() => setSelectedDept("all")}
          >
            All Departments ({faculty.length})
          </button>

          {departments.map((dept) => (
            <button
              key={dept}
              type="button"
              className="btn btn-sm"
              style={{
                background: selectedDept === dept ? "var(--gradient-primary)" : "var(--bg-elevated)",
                color: selectedDept === dept ? "#fff" : "var(--text-secondary)",
                borderRadius: 999,
                fontSize: 12.5,
                padding: "6px 14px",
              }}
              onClick={() => setSelectedDept(dept)}
            >
              {dept}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", minWidth: 0, width: "100%", maxWidth: 360 }}>
          <input
            className="form-input"
            style={{ padding: "8px 34px 8px 34px", fontSize: 13 }}
            placeholder="Search by faculty name, email, ID..."
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
      </div>

      {/* Faculty Cards Grid */}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : filteredFaculty.length === 0 ? (
        <EmptyState
          icon={<FiUsers />}
          title="No faculty members found"
          message={
            searchQuery || selectedDept !== "all"
              ? "No faculty match the current search filters."
              : "No faculty members registered in the system yet."
          }
        />
      ) : (
        <div className="grid-cards">
          {filteredFaculty.map((fac, i) => (
            <motion.div
              key={fac.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card glass-card-interactive float-card"
              style={{
                padding: "24px",
                borderRadius: "22px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      background: "var(--gradient-primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 16,
                      boxShadow: "0 6px 16px rgba(139, 92, 246, 0.35)",
                    }}
                  >
                    {fac.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px" }}>{fac.name}</h3>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
                      ID: {fac.registration_number}
                    </span>
                  </div>
                </div>

                <span className="badge badge-info">{fac.department || "General"}</span>
              </div>

              <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FiMail size={14} color="#8b5cf6" />
                  <span style={{ wordBreak: "break-all" }}>{fac.email}</span>
                </div>
                {fac.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FiPhone size={14} color="#0ea5e9" />
                    <span>{fac.phone}</span>
                  </div>
                )}
              </div>

              {/* Work Assignment & Event Badges */}
              <div
                style={{
                  background: "var(--bg-glass)",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 12.5,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 16,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Active Tasks</span>
                  <strong style={{ color: "#f59e0b", fontSize: 15 }}>{fac.active_tasks_count || 0}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block" }}>Events Led</span>
                  <strong style={{ color: "#8b5cf6", fontSize: 15 }}>{fac.events_organized_count || 0}</strong>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: "auto", width: "100%", justifyContent: "center" }}
                onClick={() => openAssignModal(fac)}
              >
                <FiPlus size={14} /> Assign Work Directive
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* ASSIGN WORK MODAL */}
      <Modal
        open={assignModalOpen}
        onClose={() => !submitting && setAssignModalOpen(false)}
        title={`Assign Work to Prof. ${targetFaculty?.name}`}
        width={520}
      >
        <form onSubmit={handleAssignSubmit}>
          <div className="form-group">
            <label className="form-label">Work Directive Title</label>
            <input
              className="form-input"
              value={taskForm.title}
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Oversee Hackathon 2026 Technical Evaluation"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Task Description & Instructions</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={taskForm.description}
              onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Provide detailed instructions, rubric, and scope for this directive..."
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                className="form-select"
                value={taskForm.priority}
                onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Completion Deadline (Optional)</label>
              <input
                type="date"
                className="form-input"
                value={taskForm.deadline}
                onChange={(e) => setTaskForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Associated Campus Event (Optional)</label>
            <select
              className="form-select"
              value={taskForm.event_id}
              onChange={(e) => setTaskForm((f) => ({ ...f, event_id: e.target.value }))}
            >
              <option value="">None (General Administrative Duty)</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.category || "Event"})
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              background: "rgba(139, 92, 246, 0.08)",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 12.5,
              color: "#a5b4fc",
              marginBottom: 16,
              border: "1px solid rgba(139, 92, 246, 0.2)",
            }}
          >
            ℹ️ Submitting this assignment will create an in-app alert and dispatch an official email notification to <strong>{targetFaculty?.email}</strong>.
          </div>

          <button className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? "Assigning & Notifying..." : "Confirm & Assign Work"}
          </button>
        </form>
      </Modal>
    </PageTransition>
  );
}
