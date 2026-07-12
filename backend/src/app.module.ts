import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { IngestionModule } from './ingestion/ingestion.module';

@Module({
  imports: [
    // Loads .env and makes ConfigService available everywhere.
    ConfigModule.forRoot({ isGlobal: true }),
    // Enables the timer infrastructure the poller registers into.
    ScheduleModule.forRoot(),
    IngestionModule,
  ],
})
export class AppModule {}
