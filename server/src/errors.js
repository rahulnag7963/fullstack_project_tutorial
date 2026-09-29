// An error the server sends back on purpose, with an HTTP status code
// and a short machine-readable code the browser can react to.
export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// One place turns every error into the same JSON shape: { error: { code, message } }.
// Unexpected errors are logged on the server but never sent to the browser,
// because error details can show an attacker how the system works inside.
// eslint-disable-next-line no-unused-vars -- Express spots error handlers by their four arguments.
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  // Errors from express.json(), such as malformed JSON or a body that is too large.
  if (err.expose && err.status < 500) {
    const code = err.type === 'entity.parse.failed' ? 'invalid_json' : 'bad_request';
    const message = code === 'invalid_json' ? 'The request body is not valid JSON.' : err.message;
    return res.status(err.status).json({ error: { code, message } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on the server.' } });
}
