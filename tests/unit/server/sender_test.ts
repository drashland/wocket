import { Rhum } from "../../deps.ts";

const ClientSocket = () => {
  return {
    send: () => true,
    close: () => true,
  };
};

Rhum.testPlan("unit/sender_test.ts", () => {
  Rhum.testSuite("add()", () => {
    // Unable to test, as `packet_queue` property is private
    // Rhum.testCase("Pushes a new packet queue item", () => {
    //   const sender = new Sender()
    //   const client = new Client(1, ClientSocket() as unknown as WebSocket)
    //   const packet = new Packet(
    //       client,
    //       "The moon",
    //       "Hello, I am a message"
    //   )
    //   const channel = new Channel("my channel");
    //   Rhum.asserts.assert(sender.packet_queue.length, 0)
    //   sender.add(packet, channel)
    //   Rhum.asserts.assert(sender.packet_queue.length, 1)
    // })

    // TODO(edward) How can we create a client to listen on the message sent?
    // Rhum.testCase("Sends an event", () => {
    //
    // })
  });

  // Cannot test as  the  method is private
  // Rhum.testSuite("send()", () => {
  //
  // })
});

Rhum.run();
