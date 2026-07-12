import { IsIn, IsInt, IsString, Min, MinLength } from 'class-validator';

// Every event coming from the source is untrusted. Before it is allowed
// further into the system it must match this exact shape — anything that
// fails validation is discarded at the ingestion border, never enqueued.
export class EventDto {
  @IsInt()
  @Min(1)
  seq!: number;

  @IsString()
  @MinLength(1)
  matchId!: string;

  @IsIn(['goal', 'card'])
  type!: 'goal' | 'card';

  @IsIn(['home', 'away'])
  team!: 'home' | 'away';

  @IsString()
  @MinLength(1)
  player!: string;

  @IsInt()
  @Min(0)
  minute!: number;
}
