import { useState } from 'react';
import { DEMO_PASSWORD, DEMO_USERS } from '../../../shared/constants.js';
import { Illustration } from '../icons.jsx';
import { supabase } from '../supabaseClient.js';
import LearnPanel from './LearnPanel.jsx';

// Turns Supabase's error codes into friendly sentences.
export function friendlyAuthError(error) {
  switch (error.code) {
    case 'invalid_credentials':
      return 'That email and password do not match an account.';
    case 'user_already_exists':
      return 'An account with that email already exists. Try logging in instead.';
    default:
      return error.message;
  }
}

export default function LoginScreen() {
  // CLIENT STATE: what is typed into the form. Nothing is sent until a button is pressed.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [tab, setTab] = useState('live');

  async function submit(kind) {
    setBusy(true);
    setMessage(null);
    setTab('live');
    const credentials = { email: email.trim(), password };
    // AUTHENTICATION: send the email and password to Supabase Auth and get a token back.
    const { data, error } =
      kind === 'login' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp(credentials);
    setBusy(false);
    if (error) setMessage(friendlyAuthError(error));
    else if (!data.session) setMessage('Check your inbox to confirm your email, then log in.');
    // On success, App sees the new session and shows the todo screen.
  }

  return (
    <main className="layout">
      <section className="phone login">
        <Illustration name="lock" className="login-art" />
        <p className="eyebrow on-blue">Welcome</p>
        <h1>Log in</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit('login');
          }}
        >
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {message && <p className="banner error" role="alert">{message}</p>}
          <div className="login-actions">
            <button type="submit" className="primary" disabled={busy}>Log in</button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={(event) => {
                if (event.currentTarget.form.reportValidity()) submit('signup');
              }}
            >
              Sign up
            </button>
          </div>
        </form>
        <p className="demo-hint">
          Demo accounts: <code>{DEMO_USERS.alice.email}</code> and <code>{DEMO_USERS.bob.email}</code>, password <code>{DEMO_PASSWORD}</code>
        </p>
      </section>
      <LearnPanel tab={tab} onTabChange={setTab} session={null} />
    </main>
  );
}
