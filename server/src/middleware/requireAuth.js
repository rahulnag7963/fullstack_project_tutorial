import { HttpError } from '../errors.js';
import { authClient, supabaseAsUser } from '../supabase.js';

// AUTHENTICATION: "Who are you?"
// Every request must carry a token (the "wristband") in the header:
//   Authorization: Bearer <token>
// We ask Supabase Auth whether the token is genuine and not expired.
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('Authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'unauthorized', 'Log in first: this request has no token.');
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, 'unauthorized', 'Your token is invalid or has expired. Log in again.');
  }

  req.user = data.user;
  req.db = supabaseAsUser(token);
  next();
}
