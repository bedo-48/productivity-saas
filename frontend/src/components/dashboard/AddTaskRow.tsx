import { type FormEvent } from "react";
import type { Priority } from "./types";

interface AddTaskRowProps {
  title: string;
  priority: Priority;
  dueDate: string;
  adding: boolean;
  onTitleChange: (value: string) => void;
  onPriorityChange: (value: Priority) => void;
  onDueDateChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function AddTaskRow({
  title,
  priority,
  dueDate,
  adding,
  onTitleChange,
  onPriorityChange,
  onDueDateChange,
  onSubmit,
}: AddTaskRowProps) {
  return (
    <form className="nb-add" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="Write the next task on the page…"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
      />
      <select
        value={priority}
        onChange={(event) => onPriorityChange(event.target.value as Priority)}
        aria-label="Priority"
      >
        <option value="low">Low priority</option>
        <option value="medium">Medium priority</option>
        <option value="high">High priority</option>
      </select>
      <input
        type="date"
        value={dueDate}
        onChange={(event) => onDueDateChange(event.target.value)}
        aria-label="Due date"
      />
      <button type="submit" disabled={adding || !title.trim()}>
        {adding ? "Writing…" : "Add task"}
      </button>
    </form>
  );
}
