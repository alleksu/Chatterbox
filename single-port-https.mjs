import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

// Accept normal browser links and TLS on one port. Plain HTTP only redirects;
// accounts, cookies, chat and files are still handled exclusively over HTTPS.
export function createSinglePortHttpsServer(options, requestHandler) {
  const secure = https.createServer(options, requestHandler);
  const redirect = http.createServer({
    requestTimeout: options.requestTimeout,
    headersTimeout: options.headersTimeout,
  }, (req, res) => {
    let target;
    try {
      const host = req.headers.host;
      if (!host || /[\s/\\@?#]/.test(host) || !req.url.startsWith('/')) throw new Error('Invalid address');
      const origin = new URL(`https://${host}`);
      target = new URL(req.url, origin);
      if (target.origin !== origin.origin) throw new Error('Invalid redirect');
      target.port = String(req.socket.localPort);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', Connection: 'close' });
      res.end('Invalid Chatterbox address.');
      return;
    }

    const navigation = req.method === 'GET' || req.method === 'HEAD';
    res.writeHead(navigation ? 308 : 426, {
      Location: target.href,
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      Connection: 'close',
    });
    res.end(navigation ? `Opening Chatterbox: ${target.href}` : 'Open Chatterbox using HTTPS before signing in.');
  });

  const server = net.createServer((socket) => {
    const timeout = setTimeout(() => socket.destroy(), options.headersTimeout || 15000).unref();
    // A browser may abandon a connection before sending any bytes.
    socket.on('error', () => {});
    socket.once('close', () => clearTimeout(timeout));
    socket.once('data', (chunk) => {
      clearTimeout(timeout);
      socket.pause();
      socket.unshift(chunk);
      // A TLS ClientHello starts with the handshake record type (22).
      if (chunk[0] === 22) {
        // TLS takes ownership of the paused socket, including buffered bytes.
        secure.emit('connection', socket);
      } else {
        redirect.emit('connection', socket);
        socket.resume();
      }
    });
  });

  server.on('listening', () => {
    // Initialise HTTP connection tracking/timeouts for both protocol handlers.
    secure.emit('listening');
    redirect.emit('listening');
  });
  const close = server.close.bind(server);
  server.close = (callback) => {
    secure.closeIdleConnections();
    redirect.closeIdleConnections();
    return close(callback);
  };
  server.on('close', () => {
    secure.close(() => {});
    redirect.close(() => {});
  });
  return server;
}
