import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function localProxyPlugin(): Plugin {
  return {
    name: 'local-proxy-middleware',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        try {
          const parsed = new URL(req.url || '', 'http://localhost:5173');
          const targetUrl = parsed.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url query parameter');
            return;
          }

          // SSRF guard: reject private and loopback IPs
          const target = new URL(targetUrl);
          const host = target.hostname.toLowerCase();
          if (
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host === '::1' ||
            host === '169.254.169.254' ||
            host.startsWith('10.') ||
            host.startsWith('192.168.') ||
            host.endsWith('.local') ||
            host.endsWith('.internal')
          ) {
            res.statusCode = 403;
            res.end('SSRF: Access to private or loopback addresses is forbidden.');
            return;
          }

          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });

          res.statusCode = response.status;
          const contentType = response.headers.get('content-type');
          if (contentType) {
            res.setHeader('Content-Type', contentType);
          }
          res.setHeader('Access-Control-Allow-Origin', '*');

          const body = await response.text();
          res.end(body);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(`Proxy error: ${err.message}`);
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localProxyPlugin()],
  server: {
    port: 5173,
    open: true
  }
});

