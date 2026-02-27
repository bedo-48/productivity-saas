import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState("");

  const navigate = useNavigate();

  // ✅ LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // ✅ ADD TASK
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    try {
      const res = await api.post("/tasks", { title });

      setTasks((prev: any[]) => [res.data, ...prev]);
      setTitle("");
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ DELETE TASK
  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/tasks/${id}`);

      setTasks((prev: any[]) =>
        prev.filter((t) => t.id !== id)
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ LOAD TASKS
  useEffect(() => {
    api.get("/tasks")
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: 40 }}>
      {/* LOGOUT BUTTON */}
      <button onClick={handleLogout}>Logout</button>
      <br /><br />

      <h2>My Tasks</h2>

      <form onSubmit={handleAddTask}>
        <input
          placeholder="New task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <br />

      {tasks.map((task: any) => (
        <div
          key={task.id}
          style={{ display: "flex", gap: 10, alignItems: "center" }}
        >
          <span>✅ {task.title}</span>

          <button onClick={() => handleDelete(task.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}