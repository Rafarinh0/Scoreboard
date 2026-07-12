import { Injectable } from '@nestjs/common';
import { EventSource, RawEvent } from '../event-source';

// Placeholder for a future real sports API (stretch goal in the guide).
// It implements the same interface, so swapping to it is a config change only.
@Injectable()
export class RealSourceService implements EventSource {
  async fetchEvents(
    _matchId: string,
    _since: number,
  ): Promise<{ events: RawEvent[]; cursor: number }> {
    throw new Error('RealSourceService not implemented yet (stretch goal).');
  }
}
