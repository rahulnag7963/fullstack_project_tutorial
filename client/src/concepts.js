// Plain-English explanations shown in the "What just happened?" panel.
// Written for students who have never heard of any of these ideas.

export const CONCEPTS = {
  http: {
    eyebrow: 'Big idea',
    title: 'HTTP REQUESTS',
    summary:
      'The browser and the server talk by sending messages called requests. Each one has a method (what to do), a URL (what to do it to), headers (extra info, like your token) and sometimes a body (the data).',
    analogy: 'Like a letter: the envelope has the address and a stamp, and the letter inside is the body.',
    tags: ['Method', 'URL', 'Headers', 'Body'],
    points: ['Every request gets a response with a status code that says how it went.'],
  },
  get: {
    eyebrow: 'HTTP method',
    title: 'GET · READ',
    summary: 'GET asks the server to show you something. Nothing on the server changes.',
    analogy: 'Like reading a menu at a restaurant: you look, but you do not order anything.',
    tags: ['Reads data', 'Safe to repeat', 'Needs login'],
    points: [
      'The browser sent your token, so the server knew whose todos to send back.',
      'The answer came back as JSON: a list of your todos.',
    ],
  },
  post: {
    eyebrow: 'HTTP method',
    title: 'POST · CREATE',
    summary: 'POST sends something new to the server to be saved.',
    analogy: 'Like mailing a letter: you send it off and the post office keeps it.',
    tags: ['Creates data', 'Not safe to repeat', 'Needs login'],
    points: [
      'The new todo travelled in the request body as JSON.',
      'The server answered 201 Created and sent back the saved todo, including the id the database gave it.',
      'Send the same POST twice and you get two todos. That is why POST is "not safe to repeat".',
    ],
  },
  patch: {
    eyebrow: 'HTTP method',
    title: 'PATCH · UPDATE',
    summary: 'PATCH changes part of something that already exists.',
    analogy: 'Like fixing a typo with correction tape: the rest of the page stays the same.',
    tags: ['Changes data', 'Needs the id', 'Needs login'],
    points: [
      "The URL ends with the todo's id, so the server knows which one to change.",
      'Only the fields that changed were sent in the body.',
    ],
    footnote: 'PUT is the sibling of PATCH. PUT replaces the whole thing, like rewriting the page. PATCH changes only the part you send.',
  },
  delete: {
    eyebrow: 'HTTP method',
    title: 'DELETE · REMOVE',
    summary: 'DELETE asks the server to remove something.',
    analogy: 'Like putting a document through a shredder: once it is gone, it is gone.',
    tags: ['Removes data', 'Needs the id', 'Needs login'],
    points: ['The server answered 204 No Content, which means "done, nothing more to say".'],
  },
  login: {
    eyebrow: 'Authentication',
    title: 'LOG IN · WHO ARE YOU?',
    summary: 'Authentication means proving who you are. You sent your email and password, and got a token back.',
    analogy: 'Like showing your ID at a club door. The bouncer checks it and gives you a wristband. The wristband is your token.',
    tags: ['Proves who you are', 'Returns a token', 'Password hidden'],
    points: [
      'This request went to Supabase Auth, a different server from our Express API.',
      'Your password is never stored as plain text. Supabase stores a scrambled version called a hash.',
      'From now on, every request carries the token in its Authorization header.',
    ],
  },
  signup: {
    eyebrow: 'Authentication',
    title: 'SIGN UP · NEW ACCOUNT',
    summary: 'Signing up creates a new account on the auth server and logs you straight in.',
    analogy: 'Like joining a gym: you fill in a form once, and they hand you a membership card.',
    tags: ['Creates an account', 'Returns a token', 'Password hidden'],
    points: ['The auth server saved a hash of your password, never the password itself.'],
  },
  refresh: {
    eyebrow: 'Authentication',
    title: 'REFRESH · NEW TOKEN',
    summary: 'Tokens expire on purpose. The app quietly swapped an old token for a fresh one.',
    analogy: 'Like a day pass that runs out at midnight: you swap it at the desk for a new one without showing your ID again.',
    tags: ['Automatic', 'Short-lived tokens', 'Security'],
    points: ['A stolen token is only useful until it expires, which limits the damage.'],
  },
  logout: {
    eyebrow: 'Authentication',
    title: 'LOG OUT',
    summary: 'Logging out tells the auth server to end your session, and the browser forgets your token.',
    analogy: 'Like handing your wristband back at the door on the way out.',
    tags: ['Ends the session', 'Token forgotten'],
  },
  whoami: {
    eyebrow: 'Authentication',
    title: 'WHO AM I?',
    summary: 'The app asked the auth server which user this token belongs to.',
    analogy: 'Like asking the front desk to read the name on your wristband.',
    tags: ['Reads your account'],
  },
  loginFailed: {
    eyebrow: 'Authentication',
    title: 'LOGIN FAILED',
    summary: 'The auth server said no. Maybe the password is wrong, or an account with that email already exists.',
    analogy: 'The bouncer turns you away, but does not say whether it was your name or your photo that did not match.',
    tags: ['Rejected', 'Deliberately vague'],
    points: ['Login errors are vague on purpose. Saying "that email exists" would help an attacker guess.'],
  },
  unauthorized: {
    eyebrow: 'Authentication',
    title: '401 · WHO ARE YOU?',
    summary: 'The server could not tell who you are, because the token was missing, fake or expired.',
    analogy: 'Like trying to get back into the club without a wristband.',
    tags: ['No valid token', 'Log in again'],
    points: ['The app sends you back to the login page.'],
  },
  authorization: {
    eyebrow: 'Authorization',
    title: 'AUTHORIZATION · BLOCKED',
    summary: 'You are logged in, but this todo is not yours, so the server refused.',
    analogy: 'Your wristband gets you into the club, but not behind the bar.',
    tags: ['You are known', 'Not allowed', 'Checked twice'],
    points: [
      'Authentication asks "who are you?". Authorization asks "what are you allowed to do?".',
      'The server answered 404 Not Found instead of 403 Forbidden, so it does not even reveal that the todo exists.',
      "Two locks stopped this: the server code checks the owner, and the database's Row Level Security checks again.",
    ],
  },
  validation: {
    eyebrow: 'Security',
    title: '400 · BAD REQUEST',
    summary: 'The server checked what you sent and rejected it.',
    analogy: 'Like a post office refusing a letter with no address.',
    tags: ['Input checked', 'Never trust the browser'],
    points: [
      'The browser checks your input too, but only to be helpful.',
      'Anyone can skip the web page and send requests directly, so the server always checks again.',
    ],
  },
  serverError: {
    eyebrow: 'Errors',
    title: 'SERVER ERROR',
    summary: 'Something broke on the server side, or the server could not be reached. It is not your fault.',
    analogy: 'The kitchen caught fire: the waiter can only apologise.',
    tags: ['Not your fault', 'Details hidden'],
    points: ['The server hides the technical details from the browser, because they can help attackers.'],
  },
  security: {
    eyebrow: 'Big idea',
    title: 'SECURITY',
    summary: 'Security means making sure only the right people can see and change the right things.',
    analogy: 'Like a building with a front desk, locked doors and cameras: several layers, so one mistake does not let everyone in.',
    tags: ['Hashed passwords', 'Expiring tokens', 'Two locks'],
    points: [
      'Passwords are stored as hashes, never as plain text.',
      'Tokens expire, so a stolen token stops working soon.',
      'The server never trusts the browser: it re-checks who you are, what you own and what you sent.',
      'Row Level Security in the database is a second lock behind the server.',
      'Secret keys live only on the server. Only PUBLIC_ settings ever reach the browser.',
    ],
  },
  state: {
    eyebrow: 'Big idea',
    title: 'STATE',
    summary: 'State is what the app is remembering right now.',
    analogy: "Like a waiter's notepad: the kitchen has the real orders, and the notepad is the waiter's copy.",
    tags: ['Server state', 'Client state'],
    points: [
      "Server state is data that really lives in the database. The todo list on screen is the app's copy of it.",
      'Client state is something only the browser knows, like text you have typed but not saved yet.',
      'When state changes, React redraws the screen. Open the State tab and watch it happen.',
    ],
  },
  token: {
    eyebrow: 'Authentication',
    title: 'TOKENS (JWT)',
    summary: 'A token is a small signed note from the auth server that says who you are. The browser shows it on every request.',
    analogy: 'Like a wristband with your name printed on it and a hologram that is impossible to fake.',
    tags: ['Signed', 'Readable by anyone', 'Expires'],
    points: [
      'Anyone can read what a token says: it is encoded, not encrypted.',
      'Nobody can change it without breaking the signature, so the server can trust it.',
      'Open the Token tab to look inside yours.',
    ],
  },
  statusCodes: {
    eyebrow: 'Big idea',
    title: 'STATUS CODES',
    summary: 'Every response starts with a three-digit number that says how it went.',
    analogy: 'Like a traffic light: you know roughly what happened before reading any details.',
    tags: ['2xx worked', '4xx your side', '5xx server side'],
    points: [
      '200 OK: here is what you asked for.',
      '201 Created: something new was saved.',
      '204 No Content: done, nothing to send back.',
      '400 Bad Request: what you sent was not valid.',
      '401 Unauthorized: who are you? Log in first.',
      '404 Not Found: there is nothing here for you.',
      '500 Server Error: the server broke.',
    ],
  },
};

// Order of the chips in the Concepts tab.
export const CONCEPT_MENU = [
  ['http', 'HTTP'],
  ['get', 'GET'],
  ['post', 'POST'],
  ['patch', 'PATCH'],
  ['delete', 'DELETE'],
  ['statusCodes', 'Status codes'],
  ['login', 'Authentication'],
  ['authorization', 'Authorization'],
  ['token', 'Tokens'],
  ['security', 'Security'],
  ['state', 'State'],
];

export const STATUS_TEXT = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable',
  429: 'Too Many Requests',
  500: 'Server Error',
  502: 'Bad Gateway',
};

// Where the instructor can find the code that handled each kind of request.
const CODE = {
  get: "server/src/routes/todos.js → router.get('/')",
  post: "server/src/routes/todos.js → router.post('/')",
  patch: "server/src/routes/todos.js → router.patch('/:id')",
  delete: "server/src/routes/todos.js → router.delete('/:id')",
  unauthorized: 'server/src/middleware/requireAuth.js → requireAuth()',
  authorization: 'server/src/routes/todos.js → notYours()',
  validation: 'server/src/validate.js',
  serverError: 'server/src/errors.js → errorHandler()',
  login: 'client/src/components/LoginScreen.jsx → supabase.auth.signInWithPassword()',
  signup: 'client/src/components/LoginScreen.jsx → supabase.auth.signUp()',
  loginFailed: 'client/src/components/LoginScreen.jsx → friendlyAuthError()',
  logout: 'client/src/components/TodoScreen.jsx → supabase.auth.signOut()',
  refresh: 'Built into @supabase/supabase-js, which refreshes tokens automatically',
  whoami: 'Built into @supabase/supabase-js',
};

const METHOD_CONCEPTS = { GET: 'get', POST: 'post', PATCH: 'patch', DELETE: 'delete' };

function conceptKeyFor({ method, path, search = '', status, error }) {
  if (path.startsWith('/auth/v1/')) {
    if (path.endsWith('/logout')) return 'logout';
    if (error || status >= 400) return 'loginFailed';
    if (path.endsWith('/signup')) return 'signup';
    if (path.endsWith('/token')) return search.includes('grant_type=refresh_token') ? 'refresh' : 'login';
    return 'whoami';
  }
  if (error || status >= 500) return 'serverError';
  if (status === 401) return 'unauthorized';
  if (status === 404 && (method === 'PATCH' || method === 'DELETE')) return 'authorization';
  if (status === 400) return 'validation';
  return METHOD_CONCEPTS[method] ?? 'http';
}

// Turns a recorded request into the concept that explains it.
export function explainRecord(record) {
  const key = conceptKeyFor(record);
  return { key, concept: CONCEPTS[key], code: CODE[key] ?? null };
}
