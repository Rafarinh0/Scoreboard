import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// A document in MongoDB. This is the persistent history — the source of truth
// of everything that happened in a match. The scoreboard state is derived
// from these documents.
export type EventDocument = HydratedDocument<Event>;

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  matchId!: string;

  @Prop({ required: true })
  seq!: number;

  @Prop({ required: true })
  type!: string;

  // Only present for scoring events (goal/card), not for phase markers.
  @Prop()
  team?: string;

  @Prop()
  player?: string;

  @Prop({ required: true })
  minute!: number;
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Idempotency at the database level: no two documents can share the same
// (matchId, seq). Even if a job somehow runs twice, the second insert is
// rejected by Mongo. This is a second safety net beyond the queue's jobId.
EventSchema.index({ matchId: 1, seq: 1 }, { unique: true });
