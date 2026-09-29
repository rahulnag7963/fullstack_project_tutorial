import { explainRecord, STATUS_TEXT } from '../concepts.js';
import ConceptBody from './ConceptBody.jsx';

const HEADER_NOTES = {
  authorization: 'This is your wristband: the token that proves who you are.',
  apikey: "The app's publishable key. It identifies the app, not you, so it is safe to be public.",
};

const KNOWN_METHODS = ['get', 'post', 'patch', 'delete'];

function pretty(value) {
  if (value == null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function StatusChip({ record }) {
  if (record.error) return <span className="status status-bad">Network error</span>;
  const tone = record.status < 300 ? 'ok' : record.status < 500 ? 'warn' : 'bad';
  return <span className={`status status-${tone}`}>{`${record.status} ${STATUS_TEXT[record.status] ?? ''}`.trim()}</span>;
}

export function MethodBadge({ method }) {
  const name = method.toLowerCase();
  return <span className={`method method-${KNOWN_METHODS.includes(name) ? name : 'other'}`}>{method}</span>;
}

function HeaderList({ headers }) {
  const entries = Object.entries(headers);
  if (entries.length === 0) return <p className="footnote">No headers.</p>;
  return (
    <ul className="header-list">
      {entries.map(([key, value]) => (
        <li key={key} className={HEADER_NOTES[key] ? 'highlight' : undefined}>
          <span className="key">{key}:</span> {value}
          {HEADER_NOTES[key] && <span className="header-note">{HEADER_NOTES[key]}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function RequestEntry({ record }) {
  const { concept, code } = explainRecord(record);
  const response = record.error ? `No response: ${record.error}` : (pretty(record.responseBody) ?? '(empty)');

  return (
    <article className="entry">
      <p className="eyebrow">{concept.eyebrow}</p>
      <h3 className="entry-title">{concept.title}</h3>
      <div className="entry-meta">
        <MethodBadge method={record.method} />
        <code className="route">{record.url}</code>
        <StatusChip record={record} />
        <span className="duration">{record.durationMs} ms</span>
      </div>

      <ConceptBody concept={concept} />

      {code && (
        <p className="code-pointer">
          <span>Where in code</span>
          <code>{code}</code>
        </p>
      )}

      <details className="raw">
        <summary>See the full request and response</summary>
        <div className="raw-body">
          <h4>Request headers</h4>
          <HeaderList headers={record.requestHeaders} />
          {record.requestBody != null && (
            <>
              <h4>Request body</h4>
              <pre>{pretty(record.requestBody)}</pre>
            </>
          )}
          <h4>Response</h4>
          <pre>{response}</pre>
        </div>
      </details>
    </article>
  );
}
