const WebSocket = require('ws');
const crypto = require('crypto');

// Port for the server
const PORT = 8008;

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT });

// Mock database for users, games, and rankings
const users = {};
const games = {};
let gameIdCounter = 1;

console.log(`WebSocket server running on ws://localhost:${PORT}/`);

function sendJSON(ws, data) {
    ws.send(JSON.stringify(data));
}

function sendResponse(ws, status, type, payload) {
    const response = { status, type, ...payload };
    sendJSON(ws, response);
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

                case 'move':
                    handleMove(ws, request);
                    break;

                default:
                    sendResponse(ws, 404, 'error', { error: 'Unknown request type.' });
            }
        } catch (error) {
            console.error('Error processing message:', error);
            sendResponse(ws, 400, 'error', { error: 'Invalid message format.' });
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Utilities
function generateGameId(players, size) {
    const timestamp = new Date().toISOString();
    const value = `${players.map(p => p.nick).join('-')}-${size}-${timestamp}`;
    return crypto.createHash('md5').update(value).digest('hex');
}

function encryptPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

function validatePassword(inputPassword, storedHash, storedSalt) {
    const hash = crypto.pbkdf2Sync(inputPassword, storedSalt, 1000, 64, 'sha512').toString('hex');
    return hash === storedHash;
}

// Handlers
function handleRegister(ws, { nick, password }) {
    if (!nick || !password) {
        return sendResponse(ws, 400, 'error', { error: 'Nickname and password are required.' });
    }

    if (users[nick]) {
        return sendResponse(ws, 400, 'error', { error: 'Nickname is already taken.' });
    }

    const { salt, hash } = encryptPassword(password);
    users[nick] = { salt, hash };

    console.log(`User registered: ${nick}`);
    sendResponse(ws, 200, 'success', { message: 'User registered successfully.' });
}

function handleJoin(ws, { nick, password, size }) {
    if (!nick || !password || !size) {
        return sendResponse(ws, 400, 'error', { error: 'Nick, password, and size are required.' });
    }

    const user = users[nick];
    if (!user || !validatePassword(password, user.hash, user.salt)) {
        return sendResponse(ws, 401, 'error', { error: 'Invalid nickname or password.' });
    }

    let game = Object.values(games).find(g => g.players.length === 1 && g.size === size);

    if (!game) {
        const gameId = generateGameId([{ nick }], size);
        game = { id: gameId, size, players: [{ nick, ws, color: 'red' }] };
        games[gameId] = game;

        sendResponse(ws, 200, 'waiting', { message: 'Waiting for an opponent', game: { id: gameId, size } });
        console.log(`Game created with ID: ${gameId}. Waiting for an opponent.`);
    } else {
        if (game.players.some(player => player.nick === nick)) {
            return sendResponse(ws, 400, 'error', { error: 'You are already in this game.' });
        }

        game.players.push({ nick, ws, color: 'blue' });

        game.players.forEach(player => {
            sendResponse(player.ws, 200, 'start', {
                message: 'Game is starting',
                game: { id: game.id, size, players: game.players.map(p => ({ nick: p.nick, color: p.color })) },
            });
        });

        console.log(`Game ${game.id} started with players: ${game.players.map(p => p.nick).join(', ')}`);
    }

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
        return sendResponse(ws, 400, 'error', { error: 'Nickname, password, and game ID are required.' });
    }

    if (!users[nick] || !validatePassword(password, users[nick].hash, users[nick].salt)) {
        return sendResponse(ws, 401, 'error', { error: 'Invalid nickname or password.' });
    }

    if (!games[game]) {
        return sendResponse(ws, 404, 'error', { error: 'Game not found.' });
    }

    games[game].players = games[game].players.filter(player => player.nick !== nick);

    if (games[game].players.length === 0) {
        delete games[game];
        console.log(`Game ${game} removed.`);
    }

    sendResponse(ws, 200, 'success', { message: 'Left the game successfully.' });
}

function handleNotify(ws, { nick, password, game, cell }) {
    if (!nick || !password || !game || !cell) {
        return sendResponse(ws, 400, 'error', { error: 'All fields are required.' });
    }

    if (!users[nick] || !validatePassword(password, users[nick].hash, users[nick].salt)) {
        return sendResponse(ws, 401, 'error', { error: 'Invalid nickname or password.' });
    }

    if (!games[game]) {
        return sendResponse(ws, 404, 'error', { error: 'Game not found.' });
    }

    games[game].moves = games[game].moves || [];
    games[game].moves.push({ nick, cell });

    sendResponse(ws, 200, 'success', { message: 'Move notified successfully.' });

    games[game].players.forEach(player => {
        sendResponse(player.ws, 200, 'update', { game, moves: games[game].moves });
    });
}

function handleUpdate(ws, { game, nick }) {
    if (!game || !nick) {
        return sendResponse(ws, 400, 'error', { error: 'Game ID and nickname are required.' });
    }

    if (!games[game]) {
        return sendResponse(ws, 404, 'error', { error: 'Game not found.' });
    }

    sendResponse(ws, 200, 'success', { game, players: games[game].players, moves: games[game].moves });
}

function handleMove(ws, { nick, gameId, move }) {
    const game = games[gameId];
    if (!game) {
        return sendResponse(ws, 404, 'error', { error: 'Game not found.' });
    }

    const player = game.players.find(p => p.nick === nick);
    if (!player) {
        return sendResponse(ws, 401, 'error', { error: 'Player not part of this game.' });
    }

    const { start, end } = move;
    if (!start || !end) {
        return sendResponse(ws, 400, 'error', { error: 'Invalid move.' });
    }

    game.players.forEach(opponent => {
        if (opponent.ws !== ws) {
            sendResponse(opponent.ws, 200, 'move', { move });
        }
    });

    console.log(`Player ${nick} made a move in game ${gameId}: ${JSON.stringify(move)}`);
}
