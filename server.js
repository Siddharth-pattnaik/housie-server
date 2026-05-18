const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// State ko clear rakhein
let gameState = {
  calledNumbers: [],
  currentNumber: 0
};

wss.on('connection', (ws) => {
  console.log('--- NEW CLIENT CONNECTED ---');

  // INIT ke waqt hum currentNumber ko strictly 0 bhej rahe hain taaki direct flash na ho
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
      console.log(`[RECEIVED EVENT]: Type = ${data.type}, Number = ${data.number}`);

      // Sirf actual button press hone par hi forward hoga
      if (data.type === 'GENERATE' || data.type === 'CONFIRMED_GENERATION') {
        const num = data.number;
        
        if (!gameState.calledNumbers.includes(num)) {
          gameState.calledNumbers.push(num);
        }
        gameState.currentNumber = num;

        console.log(`[BROADCASTING]: Sending SERVER_REAL_TIME_CALL for Number ${num}`);
        broadcast({
          type: 'SERVER_REAL_TIME_CALL', 
          number: num,
          calledNumbers: gameState.calledNumbers
        });

      } else if (data.type === 'RESET') {
        console.log('--- GAME RESET TRIGGERED ---');
        gameState = { calledNumbers: [], currentNumber: 0 };
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

console.log(`Housie Server running on port ${PORT}`);
