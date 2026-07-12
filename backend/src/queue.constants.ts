// Shared contract between the producer (poller) and the consumer (worker).
// Both sides must agree on the queue name and the job payload shape.

export const EVENTS_QUEUE = 'events';

// The data each queued job carries: a validated match event.
export interface EventJobData {
  seq: number;
  matchId: string;
  type: 'goal' | 'card';
  team: 'home' | 'away';
  player: string;
  minute: number;
}
