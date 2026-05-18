const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

let gameState = {
  calledNumbers: [],
  currentNumber: 0
};

// 1 se 90 tak ki shuffle list generate karne ka helper function
function generateRemainingPool() {
  let pool = [];
  for (let i = 1; i <= 90; i++) {
    if (!gameState.calledNumbers.includes(i)) {
      pool.push(i);
    }
  }
  return pool;
}

wss.on('connection', (ws) => {
  console.log('Client synced successfully');

  // Connection par direct number display zero block rakhein
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

      // Centralized Generation Logic: Chahe Viewer dbae ya Controller, Server random choice karega!
      if (data.type === 'GENERATE' || data.type === 'CONFIRMED_GENERATION') {
        let remainingPool = generateRemainingPool();

        if (remainingPool.length === 0) {
          return; // Saare numbers khatam ho chuke hain
        }

        // Server khud real random index select karega
        const randomIndex = Math.floor(Math.random() * remainingPool.length);
        const chosenNumber = remainingPool[randomIndex];

        gameState.calledNumbers.push(chosenNumber);
        gameState.currentNumber = chosenNumber;

        // Ab poore network par state instantly update hogi
        broadcast({
          type: 'SERVER_REAL_TIME_CALL', 
          number: chosenNumber,
          calledNumbers: gameState.calledNumbers
        });

      } else if (data.type === 'RESET') {
        gameState = { calledNumbers: [], currentNumber: 0 };
        broadcast({ type: 'RESET' });
      }

    } catch (e) {
      console.error('Error:', e);
    }
  });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

console.log(`Centralized Housie Server running on port ${PORT}`);
