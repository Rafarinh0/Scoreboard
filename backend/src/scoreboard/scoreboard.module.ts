import { Module } from '@nestjs/common';
import { ScoreboardService } from './scoreboard.service';
import { ScoreboardGateway } from './scoreboard.gateway';

@Module({
  providers: [ScoreboardService, ScoreboardGateway],
  // Exported so the worker (processing) can update the score and push it.
  exports: [ScoreboardService, ScoreboardGateway],
})
export class ScoreboardModule {}
