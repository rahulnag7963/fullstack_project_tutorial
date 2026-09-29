import express from 'express';
import { errorHandler, HttpError } from './errors.js';
import { requireAuth } from './middleware/requireAuth.js';
import todosRouter from './routes/todos.js';

export function createApp() {
  const app = express();

  // Read JSON request bodies. The size limit stops someone sending huge requests.
  app.use(express.json({ limit: '10kb' }));

  // Every /api/todos route needs a logged-in user.
  app.use('/api/todos', requireAuth, todosRouter);

  app.use('/api', () => {
    throw new HttpError(404, 'not_found', 'There is no API route here.');
  });

  app.use(errorHandler);
  return app;
}
