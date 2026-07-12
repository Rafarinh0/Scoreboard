import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventSource, EVENT_SOURCE, RawEvent } from './event-source';
import { EventDto } from './dto/event.dto';

// The poller is the "lean ingestion" of the guide: on a timer it asks the
// source for new events, validates each one, and (Stage 3) enqueues them.
// It does NOT compute standings, write to Mongo or notify WebSockets — that
// is the worker's job. Keeping this thin is what makes ingestion fast and
// resilient under bursts.
@Injectable()
export class PollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PollerService.name);

  // The cursor (last seq seen) per match. This is what makes us ask only for
  // what is new, and never reprocess an event.
  private readonly cursors = new Map<string, number>();

  private readonly matchIds: string[];
  private readonly intervalMs: number;

  constructor(
    @Inject(EVENT_SOURCE) private readonly source: EventSource,
    private readonly scheduler: SchedulerRegistry,
    config: ConfigService,
  ) {
    this.matchIds = config
      .get<string>('MATCH_IDS', '42')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    this.intervalMs = config.get<number>('POLL_INTERVAL_MS', 3000);
  }

  onModuleInit(): void {
    const interval = setInterval(() => void this.poll(), this.intervalMs);
    this.scheduler.addInterval('poller', interval);
    this.logger.log(
      `Polling ${this.matchIds.length} match(es) every ${this.intervalMs}ms: [${this.matchIds.join(', ')}]`,
    );
  }

  onModuleDestroy(): void {
    // Clean shutdown so we do not leak a running timer.
    if (this.scheduler.doesExist('interval', 'poller')) {
      this.scheduler.deleteInterval('poller');
    }
  }

  private async poll(): Promise<void> {
    for (const matchId of this.matchIds) {
      await this.pollMatch(matchId);
    }
  }

  private async pollMatch(matchId: string): Promise<void> {
    const since = this.cursors.get(matchId) ?? 0;

    let result: { events: RawEvent[]; cursor: number };
    try {
      result = await this.source.fetchEvents(matchId, since);
    } catch (err) {
      // Network/source failure: log and try again next tick. The cursor is
      // untouched, so nothing is skipped.
      this.logger.warn(`Failed to fetch events for match ${matchId}: ${String(err)}`);
      return;
    }

    for (const raw of result.events) {
      const valid = await this.validate(raw, matchId);
      if (!valid) continue;

      // Stage 3 will replace this log with queue.add(...).
      this.logger.log(
        `[enqueue] match ${valid.matchId} #${valid.seq}: ${valid.type} ${valid.team} (${valid.player}, ${valid.minute}')`,
      );
    }

    // Advance the cursor only after handling this batch.
    this.cursors.set(matchId, result.cursor);
  }

  // Validate one untrusted event against the DTO. Returns the typed event or
  // null if it should be discarded.
  private async validate(raw: RawEvent, matchId: string): Promise<EventDto | null> {
    const dto = plainToInstance(EventDto, raw);
    const errors = await validate(dto);
    if (errors.length > 0) {
      this.logger.warn(
        `Discarding invalid event for match ${matchId}: ${JSON.stringify(raw)}`,
      );
      return null;
    }
    return dto;
  }
}
