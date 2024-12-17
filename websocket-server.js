const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 8008;
const USERS_FILE = path.resolve('./users.json');
const games = {};

// Ensure the user file exists
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
}

// Load users from the file
function loadUsers() {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

// Save users to the file
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

console.log(`HTTP server running on http://localhost:${PORT}/`);

function setCORSHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS'); // Allowed HTTP methods
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allowed headers
}

function sendResponse(res, statusCode, status, type, message, additionalData = {}) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow all origins for testing
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify({ status, type, message, ...additionalData }));
}

// Utility functions
function encryptPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

function validatePassword(inputPassword, storedHash, storedSalt) {
    const hash = crypto.pbkdf2Sync(inputPassword, storedSalt, 1000, 64, 'sha512').toString('hex');
    return hash === storedHash;
}

function generateGameId(players, size) {
    const timestamp = new Date().toISOString();
    const value = `${players.map(p => p.nick).join('-')}-${size}-${timestamp}`;
    return crypto.createHash('md5').update(value).digest('hex');
}

// Handlers
function handleLeaderboard(res, { size }) {
    // Carrega os usuários do arquivo
    const users = loadUsers();

    // Cria um array com as estatísticas dos jogadores
    const players = Object.keys(users).map(nick => {
        const stats = users[nick].scores && users[nick].scores[size] 
            ? users[nick].scores[size] 
            : { wins: 0, losses: 0, gamesPlayed: 0 };
        
        return {
            name: nick,
            wins: stats.wins,
            losses: stats.losses,
            gamesPlayed: stats.gamesPlayed
        };
    });

    // Ordena os jogadores com base no número de vitórias
    players.sort((a, b) => b.wins - a.wins);

    // Envia a resposta ao cliente com o ranking
    sendResponse(res, 200, 'success', 'leaderboard', 'Leaderboard fetched successfully.', { players });
}

// Adiciona o case 'leaderboard' no switch principal
async function handleRequest(req, res) {
    setCORSHeaders(res); // Set CORS headers for every response

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    if (req.method === 'GET' && req.url.startsWith('/leaderboard')) {
        // Extract query parameters from the URL
        const urlParams = new URL(`http://localhost${req.url}`);
        const size = parseInt(urlParams.searchParams.get('size')) || 10; // Default to 10 if no size is provided
        if (isNaN(size)) {
            return sendResponse(res, 400, 'error', 'invalid_size', 'Invalid size parameter.');
        }

        handleLeaderboard(res, { size });
        return; // Prevent further processing for non-POST requests
    }

    if (req.method !== 'POST') {
        return sendResponse(res, 405, 'error', 'method_not_allowed', 'Only POST requests are allowed.');
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk;
    });

    req.on('end', () => {
        try {
            const request = JSON.parse(body);
            const { type } = request;

            switch (type) {
                case 'register':
                    handleRegister(res, request);
                    break;
                case 'join':
                    handleJoin(res, request);
                    break;
                case 'leave':
                    handleLeave(res, request);
                    break;
                case 'notify':
                    handleNotify(res, request);
                    break;
                case 'update':
                    handleUpdate(res, request);
                    break;
                case 'move':
                    handleMove(res, request);
                    break;
                default:
                    sendResponse(res, 404, 'error', 'unknown_request', 'Unknown request type.');
            }
        } catch (error) {
            sendResponse(res, 400, 'error', 'invalid_format', 'Invalid message format.');
        }
    });
}



function handleRegister(res, { nick, password }) {
    // Validate input
    if (!nick || !password) {
        return sendResponse(res, 400, 'error', 'register', 'Nickname and password are required.');
    }

    // Load existing users
    const users = loadUsers();

    // Check if the user exists
    if (users[nick]) {
        // Validate password for existing user
        if (!validatePassword(password, users[nick].hash, users[nick].salt)) {
            return sendResponse(res, 401, 'error', 'register', 'Incorrect password for this nickname.');
        }
        // User exists and password matches
        return sendResponse(res, 200, 'success', 'register', 'User loaded successfully.');
    }

    // If user does not exist, register a new user
    const { salt, hash } = encryptPassword(password);

    // Initialize default scores for new users only
    const defaultScores = {
        "9": { "wins": 0, "losses": 0, "gamesPlayed": 0 },
        "8": { "wins": 0, "losses": 0, "gamesPlayed": 0 },
        "7": { "wins": 0, "losses": 0, "gamesPlayed": 0 },
        "6": { "wins": 0, "losses": 0, "gamesPlayed": 0 },
        "5": { "wins": 0, "losses": 0, "gamesPlayed": 0 },
        "4": { "wins": 0, "losses": 0, "gamesPlayed": 0 },
        "3": { "wins": 0, "losses": 0, "gamesPlayed": 0 },
        "2": { "wins": 0, "losses": 0, "gamesPlayed": 0 }
    };

    // Create and save the new user with scores
    users[nick] = { salt, hash, scores: defaultScores };
    saveUsers(users);

    console.log(`New user registered: ${nick}`);
    return sendResponse(res, 200, 'success', 'register', 'Registration successful.');
}



function handleJoin(res, { nick, password, size }) {
    if (!nick || !password || !size) {
        return sendResponse(res, 400, 'error', 'join', 'Nick, password, and size are required.');
    }

    const users = loadUsers();

    if (!users[nick] || !validatePassword(password, users[nick].hash, users[nick].salt)) {
        return sendResponse(res, 400, 'error', 'join', 'Invalid nickname or password.');
    }

    let game = Object.values(games).find(g => g.players.length === 1 && g.size === size);

    if (!game) {
        const gameId = generateGameId([{ nick }], size);
        game = { id: gameId, size, players: [{ nick, color: 'red' }] };
        games[gameId] = game;
        sendResponse(res, 200, 'success', 'join', 'Waiting for an opponent', { game: { id: gameId, size } });
    } else {
        if (game.players.some(player => player.nick === nick)) {
            return sendResponse(res, 400, 'error', 'join', 'You are already in this game.');
        }
        game.players.push({ nick, color: 'blue' });
        sendResponse(res, 200, 'success', 'join', 'Game joined', {
            game: { id: game.id, size, players: game.players.map(p => ({ nick: p.nick, color: p.color })) }
        });
    }
}

function handleLeave(res, { nick, password, game }) {
    if (!nick || !password || !game) {
        return sendResponse(res, 400, 'error', 'leave', 'Nickname, password, and game ID are required.');
    }

    if (!users[nick] || !validatePassword(password, users[nick].hash, users[nick].salt)) {
        return sendResponse(res, 400, 'error', 'leave', 'Invalid nickname or password.');
    }

    if (!games[game]) {
        return sendResponse(res, 400, 'error', 'leave', 'Game not found.');
    }

    games[game].players = games[game].players.filter(player => player.nick !== nick);

    if (games[game].players.length === 0) {
        delete games[game];
    }

    sendResponse(res, 200, 'success', 'leave', 'Left the game successfully.');
}

function handleNotify(res, { nick, password, game, cell }) {
    if (!nick || !password || !game || !cell) {
        return sendResponse(res, 400, 'error', 'notify', 'All fields are required.');
    }

    if (!users[nick] || !validatePassword(password, users[nick].hash, users[nick].salt)) {
        return sendResponse(res, 400, 'error', 'notify', 'Invalid nickname or password.');
    }

    if (!games[game]) {
        return sendResponse(res, 400, 'error', 'notify', 'Game not found.');
    }

    games[game].moves = games[game].moves || [];
    games[game].moves.push({ nick, cell });

    sendResponse(res, 200, 'success', 'notify', 'Move notified successfully.', {
        game,
        moves: games[game].moves
    });
}

function handleUpdate(res, { game, nick }) {
    if (!game || !nick) {
        return sendResponse(res, 400, 'error', 'update', 'Game ID and nickname are required.');
    }

    if (!games[game]) {
        return sendResponse(res, 400, 'error', 'update', 'Game not found.');
    }

    sendResponse(res, 200, 'success', 'update', 'Update successful.', {
        game,
        players: games[game].players,
        moves: games[game].moves
    });
}

function handleMove(res, { nick, gameId, move }) {
    if (!gameId || !move) {
        return sendResponse(res, 400, 'error', 'move', 'Game ID and move are required.');
    }

    const game = games[gameId];
    if (!game) {
        return sendResponse(res, 400, 'error', 'move', 'Game not found.');
    }

    const player = game.players.find(p => p.nick === nick);
    if (!player) {
        return sendResponse(res, 400, 'error', 'move', 'Player not part of this game.');
    }

    const { start, end } = move;
    if (!start || !end) {
        return sendResponse(res, 400, 'error', 'move', 'Invalid move.');
    }

    sendResponse(res, 200, 'success', 'move', 'Move made successfully.', { move });
}

// Create HTTP server
const server = http.createServer(handleRequest);
server.listen(PORT);
