import {deferred, Rhum} from "../../deps.ts";
import { Server } from "../../../src/server/server.ts";
import {WocketClient} from "../../../src/client/client.ts";

const configs = {
  hostname: "localhost",
  port: 1447
}

// const server = new Server()
// await server.run(configs)
// const p = deferred()
// server.on("chat", (packet) => {
//   p.resolve()
// })
// const client = new WocketClient(configs)
// await client.connect()
// client.connectTo(["chat"])
// client.to("chat", {
//   data: "hee"
// })
// await p
// await client.close()
// await server.close()

Rhum.testPlan("tests/unit/client/client_test.ts", () => {
  // Rhum.testSuite("constructor()", () => {
  //   Rhum.testCase("Sets the configs correctly w/options", async () => {
  //     const client = new WocketClient({
  //       hostname: "beeop boop",
  //       port: 1234,
  //       reconnect: false,
  //       protocol: "wss"
  //     })
  //     Rhum.asserts.assertEquals(client.configs, {
  //       hostname: "beeop boop",
  //       port: 1234,
  //       reconnect: false,
  //       protocol: "wss"
  //     })
  //   });
  //   Rhum.testCase("Sets the configs  correctly w/o options", () => {
  //     const client = new WocketClient({})
  //     Rhum.asserts.assertEquals(client.configs, {
  //       hostname: "localhost",
  //       port: 3000,
  //       reconnect: true,
  //       protocol: "ws"
  //     })
  //   })
  // });
  // Rhum.testSuite("connect()", () => {
  //   Rhum.testCase("Should connect to the server", async () => {
  //     const server = new Server()
  //     await server.run(configs)
  //     const client = new WocketClient(configs)
  //     await client.connect()
  //     Rhum.asserts.assertEquals(client.connection!.readyState, 1)
  //     await client.close()
  //     await server.close()
  //   })
  // })
  // Rhum.testSuite("to()", async () => {
  //   Rhum.testCase("Should send a message to the channel on the server", async () => {
  //     const server = new Server()
  //     await server.run(configs)
  //     const client = new WocketClient(configs)
  //     await client.connect()
  //     const p = deferred()
  //     server.on("chat", (packet) => {
  //       p.resolve(packet.message)
  //     })
  //     client.connectTo(["chat"])
  //     client.to("chat", {
  //       name: "Washington"
  //     })
  //     const message = await p
  //     console.log('closing cllientt in test')
  //     await client.close()
  //     await server.close()
  //     Rhum.asserts.assertEquals(message, {
  //       name: "Washington"
  //     })
  //   })
  // })
  // Rhum.testSuite("connectTo()", () => {
  //   Rhum.testCase("Should connect to the specified channels to allow sending messages", async () => {
  //     const server = new Server()
  //     await server.run(configs)
  //     const client = new WocketClient(configs)
  //     await client.connect()
  //     const p1 = deferred()
  //     server.on("chat", (packet) => {
  //       p1.resolve(packet.message)
  //     })
  //     const p2 = deferred()
  //     server.on("users", (packet) => {
  //       p2.resolve(packet.message)
  //     })
  //     client.connectTo(["chat", "users"])
  //     client.to("chat", {
  //       name: "Washington"
  //     })
  //     client.to("users", {
  //       notify: "Good day sir"
  //     })
  //     const message1 = await p1
  //     const message2 = await p2
  //     await client.close()
  //     await server.close()
  //     Rhum.asserts.assertEquals(message1, {
  //       name: "Washington"
  //     })
  //     Rhum.asserts.assertEquals(message2, {
  //       notify: "Good day sir"
  //     })
  //   })
  // })
  // Rhum.testSuite("close()", () => {
  //   Rhum.testCase("Should close the server", async () => {
  //     const server = new Server()
  //     await server.run(configs)
  //     const client = new WocketClient(configs)
  //     await client.connect()
  //     Rhum.asserts.assertEquals(client.connection!.readyState, 1)
  //     await client.close()
  //     Rhum.asserts.assertEquals(client.connection!.readyState, 3)
  //     await server.close()
  //   })
  // })
  Rhum.testSuite("connect()", () => {
    Rhum.testCase("Should connect to the server", async () => {
      const server = new Server()
      await server.run(configs)
      const c = new WocketClient()
      await c.connect({
        hostname: "localhost",
        port: 1447,
        protocol: "ws"
      }, [])
      Rhum.asserts.assertEquals(c.websocket!.readyState, 1)
      await c.close()
      await server.close()
    })
    Rhum.testCase("It should set the hostname to 'localhost' by default", async () => {
      const server = new Server()
      await server.run(configs)
      const c = new WocketClient()
      await c.connect({
        port: 1447,
        protocol: "ws"
      }, [])
      Rhum.asserts.assertEquals(c.websocket!.readyState, 1)
      await c.close()
      await server.close()
    })
    Rhum.testCase("It should set the protocol to  'ws' by default", async () => {
      const server = new Server()
      await server.run(configs)
      const c = new WocketClient()
      await c.connect({
        hostname: "localhost",
        port: 1447,
      }, [])
      Rhum.asserts.assertEquals(c.websocket!.readyState, 1)
      await c.close()
      await server.close()
    })
  })
  Rhum.testSuite("on()", () => {
    Rhum.testCase("Should register a listener and handle events for that channel", async () => {
      const server = new Server()
      await server.run(configs)
      server.on("chat", (packet) => {})
      server.on("users", (packet) => {})
      const c = new WocketClient()
      await c.connect({
        hostname: "localhost",
        port: 1447,
        protocol: "ws"
      }, ["chat"])
      const p = deferred()
      c.on("chat", (data) => {
        p.resolve(data)
      })
      Rhum.asserts.assertEquals(!!c.listeners["chat"], true)
      server.to("chat", {
        d: "dd"
      })
      await p
      const message = await p
      Rhum.asserts.assertEquals(message, {
        d: "dd"
      })
      await c.close()
      await server.close()
    })
  })
  Rhum.testSuite("to()", () => {
    Rhum.testCase("It should send a message to the socket server when connected to the channel", async () => {

    })
  })
});

Rhum.run();
