import { useState, type FormEvent } from "react";
import { shareTask } from "../../services/api";
import { getErrorMessage, type Task } from "./types";

interface ShareModalProps {
  task: Task;
  onClose: () => void;
}

export default function ShareModal({ task, onClose }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setMessage("");
    try {
      await shareTask(task.id, email, permission);
      setMessage(`Shared with ${email}.`);
      setEmail("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="nb-modal-overlay"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="nb-modal-box" role="dialog" aria-modal="true">
        <div className="nb-modal-head">
          <span>Share task</span>
          <button
            className="nb-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            ×
          </button>
        </div>
        <div className="nb-modal-name">&quot;{task.title}&quot;</div>

        {message && <div className="nb-modal-success">{message}</div>}
        {errorMessage && <div className="nb-modal-error">{errorMessage}</div>}

        <form onSubmit={handleShare}>
          <input
            className="nb-modal-input"
            type="email"
            placeholder="Collaborator email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <div className="nb-modal-perm">
            <label className={permission === "view" ? "active" : ""}>
              <input
                type="radio"
                value="view"
                checked={permission === "view"}
                onChange={() => setPermission("view")}
                hidden
              />
              View only
            </label>
            <label className={permission === "edit" ? "active" : ""}>
              <input
                type="radio"
                value="edit"
                checked={permission === "edit"}
                onChange={() => setPermission("edit")}
                hidden
              />
              Can edit
            </label>
          </div>
          <button
            className="nb-modal-submit"
            type="submit"
            disabled={loading || !email.trim()}
          >
            {loading ? "Sharing…" : "Share"}
          </button>
        </form>
      </div>
    </div>
  );
}
