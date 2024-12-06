const WebSocket = require('ws');

// Port for the server
const PORT = 8008;

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT });

// Mock database for users and games
const users = {};
const games = {};
let gameIdCounter = 1;

console.log(`WebSocket server running on ws://localhost:${PORT}/`);

// Helper to send JSON messages
function sendJSON(ws, data) {
    ws.send(JSON.stringify(data));
}

// Handle incoming connections
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        try {
            const request = JSON.parse(message);

            switch (request.type) {
                case 'register':
                    handleRegister(ws, request);
                    break;

                case 'join':
                    handleJoin(ws, request);
                    break;

                case 'leave':
                    handleLeave(ws, request);
                    break;

                case 'notify':
                    handleNotify(ws, request);
                    break;

                case 'update':
                    handleUpdate(ws, request);
                    break;

                default:
                    sendJSON(ws, { error: 'Unknown request type.' });
            }
        } catch (error) {
            console.error('Error processing message:', error);
            sendJSON(ws, { error: 'Invalid message format.' });
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Handlers for different request types

function handleRegister(ws, { nick, password }) {
    if (!nick || !password) {
        return sendJSON(ws, { error: 'Nickname and password are required.' });
    }

    if (users[nick]) {
        return sendJSON(ws, { error: 'Nickname is already taken.' });
    }

    users[nick] = { password };
    sendJSON(ws, { message: 'User registered successfully.' });
}

function handleJoin(ws, { group, nick, password, size }) {
    if (!group || !nick || !password || !size) {
        return sendJSON(ws, { error: 'Group, nickname, password, and size are required.' });
    }

    if (!users[nick] || users[nick].password !== password) {
        return sendJSON(ws, { error: 'Invalid nickname or password.' });
    }

    const gameId = `game-${gameIdCounter++}`;
    games[gameId] = { group, size, players: [nick], moves: [] };
    sendJSON(ws, { game: gameId });
}

function handleLeave(ws, { nick, password, game }) {
    if (!nick || !password || !game) {
        return sendJSON(ws, { error: 'Nickname, password, and game ID are required.' });
    }

    if (!users[nick] || users[nick].password !== password) {
        return sendJSON(ws, { error: 'Invalid nickname or password.' });
    }

    if (!games[game]) {
        return sendJSON(ws, { error: 'Game not found.' });
    }

    games[game].players = games[game].players.filter((player) => player !== nick);
    sendJSON(ws, { message: 'Left the game successfully.' });
}

function handleNotify(ws, { nick, password, game, cell }) {
    if (!nick || !password || !game || !cell) {
        return sendJSON(ws, { error: 'Nickname, password, game ID, and move are required.' });
    }

    if (!users[nick] || users[nick].password !== password) {
        return sendJSON(ws, { error: 'Invalid nickname or password.' });
    }

    if (!games[game]) {
        return sendJSON(ws, { error: 'Game not found.' });
    }

    games[game].moves.push({ nick, cell });
    sendJSON(ws, { message: 'Move notified successfully.' });

    // Broadcast the move to all connected clients in the game
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            sendJSON(client, { type: 'update', game, moves: games[game].moves });
        }
    });
}

function handleUpdate(ws, { game, nick }) {
    if (!game || !nick) {
        return sendJSON(ws, { error: 'Game ID and nickname are required.' });
    }

    if (!games[game]) {
        return sendJSON(ws, { error: 'Game not found.' });
    }

    sendJSON(ws, { game, players: games[game].players, moves: games[game].moves });
}
