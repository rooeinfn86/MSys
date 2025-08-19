const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');

// Disable IPv6 for the entire Node.js process
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';

module.exports = function(app) {
  // PROXY DISABLED - Using direct API calls to cloud backend via REACT_APP_BACKEND_URL
  // The proxy configuration below is commented out to allow the axios instance
  // to make direct calls to the cloud backend specified in .env file
  
  /*
  const proxyOptions = {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    ws: true,
    xfwd: true,
    // Force IPv4 only
    agent: new http.Agent({
      keepAlive: true,
      family: 4,
      keepAliveMsecs: 1000,
      maxSockets: 10,
      maxFreeSockets: 10,
    }),
    // Additional options to prevent IPv6
    followRedirects: true,
    autoRewrite: true,
    protocolRewrite: 'http',
    onProxyReq: function(proxyReq, req, res) {
      // Force IPv4 in the request
      proxyReq.setHeader('host', '127.0.0.1:8000');
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    },
    onError: function(err, req, res) {
      console.error('Proxy Error:', err);
      if (res && !res.headersSent) {
        res.status(500).send('Something went wrong while connecting to the backend server.');
      }
    },
    onProxyReqWs: function(proxyReq, req, socket, options, head) {
      // Handle WebSocket connections
      socket.on('error', function(err) {
        console.error('WebSocket Error:', err);
        // Don't try to reconnect immediately
        socket.destroy();
      });

      // Handle WebSocket close events
      socket.on('close', function() {
        console.log('WebSocket connection closed');
      });
    },
    // Add retry logic for failed connections
    retry: {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 5000,
      randomize: true
    }
  };

  app.use(
    '/api',
    createProxyMiddleware(proxyOptions)
  );

  app.use(
    '/ws',
    createProxyMiddleware({
      ...proxyOptions,
      ws: true,
      changeOrigin: true,
      logLevel: 'debug'
    })
  );
  */
}; 