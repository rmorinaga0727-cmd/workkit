const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const indexPath = path.join(__dirname, '..', 'index.html');
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost:4173').pathname;
  if (pathname !== '/' && pathname !== '/index.html') {
    res.writeHead(404).end();
    return;
  }
  fs.readFile(indexPath, (error, content) => {
    if (error) {
      res.writeHead(500).end('Unable to read index.html');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  });
}).listen(4173, '127.0.0.1');
