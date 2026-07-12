import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EVENTS_QUEUE } from '../queue.constants';
import { EventsProcessor } from './events.processor';

@Module({
  imports: [
    // Registers this module as a consumer of the "events" queue.
    BullModule.registerQueue({ name: EVENTS_QUEUE }),
  ],
  providers: [EventsProcessor],
})
export class ProcessingModule {}
