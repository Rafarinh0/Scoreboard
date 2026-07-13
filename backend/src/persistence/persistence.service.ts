import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { EventJobData } from '../queue.constants';

// The repository: the only place that knows how to talk to MongoDB. The rest
// of the app asks it to "save an event" without knowing about Mongoose.
@Injectable()
export class PersistenceService {
  private readonly logger = new Logger(PersistenceService.name);

  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
  ) {}

  // Save one event. Returns the saved document, or null if it was a duplicate
  // (already persisted). Callers use null to skip double-processing.
  async saveEvent(data: EventJobData): Promise<EventDocument | null> {
    try {
      return await this.eventModel.create(data);
    } catch (err: unknown) {
      // Mongo error 11000 = duplicate key (our unique matchId+seq index).
      if (this.isDuplicateKeyError(err)) {
        this.logger.warn(`Duplicate event ignored: ${data.matchId} #${data.seq}`);
        return null;
      }
      throw err;
    }
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'code' in err && err.code === 11000;
  }
}
