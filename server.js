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

  // Naya client connect hone pe current state bhejo
  ws.send(JSON.stringify({
    type: 'INIT',
    payload: gameState
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'GENERATE' || data.type === 'CONTROLLER_NUMBER') {
        // Number called — state update karo
        const num = data.number;
        if (!gameState.calledNumbers.includes(num)) {
          gameState.calledNumbers.push(num);
        }
        gameState.currentNumber = num;

        // Saare clients ko broadcast karo
        broadcast({
          type: 'NUMBER_CALLED',
          number: num,
          calledNumbers: gameState.calledNumbers
        });

      } else if (data.type === 'RESET') {
        gameState = { calledNumbers: [], currentNumber: 0, reset: true };
        broadcast({ type: 'RESET' });
      }

    } catch (e) {
      console.error('Error:', e);
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