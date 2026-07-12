import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EVENT_SOURCE } from './event-source';
import { SimulatedSourceService } from './sources/simulated-source.service';
import { RealSourceService } from './sources/real-source.service';
import { PollerService } from './poller.service';

@Module({
  imports: [HttpModule],
  providers: [
    SimulatedSourceService,
    RealSourceService,
    // Factory provider: this is where "swap the source by config" happens.
    // Whoever injects EVENT_SOURCE gets the implementation chosen by the
    // EVENT_SOURCE env var — no downstream code knows which one it is.
    {
      provide: EVENT_SOURCE,
      inject: [ConfigService, SimulatedSourceService, RealSourceService],
      useFactory: (
        config: ConfigService,
        simulated: SimulatedSourceService,
        real: RealSourceService,
      ) => {
        const choice = config.get<string>('EVENT_SOURCE', 'simulated');
        return choice === 'real' ? real : simulated;
      },
    },
    PollerService,
  ],
})
export class IngestionModule {}
