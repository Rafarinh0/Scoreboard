import { Module } from '@nestjs/common';
import { ScoreboardService } from './scoreboard.service';

@Module({
  providers: [ScoreboardService],
  // Exported so the worker (processing) can update the score.
  exports: [ScoreboardService],
})
export class ScoreboardModule {}
