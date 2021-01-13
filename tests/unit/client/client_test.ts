import {deferred, Rhum} from "../../deps.ts";
import WocketClient from "../../../src/client/client.ts";
import { Server } from "../../../src/server/server.ts";

const configs = {
  hostname: "localhost",
  port: 1447
}

Rhum.testPlan("tests/unit/client/client_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase("Sets the configs and properties correctly", async () => {
      const server = new Server()
      await server.run(configs)
      const p = deferred()
      server.on("chat", (packet) => {
        console.log('dataaaa')
        p.resolve()
      })
      const client = new WocketClient(configs)
      await client.connect()
      client.connectTo(["chat"])
      client.to("chat", {
        data: "hee"
      })
      await p
      //Rhum.asserts.assertEquals(Cl.name, "my channel");
      //Rhum.asserts.assertEquals(channel.listeners, {});
      //Rhum.asserts.assertEquals(channel.callbacks, []);
    });
  });
});

Rhum.run();
