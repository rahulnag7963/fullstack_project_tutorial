import { useEffect, useState } from 'react';
import LoginScreen from './components/LoginScreen.jsx';
import TodoScreen from './components/TodoScreen.jsx';
import { supabase } from './supabaseClient.js';

export default function App() {
  // undefined means "still checking whether someone is already logged in".
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    // Fires on log in, log out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  return session ? <TodoScreen key={session.user.id} session={session} /> : <LoginScreen />;
}
