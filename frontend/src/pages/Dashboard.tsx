import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  archiveTask,
  createTask,
  deleteTask,
  getActivityLog,
  getNeglected,
  getStats,
  getSuggestions,
  getTasks,
  restoreTask,
  toggleTask,
} from "../services/api";
import { useAuth } from "../auth/AuthContext";
import {
  connectSocket,
  disconnectSocket,
  joinTaskRoom,
  syncTaskRooms,
} from "../services/socket";
import NotebookBackdrop from "../components/NotebookBackdrop";
import Topbar from "../components/dashboard/Topbar";
import InsightsBand from "../components/dashboard/InsightsBand";
import SidebarRail from "../components/dashboard/SidebarRail";
import AddTaskRow from "../components/dashboard/AddTaskRow";
import TaskRow from "../components/dashboard/TaskRow";
import StickyRail from "../components/dashboard/StickyRail";
import ShareModal from "../components/dashboard/ShareModal";
import ToastStack from "../components/dashboard/ToastStack";
import {
  getErrorMessage,
  SECTION_COPY,
  sectionFromPath,
  timeAgo,
  type ActivityItem,
  type Priority,
  type Section,
  type Stats,
  type Task,
  type TaskExitState,
  type Toast,
} from "../components/dashboard/types";
import "../components/dashboard/Dashboard.css";

const USE_MOCK_DASHBOARD = !import.meta.env.VITE_API_URL;
const COMPLETE_STRIKE_MS = 700;
const COMPLETE_FADE_MS = 850;
const DELETE_FADE_MS = 320;

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const section = useMemo<Section>(() => sectionFromPath(location.pathname), [location.pathname]);
  const sectionCopy = SECTION_COPY[section];

  // ── State ──────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [neglected, setNeglected] = useState<Task[]>([]);
  const [suggestions, setSuggestions] = useState<Task[]>([]);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [shareTarget, setShareTarget] = useState<Task | null>(null);
  const [recentlyAddedTaskId, setRecentlyAddedTaskId] = useState<number | null>(null);
  const [completingTaskIds, setCompletingTaskIds] = useState<number[]>([]);
  const [exitingTasks, setExitingTasks] = useState<Record<number, TaskExitState>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  const timeoutsRef = useRef<number[]>([]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const rememberTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notifyError = useCallback(
    (error: unknown, fallback: string) => {
      const message = getErrorMessage(error) || fallback;
      // eslint-disable-next-line no-console
      console.error(message, error);
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, kind: "error", message }]);
      rememberTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast, rememberTimeout]
  );

  const clearTaskEffects = useCallback((taskId: number) => {
    setCompletingTaskIds((current) => current.filter((id) => id !== taskId));
    setExitingTasks((current) => {
      if (!(taskId in current)) return current;
      const next = { ...current };
      delete next[taskId];
      return next;
    });
  }, []);

  const removeTaskFromState = useCallback(
    (taskId: number) => {
      setTasks((current) => current.filter((task) => task.id !== taskId));
      clearTaskEffects(taskId);
    },
    [clearTaskEffects]
  );

  const beginExit = useCallback(
    (taskId: number, exitState: TaskExitState, delay: number) => {
      setExitingTasks((current) => ({ ...current, [taskId]: exitState }));
      rememberTimeout(() => removeTaskFromState(taskId), delay);
    },
    [rememberTimeout, removeTaskFromState]
  );

  const beginCompletionSequence = useCallback(
    (taskId: number) => {
      setCompletingTaskIds((current) =>
        current.includes(taskId) ? current : [...current, taskId]
      );
      rememberTimeout(() => beginExit(taskId, "completing", COMPLETE_FADE_MS), COMPLETE_STRIKE_MS);
    },
    [beginExit, rememberTimeout]
  );

  // ── Data loaders ──────────────────────────────────────────────────────
  const loadTasks = useCallback(async (nextSection: Section) => {
    if (nextSection === "activity") {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setRecentlyAddedTaskId(null);
    setCompletingTaskIds([]);
    setExitingTasks({});
    try {
      const status =
        nextSection === "past" ? "archived" : nextSection === "shared" ? "shared" : "active";
      setTasks(await getTasks(undefined, status));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const [nextStats, nextNeglected, nextSuggestions] = await Promise.all([
        getStats(),
        getNeglected(),
        getSuggestions(),
      ]);
      setStats(nextStats);
      setNeglected(nextNeglected);
      setSuggestions(nextSuggestions);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      setActivities(await getActivityLog());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  // Initial insights + cleanup on unmount.
  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);
  useEffect(
    () => () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
    },
    []
  );

  // Refs so socket listeners can read latest callbacks without rebinding.
  const sectionRef = useRef(section);
  useEffect(() => {
    sectionRef.current = section;
  }, [section]);
  const loadActivityRef = useRef(loadActivity);
  useEffect(() => {
    loadActivityRef.current = loadActivity;
  }, [loadActivity]);
  const loadTasksRef = useRef(loadTasks);
  useEffect(() => {
    loadTasksRef.current = loadTasks;
  }, [loadTasks]);
  const loadInsightsRef = useRef(loadInsights);
  useEffect(() => {
    loadInsightsRef.current = loadInsights;
  }, [loadInsights]);
  const beginCompletionRef = useRef(beginCompletionSequence);
  useEffect(() => {
    beginCompletionRef.current = beginCompletionSequence;
  }, [beginCompletionSequence]);
  const removeTaskRef = useRef(removeTaskFromState);
  useEffect(() => {
    removeTaskRef.current = removeTaskFromState;
  }, [removeTaskFromState]);

  // Socket lifecycle.
  useEffect(() => {
    if (USE_MOCK_DASHBOARD || !user) return;
    let cancelled = false;
    (async () => {
      const socket = await connectSocket();
      if (cancelled || !socket) return;

      socket.on("task:updated", ({ task }: { task: Task }) => {
        setTasks((current) =>
          current.map((item) => (item.id === task.id ? { ...item, ...task } : item))
        );
        if (sectionRef.current === "active" && task.completed) {
          beginCompletionRef.current(task.id);
        }
        if (sectionRef.current === "activity") void loadActivityRef.current();
      });
      socket.on("task:deleted", ({ taskId }: { taskId: number }) => {
        removeTaskRef.current(taskId);
        if (sectionRef.current === "activity") void loadActivityRef.current();
      });
      socket.on("task:shared", ({ task }: { task: Task }) => {
        joinTaskRoom(task.id);
        if (sectionRef.current === "shared") void loadTasksRef.current("shared");
        void loadInsightsRef.current();
        void loadActivityRef.current();
      });
    })();
    return () => {
      cancelled = true;
      disconnectSocket();
    };
  }, [user]);

  useEffect(() => {
    if (USE_MOCK_DASHBOARD || !user) return;
    syncTaskRooms(tasks.map((task) => task.id));
  }, [tasks, user]);

  useEffect(() => {
    if (section === "activity") void loadActivity();
    else void loadTasks(section);
  }, [loadActivity, loadTasks, section]);

  // ── Derived ────────────────────────────────────────────────────────────
  const doneTasks = useMemo(
    () => tasks.filter((task) => task.completed || completingTaskIds.includes(task.id)),
    [completingTaskIds, tasks]
  );
  const progress = tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0;

  // ── Handlers ───────────────────────────────────────────────────────────
  async function handleLogout() {
    try {
      await logout();
    } finally {
      sessionStorage.removeItem("pendingLoginEmail");
      navigate("/login", { replace: true });
    }
  }

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      const newTask = await createTask(title.trim(), undefined, {
        priority,
        due_date: dueDate || undefined,
      });
      setTasks((current) => [newTask, ...current]);
      setTitle("");
      setDueDate("");
      setRecentlyAddedTaskId(newTask.id);
      rememberTimeout(
        () =>
          setRecentlyAddedTaskId((current) => (current === newTask.id ? null : current)),
        1500
      );
      void loadInsights();
      void loadActivity();
    } catch (error) {
      notifyError(error, "Couldn't add the task. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(taskId: number, completed: boolean) {
    try {
      await toggleTask(taskId, !completed);
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, completed: !completed } : task
        )
      );
      if (!completed && section === "active") beginCompletionSequence(taskId);
      else clearTaskEffects(taskId);
      void loadInsights();
      void loadActivity();
    } catch (error) {
      notifyError(error, "Couldn't update the task.");
    }
  }

  async function handleDelete(taskId: number) {
    try {
      await deleteTask(taskId);
      beginExit(taskId, "deleting", DELETE_FADE_MS);
      void loadInsights();
      void loadActivity();
    } catch (error) {
      notifyError(error, "Couldn't delete the task.");
    }
  }

  async function handleArchive(taskId: number) {
    try {
      await archiveTask(taskId);
      beginExit(taskId, "archiving", DELETE_FADE_MS);
      void loadInsights();
      void loadActivity();
    } catch (error) {
      notifyError(error, "Couldn't archive the task.");
    }
  }

  async function handleRestore(taskId: number) {
    try {
      await restoreTask(taskId);
      beginExit(taskId, "restoring", DELETE_FADE_MS);
      void loadInsights();
      void loadActivity();
    } catch (error) {
      notifyError(error, "Couldn't restore the task.");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const emptyCopy =
    section === "active"
      ? "No tasks yet. Start a fresh line above."
      : section === "shared"
      ? "Nothing has been shared with you yet."
      : "No archived tasks right now.";

  return (
    <div className="dash-root">
      <NotebookBackdrop palette="light" density={30} seed={9001} />

      <div className="dash-shell">
        <Topbar
          userName={user?.displayName}
          userEmail={user?.email}
          onLogout={handleLogout}
        />

        <InsightsBand stats={stats} loading={insightsLoading} />

        <SidebarRail section={section} onSelect={(path) => navigate(path)} />

        <section className="dash-main">
          <div className="nb-page">
            <div className="nb-page-margin" aria-hidden="true" />

            <header className="nb-page-header">
              <div className="nb-page-kicker">{sectionCopy.kicker}</div>
              <h1 className="nb-page-title">{sectionCopy.title}</h1>
              <p className="nb-page-desc">{sectionCopy.description}</p>
            </header>

            {section === "active" && tasks.length > 0 && (
              <div className="nb-progress">
                <div className="nb-progress-bar">
                  <div className="nb-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="nb-progress-label">
                  <span>{doneTasks.length}</span> crossed off of{" "}
                  <span>{tasks.length}</span>
                </div>
              </div>
            )}

            {section === "active" && (
              <AddTaskRow
                title={title}
                priority={priority}
                dueDate={dueDate}
                adding={adding}
                onTitleChange={setTitle}
                onPriorityChange={setPriority}
                onDueDateChange={setDueDate}
                onSubmit={handleAddTask}
              />
            )}

            <div className="nb-divider" />

            {section === "activity" ? (
              activityLoading ? (
                <div className="nb-activity">
                  <div className="nb-skeleton" />
                  <div className="nb-skeleton" />
                  <div className="nb-skeleton" />
                </div>
              ) : activities.length === 0 ? (
                <div className="nb-empty">
                  <span className="nb-empty-mark">//</span>
                  No activity yet. Your recent task actions will show up here.
                </div>
              ) : (
                <div className="nb-activity">
                  {activities.map((item) => (
                    <div key={item.id} className="nb-activity-item">
                      <div className="nb-activity-title">{item.task_title}</div>
                      <div className="nb-activity-meta">
                        {item.actor_name} {item.action} this task {timeAgo(item.created_at)}
                      </div>
                      <div className="nb-activity-badge">
                        {item.action.replaceAll("_", " ")}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : loading ? (
              <div className="nb-task-list">
                <div className="nb-skeleton" />
                <div className="nb-skeleton" />
                <div className="nb-skeleton" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="nb-empty">
                <span className="nb-empty-mark">
                  {section === "active" ? "…" : section === "past" ? "[ ]" : "//"}
                </span>
                {emptyCopy}
              </div>
            ) : (
              <div className="nb-task-list">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    section={section}
                    isNew={recentlyAddedTaskId === task.id}
                    isCompleting={completingTaskIds.includes(task.id)}
                    isExiting={Boolean(exitingTasks[task.id])}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                    onShare={setShareTarget}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <StickyRail neglected={neglected} suggestions={suggestions} />
      </div>

      {shareTarget && <ShareModal task={shareTarget} onClose={() => setShareTarget(null)} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
