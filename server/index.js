import cors from 'cors';
import express from 'express';
import { migrate } from './db/connection.js';
import { apiRouter } from './routes/api.js';

migrate();

const app = express();
const port = process.env.PORT ?? 3001;
const host = process.env.HOST ?? '127.0.0.1';

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

app.use((error, _req, res, _next) => {
  const status = error.status ?? 500;
  res.status(status).json({
    message: error.message ?? 'Something went wrong.'
  });
});

app.listen(port, host, () => {
  console.log(`TrustShift API running on http://${host}:${port}`);
});
