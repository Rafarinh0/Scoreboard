import express from 'express';
import { matchesRouter } from './matches/matches.routes';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(express.json());
app.use(matchesRouter);

// Simple health check so Docker / the poller can confirm we are up.
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`mock-events-api listening on http://localhost:${PORT}`);
});
