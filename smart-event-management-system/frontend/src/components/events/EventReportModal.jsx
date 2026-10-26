import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiDownload,
  FiX,
  FiFileText,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAward,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiTrendingUp,
  FiSearch,
  FiRefreshCw,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { eventService } from "../../api/services.js";
import { formatDate } from "../../utils/format.js";

export default function EventReportModal({ eventId, eventTitle, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [report, setReport] = useState(null);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadReport = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data } = await eventService.getReport(eventId);
      setReport(data);
    } catch (err) {
      console.error("Failed to load event report:", err);
      toast.error(err?.response?.data?.detail || "Could not generate event report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && eventId) {
      loadReport();
    } else {
      setReport(null);
    }
  }, [isOpen, eventId]);

  const handleDownloadPdf = async () => {
    if (!eventId) return;
    setDownloading(true);
    const toastId = toast.loading("Generating official EventSphere PDF report...");
    try {
      await eventService.downloadReportPdf(eventId, report?.event?.title || eventTitle || "Event");
      toast.success("Event report downloaded successfully", { id: toastId });
    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error(err?.response?.data?.detail || "Failed to download PDF report", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  const eventData = report?.event || {};
  const summary = report?.summary || {};
  const departmentBreakdown = report?.department_breakdown || [];
  const attendees = report?.attendees || [];

  const filteredAttendees = attendees.filter((a) => {
    const matchesSearch =
      !attendeeSearch ||
      a.user_name?.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      a.user_email?.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      a.registration_number?.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      a.department?.toLowerCase().includes(attendeeSearch.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "attended" && a.attended) ||
      (statusFilter === "not_attended" && !a.attended) ||
      (statusFilter === a.status);

    return matchesSearch && matchesStatus;
  });

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: "rgba(3, 7, 18, 0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(15, 23, 42, 0.92)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.15)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              background: "linear-gradient(90deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                }}
              >
                <FiFileText className="text-violet-400 text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Event Comprehensive Report
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    Live Database Record
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {eventData.title || eventTitle || "Loading event details..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadReport}
                disabled={loading}
                title="Refresh Report"
                className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 transition-colors border border-slate-700/50"
              >
                <FiRefreshCw className={`text-sm ${loading ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={loading || downloading || !report}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-lg hover:shadow-violet-500/25 active:scale-95 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                }}
              >
                <FiDownload className={`text-base ${downloading ? "animate-bounce" : ""}`} />
                {downloading ? "Exporting PDF..." : "Download Official PDF"}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 transition-colors border border-slate-700/50"
              >
                <FiX className="text-lg" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-200">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full border-3 border-violet-500 border-t-transparent animate-spin" />
                <p className="text-sm text-slate-400 font-medium">Aggregating live event records and roster...</p>
              </div>
            ) : !report ? (
              <div className="py-16 text-center text-slate-400">
                <p>No report data could be loaded for this event.</p>
              </div>
            ) : (
              <>
                {/* Event Profile Card */}
                <div
                  className="p-5 rounded-xl border flex flex-col md:flex-row gap-6 justify-between items-start md:items-center"
                  style={{
                    background: "rgba(30, 41, 59, 0.45)",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs uppercase tracking-wider font-semibold text-violet-400">
                        {eventData.category || "General"}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-xs text-slate-400">ID: {eventData.id}</span>
                      <span className="text-slate-500">•</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          eventData.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : eventData.status === "cancelled"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {eventData.status?.toUpperCase() || "PUBLISHED"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{eventData.title}</h3>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1">
                      <span className="flex items-center gap-1.5">
                        <FiCalendar className="text-violet-400" />
                        {eventData.date || "TBD"} {eventData.time ? `at ${eventData.time}` : ""}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FiMapPin className="text-cyan-400" />
                        {eventData.venue || "Campus Venue"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FiUser className="text-amber-400" />
                        Coordinator: {eventData.coordinator_name || "Faculty Coordinator"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex md:flex-col items-center md:items-end gap-2 md:gap-0 self-stretch md:self-auto justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-700/50">
                    <span className="text-xs text-slate-400">Generated At</span>
                    <span className="text-xs font-mono text-slate-200">
                      {new Date(report.generated_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 6 KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-4 rounded-xl border bg-slate-800/40 border-slate-700/40">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                      <span>Total Registered</span>
                      <FiUsers className="text-violet-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{summary.total_registrations || 0}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      of {eventData.capacity || "—"} seats
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-slate-800/40 border-slate-700/40">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                      <span>Confirmed</span>
                      <FiCheckCircle className="text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{summary.confirmed_count || 0}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Approved seats</div>
                  </div>

                  <div className="p-4 rounded-xl border bg-slate-800/40 border-slate-700/40">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                      <span>Pending</span>
                      <FiClock className="text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{summary.pending_count || 0}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Awaiting check</div>
                  </div>

                  <div className="p-4 rounded-xl border bg-slate-800/40 border-slate-700/40">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                      <span>Present</span>
                      <FiCheckSquare className="text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold text-cyan-400">{summary.present_count || 0}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Checked in</div>
                  </div>

                  <div className="p-4 rounded-xl border bg-slate-800/40 border-slate-700/40">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                      <span>Attendance Rate</span>
                      <FiTrendingUp className="text-pink-400" />
                    </div>
                    <div className="text-2xl font-bold text-pink-400">{summary.attendance_rate || 0}%</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {summary.present_count || 0}/{summary.total_registrations || 0}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-slate-800/40 border-slate-700/40">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                      <span>Certificates</span>
                      <FiAward className="text-amber-300" />
                    </div>
                    <div className="text-2xl font-bold text-amber-300">{summary.certificates_count || 0}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Generated</div>
                  </div>
                </div>

                {/* Department Distribution (if any) */}
                {departmentBreakdown.length > 0 && (
                  <div
                    className="p-5 rounded-xl border"
                    style={{
                      background: "rgba(30, 41, 59, 0.4)",
                      borderColor: "rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <h4 className="text-sm font-bold text-white mb-3">Registrations by Department</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {departmentBreakdown.map((dept) => (
                        <div key={dept.department} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                          <div className="text-xs text-slate-400 truncate">{dept.department}</div>
                          <div className="text-lg font-bold text-violet-300">{dept.count} students</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attendee Roster with Search and Filter */}
                <div
                  className="p-5 rounded-xl border space-y-4"
                  style={{
                    background: "rgba(30, 41, 59, 0.4)",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                    <div>
                      <h4 className="text-sm font-bold text-white">Attendee & Registration Roster</h4>
                      <p className="text-xs text-slate-400">
                        Showing {filteredAttendees.length} of {attendees.length} records
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                          type="text"
                          placeholder="Search attendee, reg #, dept..."
                          value={attendeeSearch}
                          onChange={(e) => setAttendeeSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700/60 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700/60 rounded-lg text-white focus:outline-none focus:border-violet-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="attended">Attended (Present)</option>
                        <option value="not_attended">Absent</option>
                      </select>
                    </div>
                  </div>

                  {filteredAttendees.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      No registrations match the selected criteria.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-72 custom-scrollbar border border-slate-700/50 rounded-lg">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800/90 text-slate-400 uppercase tracking-wider text-[10px] sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5">Participant</th>
                            <th className="px-4 py-2.5">Reg #</th>
                            <th className="px-4 py-2.5">Department</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5">Attendance</th>
                            <th className="px-4 py-2.5">Registered At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {filteredAttendees.map((att) => (
                            <tr key={att.registration_id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-2 font-medium text-white">
                                <div>{att.user_name}</div>
                                <div className="text-[10px] text-slate-500">{att.user_email}</div>
                              </td>
                              <td className="px-4 py-2 font-mono text-[11px]">{att.registration_number || "—"}</td>
                              <td className="px-4 py-2">{att.department || "General"}</td>
                              <td className="px-4 py-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    att.status === "confirmed"
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : att.status === "rejected"
                                      ? "bg-rose-500/20 text-rose-300"
                                      : "bg-amber-500/20 text-amber-300"
                                  }`}
                                >
                                  {att.status}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    att.attended
                                      ? "bg-cyan-500/20 text-cyan-300"
                                      : "bg-slate-700/40 text-slate-400"
                                  }`}
                                >
                                  {att.attended ? "Present" : "Absent"}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-400 text-[11px]">
                                {att.registered_at ? formatDate(att.registered_at) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
