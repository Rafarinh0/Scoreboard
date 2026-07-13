// A match is a fixed *script* of events, each with a sequence number.
// The script is defined once (in "match minutes"), but we only reveal an
// event once enough real time has passed since the server started — that is
// what makes the match feel like it is being "narrated" live.
//
// Besides scoring events (goal, card), the script also carries phase markers
// (kickoff, halftime, fulltime) so clients can show the start, the interval
// and the end of the match.

export type EventType = 'kickoff' | 'goal' | 'card' | 'halftime' | 'fulltime';

export interface MatchEvent {
  seq: number; // strictly increasing; this is the cursor clients page with
  matchId: string;
  type: EventType;
  team?: 'home' | 'away'; // only for goal/card
  player?: string; // only for goal/card
  minute: number; // in-match minute (for display / the clock)
  atMs: number; // real-world ms (since match start) when this event unlocks
}

// How fast the match plays out: 1 in-match minute every second. A full
// 90-minute match therefore lasts ~90 real seconds.
const MS_PER_MATCH_MINUTE = 1000;

// The raw script, written in match minutes. Two halves, ending 3-2.
type ScriptEntry = Omit<MatchEvent, 'seq' | 'atMs' | 'matchId'>;
const SCRIPT: ScriptEntry[] = [
  { type: 'kickoff', minute: 0 },
  { type: 'goal', team: 'home', player: 'Silva', minute: 12 },
  { type: 'card', team: 'away', player: 'Costa', minute: 23 },
  { type: 'goal', team: 'away', player: 'Pereira', minute: 34 },
  { type: 'halftime', minute: 45 },
  { type: 'goal', team: 'home', player: 'Silva', minute: 58 },
  { type: 'card', team: 'home', player: 'Souza', minute: 66 },
  { type: 'goal', team: 'away', player: 'Lima', minute: 77 },
  { type: 'goal', team: 'home', player: 'Ferreira', minute: 85 },
  { type: 'fulltime', minute: 90 },
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
