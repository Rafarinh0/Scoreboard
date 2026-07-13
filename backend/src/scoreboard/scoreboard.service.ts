import { Injectable } from '@nestjs/common';
import { EventJobData } from '../queue.constants';

// The current score of a match: goals for each side.
export interface Score {
  matchId: string;
  home: number;
  away: number;
}

// Holds the live scoreboard state, derived from the events the worker feeds
// it. For now it lives in memory (a Map). A restart loses it; a later stretch
// (Redis sorted set / Mongo aggregation) would make it durable and rankable.
@Injectable()
export class ScoreboardService {
  private readonly scores = new Map<string, Score>();

  // Apply one event to the scoreboard and return the updated score.
  // Only goals change the score; cards are recorded in Mongo but do not.
  apply(event: EventJobData): Score {
    const score = this.scores.get(event.matchId) ?? {
      matchId: event.matchId,
      home: 0,
      away: 0,
    };

    if (event.type === 'goal') {
      if (event.team === 'home') score.home += 1;
      else score.away += 1;
    }

    this.scores.set(event.matchId, score);
    return score;
  }

  getScore(matchId: string): Score {
    return this.scores.get(matchId) ?? { matchId, home: 0, away: 0 };
  }
}
