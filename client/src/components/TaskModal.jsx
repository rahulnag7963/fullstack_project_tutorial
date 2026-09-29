import { useEffect, useState } from 'react';
import { MAX_TEXT_LENGTH } from '../../../shared/constants.js';
import { BackIcon, TodoIcon } from '../icons.jsx';

// Checks input in the browser, only to be helpful. The server checks again to be safe.
function findProblem(draft) {
  if (!draft.title.trim()) return 'Give your task a name.';
  if (draft.title.trim().length > MAX_TEXT_LENGTH) return `Keep the name under ${MAX_TEXT_LENGTH} characters.`;
  if (draft.note.trim().length > MAX_TEXT_LENGTH) return `Keep the note under ${MAX_TEXT_LENGTH} characters.`;
  return null;
}

export default function TaskModal({ mode, todoId, draft, onChange, onSave, onClose }) {
  const [saving, setSaving] = useState(false);
  const problem = findProblem(draft);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    if (problem) return;
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="modal-art">
          <button type="button" className="back-button" aria-label="Close" onClick={onClose}>
            <BackIcon />
          </button>
          {/* The picture updates as you type: a small, visible example of state changing. */}
          <TodoIcon title={draft.title} id={todoId ?? ''} className="modal-icon" />
        </div>
        <div className="modal-card">
          <p className="eyebrow" id="modal-title">{mode === 'new' ? 'New task' : 'Edit task'}</p>
          <label className="sr-only" htmlFor="task-title">Task name</label>
          <input
            id="task-title"
            className="title-input"
            placeholder="Task name"
            autoComplete="off"
            autoFocus
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
          />
          <label className="field-label" htmlFor="task-note">Note</label>
          <input
            id="task-note"
            className="note-input"
            placeholder="e.g. Read every day"
            autoComplete="off"
            value={draft.note}
            onChange={(event) => onChange({ ...draft, note: event.target.value })}
          />
          <p className={`hint${problem ? '' : ' subtle'}`}>
            {problem ?? 'The browser checks this to be helpful. The server checks it again to be safe.'}
          </p>
        </div>
        <button type="submit" className="primary" disabled={Boolean(problem) || saving}>
          {saving ? 'Saving…' : 'Finish'}
        </button>
      </form>
    </div>
  );
}
