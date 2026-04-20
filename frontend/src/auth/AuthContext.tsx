import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { signOut } from "firebase/auth";
import { auth, isFirebaseConfigured, subscribeToIdToken, type User } from "../services/firebase";

type AuthState = {
  user: User | null;
  /** True while we are still resolving the initial Firebase session. */
  initializing: boolean;
  /** True when Firebase env is missing — auth flows should render a helpful message. */
  configured: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToIdToken((nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      configured: isFirebaseConfigured(),
      logout: async () => {
        if (auth) await signOut(auth);
      },
    }),
    [user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return ctx;
}
