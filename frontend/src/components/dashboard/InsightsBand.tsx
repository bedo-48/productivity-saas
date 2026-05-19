import { formatAvgFinish, type Stats } from "./types";

interface InsightsBandProps {
  stats: Stats | null;
  loading: boolean;
}

export default function InsightsBand({ stats, loading }: InsightsBandProps) {
  if (loading) {
    return (
      <section className="nb-insights dash-insights" aria-label="Productivity insights (loading)">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="nb-stat">
            <div className="nb-stat-label">Loading…</div>
            <div className="nb-stat-value">·</div>
          </div>
        ))}
      </section>
    );
  }
  if (!stats) return null;

  const active = Number(stats.active_tasks);
  const completed = Number(stats.completed_tasks);
  const rate = active + completed > 0 ? Math.round((completed / (active + completed)) * 100) : 0;

  return (
    <section className="nb-insights dash-insights" aria-label="Productivity insights">
      <div className="nb-stat">
        <div className="nb-stat-label">Active pages</div>
        <div className="nb-stat-value">{stats.active_tasks}</div>
        <div className="nb-stat-trail">Open tasks right now</div>
      </div>
      <div className="nb-stat">
        <div className="nb-stat-label">Done this week</div>
        <div className="nb-stat-value">{stats.completed_this_week}</div>
        <div className="nb-stat-trail">Last 7 days</div>
      </div>
      <div className="nb-stat">
        <div className="nb-stat-label">Completion rate</div>
        <div className="nb-stat-value">{rate}%</div>
        <div className="nb-stat-trail">All-time</div>
      </div>
      <div className="nb-stat">
        <div className="nb-stat-label">Avg. finish (30d)</div>
        <div className="nb-stat-value">{formatAvgFinish(stats)}</div>
        <div className="nb-stat-trail">From created → done</div>
      </div>
    </section>
  );
}
