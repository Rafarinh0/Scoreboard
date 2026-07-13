// Shared contract between the producer (poller) and the consumer (worker).
// Both sides must agree on the queue name and the job payload shape.

export const EVENTS_QUEUE = 'events';

// The kinds of event that flow through the pipeline: scoring events and the
// phase markers that signal the start, interval and end of a match.
export type EventType = 'kickoff' | 'goal' | 'card' | 'halftime' | 'fulltime';

// The data each queued job carries: a validated match event. team/player only
// apply to goal/card; phase markers omit them.
export interface EventJobData {
  seq: number;
  matchId: string;
  type: EventType;
  team?: 'home' | 'away';
  player?: string;
  minute: number;
}
