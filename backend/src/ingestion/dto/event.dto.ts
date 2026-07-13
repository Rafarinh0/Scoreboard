import { IsIn, IsInt, IsString, Min, MinLength, ValidateIf } from 'class-validator';
import { EventType } from '../../queue.constants';

// Every event coming from the source is untrusted. Before it is allowed
// further into the system it must match this shape — anything that fails
// validation is discarded at the ingestion border, never enqueued.
export class EventDto {
  @IsInt()
  @Min(1)
  seq!: number;

  @IsString()
  @MinLength(1)
  matchId!: string;

  @IsIn(['kickoff', 'goal', 'card', 'halftime', 'fulltime'])
  type!: EventType;

  // team/player are only required for scoring events. For phase markers
  // (kickoff/halftime/fulltime) they are absent, so validation is skipped.
  @ValidateIf((e: EventDto) => e.type === 'goal' || e.type === 'card')
  @IsIn(['home', 'away'])
  team?: 'home' | 'away';

  @ValidateIf((e: EventDto) => e.type === 'goal' || e.type === 'card')
  @IsString()
  @MinLength(1)
  player?: string;

  @IsInt()
  @Min(0)
  minute!: number;
}
