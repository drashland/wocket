import { Client } from "./client.ts";
import { ITransmitterOptions } from "./interfaces.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";
import { Server } from "./server.ts";
import { Packet } from "./packet.ts";

export class Transmitter {
  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Queues the packets to be sent in order.
   *
   * @param packet - See Packet.
   */
  public async sendPackets(packets: Packet[]): Promise<void> {
  }

  /**
   * Hydrate the client with properties.
   *
   * @param clientId - The WebSocket connection ID of the client in question.
   */
  // public hydrateClient(clientId: number): void {
  //   if (this.reconnect) {
  //     this.server.clients[clientId].pong_received = true;
  //     this.server.clients[clientId].heartbeat_id = this.startHeartbeat(
  //       clientId,
  //     );
  //   }
  // }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Pings client at a set interval.
   *
   * @param clientId - The WebSocket connection ID of the client in question.
   */
  // private ping(clientId: number): void {
  //   if (this.server.clients[clientId]) {
  //     const client = this.server.clients[clientId];
  //     if (client.pong_received) {
  //       client.socket.send("ping");
  //       client.pong_received = false;
  //     } else {
  //       setTimeout(() => this.timeoutPing(clientId), this.ping_timeout);
  //     }
  //   }
  // }

  /**
   * Start a heartbeat for the client in question.
   *
   * @param clientId - The WebSocket connection ID of the client in question.
   *
   * @returns The heartbeat ID. This is used to clear a heartbeat in
   * timeoutPing().
   */
  // private startHeartbeat(clientId: number): number {
  //   const id = setInterval(() => this.ping(clientId), this.ping_interval);
  //   return id;
  // }

  /**
   * Pings client at a timeout. If client does not respond, client connection
   * will be removed.
   *
   * @param clientId - The WebSocket connection ID of the client in question.
   */
  // private timeoutPing(clientId: number): void {
  //   if (this.server.clients[clientId]) {
  //     this.server.removeClient(clientId);
  //     const heartbeatId = this.server.clients[clientId].heartbeat_id;
  //     if (heartbeatId) {
  //       clearInterval(heartbeatId);
  //     }
  //   }
  // }
}
