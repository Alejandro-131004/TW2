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
    // Validate input
    if (!nick || !password) {
        return sendJSON(ws, {
            type: 'error',
            error: 'Nickname and password are required.'
        });
    }

    // Check if the nickname is already taken
    if (users[nick]) {
        return sendJSON(ws, {
            type: 'error',
            error: 'Nickname is already taken.'
        });
    }

    // Register the user
    users[nick] = { password };
    sendJSON(ws, {
        type: 'register',
        message: 'User registered successfully.'
    });

    console.log(`User registered: ${nick}`);
}


function handleJoin(ws, { nick, password, size }) {
    console.log(`Player ${nick} is trying to join a game.`);

    // Validate input
    if (!nick || !password || !size) {
        return sendJSON(ws, { 
            type: 'error', 
            error: 'Nick, password, and size are required.' 
        });
    }

    // Validate the user
    const user = users[nick];
    if (!user || user.password !== password) {
        return sendJSON(ws, { 
            type: 'error', 
            error: 'Invalid nickname or password.' 
        });
    }

    // Check if there's a game waiting for a player
    let game = Object.values(games).find(g => g.players.length === 1 && g.size === size);

    if (!game) {
        // Create a new game if none is available
        const gameId = `game_${gameIdCounter++}`;
        game = { id: gameId, size, players: [{ nick, ws, color: 'red' }] };
        games[gameId] = game;

        sendJSON(ws, {
            type: 'waiting',
            message: 'Waiting for an opponent',
            game: { id: gameId, size },
        });

        console.log(`Game ${gameId} created. Waiting for an opponent.`);
    } else {
        // Check if the player is already in the game
        if (game.players.some(player => player.nick === nick)) {
            return sendJSON(ws, { 
                type: 'error', 
                error: 'You are already in this game.' 
            });
        }

        // Add the second player to the game
        game.players.push({ nick, ws, color: 'blue' });

        // Notify both players that the game is starting
        game.players.forEach(player => {
            sendJSON(player.ws, {
                type: 'start',
                message: 'Game is starting',
                game: { id: game.id, size, players: game.players.map(p => ({ nick: p.nick, color: p.color })) },
            });            
        });

        console.log(`Game ${game.id} started with players: ${game.players.map(p => p.nick).join(', ')}`);
    }

    // Handle disconnections to clean up unfinished games
    ws.on('close', () => {
        game.players = game.players.filter(player => player.ws !== ws);
        if (game.players.length === 0) {
            delete games[game.id];
            console.log(`Game ${game.id} removed due to no active players.`);
        } else {
            console.log(`Player ${nick} disconnected from game ${game.id}.`);
        }
    });
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
