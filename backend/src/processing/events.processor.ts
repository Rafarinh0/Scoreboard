import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EVENTS_QUEUE, EventJobData } from '../queue.constants';
import { PersistenceService } from '../persistence/persistence.service';
import { ScoreboardService } from '../scoreboard/scoreboard.service';
import { ScoreboardGateway } from '../scoreboard/scoreboard.gateway';

// The worker is the "heavy" side the guide talks about: it consumes jobs from
// the queue at its own pace and does the real work — persist to Mongo and
// update the scoreboard. Because it is decoupled behind the queue, a burst of
// events piles up in Redis instead of overwhelming ingestion. A later stage
// will make it also push the new score via WebSocket.
@Processor(EVENTS_QUEUE)
export class EventsProcessor extends WorkerHost {
  private readonly logger = new Logger(EventsProcessor.name);

  constructor(
    private readonly persistence: PersistenceService,
    private readonly scoreboard: ScoreboardService,
    private readonly gateway: ScoreboardGateway,
  ) {
    super();
  }

  async process(job: Job<EventJobData>): Promise<void> {
    const e = job.data;

    // 1. Persist first. If it was a duplicate (already saved), skip — this
    //    stops the scoreboard from being counted twice.
    const saved = await this.persistence.saveEvent(e);
    if (!saved) return;

    // 2. Update the derived match state (score + phase + minute).
    const state = this.scoreboard.apply(e);

    // 3. Push the new state + this event to every client watching the match.
    this.gateway.broadcastUpdate(state, e);

    this.logger.log(this.describe(e, state));
  }

  // A human-readable log line per event type.
  private describe(e: EventJobData, state: { home: number; away: number }): string {
    const at = `${state.home}-${state.away}`;
    switch (e.type) {
      case 'kickoff':
        return `[KICKOFF] match ${e.matchId} — the game has started`;
      case 'goal':
        return `[GOAL] match ${e.matchId} ${e.minute}' ${e.team} — ${e.player} → ${at}`;
      case 'card':
        return `[CARD] match ${e.matchId} ${e.minute}' ${e.team} — ${e.player}`;
      case 'halftime':
        return `[HALFTIME] match ${e.matchId} — interval (${at})`;
      case 'fulltime':
        return `[FULLTIME] match ${e.matchId} — final score ${at}`;
      default:
        return `[event] match ${e.matchId} #${e.seq}: ${e.type}`;
    }
  }
}
