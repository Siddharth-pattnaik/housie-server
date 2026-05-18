const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

let gameState = {
  calledNumbers: [],
  currentNumber: 0
};

// Controller ka number hold karne ke liye central cache reference buffer
let pendingControllerNumber = null;

wss.on('connection', (ws) => {
  console.log('Device paired successfully');

  // Initial deep block: startup screen clear out locked
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

      // STEP 1: Controller inputs processing
      if (data.type === 'GENERATE_FINAL') {
        const num = parseInt(data.number);
        if (num > 0 && num <= 90 && !gameState.calledNumbers.includes(num)) {
          pendingControllerNumber = num; 
          console.log(`Controller buffer locked number: ${num}`);
          
          ws.send(JSON.stringify({
            type: 'CONTROLLER_ACK',
            number: num
          }));
        }
      } 
      
      // STEP 2: Viewer action interceptor execution
      else if (data.type === 'GENERATE') {
        let chosenNumber = 0;

        // Priority validation routing: Pehle check karo buffer me koi selection pending hai ya nahi
        if (pendingControllerNumber !== null) {
          chosenNumber = pendingControllerNumber;
          pendingControllerNumber = null; // Flush cache pointer instantly
        } else {
          // Agar queue empty hai toh Viewer ka apna payload handle karo
          chosenNumber = parseInt(data.number);
        }

        if (chosenNumber > 0 && chosenNumber <= 90 && !gameState.calledNumbers.includes(chosenNumber)) {
          gameState.calledNumbers.push(chosenNumber);
          gameState.currentNumber = chosenNumber;

          console.log(`Broadcasting Confirmed Action: ${chosenNumber}`);
          broadcast({
            type: 'SERVER_REAL_TIME_CALL',
            number: chosenNumber,
            calledNumbers: gameState.calledNumbers
          });
        }
      } 
      
      // STEP 3: Reset system execution
      else if (data.type === 'RESET') {
        gameState = { calledNumbers: [], currentNumber: 0 };
        pendingControllerNumber = null;
        broadcast({ type: 'RESET' });
      }

    } catch (e) {
      console.error(e);
    }
  });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

console.log(`Queue Server listening on port ${PORT}`);
