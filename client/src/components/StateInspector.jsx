// Shows what the app is remembering right now.
// Each value re-mounts when it changes (key={json}), which replays the flash animation.
function StateRow({ label, kind, value, note }) {
  const json = JSON.stringify(value, null, 2) ?? 'null';
  return (
    <section className="state-row">
      <header>
        <span className="state-label">{label}</span>
        <span className={`state-kind ${kind}`}>{kind === 'server' ? 'Server state' : 'Client state'}</span>
      </header>
      <p className="state-note">{note}</p>
      <pre key={json} className="state-value flash">{json}</pre>
    </section>
  );
}

export default function StateInspector({ state, lastRequest }) {
  const lastRequestSummary = lastRequest
    ? `${lastRequest.method} ${lastRequest.url} → ${lastRequest.status ?? 'failed'}`
    : null;

  return (
    <div className="state-inspector">
      <p className="eyebrow">Big idea</p>
      <h3 className="entry-title">STATE</h3>
      <p className="summary">What the app is remembering right now. A row flashes when it changes.</p>
      <StateRow label="user" kind="server" value={state.user} note="Who is logged in. It comes from the auth server." />
      <StateRow label="todos" kind="server" value={state.todos} note="The app's copy of your todos. The real ones live in the database." />
      <StateRow label="modal" kind="client" value={state.modal} note="Whether the task window is open. Only this browser knows." />
      <StateRow label="draft" kind="client" value={state.draft} note="What you are typing. It is not saved anywhere until you press Finish." />
      <StateRow label="lastRequest" kind="client" value={lastRequestSummary} note="The most recent message sent to a server." />
    </div>
  );
}
