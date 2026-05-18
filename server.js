const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

let gameState = {
  calledNumbers: [],
  currentNumber: 0
};

// Bache huye numbers ka pool nikalne ke liye
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
  console.log('Device connected successfully');

  // Initial Sync: Naye connection par board sync hoga par center empty rahega
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

      // CASE 1: Sirf jab Viewer ka GENERATE button click hoga, tabhi naya number banega
      if (data.type === 'GENERATE') {
        let remainingPool = generateRemainingPool();
        if (remainingPool.length === 0) return;

        const randomIndex = Math.floor(Math.random() * remainingPool.length);
        const chosenNumber = remainingPool[randomIndex];

        gameState.calledNumbers.push(chosenNumber);
        gameState.currentNumber = chosenNumber;

        // Dono apps ko pata chalega ki VIEWER NE CLICK KIYA HAI aur naya number aaya hai
        broadcast({
          type: 'NUMBER_GENERATED_BY_VIEWER',
          number: chosenNumber,
          calledNumbers: gameState.calledNumbers
        });
      } 
      
      // CASE 2: Controller se aane wala data (Sirf grid updates ke liye, center circle ke liye nahi)
      else if (data.type === 'GENERATE_FINAL') {
        const num = parseInt(data.number);
        if (num > 0 && num <= 90) {
          if (!gameState.calledNumbers.includes(num)) {
            gameState.calledNumbers.push(num);
          }
          // Note: Hum gameState.currentNumber ko Controller ke data se update nahi kar rahe hain!
          
          broadcast({
            type: 'CONTROLLER_GRID_SYNC',
            number: num,
            calledNumbers: gameState.calledNumbers
          });
        }
      } 
      
      // CASE 3: Reset game
      else if (data.type === 'RESET') {
        gameState = { calledNumbers: [], currentNumber: 0 };
        broadcast({ type: 'RESET' });
      }

    } catch (e) {
      console.error('Error handling message:', e);
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

console.log(`Housie Engine working fine on port ${PORT}`);
