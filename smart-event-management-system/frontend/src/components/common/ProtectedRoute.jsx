import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Loader from "../ui/Loader.jsx";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <Loader />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = (user.role || "").toLowerCase();
  const approvalStatus = (user.approval_status || (userRole === "admin" ? "APPROVED" : "PENDING")).toUpperCase();

  // Admin accounts are always approved and bypass institutional approval
  if (userRole !== "admin") {
    if (approvalStatus !== "APPROVED" && approvalStatus !== "ACTIVE") {
      return <Navigate to="/awaiting-approval" replace />;
    }
  }

  const normalizedAllowed = allowedRoles?.map((r) => r.toLowerCase());

  if (normalizedAllowed && !normalizedAllowed.includes(userRole)) {
    const destination =
      userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "faculty"
        ? "/faculty/dashboard"
        : userRole === "volunteer"
        ? "/volunteer/dashboard"
        : "/student/dashboard";
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
