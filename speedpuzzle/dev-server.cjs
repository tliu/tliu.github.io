/* Minimal static server for local development. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname);
const port = Number(process.env.PORT) || 8765;
const host = "0.0.0.0";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

const server = http.createServer((req, res) => {
  let pathname = new URL(req.url, "http://x").pathname.replace(/^\/+/, "");
  if (!pathname) pathname = "index.html";
  const file = path.resolve(root, pathname);
  const rel = path.relative(root, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    return res.end("Not found");
  }
  const ext = path.extname(file);
  res.setHeader("Content-Type", types[ext] || "application/octet-stream");
  res.end(fs.readFileSync(file));
});

server.listen(port, host, () => {
  console.log(`Serving ${root}`);
  console.log(`http://127.0.0.1:${port}/`);
  console.log(`http://localhost:${port}/`);
});
