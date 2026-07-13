import { Logger } from '@nestjs/common';
import {
  MessageBody,
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ScoreboardService, MatchState } from './scoreboard.service';
import { EventJobData } from '../queue.constants';

// The real-time edge of the system. Clients open a persistent WebSocket
// connection, "subscribe" to a match, and the server PUSHES an `update`
// whenever something happens — no polling. Each match is a socket.io "room",
// so an update only reaches the clients watching that match.
@WebSocketGateway({ cors: { origin: '*' } })
export class ScoreboardGateway {
  private readonly logger = new Logger(ScoreboardGateway.name);

  @WebSocketServer() private readonly server!: Server;

  constructor(private readonly scoreboard: ScoreboardService) {}

  // A client asks to follow a match. We put its socket in that match's room
  // and immediately send the current state so it is not blank until the next
  // event.
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() matchId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    const room = `match:${matchId}`;
    void client.join(room);
    const state = this.scoreboard.getState(matchId);
    client.emit('update', { state, event: null });
    this.logger.log(`client ${client.id} subscribed to ${room}`);
  }

  // Called by the worker after a processed event. Pushes the new state plus
  // the triggering event to every client in that match's room.
  broadcastUpdate(state: MatchState, event: EventJobData): void {
    this.server.to(`match:${state.matchId}`).emit('update', { state, event });
  }
}
