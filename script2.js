const SERVER_URL = "ws://localhost:8008/"; // WebSocket server running locally

let socket = null;

// Initialize WebSocket connection
function initWebSocket() {
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
    };

    socket.onerror = function (error) {
        console.error("WebSocket error:", error);
    };
}

// Send a message through WebSocket
function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        console.error("WebSocket is not connected.");
    }
}

// Handle responses from the server
function handleServerResponse(data) {
    // Implement specific handling based on server messages
    console.log("Received data from server:", data);
}

// Functions for game logic
function register(nick, password) {
    const message = {
        type: "register",
        nick: nick,
        password: password
    };
    sendMessage(message);
}

function join(group, nick, password, size) {
    const message = {
        type: "join",
        group: group,
        nick: nick,
        password: password,
        size: size
    };
    sendMessage(message);
}

function leave(nick, password, game) {
    const message = {
        type: "leave",
        nick: nick,
        password: password,
        game: game
    };
    sendMessage(message);
}

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

function update(game, nick, onUpdate, onError) {
    const message = {
        type: "update",
        game: game,
        nick: nick
    };
    sendMessage(message);

    // The `onUpdate` and `onError` can be handled in `handleServerResponse`
    // based on the server's response.
}

// Initialize the WebSocket connection when the script loads
initWebSocket();


register("player1", "securePassword123").then(response => {
    console.log("Registration successful:", response);
});


join(1, "player1", "securePassword123", 3).then(response => {
    console.log("Joined game:", response);
    if (response && response.game) {
        // Start listening for updates
        const gameUpdateSource = update(
            response.game,
            "player1",
            handleGameUpdate, // Function to handle updates
            handleError       // Function to handle errors
        );

        // Save the EventSource reference to close it later
        window.gameUpdateSource = gameUpdateSource;
    }
});


const move = { square: 1, position: 4, phase: "drop" }; // Example move
notify("player1", "securePassword123", "gameID", move).then(response => {
    console.log("Move notification response:", response);
});


function handleGameUpdate(updateData) {
    console.log("Game state updated:", updateData);
    // Update your game UI or logic based on `updateData`
}

function handleError(error) {
    console.error("Error while updating game:", error);
    alert("Lost connection to the server.");
}


leave("player1", "securePassword123", "gameID").then(response => {
    console.log("Left game:", response);
});

// Close the EventSource connection
if (window.gameUpdateSource) {
    window.gameUpdateSource.close();
}
