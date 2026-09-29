import { CheckIcon, TodoIcon, TrashIcon } from '../icons.jsx';

export default function TodoCard({ todo, onToggle, onEdit, onDelete }) {
  return (
    <li className={`todo-card${todo.done ? ' done' : ''}`}>
      <TodoIcon title={todo.title} id={todo.id} className="todo-icon" />
      <button type="button" className="todo-text" aria-label={`Edit ${todo.title}`} onClick={() => onEdit(todo)}>
        <span className="todo-title">{todo.title}</span>
        {todo.note && <span className="todo-note">{todo.note}</span>}
      </button>
      <button type="button" className="delete-button" aria-label={`Delete ${todo.title}`} onClick={() => onDelete(todo)}>
        <TrashIcon />
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={`Mark ${todo.title} as done`}
        className={`check${todo.done ? ' checked' : ''}`}
        onClick={() => onToggle(todo)}
      >
        {todo.done && <CheckIcon />}
      </button>
    </li>
  );
}
