import { Rhum } from "../deps.ts";
import {
  Client,
  EventEmitter,
  Packet,
  Server,
  Transmitter,
} from "../../mod.ts";
import { WebSocket } from "../../deps.ts";

const ClientSocket = () => {
  return {
    send: () => true,
    close: () => true,
  };
};

Rhum.testPlan("unit/transmitter_test.ts", () => {
  // Unable to test as properties are private
  // Rhum.testSuite("constructor()", () => {
  //   Rhum.testCase("Sets the properties", () => {
  //     const server = new Server();
  //     const transmitter = new Transmitter(server, {
  //       reconnect: false,
  //       ping_interval: 100000,
  //       ping_timeout: 40000
  //     })
  //     // ... assert the properties
  //   })
  // });

  // TODO(edward) Not sure how best to unit test this
  // Rhum.testSuite("handlePacket()", () => {
  //   Rhum.testCase("Handles a reserved event type differently", async () => {
  //     const server = new Server()
  //     const transmitter = new Transmitter(server)
  //     const client = new Client(1, ClientSocket() as unknown as WebSocket)
  //     const packet = new Packet(client, "the to", "hello");
  //     await transmitter.handlePacket(packet)
  //   })
  //   Rhum.testCase("Calls the cb's when the channel exists for the packet", () => {
  //
  //   })
  //   Rhum.testCase("Throws an error when the channel for the packet was not found", () => {
  //
  //   })
  // })

  // TODO(edward) Not sure how best to unit test this
  // Rhum.testSuite("handleReservedEvent()", () => {
  //   Rhum.testCase("Calls all cb's on channel when event is disconnected", () => {
  //
  //   })
  //   Rhum.testCase("Sends an error if event is error", () => {
  //
  //   })
  //   Rhum.testCase("Pong received for a valid connected client", () => {
  //
  //   })
  // })

  // TODO(edward) Not sure how best to unit test this
  // Rhum.testSuite("hydrateClient()", () => {
  //   Rhum.testCase("Starts a heartbeat and returns the id", async () => {
  //     const server = new Server()
  //     const io = new EventEmitter()
  //     const client = io.createClient(1337, ClientSocket() as unknown as WebSocket)
  //     await io.addClientToChannel("My channel", client.id)
  //     const transmitter = new Transmitter(server)
  //     transmitter.hydrateClient(2)
  //   })
  // })

  // Unable to test as it is private
  // Rhum.testSuite("ping()", () => {
  //   Rhum.testCase("Pings a client when a pong hasn't been received", () => {
  //
  //   })
  //   Rhum.testCase("Sends a ping after a set time when a pong has been received", () => {
  //
  //   })
  // })

  // Unable to test as it's a private method
  Rhum.testSuite("startHeartbeat()", () => {
  });
  // Unable to test as it's a private test
  Rhum.testSuite("timeoutPing()", () => {
  });
});

Rhum.run();
