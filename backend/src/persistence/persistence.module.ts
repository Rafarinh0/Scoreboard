import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { PersistenceService } from './persistence.service';

@Module({
  imports: [
    // Registers the Event model so it can be injected with @InjectModel.
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
  ],
  providers: [PersistenceService],
  // Exported so other modules (processing) can use it.
  exports: [PersistenceService],
})
export class PersistenceModule {}
