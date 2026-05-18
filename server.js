const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

let gameState = {
  calledNumbers: [],
  currentNumber: 0
};

// CONTROLLER KA NUMBER HOLD KARNE KE LIYE WAITING ROOM (BUFFER)
let pendingControllerNumber = null;

// 1 se 90 tak ke bache huye random numbers ka backup pool
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
  console.log('New device paired');

  // Initial setup board sync ke liye (Center empty)
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

      // STEP 1: Controller ne number enter kiya
      if (data.type === 'GENERATE_FINAL') {
        const num = parseInt(data.number);
        if (num > 0 && num <= 90 && !gameState.calledNumbers.includes(num)) {
          // STRICT RULE: Chupchaap server par hold karo, kisi ko broadcast mat karo!
          pendingControllerNumber = num; 
          console.log(`Controller locked number: ${num}. Waiting for Viewer to click Generate.`);
          
          // Controller app ko local confirmation bhej do ki number lock ho gaya hai
          ws.send(JSON.stringify({
            type: 'CONTROLLER_ACK',
            number: num
          }));
        }
      } 
      
      // STEP 2: Viewer ne GENERATE button click kiya
      else if (data.type === 'GENERATE') {
        let chosenNumber = 0;

        // Agar Controller ne pehle se koi number lock karke rakha hai, toh wahi uthao
        if (pendingControllerNumber !== null) {
          chosenNumber = pendingControllerNumber;
          pendingControllerNumber = null; // Use hone ke baad waiting room khali
        } 
        // Agar Controller ne koi number enter nahi kiya hai, toh system khud random generate karega
        else {
          let remainingPool = generateRemainingPool();
          if (remainingPool.length === 0) return;
          const randomIndex = Math.floor(Math.random() * remainingPool.length);
          chosenNumber = remainingPool[randomIndex];
        }

        if (chosenNumber > 0 && !gameState.calledNumbers.includes(chosenNumber)) {
          gameState.calledNumbers.push(chosenNumber);
          gameState.currentNumber = chosenNumber;

          console.log(`Viewer triggered generation. Displaying Number: ${chosenNumber}`);
          
          // AB DONO SCREENS PAR UTARega NUMBER
          broadcast({
            type: 'SERVER_REAL_TIME_CALL',
            number: chosenNumber,
            calledNumbers: gameState.calledNumbers
          });
        }
      } 
      
      // STEP 3: Reset game
      else if (data.type === 'RESET') {
        gameState = { calledNumbers: [], currentNumber: 0 };
        pendingControllerNumber = null;
        broadcast({ type: 'RESET' });
      }

    } catch (e) {
      console.error('Payload Error:', e);
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

console.log(`Housie Waiting-Queue Engine live on port ${PORT}`);
