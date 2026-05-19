import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActivityLog, getStats, getTasks } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import NotebookBackdrop from "../components/NotebookBackdrop";
import Topbar from "../components/dashboard/Topbar";
import {
  formatAvgFinish,
  type ActivityItem,
  type Stats,
  type Task,
} from "../components/dashboard/types";
import "../components/dashboard/Dashboard.css";

/**
 * buildWeeklyHistogram — bucketise the last 8 weeks of completions.
 *
 * We use archived_at as a proxy for "task closed". Once the backend grows a
 * real `completed_at` column, swap the source field here.
 */
function buildWeeklyHistogram(tasks: Task[]): Array<{ label: string; count: number }> {
  const now = new Date();
  const buckets: Array<{ label: string; count: number; start: Date; end: Date }> = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    buckets.push({
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      count: 0,
      start,
      end,
    });
  }
  for (const task of tasks) {
    const closedAt = task.archived_at ? new Date(task.archived_at) : null;
    if (!closedAt) continue;
    const idx = buckets.findIndex((b) => closedAt >= b.start && closedAt <= b.end);
    if (idx >= 0) buckets[idx].count++;
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

function buildWeekdayHeatmap(items: ActivityItem[]): number[] {
  // index: 0 = Monday, 6 = Sunday
  const counts = Array(7).fill(0);
  for (const item of items) {
    const d = new Date(item.created_at);
    const idx = (d.getDay() + 6) % 7;
    counts[idx]++;
  }
  return counts;
}

function computeStreak(items: ActivityItem[]): number {
  // Streak = consecutive days (counting today) with at least one completion.
  const days = new Set<string>();
  for (const item of items) {
    if (!/complet/i.test(item.action)) continue;
    const d = new Date(item.created_at);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!days.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StatsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [archived, setArchived] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, t, a] = await Promise.all([
          getStats(),
          getTasks(undefined, "archived"),
          getActivityLog(),
        ]);
        if (cancelled) return;
        setStats(s);
        setArchived(t);
        setActivity(a);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const histogram = useMemo(() => buildWeeklyHistogram(archived), [archived]);
  const heatmap = useMemo(() => buildWeekdayHeatmap(activity), [activity]);
  const streak = useMemo(() => computeStreak(activity), [activity]);

  const maxCount = useMemo(
    () => Math.max(1, ...histogram.map((h) => h.count), ...heatmap),
    [histogram, heatmap]
  );

  async function handleLogout() {
    try { await logout(); } finally { navigate("/login", { replace: true }); }
  }

  return (
    <div className="dash-root">
      <NotebookBackdrop palette="light" density={24} seed={9119} />
      <style>{`
        .nb-stats { width: min(100%, 1240px); margin: 18px auto 0; display: grid; gap: 14px; }
        .nb-stats-row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 14px; }
        @media (max-width: 980px) { .nb-stats-row { grid-template-columns: 1fr; } }
        .nb-panel {
          background: rgba(249, 243, 232, 0.74);
          border: 1px solid rgba(121, 97, 81, 0.12);
          border-radius: var(--nb-radius-l);
          padding: 16px;
          box-shadow: var(--nb-shadow-card);
        }
        .nb-panel h3 { margin: 4px 0 12px; font-family: var(--nb-font-serif); font-size: 1.05rem; color: var(--nb-ink); }
        .nb-bars { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; height: 180px; align-items: end; }
        .nb-bar {
          background: linear-gradient(180deg, #d1a15c, #d67f72);
          border-radius: 6px 6px 0 0;
          min-height: 4px;
        }
        .nb-bar-label { font-size: 0.72rem; color: var(--nb-ink-faint); text-align: center; margin-top: 4px; }
        .nb-heat { display: grid; grid-template-columns: 48px repeat(7, 1fr); gap: 6px; align-items: center; }
        .nb-heat-label { font-size: 0.72rem; color: var(--nb-ink-faint); }
        .nb-heat-cell {
          height: 28px;
          border-radius: 6px;
          border: 1px solid rgba(121, 97, 81, 0.10);
        }
      `}</style>

      <div className="dash-shell" style={{ gridTemplateColumns: "1fr" }}>
        <Topbar userName={user?.displayName} userEmail={user?.email} onLogout={handleLogout} />
      </div>

      <div className="nb-stats">
        <section className="nb-insights" aria-label="Headline stats">
          <div className="nb-stat">
            <div className="nb-stat-label">Streak</div>
            <div className="nb-stat-value">{streak}d</div>
            <div className="nb-stat-trail">Consecutive completion days</div>
          </div>
          <div className="nb-stat">
            <div className="nb-stat-label">Active</div>
            <div className="nb-stat-value">{stats?.active_tasks ?? "?"}</div>
          </div>
          <div className="nb-stat">
            <div className="nb-stat-label">Done this week</div>
            <div className="nb-stat-value">{stats?.completed_this_week ?? "?"}</div>
          </div>
          <div className="nb-stat">
            <div className="nb-stat-label">Avg. finish (30d)</div>
            <div className="nb-stat-value">{stats ? formatAvgFinish(stats) : "?"}</div>
          </div>
        </section>

        <div className="nb-stats-row">
          <div className="nb-panel">
            <h3>Completions — last 8 weeks</h3>
            {loading ? (
              <div className="nb-skeleton" style={{ height: 200 }} />
            ) : (
              <>
                <div className="nb-bars" role="img" aria-label="Weekly completions">
                  {histogram.map((bin) => (
                    <div
                      key={bin.label}
                      className="nb-bar"
                      style={{ height: `${(bin.count / maxCount) * 100}%` }}
                      title={`${bin.label}: ${bin.count}`}
                    />
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
                  {histogram.map((bin) => (
                    <div key={`l-${bin.label}`} className="nb-bar-label">
                      {bin.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="nb-panel">
            <h3>When you act</h3>
            {loading ? (
              <div className="nb-skeleton" style={{ height: 180 }} />
            ) : (
              <div className="nb-heat">
                <div />
                {WEEKDAY_LABELS.map((d) => (
                  <div key={d} className="nb-heat-label" style={{ textAlign: "center" }}>
                    {d}
                  </div>
                ))}
                <div className="nb-heat-label">Acts</div>
                {heatmap.map((count, idx) => {
                  const intensity = count / maxCount;
                  return (
                    <div
                      key={idx}
                      className="nb-heat-cell"
                      title={`${WEEKDAY_LABELS[idx]}: ${count} actions`}
                      style={{
                        background: `rgba(208, 143, 88, ${0.12 + intensity * 0.7})`,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
