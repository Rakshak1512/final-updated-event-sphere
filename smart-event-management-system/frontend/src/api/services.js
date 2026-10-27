import api, { API_BASE_URL } from "./axios.js";
import jsPDF from "jspdf";
import { downloadBlobOrFile } from "../utils/fileDownload.js";

const readBlobAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Could not read the certificate image."));
  reader.readAsDataURL(blob);
});

const hasPdfSignature = async (blob) => {
  const signature = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
  return signature === "%PDF-";
};

const convertImageCertificateToPdf = async (imageBlob) => {
  const dataUrl = await readBlobAsDataUrl(imageBlob);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const imageInfo = doc.getImageProperties(dataUrl);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const scale = Math.min((pageWidth - margin * 2) / imageInfo.width, (pageHeight - margin * 2) / imageInfo.height);
  const width = imageInfo.width * scale;
  const height = imageInfo.height * scale;
  const format = String(imageInfo.fileType || "").toUpperCase() === "PNG" ? "PNG" : "JPEG";
  doc.addImage(dataUrl, format, (pageWidth - width) / 2, (pageHeight - height) / 2, width, height);
  return doc.output("blob");
};

/* ---------------- Auth ---------------- */
export const authService = {
  register: (payload) => api.post("/auth/register", payload),
  firebaseRegister: (payload) => api.post("/auth/firebase/register", payload),
  firebaseSession: (payload) => api.post("/auth/firebase/session", payload),
  verifyEmail: (payload) => api.post("/auth/verify-email", payload),
  resendOtp: (payload) => api.post("/auth/resend-verification-otp", payload),
  login: (payload) => api.post("/auth/login", payload),
  sendEmailLoginOtp: (payload) => api.post("/auth/email/send-login-otp", payload),
  verifyEmailLoginOtp: (payload) => api.post("/auth/email/verify-login-otp", payload),
  forgotPassword: (payload) => api.post("/auth/forgot-password", payload),
  verifyResetOtp: (payload) => api.post("/auth/verify-reset-otp", payload),
  resetPassword: (payload) => api.post("/auth/reset-password", payload),
  me: () => api.get("/auth/me"),
  getAdminAvailability: () => api.get("/auth/admin-availability"),
};

/* ---------------- Events ---------------- */
export const eventService = {
  list: (params) => api.get("/events", { params }),
  get: (id) => api.get(`/events/${id}`),
  getCapacity: (id) => api.get(`/events/${id}/capacity`),
  history: (id) => api.get(`/events/${id}/history`),
  categories: () => api.get("/events/categories/list"),
  create: (formData) =>
    api.post("/events", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, formData) =>
    api.put(`/events/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  remove: (id) => api.delete(`/events/${id}`),
  getReport: (id) => api.get(`/events/${id}/report`),
  downloadReportPdf: async (id, eventTitle = "Event") => {
    const response = await api.get(`/events/${id}/report/pdf`, {
      responseType: "blob",
    });
    const sanitizedTitle = (eventTitle || "Event").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeIdStr = String(id || "0").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `EventSphere_Review_Report_${sanitizedTitle}_${safeIdStr}.pdf`;
    await downloadBlobOrFile(response.data, filename, "application/pdf");
    return { success: true, data: response.data };
  },
};

/* ---------------- Registrations & Teams ---------------- */
export const registrationService = {
  register: (eventId) =>
    api.post("/registrations", {
      event_id: eventId,
    }),

  getCapacity: (eventId) =>
    api.get(`/registrations/event/${eventId}/capacity`),

  searchStudent: (regNo, eventId) =>
    api.get("/registrations/students/search", {
      params: { reg_no: regNo, event_id: eventId },
    }),

  registerTeam: (payload) =>
    api.post("/registrations/team", payload),

  eventTeams: (eventId) =>
    api.get(`/registrations/teams/event/${eventId}`),

  myTeams: () =>
    api.get("/registrations/teams/my"),

  my: () => api.get("/registrations/my"),

  cancel: (id) => api.delete(`/registrations/${id}`),

  downloadSlip: async (id) => {
    const response = await api.get(`/registrations/${id}/slip`, {
      responseType: "blob",
    });

    const headerType = response.headers?.["content-type"] || "";
    if (headerType.includes("application/json")) {
      const text = await response.data.text();
      const parsed = JSON.parse(text);
      throw new Error(parsed.detail || "Failed to download registration slip");
    }

    const filename = `registration-slip-${id}.pdf`;
    return await downloadBlobOrFile(response.data, filename, "application/pdf");
  },

  forEvent: (eventId, params = {}) =>
    api.get(`/registrations/event/${eventId}`, { params }),

  getBranchStats: (eventId) =>
    api.get(`/registrations/event/${eventId}/branch-stats`),

  updateStatus: (id, statusValue) =>
    api.put(`/registrations/${id}/status`, {
      status: statusValue,
    }),
};

/* ---------------- Certificates ---------------- */
export const certificateService = {
  upload: (formData) =>
    api.post("/certificates", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  studentDetails: (regNo) =>
    api.get(`/certificates/student/details/${regNo}`),

  my: () => api.get("/certificates/my"),

  downloadUrl: (id) => `${API_BASE_URL}/certificates/${id}/download`,

  downloadBlob: async (id) => {
    const response = await api.get(`/certificates/${id}/download`, {
      responseType: "blob",
    });
    const headerType = response.headers?.["content-type"] || "";
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    // Older records can contain PDF bytes with an image MIME type. Trust bytes.
    if (await hasPdfSignature(blob)) {
      return new Blob([blob], { type: "application/pdf" });
    }
    const type = headerType && headerType !== "application/octet-stream" ? headerType : (blob.type || "application/pdf");
    return new Blob([blob], { type });
  },

  downloadFile: async (id, title = "certificate") => {
    const response = await api.get(`/certificates/${id}/download`, {
      responseType: "blob",
    });
    const headerType = response.headers?.["content-type"] || "";
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);

    if (headerType.includes("application/json") || headerType.includes("text/html")) {
      const text = await blob.text();
      let message = "The server did not return a valid certificate file. Please try again.";
      try {
        const parsed = JSON.parse(text);
        message = parsed.detail || message;
      } catch {
        // Keep the safe fallback for HTML or malformed error responses.
      }
      throw new Error(message);
    }

    const safeTitle = String(title || "certificate").replace(/[^a-zA-Z0-9_-]/g, "_");
    // Trust the actual bytes if an old backend response has a stale image header.
    if (await hasPdfSignature(blob)) {
      return await downloadBlobOrFile(blob, `${safeTitle}.pdf`, "application/pdf");
    }

    const isImage = headerType.startsWith("image/") || (blob.type && blob.type.startsWith("image/"));
    if (isImage) {
      const pdfBlob = await convertImageCertificateToPdf(blob);
      return await downloadBlobOrFile(pdfBlob, `${safeTitle}.pdf`, "application/pdf");
    }

    throw new Error("This certificate is neither a valid PDF nor a supported image.");
  },

  facultyUploaded: () => api.get("/certificates/faculty/uploaded"),

  update: (id, formData) =>
    api.put(`/certificates/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  remove: (id) => api.delete(`/certificates/${id}`),

  generatePreview: async (payload) => {
    const response = await api.post("/certificates/generate-preview", payload, {
      responseType: "blob",
    });
    return new Blob([response.data], { type: "application/pdf" });
  },

  autoGenerate: (payload) => api.post("/certificates/auto-generate", payload),
};

/* ---------------- Notifications ---------------- */
export const notificationService = {
  list: () => api.get("/notifications"),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/mark-all-read"),
};

/* ---------------- Analytics ---------------- */
export const analyticsService = {
  admin: (params) => api.get("/analytics/admin", { params }),
  student: () => api.get("/analytics/student"),
  faculty: () => api.get("/analytics/faculty"),
};

/* ---------------- Users / Profile ---------------- */
export const userService = {
  updateProfile: (payload) => api.put("/users/profile", payload),

  uploadPicture: (formData) =>
    api.post("/users/profile/picture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  updateEmail: (payload) => api.put("/users/email", payload),

  changePassword: (payload) => api.put("/users/password", payload),

  updateNotificationPreferences: (payload) => api.put("/users/notification-preferences", payload),

  deleteAccount: () => api.delete("/users/me"),
};

/* ---------------- Chatbot ---------------- */
export const chatbotService = {
  ask: (payload) => api.post("/chatbot/ask", payload),
};

/* ---------------- Volunteer / Attendance ---------------- */
export const volunteerService = {
  getDashboard: () => api.get("/volunteer/dashboard"),
  verifyTicket: (payload) => api.post("/volunteer/verify-ticket", payload),
  confirmAttendance: (payload) => api.post("/volunteer/confirm-attendance", payload),
};

/* ---------------- Event Feedback ---------------- */
export const feedbackService = {
  submit: (payload) => api.post("/feedback", payload),
  getEventFeedback: (eventId) => api.get(`/feedback/event/${eventId}`),
  getFacultyFeedbacks: () => api.get("/feedback/faculty"),
  getMyFeedbacks: () => api.get("/feedback/my"),
};

/* ---------------- Event Results & Winners ---------------- */
export const resultService = {
  forEvent: (eventId) => api.get(`/results/event/${eventId}`),
  create: (payload) => api.post("/results", payload),
  update: (id, payload) => api.put(`/results/${id}`, payload),
  remove: (id) => api.delete(`/results/${id}`),
};

/* ---------------- Admin & Principal Services ---------------- */
export const adminService = {
  facultyList: () => api.get("/admin/faculty"),
  pendingFaculty: () => api.get("/admin/pending-faculty"),
  facultyApprovals: () => api.get("/admin/faculty-approvals"),
  approveFaculty: (facultyId) => api.post(`/admin/faculty/${facultyId}/approve`),
  rejectFaculty: (facultyId, reason) => api.post(`/admin/faculty/${facultyId}/reject`, { reason }),
  removeFaculty: (facultyId) => api.delete(`/admin/faculty/${facultyId}`),
  assignments: () => api.get("/admin/assignments"),
  facultyAssignments: (facultyId) => api.get(`/admin/assignments/faculty/${facultyId}`),
  createAssignment: (payload) => api.post("/admin/assignments", payload),
  updateAssignment: (id, payload) => api.put(`/admin/assignments/${id}`, payload),
  deleteAssignment: (id) => api.delete(`/admin/assignments/${id}`),
  reportsSummary: () => api.get("/admin/reports/summary"),
  downloadFacultyPdf: async (statusType = "all") => {
    const cleanType = (statusType || "all").toLowerCase();
    const response = await api.get(`/admin/reports/faculty/${cleanType}/pdf`, {
      responseType: "blob",
    });
    const filenameMap = {
      pending: "Pending Faculty.pdf",
      approved: "Approved Faculty.pdf",
      rejected: "Rejected Faculty.pdf",
      all: "All Faculty.pdf",
    };
    const filename = filenameMap[cleanType] || "Faculty Report.pdf";
    await downloadBlobOrFile(response.data, filename, "application/pdf");
    return { success: true, data: response.data };
  },
  analytics: () => api.get("/analytics/admin"),
};

/* ---------------- Faculty Approval Services ---------------- */
export const facultyApprovalService = {
  pendingStudents: () => api.get("/faculty/pending-students"),
  studentApprovals: () => api.get("/faculty/student-approvals"),
  approveStudent: (studentId) => api.post(`/faculty/students/${studentId}/approve`),
  rejectStudent: (studentId, reason) => api.post(`/faculty/students/${studentId}/reject`, { reason }),
  removeStudent: (studentId) => api.delete(`/faculty/students/${studentId}`),
  downloadStudentPdf: async (statusType = "all") => {
    const cleanType = (statusType || "all").toLowerCase();
    const response = await api.get(`/faculty/reports/students/${cleanType}/pdf`, {
      responseType: "blob",
    });
    const filenameMap = {
      pending: "Pending Students.pdf",
      approved: "Approved Students.pdf",
      rejected: "Rejected Students.pdf",
      all: "All Students.pdf",
    };
    const filename = filenameMap[cleanType] || "Student Report.pdf";
    await downloadBlobOrFile(response.data, filename, "application/pdf");
    return { success: true, data: response.data };
  },
};

/* ---------------- Volunteer Approval Services (Faculty) ---------------- */
export const volunteerApprovalService = {
  pendingVolunteers: () => api.get("/faculty/pending-volunteers"),
  volunteerApprovals: () => api.get("/faculty/volunteer-approvals"),
  approveVolunteer: (volunteerId) => api.post(`/faculty/volunteers/${volunteerId}/approve`),
  rejectVolunteer: (volunteerId, reason) => api.post(`/faculty/volunteers/${volunteerId}/reject`, { reason }),
  removeVolunteer: (volunteerId) => api.delete(`/faculty/volunteers/${volunteerId}`),
  downloadVolunteerPdf: async (statusType = "all") => {
    const cleanType = (statusType || "all").toLowerCase();
    const response = await api.get(`/faculty/reports/volunteers/${cleanType}/pdf`, {
      responseType: "blob",
    });
    const filenameMap = {
      pending: "Pending Volunteers.pdf",
      approved: "Approved Volunteers.pdf",
      rejected: "Rejected Volunteers.pdf",
      all: "All Volunteers.pdf",
    };
    const filename = filenameMap[cleanType] || "Volunteer Report.pdf";
    await downloadBlobOrFile(response.data, filename, "application/pdf");
    return { success: true, data: response.data };
  },
};

/* ---------------- Faculty Task Services ---------------- */
export const facultyTaskService = {
  myTasks: () => api.get("/faculty/tasks"),
  updateStatus: (id, status) => api.put(`/faculty/tasks/${id}/status`, { status }),
};

/* ---------------- Global Search ---------------- */
export const searchService = {
  global: (q) => api.get("/search/global", { params: { q } }),
};