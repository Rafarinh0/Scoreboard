import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // From Stage 5 the backend is a real server: NestFactory.create starts an
  // HTTP server that socket.io attaches to, so clients can open WebSocket
  // connections. The poller and worker still run inside the same process.
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Backend listening on http://localhost:${port} (WebSocket ready)`, 'Bootstrap');
}

void bootstrap();
