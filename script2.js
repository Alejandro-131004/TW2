const SERVER_URL = "ws://localhost:8008/"; // WebSocket server URL
let socket = null; // WebSocket instance
let currentGame = null; // Current game ID
let isJoining = false; // Prevent multiple join attempts

// Initialize WebSocket connection
function initWebSocket() {
    if (socket && socket.readyState !== WebSocket.CLOSED) {
        console.log("WebSocket already connected.");
        return;
    }

    socket = new WebSocket(SERVER_URL);

    socket.onopen = function () {
        console.log("Connected to WebSocket server.");
    };

    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);
        handleServerResponse(data);
    };

    socket.onclose = function () {
        console.log("Disconnected from WebSocket server.");
        socket = null; // Reset socket
    };

    socket.onerror = function (error) {
        console.error("WebSocket error:", error);
    };
}

// Send a message through WebSocket
function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Sending message:", message);
        socket.send(JSON.stringify(message));
    } else {
        console.error("WebSocket is not connected.");
    }
}

// Handle responses from the server
function handleServerResponse(data) {
    console.log("Received data from server:", data);

    if (!data.type) {
        console.warn("Missing 'type' field in server response:", data);
        return;
    }

    switch (data.type) {
        case "register":
            console.log(data.message || "Registration completed.");
            break;

        case "join":
            if (data.game) {
                console.log(`Joined game ${data.game.id} with players:`, data.game.players);
                currentGame = data.game.id;
                startGameIfReady(data.game);
            } else if (data.error) {
                console.error(`Join error: ${data.error}`);
                isJoining = false; // Allow retry
            }
            break;

        case "update":
            console.log("Game state updated:", data);
            updateBoard(data);
            break;

        case "notify":
            console.log("Move received:", data.move);
            applyMoveToBoard(data.move);
            break;

        default:
            console.warn("Unknown message type:", data.type, data);
    }
}


// Register a player
function register(nick, password) {
    const message = {
        type: "register",
        nick: nick,
        password: password
    };
    sendMessage(message);
}

// Join a game
function join(group, nick, password, size) {
    if (!nick || !password) {
        alert("Please log in before joining a game.");
        return;
    }

    if (isJoining) {
        console.warn("Already attempting to join a game.");
        return;
    }

    isJoining = true;

    const message = {
        type: "join",
        group: group,
        nick: nick,
        password: password,
        size: size
    };
    sendMessage(message);
}

// Leave a game
function leave(nick, password, game) {
    const message = {
        type: "leave",
        nick: nick,
        password: password,
        game: game
    };
    sendMessage(message);
    currentGame = null; // Clear current game
}

// Notify a move
function notify(nick, password, game, move) {
    const message = {
        type: "notify",
        nick: nick,
        password: password,
        game: game,
        move: move
    };
    sendMessage(message);
}

// Update game state
function update(game, nick) {
    const message = {
        type: "update",
        game: game,
        nick: nick
    };
    sendMessage(message);
}

// Start the game if players are ready
function startGameIfReady(game) {
    if (game.players.length === 2) {
        console.log("Game is ready to start with players:", game.players);
        initializeGameBoard(game.size, game.players);
    } else {
        console.log("Waiting for more players...");
    }
}



// Initialize the WebSocket connection when the script loads
initWebSocket();
