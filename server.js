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

  // FIXED: Naya client connect hone par hum 'currentNumber' ko hamesha 0 bhejenge
  // Is se Viewer app open karte hi beech ka circle ekdum khali (Blank) rahega!
  ws.send(JSON.stringify({
    type: 'INIT',
    payload: {
      calledNumbers: gameState.calledNumbers,
      currentNumber: 0, // <--- Yeh line automatic direct dikhana band kar degi!
      reset: gameState.reset
    }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Dono apps se aane wale data ko accept karo
      if (data.type === 'GENERATE' || data.type === 'GENERATE_FINAL' || data.type === 'CONTROLLER_NUMBER') {
        const num = data.number;
        
        if (!gameState.calledNumbers.includes(num)) {
          gameState.calledNumbers.push(num);
        }
        gameState.currentNumber = num;

        // Jab sahi me click hoga, tabhi naya update broadcast hoga
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
