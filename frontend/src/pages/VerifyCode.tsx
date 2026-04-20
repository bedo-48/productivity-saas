import { Navigate } from "react-router-dom";

// The old auth flow required a 6-digit sign-in code after login. Firebase
// Auth handles sign-in in a single step, so this route is no longer needed;
// we just bounce users to the dashboard (ProtectedRoute will send them back
// to /login if they aren't signed in).
export default function VerifyCode() {
  return <Navigate to="/dashboard" replace />;
}
