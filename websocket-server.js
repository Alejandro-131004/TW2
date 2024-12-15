const WebSocket = require('ws');
const crypto = require('crypto');

const PORT = 8008;
const wss = new WebSocket.Server({ port: PORT });

const users = {};
const games = {};

console.log(`WebSocket server running on ws://localhost:${PORT}/`);

function sendResponse(ws, status, type, message, additionalData = {}) {
    const response = { status, type, message, ...additionalData };
    ws.send(JSON.stringify(response));
}

// Funções auxiliares
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

// Tratamento de conexões
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        let request;
        try {
            request = JSON.parse(message);
        } catch (error) {
            // Pedido mal formatado -> erro 400
            return sendResponse(ws, 400, 'error', 'Invalid message format');
        }

        const { type } = request;

        switch (type) {
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
                // Pedido desconhecido -> 404
                sendResponse(ws, 404, 'error', 'Unknown request type');
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

//------------------------------------
// Handlers
//------------------------------------

// Handler para registro/login (apenas "register")
function handleRegister(ws, { nick, password }) {
    if (!nick || !password) {
        return sendResponse(ws, 400, 'register', 'Nickname and password are required.');
    }

    const existingUser = users[nick];

    // Se o usuário existe, verifica a password
    if (existingUser) {
        if (!validatePassword(password, existingUser.hash, existingUser.salt)) {
            // Senha diferente -> 401
            return sendResponse(ws, 401, 'register', 'Nickname is already taken with a different password.');
        } else {
            // Senha igual -> já registrado
            return sendResponse(ws, 200, 'register', 'User already registered.');
        }
    }

    // Caso não exista, registra
    const { salt, hash } = encryptPassword(password);
    users[nick] = { salt, hash };
    console.log(`User registered: ${nick}`);
    return sendResponse(ws, 200, 'register', 'Registration successful.');
}


// Entrar ou criar jogo ("success" ou "error")
function handleJoin(ws, { nick, password, size }) {
    if (!nick || !password || !size) {
        return sendResponse(ws, 400, 'error', 'Nick, password, and size are required.');
    }

    const user = users[nick];
    if (!user || !validatePassword(password, user.hash, user.salt)) {
        return sendResponse(ws, 400, 'error', 'Invalid nickname or password.');
    }

    let game = Object.values(games).find(g => g.players.length === 1 && g.size === size);

    if (!game) {
        // Cria novo jogo, aguarda oponente
        const gameId = generateGameId([{ nick }], size);
        game = { id: gameId, size, players: [{ nick, ws, color: 'red' }] };
        games[gameId] = game;
        sendResponse(ws, 200, 'success', 'Waiting for an opponent', { game: { id: gameId, size } });
    } else {
        // Junta a jogo existente
        if (game.players.some(player => player.nick === nick)) {
            return sendResponse(ws, 400, 'error', 'You are already in this game.');
        }
        game.players.push({ nick, ws, color: 'blue' });
        game.players.forEach(player => {
            sendResponse(player.ws, 200, 'success', 'Game joined', {
                game: { id: game.id, size, players: game.players.map(p => ({ nick: p.nick, color: p.color })) }
            });
        });
    }

    ws.on('close', () => {
        if (!games[game.id]) return;
        game.players = game.players.filter(player => player.ws !== ws);
        if (game.players.length === 0) {
            delete games[game.id];
        }
    });
}

// Sair do jogo ("success" ou "error")
function handleLeave(ws, { nick, password, game }) {
    if (!nick || !password || !game) {
        return sendResponse(ws, 400, 'error', 'Nickname, password, and game ID are required.');
    }

    if (!users[nick] || !validatePassword(password, users[nick].hash, users[nick].salt)) {
        return sendResponse(ws, 400, 'error', 'Invalid nickname or password.');
    }

    if (!games[game]) {
        return sendResponse(ws, 400, 'error', 'Game not found.');
    }

    games[game].players = games[game].players.filter(player => player.nick !== nick);

    if (games[game].players.length === 0) {
        delete games[game];
    }

    // Saiu com sucesso
    sendResponse(ws, 200, 'success', 'Left the game successfully.');
}

// Notificar jogada ("success" ou "error")
function handleNotify(ws, { nick, password, game, cell }) {
    if (!nick || !password || !game || !cell) {
        return sendResponse(ws, 400, 'error', 'All fields are required.');
    }

    if (!users[nick] || !validatePassword(password, users[nick].hash, users[nick].salt)) {
        return sendResponse(ws, 400, 'error', 'Invalid nickname or password.');
    }

    if (!games[game]) {
        return sendResponse(ws, 400, 'error', 'Game not found.');
    }

    games[game].moves = games[game].moves || [];
    games[game].moves.push({ nick, cell });

    sendResponse(ws, 200, 'success', 'Move notified successfully.');
    games[game].players.forEach(player => {
        sendResponse(player.ws, 200, 'success', 'Game updated', { game, moves: games[game].moves });
    });
}

// Pedir atualização ("success" ou "error")
function handleUpdate(ws, { game, nick }) {
    if (!game || !nick) {
        return sendResponse(ws, 400, 'error', 'Game ID and nickname are required.');
    }

    if (!games[game]) {
        return sendResponse(ws, 400, 'error', 'Game not found.');
    }

    sendResponse(ws, 200, 'success', 'Update successful', {
        game,
        players: games[game].players,
        moves: games[game].moves
    });
}

// Realizar movimento ("success" ou "error")
function handleMove(ws, { nick, gameId, move }) {
    if (!gameId || !move) {
        return sendResponse(ws, 400, 'error', 'Game ID and move are required.');
    }

    const game = games[gameId];
    if (!game) {
        return sendResponse(ws, 400, 'error', 'Game not found.');
    }

    const player = game.players.find(p => p.nick === nick);
    if (!player) {
        return sendResponse(ws, 400, 'error', 'Player not part of this game.');
    }

    const { start, end } = move;
    if (!start || !end) {
        return sendResponse(ws, 400, 'error', 'Invalid move.');
    }

    // Notifica o outro jogador
    game.players.forEach(opponent => {
        if (opponent.ws !== ws) {
            sendResponse(opponent.ws, 200, 'success', 'Opponent moved', { move });
        }
    });

    sendResponse(ws, 200, 'success', 'Move made successfully.', { move });
}
