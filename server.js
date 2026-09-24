const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      await handle(req, res, parse(req.url, true));
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end("internal error");
    }
  }).listen(port, hostname, () => {
    console.log(`TECHPODIO listening on ${port}`);
  });
});
