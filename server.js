const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

let gameState = {
  calledNumbers: [],
  currentNumber: 0
};

// 1 se 90 tak ke bache huye numbers nikalne ke liye
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
  console.log('New device connected to Housie Server');

  // Strict initial handshake: App open hote hi center circle 0 (Blank) rahega
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
      console.log(`Received payload event type: ${data.type}`);

      // FIXED CONDITION MATCHING FOR BOTH CLIENTS
      if (data.type === 'GENERATE' || data.type === 'GENERATE_FINAL') {
        let chosenNumber = 0;

        // Case A: Controller ne manually board se select karke bheja hai
        if (data.number && data.number > 0) {
          chosenNumber = parseInt(data.number);
        } 
        // Case B: Viewer ne direct generation request bheji hai (Random pool)
        else {
          let remainingPool = generateRemainingPool();
          if (remainingPool.length === 0) return;
          const randomIndex = Math.floor(Math.random() * remainingPool.length);
          chosenNumber = remainingPool[randomIndex];
        }

        if (chosenNumber > 0 && chosenNumber <= 90) {
          if (!gameState.calledNumbers.includes(chosenNumber)) {
            gameState.calledNumbers.push(chosenNumber);
          }
          gameState.currentNumber = chosenNumber;

          console.log(`Broadcasting Confirmed Number: ${chosenNumber}`);
          
          // Dono devices ko central signal broadcast karo
          broadcast({
            type: 'SERVER_REAL_TIME_CALL',
            number: chosenNumber,
            calledNumbers: gameState.calledNumbers
          });
        }

      } else if (data.type === 'RESET') {
        console.log('Game state fully wiped out');
        gameState = { calledNumbers: [], currentNumber: 0 };
        broadcast({ type: 'RESET' });
      }

    } catch (e) {
      console.error('Payload processing crashed:', e);
    }
  });

  ws.on('close', () => console.log('Device disconnected'));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

console.log(`Housie Micro-Engine running strictly on port ${PORT}`);
