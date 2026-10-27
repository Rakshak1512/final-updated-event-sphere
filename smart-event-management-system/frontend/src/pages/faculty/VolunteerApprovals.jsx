import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  FiUsers,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiRefreshCw,
  FiEye,
  FiAlertCircle,
  FiMail,
  FiHash,
  FiBook,
  FiCalendar,
  FiFilter,
  FiDownload,
  FiFileText,
  FiTrash2,
  FiAward,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Modal from "../../components/ui/Modal.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { volunteerApprovalService } from "../../api/services.js";
import { formatDate } from "../../utils/format.js";

export default function VolunteerApprovals() {
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [data, setData] = useState({
    volunteers: [],
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    total_count: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING"); // PENDING, APPROVED, REJECTED, ALL
  const [deptFilter, setDeptFilter] = useState("all");

  // Action Modals State
  const [detailModalVolunteer, setDetailModalVolunteer] = useState(null);
  const [approveConfirmVolunteer, setApproveConfirmVolunteer] = useState(null);
  const [rejectConfirmVolunteer, setRejectConfirmVolunteer] = useState(null);
  const [removeConfirmVolunteer, setRemoveConfirmVolunteer] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const loadVolunteerApprovals = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await volunteerApprovalService.volunteerApprovals();
      setData(
        res.data || {
          volunteers: [],
          pending_count: 0,
          approved_count: 0,
          rejected_count: 0,
          total_count: 0,
        }
      );
    } catch (err) {
      console.error("Failed to load volunteer approvals roster:", err);
      if (showLoader) toast.error("Could not fetch volunteer approval records.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVolunteerApprovals(true);
    // Poll less often while visible; pause network work in background tabs.
    const interval = setInterval(() => {
      if (!document.hidden) loadVolunteerApprovals(false);
    }, 20000);
    const handleFocus = () => loadVolunteerApprovals(false);
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadVolunteerApprovals]);

  // Handle Approve
  const handleApprove = async () => {
    if (!approveConfirmVolunteer) return;
    const volunteer = approveConfirmVolunteer;
    setProcessingId(volunteer.id);
    try {
      await volunteerApprovalService.approveVolunteer(volunteer.id);
      toast.success(`Account approved for ${volunteer.name}! Notification email sent.`);
      setApproveConfirmVolunteer(null);
      await loadVolunteerApprovals(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to approve volunteer account.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!rejectConfirmVolunteer) return;
    const volunteer = rejectConfirmVolunteer;
    setProcessingId(volunteer.id);
    try {
      await volunteerApprovalService.rejectVolunteer(volunteer.id, rejectionReason);
      toast.success(`Registration rejected for ${volunteer.name}. Notification email sent.`);
      setRejectConfirmVolunteer(null);
      setRejectionReason("");
      await loadVolunteerApprovals(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reject volunteer account.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Remove Volunteer
  const handleRemove = async () => {
    if (!removeConfirmVolunteer) return;
    const volunteer = removeConfirmVolunteer;
    setProcessingId(volunteer.id);
    try {
      await volunteerApprovalService.removeVolunteer(volunteer.id);
      toast.success(`Volunteer account for ${volunteer.name} removed successfully.`);
      setRemoveConfirmVolunteer(null);
      await loadVolunteerApprovals(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove volunteer account.");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle PDF Reports Download
  const handleDownloadPdf = async (type) => {
    const titleCase = type.charAt(0).toUpperCase() + type.slice(1);
    try {
      setDownloadingPdf(type);
      toast.loading(`Generating ${titleCase} Volunteers PDF report...`, { id: "pdf-toast" });
      await volunteerApprovalService.downloadVolunteerPdf(type);
      toast.success(`${titleCase} Volunteers PDF downloaded successfully!`, { id: "pdf-toast" });
    } catch (err) {
      console.error("PDF report download failed:", err);
      toast.error(`Failed to download ${titleCase} Volunteers PDF report.`, { id: "pdf-toast" });
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Filter volunteers
  const filteredVolunteers = (data.volunteers || []).filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    const volId = (v.registration_number || v.admin_id || `VOL-${v.id}`).toLowerCase();
    const nameMatch = (v.name || "").toLowerCase().includes(q);
    const emailMatch = (v.email || "").toLowerCase().includes(q);
    const idMatch = volId.includes(q);
    const courseMatch = (v.course || "").toLowerCase().includes(q);
    const deptMatchText = (v.department || "").toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || emailMatch || idMatch || courseMatch || deptMatchText;

    const matchesStatus =
      statusFilter === "ALL" || (v.approval_status || "PENDING").toUpperCase() === statusFilter;

    const matchesDept =
      deptFilter === "all" || (v.department || "").toLowerCase() === deptFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Extract unique departments for filter dropdown
  const departments = Array.from(
    new Set((data.volunteers || []).map((v) => v.department).filter(Boolean))
  );

  return (
    <PageTransition>
      <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 40 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(13, 148, 136, 0.15)",
                  color: "#2dd4bf",
                }}
              >
                <FiAward size={20} />
              </span>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                Volunteer Approval Management
              </h1>
            </div>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Verify student volunteer account applications, manage dashboard permissions, and generate institutional verification reports.
            </p>
          </div>

          <button
            onClick={() => loadVolunteerApprovals(true)}
            disabled={loading}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px" }}
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} size={15} />
            Refresh Roster
          </button>
        </div>

        {/* 4 Database Counters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Pending Volunteers */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            onClick={() => setStatusFilter("PENDING")}
            className="glass-card"
            style={{
              padding: "18px 20px",
              borderRadius: 16,
              cursor: "pointer",
              border:
                statusFilter === "PENDING"
                  ? "2px solid #f59e0b"
                  : "1px solid rgba(245, 158, 11, 0.3)",
              background:
                statusFilter === "PENDING"
                  ? "linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.06))"
                  : "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))",
              boxShadow: data.pending_count > 0 ? "0 4px 20px rgba(245, 158, 11, 0.15)" : "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fbbf24" }}>
                Pending Volunteers
              </span>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiClock size={16} />
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 8 }}>
              {data.pending_count}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Awaiting faculty verification
            </div>
          </motion.div>

          {/* Approved Volunteers */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            whileHover={{ y: -2 }}
            onClick={() => setStatusFilter("APPROVED")}
            className="glass-card"
            style={{
              padding: "18px 20px",
              borderRadius: 16,
              cursor: "pointer",
              border:
                statusFilter === "APPROVED"
                  ? "2px solid #10b981"
                  : "1px solid rgba(16, 185, 129, 0.3)",
              background:
                statusFilter === "APPROVED"
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(16, 185, 129, 0.06))"
                  : "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#34d178" }}>
                Approved Volunteers
              </span>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d178",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiCheckCircle size={16} />
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 8 }}>
              {data.approved_count}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Active volunteer dashboard access
            </div>
          </motion.div>

          {/* Rejected Volunteers */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -2 }}
            onClick={() => setStatusFilter("REJECTED")}
            className="glass-card"
            style={{
              padding: "18px 20px",
              borderRadius: 16,
              cursor: "pointer",
              border:
                statusFilter === "REJECTED"
                  ? "2px solid #ef4444"
                  : "1px solid rgba(239, 68, 68, 0.3)",
              background:
                statusFilter === "REJECTED"
                  ? "linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(239, 68, 68, 0.06))"
                  : "linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f87171" }}>
                Rejected Volunteers
              </span>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#f87171",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiXCircle size={16} />
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 8 }}>
              {data.rejected_count}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Declined volunteer applications
            </div>
          </motion.div>

          {/* Total Volunteers */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ y: -2 }}
            onClick={() => setStatusFilter("ALL")}
            className="glass-card"
            style={{
              padding: "18px 20px",
              borderRadius: 16,
              cursor: "pointer",
              border:
                statusFilter === "ALL"
                  ? "2px solid #0d9488"
                  : "1px solid rgba(13, 148, 136, 0.3)",
              background:
                statusFilter === "ALL"
                  ? "linear-gradient(135deg, rgba(13, 148, 136, 0.18), rgba(13, 148, 136, 0.06))"
                  : "linear-gradient(135deg, rgba(13, 148, 136, 0.08), rgba(13, 148, 136, 0.02))",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2dd4bf" }}>
                Total Volunteers
              </span>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(13, 148, 136, 0.15)",
                  color: "#2dd4bf",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiUsers size={16} />
              </span>
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 8 }}>
              {data.total_count}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              All registered volunteer accounts
            </div>
          </motion.div>
        </div>

        {/* PDF Reports Section */}
        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            borderRadius: 16,
            marginBottom: 24,
            background: "linear-gradient(135deg, rgba(13, 148, 136, 0.08), rgba(20, 184, 166, 0.05))",
            border: "1px solid rgba(13, 148, 136, 0.25)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(13, 148, 136, 0.2)",
                color: "#2dd4bf",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiFileText size={20} />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                Official Volunteer PDF Reports
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Generate printable, institutionally branded EventSphere volunteer rosters generated directly by the backend.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              onClick={() => handleDownloadPdf("pending")}
              disabled={!!downloadingPdf}
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#fbbf24",
                borderColor: "rgba(245, 158, 11, 0.35)",
                background: "rgba(245, 158, 11, 0.08)",
                cursor: downloadingPdf ? "not-allowed" : "pointer",
              }}
            >
              <FiDownload size={14} className={downloadingPdf === "pending" ? "animate-spin" : ""} />
              Download Pending Volunteers PDF
            </button>

            <button
              onClick={() => handleDownloadPdf("approved")}
              disabled={!!downloadingPdf}
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#34d178",
                borderColor: "rgba(16, 185, 129, 0.35)",
                background: "rgba(16, 185, 129, 0.08)",
                cursor: downloadingPdf ? "not-allowed" : "pointer",
              }}
            >
              <FiDownload size={14} className={downloadingPdf === "approved" ? "animate-spin" : ""} />
              Download Approved Volunteers PDF
            </button>

            <button
              onClick={() => handleDownloadPdf("rejected")}
              disabled={!!downloadingPdf}
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#f87171",
                borderColor: "rgba(239, 68, 68, 0.35)",
                background: "rgba(239, 68, 68, 0.08)",
                cursor: downloadingPdf ? "not-allowed" : "pointer",
              }}
            >
              <FiDownload size={14} className={downloadingPdf === "rejected" ? "animate-spin" : ""} />
              Download Rejected Volunteers PDF
            </button>

            <button
              onClick={() => handleDownloadPdf("all")}
              disabled={!!downloadingPdf}
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#2dd4bf",
                borderColor: "rgba(13, 148, 136, 0.35)",
                background: "rgba(13, 148, 136, 0.08)",
                cursor: downloadingPdf ? "not-allowed" : "pointer",
              }}
            >
              <FiDownload size={14} className={downloadingPdf === "all" ? "animate-spin" : ""} />
              Download All Volunteers PDF
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", flex: "1 1 300px", maxWidth: 440 }}>
            <FiSearch
              size={16}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search by name, volunteer ID, email, dept, course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 40px",
                borderRadius: 12,
                border: "1px solid var(--border-color)",
                background: "var(--bg-base)",
                color: "var(--text-primary)",
                fontSize: "0.88rem",
                outline: "none",
              }}
            />
          </div>

          {/* Department Filter */}
          {departments.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FiFilter size={15} style={{ color: "var(--text-muted)" }} />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-base)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Tabs: Pending, Approved, Rejected, All Volunteers */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--bg-base)",
              padding: 4,
              borderRadius: 12,
              border: "1px solid var(--border-color)",
              gap: 4,
            }}
          >
            {[
              { id: "PENDING", label: `Pending (${data.pending_count})` },
              { id: "APPROVED", label: `Approved (${data.approved_count})` },
              { id: "REJECTED", label: `Rejected (${data.rejected_count})` },
              { id: "ALL", label: `All Volunteers (${data.total_count})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background:
                    statusFilter === tab.id ? "#0d9488" : "transparent",
                  color:
                    statusFilter === tab.id ? "#ffffff" : "var(--text-secondary)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Volunteers Table */}
        {loading && data.volunteers.length === 0 ? (
          <SkeletonGrid count={6} />
        ) : filteredVolunteers.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title={
              statusFilter === "PENDING"
                ? "No Pending Volunteer Approvals"
                : "No Volunteers Found"
            }
            description={
              statusFilter === "PENDING"
                ? "All registered volunteer accounts have been reviewed and approved!"
                : "Try adjusting your search query or department filter."
            }
          />
        ) : (
          <div
            className="glass-card"
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid var(--border-color)",
            }}
          >
            <div className="table-wrap">
              <table
                className="data-table"
                style={{
                  width: "100%",
                  minWidth: 640,
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "0.9rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      borderBottom: "1px solid var(--border-color)",
                      color: "var(--text-secondary)",
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "14px 18px" }}>Volunteer Name</th>
                    <th style={{ padding: "14px 18px" }}>Volunteer ID</th>
                    <th style={{ padding: "14px 18px" }}>Email</th>
                    <th style={{ padding: "14px 18px" }}>Department</th>
                    <th style={{ padding: "14px 18px" }}>Course</th>
                    <th style={{ padding: "14px 18px" }}>Year / Semester</th>
                    <th style={{ padding: "14px 18px" }}>Registration Date</th>
                    <th style={{ padding: "14px 18px" }}>Approval Status</th>
                    <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVolunteers.map((v) => {
                    const status = (v.approval_status || "PENDING").toUpperCase();
                    const isPending = status === "PENDING";
                    const isApproved = status === "APPROVED";
                    const isRejected = status === "REJECTED";

                    const volId = v.registration_number || v.admin_id || `VOL-${v.id}`;
                    const courseDisplay = v.course || (v.department ? `${v.department} UG` : "Undergraduate");
                    const semesterDisplay = v.semester
                      ? (v.semester <= 8 ? `Semester ${v.semester}` : `Sem ${v.semester}`)
                      : "Year 1";

                    return (
                      <tr
                        key={v.id}
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                          transition: "background 0.2s ease",
                        }}
                      >
                        {/* Name */}
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                flexShrink: 0,
                              }}
                            >
                              {(v.name || "V").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                {v.name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Volunteer ID */}
                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "#2dd4bf",
                              background: "rgba(13, 148, 136, 0.1)",
                              padding: "2px 8px",
                              borderRadius: 6,
                            }}
                          >
                            {volId}
                          </span>
                        </td>

                        {/* Email */}
                        <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>
                          {v.email}
                        </td>

                        {/* Department */}
                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: 6,
                              fontSize: "0.8rem",
                              fontWeight: 500,
                              background: "rgba(255, 255, 255, 0.05)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {v.department || "General"}
                          </span>
                        </td>

                        {/* Course */}
                        <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>
                          {courseDisplay}
                        </td>

                        {/* Year / Semester */}
                        <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>
                          {semesterDisplay}
                        </td>

                        {/* Registration Date */}
                        <td style={{ padding: "14px 18px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          {formatDate(v.created_at)}
                        </td>

                        {/* Approval Status */}
                        <td style={{ padding: "14px 18px" }}>
                          {isPending && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                background: "rgba(245, 158, 11, 0.15)",
                                color: "#fbbf24",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "#f59e0b",
                                }}
                              />
                              PENDING
                            </span>
                          )}
                          {isApproved && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#34d178",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                              }}
                            >
                              <FiCheckCircle size={12} />
                              APPROVED
                            </span>
                          )}
                          {isRejected && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 12,
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                              }}
                            >
                              <FiXCircle size={12} />
                              REJECTED
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              justifyContent: "flex-end",
                            }}
                          >
                            {/* Pending actions: Approve, Reject */}
                            {isPending && (
                              <>
                                <button
                                  onClick={() => setApproveConfirmVolunteer(v)}
                                  disabled={processingId === v.id}
                                  title="Approve Volunteer Account"
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(16, 185, 129, 0.4)",
                                    background: "rgba(16, 185, 129, 0.15)",
                                    color: "#34d178",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "0.82rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                >
                                  <FiCheckCircle size={14} />
                                  Approve
                                </button>

                                <button
                                  onClick={() => {
                                    setRejectConfirmVolunteer(v);
                                    setRejectionReason("");
                                  }}
                                  disabled={processingId === v.id}
                                  title="Reject Volunteer Application"
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    background: "rgba(239, 68, 68, 0.12)",
                                    color: "#f87171",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "0.82rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                >
                                  <FiXCircle size={14} />
                                  Reject
                                </button>
                              </>
                            )}

                            {/* View details (all tabs) */}
                            <button
                              onClick={() => setDetailModalVolunteer(v)}
                              title="View Details"
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "1px solid var(--border-color)",
                                background: "rgba(255, 255, 255, 0.05)",
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <FiEye size={13} />
                              Details
                            </button>

                            {/* Remove button (all tabs) */}
                            <button
                              onClick={() => setRemoveConfirmVolunteer(v)}
                              disabled={processingId === v.id}
                              title="Remove Volunteer Account"
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "1px solid rgba(239, 68, 68, 0.35)",
                                background: "rgba(239, 68, 68, 0.08)",
                                color: "#f87171",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <FiTrash2 size={13} />
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: VOLUNTEER DETAILS ----------------- */}
        <Modal
          open={!!detailModalVolunteer}
          onClose={() => setDetailModalVolunteer(null)}
          title="Volunteer Details"
          width={540}
        >
          {detailModalVolunteer && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px",
                  borderRadius: 14,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-color)",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                  }}
                >
                  {(detailModalVolunteer.name || "V").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {detailModalVolunteer.name}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {detailModalVolunteer.email}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginBottom: 20,
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>
                    Volunteer ID
                  </span>
                  <strong style={{ color: "#2dd4bf", fontFamily: "monospace" }}>
                    {detailModalVolunteer.registration_number || detailModalVolunteer.admin_id || `VOL-${detailModalVolunteer.id}`}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>
                    Approval Status
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      background:
                        (detailModalVolunteer.approval_status || "").toUpperCase() === "APPROVED"
                          ? "rgba(16, 185, 129, 0.15)"
                          : (detailModalVolunteer.approval_status || "").toUpperCase() === "REJECTED"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(245, 158, 11, 0.15)",
                      color:
                        (detailModalVolunteer.approval_status || "").toUpperCase() === "APPROVED"
                          ? "#34d178"
                          : (detailModalVolunteer.approval_status || "").toUpperCase() === "REJECTED"
                          ? "#f87171"
                          : "#fbbf24",
                    }}
                  >
                    {(detailModalVolunteer.approval_status || "PENDING").toUpperCase()}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>
                    Department
                  </span>
                  <strong style={{ color: "var(--text-primary)" }}>
                    {detailModalVolunteer.department || "General"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>
                    Course
                  </span>
                  <strong style={{ color: "var(--text-primary)" }}>
                    {detailModalVolunteer.course || "B.Tech / Degree"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>
                    Year / Semester
                  </span>
                  <strong style={{ color: "var(--text-primary)" }}>
                    {detailModalVolunteer.semester ? `Semester ${detailModalVolunteer.semester}` : "Semester 1"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>
                    Registration Date
                  </span>
                  <strong style={{ color: "var(--text-primary)" }}>
                    {formatDate(detailModalVolunteer.created_at)}
                  </strong>
                </div>
              </div>

              {detailModalVolunteer.rejection_reason && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ color: "#f87171", fontWeight: 600, fontSize: "0.82rem", marginBottom: 4 }}>
                    Rejection Reason
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    {detailModalVolunteer.rejection_reason}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setDetailModalVolunteer(null)} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ----------------- MODAL: APPROVE CONFIRMATION ----------------- */}
        <Modal
          open={!!approveConfirmVolunteer}
          onClose={() => setApproveConfirmVolunteer(null)}
          title="Approve Volunteer Account"
          width={480}
        >
          {approveConfirmVolunteer && (
            <div>
              <div style={{ textAlign: "center", padding: "10px 0 16px" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d178",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <FiCheckCircle size={32} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700 }}>
                  Approve Volunteer Account?
                </h3>
                <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  This will grant volunteer dashboard access to:
                </p>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-color)",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {approveConfirmVolunteer.name}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {approveConfirmVolunteer.email}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#2dd4bf", marginTop: 4 }}>
                    ID: {approveConfirmVolunteer.registration_number || approveConfirmVolunteer.admin_id || `VOL-${approveConfirmVolunteer.id}`}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(13, 148, 136, 0.08)",
                  border: "1px solid rgba(13, 148, 136, 0.2)",
                  color: "var(--text-secondary)",
                  fontSize: "0.82rem",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <FiMail size={16} style={{ color: "#2dd4bf", flexShrink: 0, marginTop: 2 }} />
                <span>
                  The volunteer will immediately gain access to their dashboard and will receive an email notification:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>EventSphere Volunteer Account Approved</strong>.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setApproveConfirmVolunteer(null)}
                  disabled={!!processingId}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!!processingId}
                  className="btn-primary"
                  style={{ background: "#0d9488", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {processingId ? <FiRefreshCw className="animate-spin" size={14} /> : <FiCheckCircle size={15} />}
                  Confirm Approval
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ----------------- MODAL: REJECT CONFIRMATION ----------------- */}
        <Modal
          open={!!rejectConfirmVolunteer}
          onClose={() => {
            setRejectConfirmVolunteer(null);
            setRejectionReason("");
          }}
          title="Reject Volunteer Application"
          width={480}
        >
          {rejectConfirmVolunteer && (
            <div>
              <div style={{ textAlign: "center", padding: "10px 0 16px" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#f87171",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <FiAlertCircle size={32} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700 }}>
                  Reject Volunteer Application?
                </h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  This will deny volunteer access for <strong style={{ color: "var(--text-primary)" }}>{rejectConfirmVolunteer.name}</strong>.
                </p>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "var(--text-secondary)",
                  }}
                >
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Volunteer quota reached for department, invalid student credentials..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-base)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#f87171",
                  fontSize: "0.82rem",
                  marginBottom: 20,
                }}
              >
                The volunteer account will remain blocked and will receive an email notification: <strong>EventSphere Volunteer Account Update</strong>.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => {
                    setRejectConfirmVolunteer(null);
                    setRejectionReason("");
                  }}
                  disabled={!!processingId}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!processingId}
                  className="btn-primary"
                  style={{ background: "#ef4444", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {processingId ? <FiRefreshCw className="animate-spin" size={14} /> : <FiXCircle size={15} />}
                  Reject Volunteer
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ----------------- MODAL: REMOVE CONFIRMATION ----------------- */}
        <Modal
          open={!!removeConfirmVolunteer}
          onClose={() => setRemoveConfirmVolunteer(null)}
          title="Remove Volunteer Account?"
          width={480}
        >
          {removeConfirmVolunteer && (
            <div>
              <div style={{ textAlign: "center", padding: "10px 0 16px" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#f87171",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <FiTrash2 size={28} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700 }}>
                  Remove Volunteer Account?
                </h3>
                <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  This will remove the volunteer account and its approval record.
                </p>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-color)",
                    textAlign: "left",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {removeConfirmVolunteer.name}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {removeConfirmVolunteer.email}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#2dd4bf", marginTop: 4 }}>
                    ID: {removeConfirmVolunteer.registration_number || removeConfirmVolunteer.admin_id || `VOL-${removeConfirmVolunteer.id}`}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setRemoveConfirmVolunteer(null)}
                  disabled={!!processingId}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemove}
                  disabled={!!processingId}
                  className="btn-primary"
                  style={{ background: "#ef4444", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {processingId ? <FiRefreshCw className="animate-spin" size={14} /> : <FiTrash2 size={15} />}
                  Remove
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
}
