// The ingestion layer never talks to a concrete API directly — it talks to
// this interface. That is what lets us swap the simulated source for a real
// sports API later by changing config only, with no changes downstream.

export interface RawEvent {
  seq: number;
  matchId: string;
  type: string;
  team: string;
  player: string;
  minute: number;
}

export interface EventSource {
  // Ask the source for events after `since` for a given match.
  // Returns the new events plus the cursor to use on the next call.
  fetchEvents(matchId: string, since: number): Promise<{ events: RawEvent[]; cursor: number }>;
}

// Interfaces vanish at runtime (they are a TypeScript-only concept), so Nest's
// dependency injection cannot use `EventSource` as a token. We define an
// explicit token and inject it with @Inject(EVENT_SOURCE).
export const EVENT_SOURCE = Symbol('EVENT_SOURCE');
