import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiDownload,
  FiXCircle,
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiRefreshCw,
  FiAlertCircle,
  FiCheck,
  FiMaximize2,
  FiSearch,
  FiX,
  FiClipboard,
} from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import { registrationService } from "../../api/services.js";
import { fileUrl, formatDate, statusBadgeClass } from "../../utils/format.js";
import QRCodeDisplay from "../../components/common/QRCodeDisplay.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useRealtime } from "../../context/RealtimeContext.jsx";
import BackButton from "../../components/common/BackButton.jsx";

export default function MyRegistrations() {
  const { user } = useAuth();
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qrModal, setQrModal] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const { addListener } = useRealtime();

  const load = () => {
    setLoading(true);
    setError(false);
    setErrorMessage("");

    registrationService
      .my()
      .then(({ data }) => {
        setRegs(Array.isArray(data) ? data : (data?.registrations || []));
      })
      .catch((err) => {
        console.error("My Registrations load error:", err);
        setError(true);
        setErrorMessage(
          err.response?.data?.detail ||
          "Unable to connect to the EventSphere server. Please verify your connection."
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Real-time synchronization for student's registrations
  useEffect(() => {
    const remove = addListener((msg) => {
      if (
        msg.type === "REGISTRATION_STATUS_CHANGED" ||
        msg.type === "SEAT_ASSIGNED" ||
        msg.type === "SEAT_REASSIGNED" ||
        msg.type === "ATTENDANCE_CHECKED_IN"
      ) {
        // Silently reload student's registrations to update seats & statuses in real time
        registrationService
          .my()
          .then(({ data }) => setRegs(Array.isArray(data) ? data : []))
          .catch(() => {});
      }
    });
    return () => remove();
  }, [addListener]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);

    try {
      await registrationService.cancel(cancelTarget.id);
      toast.success("Registration cancelled successfully");
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Could not cancel registration"
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadSlip = async (registrationId) => {
    try {
      await registrationService.downloadSlip(registrationId);
      toast.success("Registration slip downloaded!");
    } catch (err) {
      console.error("Slip download error:", err);
      let detailMsg = "Failed to download registration slip";
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          detailMsg = err.response.data;
        } else if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const parsed = JSON.parse(text);
            detailMsg = parsed.detail || detailMsg;
          } catch {
            // fallback
          }
        } else if (err.response.data.detail) {
          detailMsg = err.response.data.detail;
        }
      } else if (err.message) {
        detailMsg = err.message;
      }
      toast.error(detailMsg);
    }
  };

  const getQrUrl = (reg) => {
    if (!reg) return "";
    if (reg.qr_code_path) {
      const formatted = fileUrl(reg.qr_code_path);
      if (formatted) return formatted;
    }
    if (reg.ticket_code) {
      return `/api/registrations/ticket/${reg.ticket_code}/qr`;
    }
    return `/api/registrations/${reg.id}/qr`;
  };

  const filteredRegs = regs.filter((r) => {
    const rawStatus = (r.status || "registered").toLowerCase();
    if (statusFilter !== "all") {
      if (statusFilter === "attended" && !(rawStatus === "attended" || rawStatus === "completed" || r.checked_in_at)) return false;
      if (statusFilter === "approved" && rawStatus !== "approved") return false;
      if (statusFilter === "pending" && rawStatus !== "pending" && rawStatus !== "registered") return false;
      if (statusFilter === "cancelled" && rawStatus !== "cancelled") return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const title = (r.event?.title || "").toLowerCase();
    const cat = (r.event?.category || "").toLowerCase();
    const venue = (r.event?.venue || "").toLowerCase();
    const ticket = (r.ticket_code || "").toLowerCase();
    const statusStr = rawStatus;

    return title.includes(q) || cat.includes(q) || venue.includes(q) || ticket.includes(q) || statusStr.includes(q);
  });

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <BackButton fallback="/student/dashboard" label="Back to Dashboard" />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 className="page-title">My Registrations</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Track your campus event registrations, digital QR passes, and downloadable slips.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {regs.length > 0 && (
            <div style={{ position: "relative", minWidth: 0, width: "100%", maxWidth: 360 }}>
              <input
                className="form-input"
                style={{ padding: "8px 34px 8px 34px", fontSize: 13 }}
                placeholder="Search event, ticket code, status..."
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
          <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            <FiRefreshCw className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      {regs.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 14,
            marginBottom: 16,
          }}
        >
          {[
            { key: "all", label: "All Registrations", count: regs.length },
            { key: "approved", label: "Approved", count: regs.filter((r) => r.status === "approved").length },
            { key: "attended", label: "Attended", count: regs.filter((r) => r.status === "attended" || r.status === "completed" || r.checked_in_at).length },
            { key: "pending", label: "Pending", count: regs.filter((r) => r.status === "pending" || r.status === "registered").length },
            { key: "cancelled", label: "Cancelled", count: regs.filter((r) => r.status === "cancelled").length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`btn btn-sm ${statusFilter === tab.key ? "btn-primary" : "btn-outline"}`}
              onClick={() => setStatusFilter(tab.key)}
              style={{ borderRadius: 999, fontSize: 12.5 }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div>
          <div
            style={{
              textAlign: "center",
              padding: "20px 0 10px",
              color: "var(--text-secondary)",
              fontSize: 14,
            }}
          >
            Loading your registrations...
          </div>
          <SkeletonGrid count={4} />
        </div>
      ) : error ? (
        <div
          className="glass-card"
          style={{
            padding: "40px 24px",
            textAlign: "center",
            maxWidth: 480,
            margin: "40px auto",
            borderRadius: 20,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <FiAlertCircle size={24} />
          </div>
          <h3 style={{ fontSize: 18, marginBottom: 8, fontWeight: 700 }}>
            Failed to Load Registrations
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
            {errorMessage || "Unable to connect to the EventSphere server. Please verify your connection."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={load}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FiRefreshCw size={14} /> Try Again
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
            <Link to="/student/dashboard" className="btn btn-outline">
              Return to Home
            </Link>
          </div>
        </div>
      ) : regs.length === 0 ? (
        <EmptyState
          icon={<FiClipboard size={26} />}
          title="No registrations yet"
          message="You haven't registered for any events yet. Explore upcoming campus events and join the action!"
          action={
            <Link to="/student/events" className="btn btn-primary" style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <FiCalendar /> Browse Events
            </Link>
          }
        />
      ) : filteredRegs.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: "center", borderRadius: 20 }}>
          <p style={{ color: "var(--text-secondary)", margin: "0 0 12px" }}>
            No registrations matched your search or active filter.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid-responsive">
          {filteredRegs.map((r, index) => {
            const ev = r.event || {};
            const rawStatus = (r.status || "registered").toLowerCase();
            const isCancelled = rawStatus === "cancelled";
            const isAttended = rawStatus === "attended" || rawStatus === "completed" || !!r.checked_in_at;
            const regKey = r.id || r.ticket_code || `reg-${index}`;

            return (
              <div
                key={regKey}
                className="glass-card"
                style={{
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  opacity: isCancelled ? 0.65 : 1,
                  borderRadius: 20,
                  transition: "all 0.2s ease",
                  border: isAttended
                    ? "1px solid rgba(16, 185, 129, 0.35)"
                    : "1px solid rgba(139, 92, 246, 0.2)",
                  background: isAttended
                    ? "linear-gradient(180deg, var(--bg-elevated) 0%, rgba(16, 185, 129, 0.04) 100%)"
                    : "var(--bg-elevated)",
                }}
              >
                {/* Header tags */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`badge ${statusBadgeClass(rawStatus)}`}>
                      {rawStatus.toUpperCase()}
                    </span>
                    {isAttended && (
                      <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <FiCheck size={11} /> ATTENDED
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#8b5cf6",
                      fontFamily: "monospace",
                      background: "rgba(139, 92, 246, 0.1)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    #{r.ticket_code || `REG-${r.id || index}`}
                  </span>
                </div>

                <h3 style={{ fontSize: 17, marginBottom: 8, fontWeight: 700 }}>
                  {ev.title || "Campus Event"}
                </h3>

                {/* Team Tag if part of a team */}
                {r.team_name && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(139, 92, 246, 0.12)",
                      color: "#8b5cf6",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 10,
                      width: "fit-content",
                    }}
                  >
                    <FiUsers size={13} />
                    <span>Team: {r.team_name}</span>
                    {r.team_role && (
                      <span style={{ opacity: 0.75, fontSize: 11 }}>({r.team_role})</span>
                    )}
                  </div>
                )}

                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginBottom: 18,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <FiCalendar size={14} style={{ color: "#8b5cf6" }} />{" "}
                    {formatDate(ev.event_date)} {ev.event_time ? `· ${ev.event_time}` : ""}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <FiMapPin size={14} style={{ color: "#8b5cf6" }} />{" "}
                    {ev.venue || "Campus Venue"}
                  </span>
                </div>

                {/* Actions */}
                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => setQrModal(r)}
                    disabled={isCancelled}
                    title="View QR Ticket Pass"
                  >
                    <BsQrCode size={14} /> View QR
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDownloadSlip(r.id)}
                    title="Download Registration Slip (PDF)"
                    disabled={isCancelled}
                  >
                    <FiDownload size={14} /> Slip
                  </button>

                  {!isCancelled && !isAttended && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{
                        background: "rgba(220, 38, 38, 0.1)",
                        color: "var(--danger)",
                      }}
                      onClick={() => setCancelTarget(r)}
                      title="Cancel Registration"
                    >
                      <FiXCircle size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR PASS MODAL */}
      <Modal
        open={!!qrModal}
        onClose={() => setQrModal(null)}
        title="Event Ticket Pass & QR Code"
        width={440}
      >
        {qrModal && (
          <div style={{ textAlign: "center" }}>
            {/* White QR Code container */}
            <div
              style={{
                width: 220,
                height: 220,
                margin: "0 auto 16px",
                padding: 10,
                borderRadius: 16,
                background: "#ffffff",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <QRCodeDisplay
                registration={qrModal}
                ticketCode={qrModal.ticket_code}
                size={200}
                alt={`QR Ticket Pass - ${qrModal.ticket_code || qrModal.id}`}
              />
            </div>

            <h3 style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
              {qrModal.event?.title || "Campus Event"}
            </h3>

            <div
              style={{
                background: "rgba(139, 92, 246, 0.08)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                borderRadius: 12,
                padding: "10px 14px",
                margin: "12px 0 18px",
                fontSize: 13,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Ticket Code:</span>
                <span style={{ fontWeight: 700, color: "#8b5cf6", fontFamily: "monospace" }}>
                  #{qrModal.ticket_code || qrModal.id}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Attendee:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {qrModal.student?.name || user?.name || "Student"}
                </span>
              </div>
              {qrModal.team_name && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Team:</span>
                  <span style={{ fontWeight: 600, color: "#8b5cf6" }}>
                    {qrModal.team_name} {qrModal.team_role ? `(${qrModal.team_role})` : ""}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Venue:</span>
                <span style={{ color: "var(--text-primary)" }}>
                  {qrModal.event?.venue || "Campus Venue"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Date & Time:</span>
                <span style={{ color: "var(--text-primary)" }}>
                  {formatDate(qrModal.event?.event_date)} {qrModal.event?.event_time ? `· ${qrModal.event?.event_time}` : ""}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => handleDownloadSlip(qrModal.id)}
            >
              <FiDownload /> Download Slip (PDF)
            </button>
          </div>
        )}
      </Modal>

      {/* CANCEL REGISTRATION MODAL */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Registration"
        width={440}
      >
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
          Are you sure you want to cancel your registration for{" "}
          <strong>{cancelTarget?.event?.title}</strong>?
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setCancelTarget(null)}
            disabled={cancelling}
          >
            Keep Registration
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling..." : "Yes, Cancel"}
          </button>
        </div>
      </Modal>
    </div>
  );
}