
const EventEmitter = require('events');

class LogStreamer extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
  }

  addClient(res) {
    this.clients.add(res);
    
    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      level: 'info',
      message: 'Console backend connectée',
      service: 'nums3-backend',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Remove client when connection closes
    res.on('close', () => {
      this.clients.delete(res);
    });

    return res;
  }

  broadcast(logData) {
    const message = `data: ${JSON.stringify(logData)}\n\n`;
    
    this.clients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        this.clients.delete(client);
      }
    });
  }

  getClientCount() {
    return this.clients.size;
  }
}

const logStreamer = new LogStreamer();
module.exports = logStreamer;
