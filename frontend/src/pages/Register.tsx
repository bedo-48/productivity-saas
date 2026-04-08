import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ClosedNotebookAuthLayout from "../components/ClosedNotebookAuthLayout";
import { register } from "../services/api";

type FieldErrors = {
  name: string;
  email: string;
  password: string;
};

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const fieldErrors = useMemo<FieldErrors>(() => {
    const next = { name: "", email: "", password: "" };

    if (!name.trim()) next.name = "Name is required.";
    if (!email.trim()) next.email = "Email is required.";
    if (!password.trim()) {
      next.password = "Password is required.";
    } else if (password.trim().length < 8) {
      next.password = "Password must be at least 8 characters long.";
    }

    return next;
  }, [email, name, password]);

  const hasErrors = Boolean(fieldErrors.name || fieldErrors.email || fieldErrors.password);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (hasErrors) {
      setError(fieldErrors.name || fieldErrors.email || fieldErrors.password);
      return;
    }

    setLoading(true);

    try {
      const data = await register(name.trim(), email.trim().toLowerCase(), password.trim());
      localStorage.setItem("token", data.token);
      navigate("/verify-email");
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClosedNotebookAuthLayout>
      <style>{`
        .auth-form {
          width: 100%;
          max-width: 280px;
          text-align: center;
        }

        .auth-title {
          font-family: "Newsreader", serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #3e342d;
          margin-bottom: 8px;
        }

        .auth-subtitle {
          font-size: 0.9rem;
          color: #6b564a;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .field {
          margin-bottom: 12px;
          text-align: left;
        }

        .field-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: #5a463d;
          margin-bottom: 4px;
          font-family: "Manrope", sans-serif;
        }

        .field-input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid rgba(72, 57, 49, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.9);
          color: #3e342d;
          font-family: "Patrick Hand", cursive;
          font-size: 1rem;
          outline: none;
        }

        .field-input:focus {
          border-color: #8b6e63;
          background: #fff;
        }

        .field-input.error {
          border-color: #cc6b5f;
        }

        .field-error {
          margin-top: 4px;
          color: #cc6b5f;
          font-size: 0.75rem;
        }

        .toggle-pw {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6b564a;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .field-wrap {
          position: relative;
        }

        .submit-btn {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          border: none;
          background: linear-gradient(135deg, #d08f58, #c5655d);
          color: #fffaf4;
          font-family: "Manrope", sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          margin-top: 12px;
          box-shadow: 0 4px 12px rgba(169, 99, 69, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-msg {
          margin-top: 12px;
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(204, 107, 95, 0.1);
          border: 1px solid rgba(204, 107, 95, 0.3);
          color: #cc6b5f;
          font-size: 0.8rem;
          text-align: center;
        }

        .auth-links {
          margin-top: 16px;
          font-size: 0.8rem;
          color: #6b564a;
        }

        .auth-link {
          color: #8b6e63;
          text-decoration: none;
          font-weight: 500;
        }
      `}</style>
      <form className="auth-form" onSubmit={handleRegister} noValidate>
        <div className="auth-title">Create account</div>
        <div className="auth-subtitle">
          Join our productivity community. Start organizing your thoughts in a beautiful notebook.
        </div>
        <div className="field">
          <label className="field-label">Name</label>
          <input
            className={`field-input ${fieldErrors.name ? "error" : ""}`}
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
          />
          {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
        </div>
        <div className="field">
          <label className="field-label">Email</label>
          <input
            className={`field-input ${fieldErrors.email ? "error" : ""}`}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
          {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
        </div>
        <div className="field">
          <label className="field-label">Password</label>
          <div className="field-wrap">
            <input
              className={`field-input ${fieldErrors.password ? "error" : ""}`}
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="toggle-pw"
              onClick={() => setShowPassword((value) => !value)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
        </div>
        <button className="submit-btn" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
        {error && <div className="error-msg">{error}</div>}
        <div className="auth-links">
          Already have an account? <Link to="/" className="auth-link">Sign in</Link>
        </div>
      </form>
    </ClosedNotebookAuthLayout>
  );
}