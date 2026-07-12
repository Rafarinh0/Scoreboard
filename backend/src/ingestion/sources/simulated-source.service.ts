import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { EventSource, RawEvent } from '../event-source';

// Concrete EventSource that consumes the Stage 1 mock-events-api over HTTP.
@Injectable()
export class SimulatedSourceService implements EventSource {
  private readonly logger = new Logger(SimulatedSourceService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('MOCK_EVENTS_API_URL', 'http://localhost:4000');
  }

  async fetchEvents(
    matchId: string,
    since: number,
  ): Promise<{ events: RawEvent[]; cursor: number }> {
    const url = `${this.baseUrl}/matches/${matchId}/events`;
    // firstValueFrom turns Nest's Observable-based HTTP call into a Promise.
    const response = await firstValueFrom(
      this.http.get<{ events: RawEvent[]; cursor: number }>(url, { params: { since } }),
    );
    return response.data;
  }
}
