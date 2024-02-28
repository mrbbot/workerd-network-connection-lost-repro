import assert from "node:assert";
import events from "node:events";
import childProcess from "node:child_process";
import workerd from "workerd";

function spawnWorkerd(configPath, port) {
  return new Promise((resolve) => {
    const workerdProcess = childProcess.spawn(
      workerd.default,
      ["serve", "--control-fd=3", `--socket-addr=http=127.0.0.1:${port}`, configPath],
      { stdio: ["inherit", "inherit", "inherit", "pipe"] }
    );
    const exitPromise = events.once(workerdProcess, "exit");
    workerdProcess.stdio[3].on("data", (chunk) => {
      const message = JSON.parse(chunk.toString().trim());
      assert.strictEqual(message.event, "listen");
      resolve({
        url: new URL(`http://127.0.0.1:${message.port}`),
        async kill() {
          workerdProcess.kill("SIGKILL");
          await exitPromise;
        }
      });
    });
  })
}

// Start user worker and proxy worker on random ports
const user = await spawnWorkerd("user.capnp", "0");
const proxy = await spawnWorkerd("proxy.capnp", "0");

const body = new Uint8Array(200_000);
const totalRequests = 10;
let successfulRequests = 0;

try {
  // Send requests to user worker through the proxy worker
  for (let i = 0; i < totalRequests; i++) {
    const res = await fetch(proxy.url, {
      method: "POST",
      headers: { Target: user.url.href },
      body,
    });
    if (res.ok) successfulRequests++;
  }

  assert.strictEqual(
    successfulRequests, totalRequests,
    "Expected all requests to be successful"
  );
} finally {
  await user.kill();
  await proxy.kill();
}
