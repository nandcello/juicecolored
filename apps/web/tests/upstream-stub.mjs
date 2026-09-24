// Echoes each request so proxy tests can assert what reached the upstream app.
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 4390);

createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  response.writeHead(200, { "content-type": "application/json", "x-upstream-stub": "1" });
  response.end(
    JSON.stringify({
      method: request.method,
      url: request.url,
      body: Buffer.concat(chunks).toString("utf8"),
    }),
  );
}).listen(port, "127.0.0.1");
