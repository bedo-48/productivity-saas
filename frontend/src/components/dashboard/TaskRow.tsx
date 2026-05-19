import { AGE_BADGES, getAgeLevel, priorityColor, timeAgo, type Section, type Task } from "./types";

interface TaskRowProps {
  task: Task;
  section: Section;
  isNew: boolean;
  isCompleting: boolean;
  isExiting: boolean;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onShare: (task: Task) => void;
}

export default function TaskRow({
  task,
  section,
  isNew,
  isCompleting,
  isExiting,
  onToggle,
  onDelete,
  onArchive,
  onRestore,
  onShare,
}: TaskRowProps) {
  const age = getAgeLevel(task.created_at, task.completed);
  const cls = [
    "nb-task",
    `age-${age}`,
    section === "shared" ? "is-shared" : "",
    isNew ? "is-new" : "",
    isCompleting ? "is-completing" : "",
    isExiting ? "is-exiting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cls}>
      <div className="nb-task-line">
        {section === "active" && (
          <button
            type="button"
            className={`nb-check ${task.completed ? "is-checked" : ""}`}
            onClick={() => onToggle(task.id, task.completed)}
            aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
          />
        )}

        <div className="nb-task-body">
          <span className="nb-task-title">
            {task.title}
            <span className="nb-task-strike" aria-hidden="true" />
          </span>
          {task.description && <span className="nb-task-desc">{task.description}</span>}
          <div className="nb-task-meta">
            <span className="nb-priority">
              <span className="nb-priority-dot" style={{ background: priorityColor(task.priority) }} />
              {task.priority}
            </span>
            <span>{timeAgo(task.created_at)}</span>
            {task.due_date && <span>Due {new Date(task.due_date).toLocaleDateString()}</span>}
            {section === "shared" && task.owner_name && <span>By {task.owner_name}</span>}
            {section === "shared" && task.permission && (
              <span className={`nb-share-perm ${task.permission === "edit" ? "edit" : "view"}`}>
                {task.permission === "edit" ? "Can edit" : "View only"}
              </span>
            )}
          </div>
        </div>

        <div className="nb-task-actions">
          {section === "active" && AGE_BADGES[age] && (
            <span className="nb-task-age">{AGE_BADGES[age]}</span>
          )}
          {section === "active" && (
            <>
              <button type="button" className="nb-action" onClick={() => onShare(task)}>
                Share
              </button>
              <button type="button" className="nb-action" onClick={() => onArchive(task.id)}>
                Archive
              </button>
              <button type="button" className="nb-action danger" onClick={() => onDelete(task.id)}>
                Delete
              </button>
            </>
          )}
          {section === "past" && (
            <>
              <button type="button" className="nb-action" onClick={() => onRestore(task.id)}>
                Restore
              </button>
              <button type="button" className="nb-action danger" onClick={() => onDelete(task.id)}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
