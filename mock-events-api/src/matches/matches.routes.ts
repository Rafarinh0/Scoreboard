import { Router, Request, Response } from 'express';
import { Match } from './match';

export const matchesRouter = Router();

// One live Match instance per matchId, created on first access.
// The clock for a match starts the first time someone asks about it.
const matches = new Map<string, Match>();

function getMatch(matchId: string): Match {
  let match = matches.get(matchId);
  if (!match) {
    match = new Match(matchId, Date.now());
    matches.set(matchId, match);
  }
  return match;
}

// GET /matches/:id/events?since=<cursor>
// Returns only events after the cursor that have already unlocked.
matchesRouter.get('/matches/:id/events', (req: Request, res: Response) => {
  const matchId = req.params.id;
  const since = Number(req.query.since ?? 0);

  if (Number.isNaN(since) || since < 0) {
    return res.status(400).json({ error: 'since must be a non-negative number' });
  }

  const events = getMatch(matchId).eventsSince(since);
  const cursor = events.length > 0 ? events[events.length - 1].seq : since;

  return res.json({ events, cursor });
});
