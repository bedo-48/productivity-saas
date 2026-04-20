import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const { user, initializing, configured } = useAuth();
  const location = useLocation();

  if (!configured) {
    // Firebase env vars missing — bounce to /login, which explains what to set.
    return <Navigate to="/login" replace />;
  }

  if (initializing) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Manrope, sans-serif",
          color: "#5a463d",
        }}
      >
        Loading your workspace…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
