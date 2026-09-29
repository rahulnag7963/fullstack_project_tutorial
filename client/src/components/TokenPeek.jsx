import { useState } from 'react';

function decodePart(part) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
}

// A JWT is three base64url parts joined by dots: header.payload.signature
export function decodeJwt(token) {
  const [header, payload, signature] = token.split('.');
  return { parts: { header, payload, signature }, header: decodePart(header), payload: decodePart(payload) };
}

const FIELD_NOTES = {
  sub: 'Your user id (the "subject"). The server uses it to find your todos.',
  email: 'The email you logged in with.',
  role: '"authenticated" means a logged-in user. The database security rules check this.',
  iat: 'When this token was issued.',
  exp: 'When this token stops working.',
  aud: 'Who the token is meant for (the "audience").',
  session_id: 'Which login session this token belongs to.',
};

const TIME_FIELDS = new Set(['iat', 'exp']);

function shorten(text) {
  return text.length > 28 ? `${text.slice(0, 24)}…` : text;
}

export default function TokenPeek({ token }) {
  const [now] = useState(() => Date.now());
  const { parts, payload } = decodeJwt(token);
  const minutesLeft = Math.max(0, Math.round((payload.exp * 1000 - now) / 60_000));

  return (
    <div className="token-peek">
      <p className="eyebrow">Authentication</p>
      <h3 className="entry-title">YOUR TOKEN (JWT)</h3>
      <p className="summary">
        This is the wristband your browser shows the server on every request. It has three parts, separated by dots.
      </p>

      <p className="jwt" aria-label="Your token, split into its three parts">
        <span className="jwt-header">{shorten(parts.header)}</span>.
        <span className="jwt-payload">{shorten(parts.payload)}</span>.
        <span className="jwt-signature">{shorten(parts.signature)}</span>
      </p>
      <ul className="jwt-legend">
        <li><span className="swatch jwt-header-bg" /> <strong>Header:</strong> what kind of token this is.</li>
        <li><span className="swatch jwt-payload-bg" /> <strong>Payload:</strong> facts about you, decoded below.</li>
        <li><span className="swatch jwt-signature-bg" /> <strong>Signature:</strong> a seal only the auth server can make. Change one letter and the seal breaks.</li>
      </ul>

      <table className="claims">
        <tbody>
          {Object.keys(FIELD_NOTES)
            .filter((key) => payload[key] !== undefined)
            .map((key) => (
              <tr key={key}>
                <th scope="row">{key}</th>
                <td className="value">
                  {TIME_FIELDS.has(key) ? new Date(payload[key] * 1000).toLocaleTimeString() : String(payload[key])}
                </td>
                <td>{FIELD_NOTES[key]}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <p className="callout">
        Anyone can read the payload: it is encoded, not encrypted. Never put secrets in a token. What makes it
        trustworthy is the signature.
      </p>
      <p className="footnote">This token expires in about {minutesLeft} minutes. The app will quietly fetch a new one.</p>
    </div>
  );
}
