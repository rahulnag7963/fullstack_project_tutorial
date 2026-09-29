import { useState } from 'react';
import { CONCEPT_MENU, CONCEPTS } from '../concepts.js';
import { Illustration } from '../icons.jsx';
import { useRequestLog } from '../requestLog.js';
import ConceptBody from './ConceptBody.jsx';
import RequestEntry, { MethodBadge, StatusChip } from './RequestEntry.jsx';
import StateInspector from './StateInspector.jsx';
import TokenPeek from './TokenPeek.jsx';

function Welcome({ signedIn }) {
  return (
    <div className="welcome">
      <Illustration name="star" className="welcome-art" />
      <p className="eyebrow">Start here</p>
      <h3 className="entry-title">WELCOME</h3>
      <p className="summary">Every time this app talks to a server, this panel explains what happened, in plain English.</p>
      <p>{signedIn ? 'Add, tick, edit or delete a task and watch this space.' : 'Log in or sign up on the left to send your first request.'}</p>
    </div>
  );
}

function History({ records, selectedId, onSelect }) {
  return (
    <section className="history" aria-label="Earlier requests">
      <h4>Earlier requests</h4>
      <ol>
        {records.map((record) => (
          <li key={record.id}>
            <button type="button" aria-pressed={record.id === selectedId} onClick={() => onSelect(record.id)}>
              <MethodBadge method={record.method} />
              <span className="route-text">{record.url}</span>
              <StatusChip record={record} />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ConceptsBrowser({ selected, onSelect }) {
  const concept = CONCEPTS[selected];
  return (
    <>
      <div className="concept-chips">
        {CONCEPT_MENU.map(([key, label]) => (
          <button key={key} type="button" className="concept-chip" aria-pressed={key === selected} onClick={() => onSelect(key)}>
            {label}
          </button>
        ))}
      </div>
      <p className="eyebrow">{concept.eyebrow}</p>
      <h3 className="entry-title">{concept.title}</h3>
      <ConceptBody concept={concept} />
    </>
  );
}

// The right-hand "What just happened?" panel.
// `inspect` (the app's state) and `session` are only passed once someone is logged in.
export default function LearnPanel({ tab, onTabChange, session, inspect }) {
  const records = useRequestLog();
  const latest = records[0];
  // Remember which older request the user clicked, but jump back to the newest one when a new request arrives.
  const [pick, setPick] = useState(null);
  const [conceptKey, setConceptKey] = useState('http');
  const selected = (pick?.latestId === latest?.id && records.find((record) => record.id === pick.id)) || latest;

  const tabs = [['live', 'Live'], inspect && ['state', 'State'], session && ['token', 'Token'], ['concepts', 'Concepts']].filter(Boolean);
  const activeTab = tabs.some(([key]) => key === tab) ? tab : 'live';

  return (
    <aside className="learn-panel" aria-label="What just happened?">
      <div className="panel-top">
        <h2 className="panel-heading">What just happened?</h2>
        <div role="tablist" className="tabs" aria-label="Panel views">
          {tabs.map(([key, label]) => (
            <button key={key} type="button" role="tab" className="tab" aria-selected={activeTab === key} onClick={() => onTabChange(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-body" role="tabpanel">
        {activeTab === 'live' && (selected ? <RequestEntry record={selected} /> : <Welcome signedIn={Boolean(session)} />)}
        {activeTab === 'live' && records.length > 1 && (
          <History records={records} selectedId={selected.id} onSelect={(id) => setPick({ id, latestId: latest.id })} />
        )}
        {activeTab === 'state' && <StateInspector state={inspect} lastRequest={latest} />}
        {activeTab === 'token' && <TokenPeek token={session.access_token} />}
        {activeTab === 'concepts' && <ConceptsBrowser selected={conceptKey} onSelect={setConceptKey} />}
      </div>
    </aside>
  );
}
