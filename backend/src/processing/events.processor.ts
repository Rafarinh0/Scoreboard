import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EVENTS_QUEUE, EventJobData } from '../queue.constants';

// The worker is the "heavy" side the guide talks about: it consumes jobs from
// the queue at its own pace and does the real work. Right now it just logs;
// later stages will make it persist to Mongo, update the scoreboard and push
// via WebSocket. Because it is decoupled behind the queue, a burst of events
// piles up in Redis instead of overwhelming ingestion.
@Processor(EVENTS_QUEUE)
export class EventsProcessor extends WorkerHost {
  private readonly logger = new Logger(EventsProcessor.name);

  async process(job: Job<EventJobData>): Promise<void> {
    const e = job.data;
    this.logger.log(
      `[process] job ${job.id} → match ${e.matchId} #${e.seq}: ${e.type} ${e.team} (${e.player}, ${e.minute}')`,
    );
  }
}
