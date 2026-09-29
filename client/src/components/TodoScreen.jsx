import { useCallback, useEffect, useState } from 'react';
import { foreignTodoId } from '../../../shared/constants.js';
import { todosApi } from '../api.js';
import { LogoutIcon } from '../icons.jsx';
import { supabase } from '../supabaseClient.js';
import LearnPanel from './LearnPanel.jsx';
import TaskModal from './TaskModal.jsx';
import TodoCard from './TodoCard.jsx';

const EMPTY_DRAFT = { title: '', note: '' };

function ordinal(day) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const lastTwo = day % 100;
  return day + (suffixes[(lastTwo - 20) % 10] || suffixes[lastTwo] || suffixes[0]);
}

// A 401 means the token is missing or expired: forget it and return to the login page.
// Anything else is shown to the user as a banner.
async function handleFailure(error, setBanner) {
  if (error.status === 401) {
    await supabase.auth.signOut({ scope: 'local' });
    return;
  }
  setBanner({ tone: 'error', text: error.message });
}

export default function TodoScreen({ session }) {
  // SERVER STATE: our copy of the todos that live in the database.
  const [todos, setTodos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  // CLIENT STATE: things only this browser knows about.
  const [modal, setModal] = useState(null); // null, { mode: 'new' } or { mode: 'edit', todo }
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [banner, setBanner] = useState(null);
  const [tab, setTab] = useState('live');
  const [today] = useState(() => new Date());

  // GET: load this user's todos once, when the screen first appears.
  useEffect(() => {
    let active = true;
    todosApi
      .list()
      .then((list) => active && setTodos(list))
      .catch((error) => active && handleFailure(error, setBanner))
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  async function attempt(action) {
    setBanner(null);
    try {
      return { ok: true, value: await action() };
    } catch (error) {
      await handleFailure(error, setBanner);
      return { ok: false };
    }
  }

  const replaceTodo = (updated) => setTodos((list) => list.map((todo) => (todo.id === updated.id ? updated : todo)));

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setModal({ mode: 'new' });
  }

  function openEdit(todo) {
    setDraft({ title: todo.title, note: todo.note });
    setModal({ mode: 'edit', todo });
  }

  const closeModal = useCallback(() => {
    setModal(null);
    setDraft(EMPTY_DRAFT);
  }, []);

  async function saveDraft() {
    if (modal.mode === 'new') {
      // POST: send the new todo to be saved.
      const result = await attempt(() => todosApi.create(draft));
      if (!result.ok) return;
      setTodos((list) => [...list, result.value]);
    } else {
      // PATCH: send the fields that can change.
      const result = await attempt(() => todosApi.update(modal.todo.id, draft));
      if (!result.ok) return;
      replaceTodo(result.value);
    }
    closeModal();
  }

  async function toggle(todo) {
    // PATCH: change just one field.
    const result = await attempt(() => todosApi.update(todo.id, { done: !todo.done }));
    if (result.ok) replaceTodo(result.value);
  }

  async function remove(todo) {
    // DELETE: ask the server to remove it, then forget our copy.
    const result = await attempt(() => todosApi.remove(todo.id));
    if (result.ok) setTodos((list) => list.filter((item) => item.id !== todo.id));
  }

  async function trySomeoneElses() {
    // AUTHORIZATION demo: we are logged in, but this todo belongs to another user.
    setTab('live');
    setBanner(null);
    try {
      await todosApi.update(foreignTodoId(session.user.email), { title: 'Hacked!' });
      setBanner({ tone: 'error', text: 'Uh oh: the server allowed it. Authorization is broken!' });
    } catch (error) {
      if (error.status === 404) {
        setBanner({ tone: 'info', text: 'Blocked! The server refused to change a todo that is not yours.' });
      } else {
        await handleFailure(error, setBanner);
      }
    }
  }

  const email = session.user.email;

  return (
    <>
      <main className="layout">
        <section className="phone">
          <header className="phone-header">
            <p className="date">
              <span>{today.getFullYear()}</span>
              <span>
                {today.toLocaleString('en-US', { month: 'long' })} {ordinal(today.getDate())}
              </span>
            </p>
            <div className="user-actions">
              <span className="avatar" aria-hidden="true">{email[0].toUpperCase()}</span>
              <button type="button" className="icon-button" aria-label="Log out" onClick={() => supabase.auth.signOut()}>
                <LogoutIcon />
              </button>
            </div>
          </header>
          <p className="signed-in-as">Signed in as {email}</p>

          {banner && (
            <p className={`banner ${banner.tone}`} role={banner.tone === 'error' ? 'alert' : 'status'}>
              {banner.text}
            </p>
          )}

          {todos.length > 0 && (
            <ul className="todo-list">
              {todos.map((todo) => (
                <TodoCard key={todo.id} todo={todo} onToggle={toggle} onEdit={openEdit} onDelete={remove} />
              ))}
            </ul>
          )}
          {loaded && todos.length === 0 && (
            <p className="empty">No tasks yet. Add one to send your first POST request.</p>
          )}

          <button type="button" className="primary" onClick={openNew}>Add new task</button>
          <button type="button" className="demo-button" onClick={trySomeoneElses}>
            Try to edit someone else&apos;s todo
          </button>
        </section>

        <LearnPanel
          tab={tab}
          onTabChange={setTab}
          session={session}
          inspect={{ user: { id: session.user.id, email }, todos, modal, draft }}
        />
      </main>

      {modal && (
        <TaskModal
          mode={modal.mode}
          todoId={modal.todo?.id}
          draft={draft}
          onChange={setDraft}
          onSave={saveDraft}
          onClose={closeModal}
        />
      )}
    </>
  );
}
