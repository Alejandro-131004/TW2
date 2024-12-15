const fs = require('fs');
const path = require('path');
const { validateUser } = require('../utils/validation');

// Caminho do ficheiro de jogos
const GAMES_FILE = path.join(__dirname, '..', 'data', 'games.json');

// Carrega ou inicializa jogos
function loadGames() {
    if (!fs.existsSync(GAMES_FILE)) {
        fs.writeFileSync(GAMES_FILE, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
}

function saveGames(games) {
    fs.writeFileSync(GAMES_FILE, JSON.stringify(games));
}

function generateGameId(players, size) {
    // Uma id simples, pode ser melhorado
    return `game_${players.map(p=>p.nick).join('_')}_${size}_${Date.now()}`;
}

function handleJoin(res, { nick, password, size }) {
    if (!nick || !password || !size) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Nick, password, and size are required.'}));
    }

    const userValidated = validateUser(nick, password);
    if (!userValidated) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Invalid nickname or password.'}));
    }

    const games = loadGames();
    let game = Object.values(games).find(g => g.players.length === 1 && g.size === size);

    if (!game) {
        // Cria novo jogo
        const gameId = generateGameId([{nick}], size);
        game = { id: gameId, size, players: [{ nick, color: 'red' }], moves: [] };
        games[gameId] = game;
        saveGames(games);

        res.writeHead(200);
        return res.end(JSON.stringify({status:200, type:'success', message:'Waiting for an opponent', game:{id:gameId, size}}));
    } else {
        // Junta a jogo existente
        if (game.players.some(player => player.nick === nick)) {
            res.writeHead(400);
            return res.end(JSON.stringify({status:400, type:'error', message:'You are already in this game.'}));
        }

        game.players.push({ nick, color:'blue' });
        games[game.id] = game;
        saveGames(games);

        // Ambos os jogadores recebem "Game joined"
        // Neste caso, como não temos WebSockets, apenas retorna a resposta para quem fez o request.
        // Em aplicações reais, talvez seja necessário outro mecanismo de notificação.
        res.writeHead(200);
        return res.end(JSON.stringify({status:200, type:'success', message:'Game joined', game:{id:game.id, size, players: game.players}}));
    }
}

function handleLeave(res, { nick, password, game }) {
    if (!nick || !password || !game) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Nickname, password, and game ID are required.'}));
    }

    const userValidated = validateUser(nick, password);
    if (!userValidated) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Invalid nickname or password.'}));
    }

    const games = loadGames();
    if (!games[game]) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Game not found.'}));
    }

    games[game].players = games[game].players.filter(p => p.nick !== nick);
    if (games[game].players.length === 0) {
        delete games[game];
    }
    saveGames(games);

    res.writeHead(200);
    return res.end(JSON.stringify({status:200, type:'success', message:'Left the game successfully.'}));
}

function handleNotify(res, { nick, password, game, cell }) {
    if (!nick || !password || !game || !cell) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'All fields are required.'}));
    }

    const userValidated = validateUser(nick, password);
    if (!userValidated) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Invalid nickname or password.'}));
    }

    const games = loadGames();
    if (!games[game]) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Game not found.'}));
    }

    games[game].moves = games[game].moves || [];
    games[game].moves.push({nick, cell});
    saveGames(games);

    // Move notificado
    res.writeHead(200);
    return res.end(JSON.stringify({status:200, type:'success', message:'Move notified successfully.'}));
}

function handleUpdate(res, { game, nick }) {
    if (!game || !nick) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Game ID and nickname are required.'}));
    }

    const games = loadGames();
    if (!games[game]) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Game not found.'}));
    }

    res.writeHead(200);
    return res.end(JSON.stringify({status:200, type:'success', message:'Update successful', game, players:games[game].players, moves:games[game].moves}));
}

function handleMove(res, { nick, gameId, move }) {
    if (!gameId || !move) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Game ID and move are required.'}));
    }

    const userValidated = validateUser(nick);
    if (!userValidated) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Invalid nickname or password.'}));
    }

    const games = loadGames();
    if (!games[gameId]) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Game not found.'}));
    }

    const player = games[gameId].players.find(p => p.nick === nick);
    if (!player) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Player not part of this game.'}));
    }

    const { start, end } = move;
    if (!start || !end) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Invalid move.'}));
    }

    // Aqui poderia verificar lógica de jogo, mover peça etc.
    // Atualiza o jogo conforme necessário e salva
    saveGames(games);

    // Responde com sucesso
    res.writeHead(200);
    return res.end(JSON.stringify({status:200, type:'success', message:'Move made successfully.', move}));
}

module.exports = { handleJoin, handleLeave, handleNotify, handleUpdate, handleMove };
