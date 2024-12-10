const SERVER_URL = "ws://localhost:8008/"; // WebSocket server URL
let socket = null; // WebSocket instance
let playersReady = []; // List of players ready to play
let gameStarted = false; // Flag to prevent multiple game starts
let currentMatch2 = null; // Current match state
let matchTimeout = null; // Timeout for finding an opponent

// Initialize WebSocket connection
function initWebSocket() {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket(SERVER_URL);

        socket.onopen = function () {
            console.log("Connected to WebSocket server.");
        };

        socket.onmessage = function (event) {
            const data = JSON.parse(event.data);
            //console.log("Received data:", data);
            handleServerResponse(data);
        };

        socket.onclose = function () {
            console.log("Disconnected from WebSocket server.");
        };

        socket.onerror = function (error) {
            console.error("WebSocket error:", error);
        };
    } else {
        console.log("WebSocket is already open or in the process of connecting.");
    }
}
// Função para autenticar o jogador e exibir o menu de configurações

function register(nick, password) {
    const message = {
        type: "register",
        nick: nick,
        password: password
    };
    
    sendMessage(message); // Send the registration message
}

window.register = register;


// Send a message through WebSocket
function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Sending message:", JSON.stringify(message, null, 2)); // Pretty print the message
        socket.send(JSON.stringify(message));
    } else {
        console.error("WebSocket is not connected.");
    }
}

// Handle responses from the server
function handleServerResponse(data) {
    if (!data.type) {
        console.warn("Missing 'type' field in server response:", data);
        return;
    }

    switch (data.type) {
        case "join":
            handleJoinResponse(data);
            break;

        case "update":
            updateGameBoardFromServer(data);
            break;

        case "ready":
            handlePlayerReady(data);
            break;

        case "start":
            handleStartGame(data);
            break;
        
        case "register":
            console.log(`Registration successful (${data.status}): ${data.message}`);
            break;

        case "error":
            console.error(`Error (${data.status}): ${data.error}`);
            break;

        default:
            console.warn("Unknown message type:", data.type, data);
    }
}

async function initiateMatchmaking(firstPlayer, numSquares) {
    const nick = localStorage.getItem("nick");
    const password = localStorage.getItem("password");

    if (!nick || !password) {
        alert("Você precisa se autenticar antes de iniciar um jogo.");
        return;
    }

    const message = {
        type: "join",
        group: "default", // Use your preferred group name
        nick: nick,
        password: password,
        size: numSquares,
    };

    sendMessage(message);

    // Remove any previous socket onmessage handler to avoid duplicates
    socket.onmessage = function (event) {
        const response = JSON.parse(event.data);
        if (response.type === "waiting" && response.game) {
            currentMatch2 = response.game;
            checkForOpponentInScript2(response.game.id, firstPlayer, numSquares);
        } else if (response.error) {
            alert(`Erro ao entrar na partida: ${response.error}`);
        }
        // If the message is 'start', directly start the game
        else if (response.type === "start") {
            startGame(response.game, firstPlayer, numSquares);
        }
    };
}

// Check for an opponent
function checkForOpponentInScript2(gameId, preferredColor, numSquares) {
    console.log("Checking for opponent:", { gameId, preferredColor, numSquares });

    const timeoutDuration = 30000; // 30 seconds timeout

    matchTimeout = setTimeout(() => {
        alert("Nenhum oponente encontrado dentro do tempo limite.");
        console.log("Timeout reached: No opponent found.");
        leaveGame(gameId);
    }, timeoutDuration);

    // Wait for the 'start' signal from the WebSocket server
    socket.onmessage = function (event) {
        const message = JSON.parse(event.data);
        console.log("Message received from server:", message);

        if (message.type === "start") {
            console.log("Game is starting...");

            clearTimeout(matchTimeout);

            // Directly call startGame with the necessary data
            startGame(message.game, preferredColor, numSquares);
        }
    };
}

// Function to start the game
function startGame(gameState, preferredColor, numSquares) {
    // Assuming the message contains the game state
    console.log("Starting the game with the following data:", gameState);

    const opponentColor = gameState.players[0].color === preferredColor
        ? preferredColor === "red"
            ? "blue"
            : "red"
        : preferredColor;

    // Start the two-player game
    window.startTwoPlayerGame(preferredColor, opponentColor, numSquares);
}



// Start the two-player game


// Leave a game
function leaveGame(gameId) {
    const nick = localStorage.getItem("nick");
    const password = localStorage.getItem("password");

    if (!nick || !password || !gameId) {
        console.warn("Cannot leave game without proper authentication or game ID.");
        return;
    }

    const message = {
        type: "leave",
        nick: nick,
        password: password,
        game: gameId,
    };
    sendMessage(message);

    // Reset game state
    currentMatch2 = null;
    console.log("Left the game.");
}
function processPlayerAction(clickedCell, goalCell) {
    if (!clickedCell) {
        console.error("No cell was clicked.");
        return;
    }

    // Check if the game is in phase 1 based on goalCell
    if (goalCell.x === -1 && goalCell.y === -1) {
        console.log("Phase 1: Placing a piece.");
        // Call the placePiece function from another file
        window.placePiece(clickedCell);
    } else {
        console.log("Phase 2: Moving a piece.");
        // Check if the move is valid
        const isValid = window.isMoveValid(clickedCell, goalCell);

        if (isValid) {
            console.log("Move is valid. Sending to the server...");
            // Notify the server about the move
            const moveData = {
                from: clickedCell,
                to: goalCell,
            };
            notifyMoveToServer(moveData); // Assumes you have this function implemented

            // Call makeMove to update the local board state
            window.makeMove(clickedCell, goalCell);
        } else {
            console.error("Invalid move. Try again.");
        }
    }
}


window.processPlayerAction = processPlayerAction
// Initialize the WebSocket connection when the script loads
initWebSocket();
