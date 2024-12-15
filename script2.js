// Controla qual servidor usar:
// true -> Servidor oficial da segunda entrega (http://twserver.alunos.dcc.fc.up.pt:8008)
// false -> Seu servidor local da terceira entrega (ex: http://localhost:8008)
let useOfficialServer = false;

const serverURL = useOfficialServer 
    ? "http://twserver.alunos.dcc.fc.up.pt:8008"
    : "http://localhost:8008";

// Variáveis de estado
let currentMatch2 = null;
let matchTimeout = null;

// Função para interpretar a resposta do servidor após fetch
function handleServerResponse(data) {
    const { type, status, message } = data;

    switch (type) {
        case "register":
            // Respostas do tipo register (apenas login/registro)
            if (status === 200) {
                if (message === "Registration successful.") {
                    console.log("Register/Login successful:", message);
                } else if (message === "User already registered.") {
                    console.log("This user is already registered with the same password:", message);
                }
            } else if (status === 401) {
                console.error("Register/Login failed (401):", message);
            } else if (status === 400) {
                console.error("Register/Login failed (400):", message);
            }
            break;

        case "success":
            // Sempre status 200
            console.log("Success (200):", message);
            break;

        case "error":
            // Sempre status 400
            console.error("Error (400):", message);
            break;

        default:
            // Tipo desconhecido -> tratar como 404
            console.error("Unknown response type (404):", message || "Unknown request type");
            break;
    }
}

// Função para registar/login
window.register = async function(nick, password) {
    try {
        const response = await fetch(serverURL + "/register", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick, password })
        });
        const data = await response.json();
        handleServerResponse(data);
    } catch (error) {
        console.error("Error in register:", error);
    }
};

// Iniciar matchmaking: entrar num jogo
window.initiateMatchmaking = async function(firstPlayer, numSquares) {
    const nick = localStorage.getItem("nick");
    const password = localStorage.getItem("password");

    if (!nick || !password) {
        alert("Você precisa se autenticar antes de iniciar um jogo.");
        return;
    }

    try {
        const response = await fetch(serverURL + "/join", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick, password, size: numSquares })
        });
        const data = await response.json();

        if (data.type === 'success' && data.status === 200) {
            handleServerResponse(data);

            if (data.message === 'Waiting for an opponent') {
                currentMatch2 = data.game;
                // Aguarda oponente usando polling
                checkForOpponentInScript2(data.game.id, firstPlayer, numSquares);
            } else if (data.message === 'Game joined') {
                // Jogo iniciado imediatamente
                startGame(data.game, firstPlayer, numSquares);
            }
        } else if (data.type === 'error') {
            handleServerResponse(data);
            alert(`Erro: ${data.message}`);
        } else {
            console.error("Resposta inesperada em initiateMatchmaking:", data);
        }
    } catch (error) {
        console.error("Error in initiateMatchmaking:", error);
    }
};

// Polling para ver se o oponente entrou
function checkForOpponentInScript2(gameId, preferredColor, numSquares) {
    console.log("Checking for opponent:", { gameId, preferredColor, numSquares });

    const timeoutDuration = 30000; // Tempo limite de 30s
    matchTimeout = setTimeout(() => {
        alert("Nenhum oponente encontrado dentro do tempo limite.");
        console.log("Timeout reached: No opponent found.");
        leaveGame(gameId);
    }, timeoutDuration);

    // Tentamos obter update do jogo periodicamente
    const interval = setInterval(async () => {
        try {
            const nick = localStorage.getItem("nick");
            if (!nick) { 
                clearInterval(interval);
                return;
            }
            const response = await fetch(serverURL + "/update", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game: gameId, nick })
            });
            const data = await response.json();

            // Verifica se o jogo já tem 2 jogadores
            if (data.type === 'success' && data.status === 200) {
                handleServerResponse(data);
                // Se já temos 2 jogadores
                if (data.players && data.players.length === 2) {
                    clearInterval(interval);
                    clearTimeout(matchTimeout);

                    // "Game joined" após oponente entrar
                    console.log("Oponente encontrado, iniciando jogo...");
                    // Supondo que agora podemos iniciar o jogo
                    startGame({id:gameId, players:data.players, size:numSquares}, preferredColor, numSquares);
                }
            } else {
                handleServerResponse(data);
            }

        } catch (error) {
            console.error("Error checking for opponent:", error);
        }
    }, 2000); // verifica a cada 2s se o oponente já entrou
}

// Iniciar o jogo no cliente
function startGame(gameState, preferredColor, numSquares) {
    console.log("Starting the game:", gameState);

    const opponentColor = gameState.players[0].color === preferredColor
        ? (preferredColor === "red" ? "blue" : "red")
        : preferredColor;

    window.startTwoPlayerGame(preferredColor, opponentColor, numSquares);
}

// Sair do jogo
window.leaveGame = async function(gameId) {
    const nick = localStorage.getItem("nick");
    const password = localStorage.getItem("password");

    if (!nick || !password || !gameId) {
        console.warn("Cannot leave game without proper authentication or game ID.");
        return;
    }

    try {
        const response = await fetch(serverURL + "/leave", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick, password, game: gameId })
        });
        const data = await response.json();
        handleServerResponse(data);

        if (data.status === 200 && data.type === 'success') {
            currentMatch2 = null;
            console.log("Left the game.");
        }
    } catch (error) {
        console.error("Error in leaveGame:", error);
    }
};

// Função para ações do jogador (caso seja necessário notificar movimentos)
window.processPlayerAction = function(clickedCell, goalCell) {
    // Aqui você pode implementar fetch para /notify ou /move se necessário
    // Por enquanto mantemos vazio como no código original
};

