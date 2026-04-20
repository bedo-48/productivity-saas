import { Navigate } from "react-router-dom";

// Firebase handles password resets via a link sent to the user's email.
// Clicking that link opens Firebase's hosted reset page, so we no longer
// need an in-app reset form. Any stale /reset-password URLs just bounce
// back to the sign-in screen.
export default function ResetPassword() {
  return <Navigate to="/" replace />;
}
