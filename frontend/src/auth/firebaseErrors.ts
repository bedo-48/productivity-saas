import { FirebaseError } from "firebase/app";

/**
 * Translate Firebase Auth error codes into short, user-friendly sentences.
 * Falls back to the native message for anything we haven't mapped.
 */
export function humanizeFirebaseError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "That email address doesn't look right.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact support.";
      case "auth/user-not-found":
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Email or password is incorrect.";
      case "auth/email-already-in-use":
        return "An account with this email already exists. Try signing in.";
      case "auth/weak-password":
        return "Password is too weak — use at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a minute and try again.";
      case "auth/network-request-failed":
        return "Network error — check your connection and retry.";
      case "auth/operation-not-allowed":
        return "Email/password sign-in isn't enabled in Firebase yet. Open the Firebase console → Authentication → Sign-in method.";
      case "auth/popup-closed-by-user":
        return "You closed the sign-in popup before finishing.";
      default:
        return error.message || "Something went wrong.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
