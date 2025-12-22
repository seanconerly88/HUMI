const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

const METRO_URL = 'http://localhost:8081';

const proxy = httpProxy.createProxyServer({
  target: METRO_URL,
  ws: true,
  changeOrigin: true
});

const waitingPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>HUMI - Digital Cigar Lounge</title>
  <meta name="theme-color" content="#8B4513">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="HUMI">
  <link rel="manifest" href="/manifest.json">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      -webkit-font-smoothing: antialiased;
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
    <p>Starting the Digital Cigar Lounge...</p>
    <p class="status">Preparing your experience, this takes about 15-20 seconds</p>
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
          if (!text.includes('Starting the Digital Cigar Lounge')) {
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

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function serveStaticFile(filePath, res) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      return false;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400'
    });
    res.end(data);
    return true;
  });
  return true;
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  
  if (url === '/manifest.json') {
    const filePath = path.join(__dirname, 'public', 'manifest.json');
    if (fs.existsSync(filePath)) {
      return serveStaticFile(filePath, res);
    }
  }
  
  if (url === '/service-worker.js') {
    const filePath = path.join(__dirname, 'public', 'service-worker.js');
    if (fs.existsSync(filePath)) {
      return serveStaticFile(filePath, res);
    }
  }
  
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
  console.log('HUMI Digital Cigar Lounge');
  console.log('Reverse proxy listening on http://0.0.0.0:5000');
  console.log('Forwarding to Expo web server at http://localhost:8081');
  console.log('PWA manifest available at /manifest.json');
  console.log('Service worker available at /service-worker.js');
});
