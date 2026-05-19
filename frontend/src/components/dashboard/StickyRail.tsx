import { priorityColor, timeAgo, type Task } from "./types";

interface StickyRailProps {
  neglected: Task[];
  suggestions: Task[];
}

export default function StickyRail({ neglected, suggestions }: StickyRailProps) {
  if (neglected.length === 0 && suggestions.length === 0) return null;

  return (
    <aside className="nb-sticky-rail dash-right" aria-label="Insights">
      {neglected.length > 0 && (
        <div className="nb-sticky">
          <div className="nb-sticky-kicker">Needs attention</div>
          <div className="nb-sticky-title">
            {neglected.length} task{neglected.length > 1 ? "s" : ""} sitting around
          </div>
          <ul className="nb-sticky-list">
            {neglected.slice(0, 4).map((task) => (
              <li key={task.id}>
                <span style={{ marginRight: 6, color: priorityColor(task.priority) }}>•</span>
                {task.title}
                <span style={{ marginLeft: 6, opacity: 0.65, fontSize: ".82rem" }}>
                  ({timeAgo(task.created_at)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="nb-sticky">
          <div className="nb-sticky-kicker">Suggested focus</div>
          <div className="nb-sticky-title">Today's three</div>
          <ul className="nb-sticky-list">
            {suggestions.slice(0, 3).map((task) => (
              <li key={task.id}>
                <span style={{ marginRight: 6, color: priorityColor(task.priority) }}>•</span>
                {task.title}
                {task.due_date && (
                  <span style={{ marginLeft: 6, opacity: 0.65, fontSize: ".82rem" }}>
                    Due {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
