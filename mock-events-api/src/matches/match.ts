// A match is a fixed *script* of events, each with a sequence number.
// The script is defined once (in "match minutes"), but we only reveal an
// event once enough real time has passed since the server started — that is
// what makes the match feel like it is being "narrated" live.

export type EventType = 'goal' | 'card';

export interface MatchEvent {
  seq: number; // strictly increasing; this is the cursor clients page with
  matchId: string;
  type: EventType;
  team: 'home' | 'away';
  player: string;
  minute: number; // in-match minute (for display)
  atMs: number; // real-world ms (since server start) when this event unlocks
}

// How fast the match plays out: 1 in-match minute every 2 real seconds.
const MS_PER_MATCH_MINUTE = 2000;

// The raw script of a single sample match, written in match minutes.
const SCRIPT: Array<Omit<MatchEvent, 'seq' | 'atMs' | 'matchId'>> = [
  { type: 'goal', team: 'home', player: 'Silva', minute: 12 },
  { type: 'card', team: 'away', player: 'Costa', minute: 23 },
  { type: 'goal', team: 'away', player: 'Pereira', minute: 34 },
  { type: 'card', team: 'home', player: 'Souza', minute: 41 },
  { type: 'goal', team: 'home', player: 'Silva', minute: 58 },
  { type: 'goal', team: 'away', player: 'Lima', minute: 77 },
  { type: 'card', team: 'away', player: 'Rocha', minute: 88 },
];

export class Match {
  private readonly events: MatchEvent[];

  constructor(
    public readonly matchId: string,
    private readonly startedAtMs: number,
  ) {
    // Build the full timeline once, converting match minutes -> real ms.
    this.events = SCRIPT.map((e, i) => ({
      ...e,
      matchId,
      seq: i + 1,
      atMs: e.minute * MS_PER_MATCH_MINUTE,
    }));
  }

  // Return every event with seq > since that has already unlocked by now.
  eventsSince(since: number): MatchEvent[] {
    const elapsed = Date.now() - this.startedAtMs;
    return this.events.filter((e) => e.seq > since && e.atMs <= elapsed);
  }
}
