import { Navigate } from "react-router-dom";

// Firebase doesn't require email verification for sign-in by default. If the
// project wants to enforce it later, call sendEmailVerification(user) at
// registration time and gate /dashboard behind user.emailVerified. For now
// this page is just a stub that forwards to the dashboard.
export default function VerifyEmail() {
  return <Navigate to="/dashboard" replace />;
}
