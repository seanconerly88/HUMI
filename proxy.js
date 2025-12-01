const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:8081',
  ws: true,
  changeOrigin: true
});

const server = http.createServer((req, res) => {
  proxy.web(req, res);
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Waiting for Expo web server to start...');
  }
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Reverse proxy listening on http://0.0.0.0:5000');
  console.log('Forwarding to Expo web server at http://localhost:8081');
});
