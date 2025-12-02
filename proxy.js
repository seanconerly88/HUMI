const http = require('http');
const httpProxy = require('http-proxy');

const METRO_URL = 'http://localhost:8081';

const proxy = httpProxy.createProxyServer({
  target: METRO_URL,
  ws: true,
  changeOrigin: true
});

const waitingPage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HUMI - Loading...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    h1 {
      font-size: 48px;
      margin-bottom: 20px;
      background: linear-gradient(90deg, #c4a35a, #d4af37);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(196, 163, 90, 0.3);
      border-top-color: #c4a35a;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 30px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    p {
      color: #aaa;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .status {
      color: #c4a35a;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>HUMI</h1>
    <div class="spinner"></div>
    <p>Starting the app...</p>
    <p class="status">Bundling modules, this takes about 15-20 seconds</p>
  </div>
  <script>
    let checkCount = 0;
    const maxChecks = 60;
    
    async function checkServer() {
      checkCount++;
      if (checkCount > maxChecks) {
        document.querySelector('.status').textContent = 'Taking longer than expected. Please refresh the page.';
        return;
      }
      
      try {
        const response = await fetch('/', { method: 'HEAD', cache: 'no-store' });
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && !contentType.includes('text/html')) {
          window.location.reload();
          return;
        }
        if (response.ok && contentType.includes('text/html')) {
          const text = await fetch('/').then(r => r.text());
          if (!text.includes('Starting the app')) {
            window.location.reload();
            return;
          }
        }
      } catch (e) {}
      
      setTimeout(checkServer, 1000);
    }
    
    setTimeout(checkServer, 2000);
  </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  proxy.web(req, res);
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (res.writeHead) {
    res.writeHead(200, { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(waitingPage);
  }
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Reverse proxy listening on http://0.0.0.0:5000');
  console.log('Forwarding to Expo web server at http://localhost:8081');
});
