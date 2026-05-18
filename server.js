const WebSocket = require('ws');

// Port configure karein Render environment ke liye
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Server-side Game State memory storage
let gameState = {
  calledNumbers: [],
  currentNumber: 0
};

wss.on('connection', (ws) => {
  console.log('New client connected successfully');

  // FIXED INITIAL HANDSHAKE:
  // Jab naya Viewer connect hoga, toh hum 'currentNumber' ko hamesha 0 (khali) bhejenge.
  // Is se Viewer open karte hi screen par direct purana number flash hona band ho jayega!
  ws.send(JSON.stringify({
    type: 'INIT',
    payload: {
      calledNumbers: gameState.calledNumbers,
      currentNumber: 0 
    }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // STRICT ACTION CHECK:
      // Server sirf tabhi reaction dega jab click CONFIRMED hoga (Generate button press hoga)
      if (data.type === 'GENERATE' || data.type === 'CONFIRMED_GENERATION') {
        const num = data.number;
        
        // Memory list state backup check
        if (!gameState.calledNumbers.includes(num)) {
          gameState.calledNumbers.push(num);
        }
        gameState.currentNumber = num;

        // Pure network par sirf authenticated 'SERVER_REAL_TIME_CALL' token broadcast hoga
        broadcast({
          type: 'SERVER_REAL_TIME_CALL', 
          number: num,
          calledNumbers: gameState.calledNumbers
        });

      } else if (data.type === 'RESET') {
        // Full Reset execution clear stack
        gameState = { calledNumbers: [], currentNumber: 0 };
        broadcast({ type: 'RESET' });
      }

    } catch (e) {
      console.error('Error processing network payload:', e);
    }
  });

  ws.on('close', () => console.log('Client disconnected from server'));
});

// Broadcast function global network distribution ke liye
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

console.log(`Housie Micro-Server running on port ${PORT}`);
