import { Logger } from '@nestjs/common';
import {
  MessageBody,
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ScoreboardService, Score } from './scoreboard.service';

// The real-time edge of the system. Clients open a persistent WebSocket
// connection, "subscribe" to a match, and the server PUSHES the score to them
// whenever it changes — no polling. Each match is a socket.io "room", so a
// score update only reaches the clients watching that match.
@WebSocketGateway({ cors: { origin: '*' } })
export class ScoreboardGateway {
  private readonly logger = new Logger(ScoreboardGateway.name);

  // The underlying socket.io server, injected by Nest.
  @WebSocketServer() private readonly server!: Server;

  constructor(private readonly scoreboard: ScoreboardService) {}

  // A client asks to follow a match. We put its socket in that match's room
  // and immediately send the current score so it is not blank until the next
  // goal.
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() matchId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    const room = `match:${matchId}`;
    void client.join(room);
    const score = this.scoreboard.getScore(matchId);
    client.emit('score', score);
    this.logger.log(`client ${client.id} subscribed to ${room}`);
  }

  // Called by the worker after a processed event. Pushes the new score to
  // every client in that match's room.
  broadcastScore(score: Score): void {
    this.server.to(`match:${score.matchId}`).emit('score', score);
  }
}
