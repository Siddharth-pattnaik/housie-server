const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

let gameState = {
  calledNumbers: [],
  currentNumber: 0,
  reset: false
};

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Naya client connect hone pe current state sync bhejo
  ws.send(JSON.stringify({
    type: 'INIT',
    payload: gameState
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // FIXED: 'CONTROLLER_NUMBER' hata kar ab yahan 'GENERATE_FINAL' map kiya hai
      if (data.type === 'GENERATE' || data.type === 'GENERATE_FINAL') {
        const num = data.number;
        
        // Number check karke state update karo
        if (!gameState.calledNumbers.includes(num)) {
          gameState.calledNumbers.push(num);
        }
        gameState.currentNumber = num;

        // Saare clients ko broadcast karo (Housie rules dynamic broadcast)
        // Note: Controller aur Viewer dono is 'GENERATE_FINAL' ko accept karenge aur red mark karenge
        broadcast({
          type: 'GENERATE_FINAL', 
          number: num,
          calledNumbers: gameState.calledNumbers
        });

      } else if (data.type === 'RESET') {
        gameState = { calledNumbers: [], currentNumber: 0, reset: true };
        broadcast({ type: 'RESET' });
      }

    } catch (e) {
      console.error('Error handling message:', e);
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      
      client.send(msg);
    }
  });
}

console.log(`Housie WebSocket Server running on port ${PORT}`);
