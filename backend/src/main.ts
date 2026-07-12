import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // For Stage 2 we don't expose HTTP endpoints yet; the app runs the poller
  // as a background worker. createApplicationContext boots the DI container
  // without an HTTP server.
  const app = await NestFactory.createApplicationContext(AppModule);
  // Ensure onModuleDestroy (timer cleanup) runs on Ctrl+C / SIGTERM.
  app.enableShutdownHooks();
  Logger.log('Backend up — ingestion poller running.', 'Bootstrap');
}

void bootstrap();
