import { Injectable } from '@nestjs/common';
import { EventJobData } from '../queue.constants';

// The phase a match is currently in.
export type MatchPhase = 'scheduled' | 'live' | 'halftime' | 'ended';

// The full live state of a match: score, phase and the current minute.
// Derived from the events the worker feeds in.
export interface MatchState {
  matchId: string;
  home: number;
  away: number;
  phase: MatchPhase;
  minute: number;
}

// Holds the live match state, derived from the events. For now it lives in
// memory (a Map). A restart loses it; a later stretch (Redis) would make it
// durable and rankable.
@Injectable()
export class ScoreboardService {
  private readonly states = new Map<string, MatchState>();

  // Apply one event to the match state and return the updated state.
  apply(event: EventJobData): MatchState {
    const state = this.states.get(event.matchId) ?? {
      matchId: event.matchId,
      home: 0,
      away: 0,
      phase: 'scheduled' as MatchPhase,
      minute: 0,
    };

    switch (event.type) {
      case 'kickoff':
        state.phase = 'live';
        state.minute = 0;
        break;
      case 'goal':
        if (event.team === 'home') state.home += 1;
        else if (event.team === 'away') state.away += 1;
        if (state.phase !== 'ended') state.phase = 'live';
        state.minute = event.minute;
        break;
      case 'card':
        if (state.phase !== 'ended') state.phase = 'live';
        state.minute = event.minute;
        break;
      case 'halftime':
        state.phase = 'halftime';
        state.minute = event.minute;
        break;
      case 'fulltime':
        state.phase = 'ended';
        state.minute = event.minute;
        break;
    }

    this.states.set(event.matchId, state);
    return state;
  }

  getState(matchId: string): MatchState {
    return (
      this.states.get(matchId) ?? {
        matchId,
        home: 0,
        away: 0,
        phase: 'scheduled',
        minute: 0,
      }
    );
  }
}
