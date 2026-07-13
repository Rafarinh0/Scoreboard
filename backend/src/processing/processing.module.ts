import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EVENTS_QUEUE } from '../queue.constants';
import { EventsProcessor } from './events.processor';
import { PersistenceModule } from '../persistence/persistence.module';
import { ScoreboardModule } from '../scoreboard/scoreboard.module';

@Module({
  imports: [
    // Registers this module as a consumer of the "events" queue.
    BullModule.registerQueue({ name: EVENTS_QUEUE }),
    // The worker needs these to persist and to update the score.
    PersistenceModule,
    ScoreboardModule,
  ],
  providers: [EventsProcessor],
})
export class ProcessingModule {}
