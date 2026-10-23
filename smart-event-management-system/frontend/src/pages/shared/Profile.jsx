import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiCamera, FiMail, FiSave, FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { userService } from "../../api/services.js";
import { fileUrl, initials } from "../../utils/format.js";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: user?.name || "",
    department: user?.department || "",
    semester: user?.semester || "",
  });
  const [emailForm, setEmailForm] = useState({ new_email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await userService.updateProfile(form);
      updateUser(data);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await userService.uploadPicture(formData);
      updateUser(data);
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not upload picture");
    } finally {
      setUploadingPic(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(emailForm.new_email)) return toast.error("Enter a valid email address");
    if (!emailForm.password) return toast.error("Enter your current password to confirm");
    setSavingEmail(true);
    try {
      const { data } = await userService.updateEmail(emailForm);
      updateUser(data);
      toast.success("Email updated. Please verify your new email before your next login.");
      setEmailForm({ new_email: "", password: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not update email");
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">Manage your personal details and account photo.</p>

      <div className="grid-cards-2" style={{ alignItems: "start" }}>
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 26 }}>
            <div style={{ position: "relative" }}>
              {user?.profile_picture ? (
                <img src={fileUrl(user.profile_picture)} alt="" style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--gradient-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24 }}>
                  {initials(user?.name)}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPic}
                className="icon-btn"
                style={{ position: "absolute", bottom: -4, right: -4, width: 30, height: 30, borderRadius: "50%", background: "var(--gradient-primary)", color: "#fff", border: "2px solid var(--bg-elevated)" }}
              >
                <FiCamera size={13} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePictureChange} style={{ display: "none" }} />
            </div>
            <div>
              <h3 style={{ fontSize: 17 }}>{user?.name}</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{user?.email}</p>
              <span className="badge badge-info" style={{ marginTop: 6 }}>{user?.role}</span>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
            </div>
            {user?.role === "student" && (
              <div className="form-group">
                <label className="form-label">Semester</label>
                <input className="form-input" value={form.semester} onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))} />
              </div>
            )}
            {user?.registration_number && (
              <div className="form-group">
                <label className="form-label">Registration Number</label>
                <input className="form-input" value={user.registration_number} disabled style={{ opacity: 0.6 }} />
              </div>
            )}
            <button className="btn btn-primary" disabled={savingProfile}>
              <FiSave /> {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        <div className="glass-card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 16, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <FiMail /> Update Email
          </h3>
          <form onSubmit={handleEmailSubmit}>
            <div className="form-group">
              <label className="form-label">New Email Address</label>
              <input className="form-input" value={emailForm.new_email} onChange={(e) => setEmailForm((f) => ({ ...f, new_email: e.target.value }))} placeholder="new@college.edu" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Current Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  value={emailForm.password}
                  onChange={(e) => setEmailForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  style={{ paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    fontSize: 16,
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
            <button className="btn btn-primary" disabled={savingEmail}>
              {savingEmail ? "Updating..." : "Update Email"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
