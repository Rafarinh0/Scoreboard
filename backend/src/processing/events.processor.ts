import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EVENTS_QUEUE, EventJobData } from '../queue.constants';
import { PersistenceService } from '../persistence/persistence.service';
import { ScoreboardService } from '../scoreboard/scoreboard.service';

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
  ) {
    super();
  }

  async process(job: Job<EventJobData>): Promise<void> {
    const e = job.data;

    // 1. Persist first. If it was a duplicate (already saved), skip — this
    //    stops the scoreboard from being counted twice.
    const saved = await this.persistence.saveEvent(e);
    if (!saved) return;

    // 2. Update the derived scoreboard state.
    const score = this.scoreboard.apply(e);

    this.logger.log(
      `[process] match ${e.matchId} #${e.seq}: ${e.type} ${e.team} (${e.player}) → ${score.home}-${score.away}`,
    );
  }
}
