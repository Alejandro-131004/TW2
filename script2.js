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

    if (!type || status === undefined) {
        console.error("Invalid server response format:", data);
        alert("Erro: resposta inválida do servidor.");
        return false; // Explicitly return false for invalid responses
    }

    switch (type) {
        case "register":
            // Registration/Login Responses
            if (status === 200) {
                if (message === "Registration successful.") {
                    console.log("Register/Login successful:", message);
                    return true; // Indicate success
                } else if (message === "User already registered.") {
                    console.log("User already registered:", message);
                    return true; // Indicate success
                }
            } else if (status === 401) {
                console.error("Register/Login failed (401):", message);
                alert(`Authentication failed: ${message}`);
                return false; // Indicate failure
            } else if (status === 400) {
                console.error("Register/Login failed (400):", message);
                alert(`Bad request: ${message}`);
                return false; // Indicate failure
            }
            break;

        case "join":
            // Responses for joining a game
            if (status === 200) {
                console.log("Matchmaking started successfully:", message);
                return true;
            } else {
                console.error(`Failed to join game (${status}):`, message);
                alert(`Failed to join game: ${message}`);
                return false;
            }

        case "update":
            // Responses for game state updates
            if (status === 200) {
                console.log("Game update received:", message || "Update successful.");
                return true;
            } else {
                console.error(`Game update failed (${status}):`, message);
                alert(`Failed to update game state: ${message}`);
                return false;
            }
            
        case "ranking":
            if (status === 200) {
                console.log("Ranking carregado com sucesso:", message);
                updateRankingTable(message);
                return true;
            } else {
                console.error(`Falha ao carregar ranking (${status}):`, message);
                alert(`Erro ao carregar ranking: ${message}`);
                return false;
            }

        case "leave":
            // Responses for leaving a game
            if (status === 200) {
                console.log("Left the game successfully:", message || "Leave successful.");
                return true;
            } else {
                console.error(`Failed to leave game (${status}):`, message);
                alert(`Failed to leave game: ${message}`);
                return false;
            }

        case "notify":
            // Responses for player action notifications
            if (status === 200) {
                console.log("Player action notified successfully:", message);
                return true;
            } else {
                console.error(`Failed to notify player action (${status}):`, message);
                alert(`Failed to notify action: ${message}`);
                return false;
            }

        case "success":
            // General success responses
            console.log("Success:", message);
            return true;

        case "error":
            // General error responses
            console.error("Error:", message);
            alert(`Error: ${message}`);
            return false;

        default:
            // Unknown response type
            console.error("Unknown response type:", type, message || "No message provided.");
            alert(`Unknown response type: ${type}`);
            return false;
    }

    return false; // Default to failure if no condition is met
}


// Function for registering or logging in
window.register = async function(nick, password) {
    try {
        const response = await fetch(serverURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: "register", nick, password })
        });

        const data = await response.json();

        // Handle server response and return success/failure status
        const isSuccess = handleServerResponse(data);

        // Return whether the registration/login was successful
        return isSuccess;
    } catch (error) {
        console.error("Error in register:", error);
        return false; // In case of error, return false to indicate failure
    }
};

function fetchRanking(size) {
    fetch(`${serverURL}/ranking?size=${size}`)
        .then(response => response.json())
        .then(data => {
            console.log("Ranking response data:", data);
            if (data.error) {
                console.error("Erro ao buscar ranking:", data.error);
                alert(`Erro ao buscar ranking: ${data.error}`);
            } else {
                console.log("Ranking recebido com sucesso:", data);
                updateRankingTable(data.ranking);
            }
        })
        .catch(error => {
            console.error("Erro de rede ao buscar ranking:", error);
            alert("Erro de rede ao buscar ranking. Verifique sua conexão.");
        });
}

// Função para atualizar a tabela com os dados do ranking
function updateRankingTable(rankingData) {
    const multiplayerTable = document.getElementById('multiplayer-classification-table');
    const tbody = multiplayerTable.querySelector('tbody');
    tbody.innerHTML = ''; // Limpa qualquer conteúdo anterior

    rankingData.forEach((player, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${player.wins}</td>
            <td>${player.losses}</td>
            <td>${player.gamesPlayed}</td>
        `;
        tbody.appendChild(row);
    });

    multiplayerTable.style.display = 'block'; // Mostra a tabela
}
// Função para iniciar/joinar em um jogo
window.joinGame = async function(nick, password, size) {
    try {
        const response = await fetch(serverURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: "join", nick, password, size })
        });
        const data = await response.json();
        handleServerResponse(data);
    } catch (error) {
        console.error("Error in joinGame:", error);
    }
};

// Iniciar matchmaking: entrar num jogo
window.initiateMatchmaking = async function (firstPlayer, numSquares) {
    const nick = localStorage.getItem("nick");
    const password = localStorage.getItem("password");

    if (!nick || !password) {
        alert("Você precisa se autenticar antes de iniciar um jogo.");
        return;
    }

    try {
        const response = await fetch(serverURL, { // No "/join" suffix, handled by request body
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: "join", nick, password, size: numSquares })
        });
        const data = await response.json();

        if (data.status === 200 && data.type === 'success') {
            handleServerResponse(data);

            if (data.message === 'Waiting for an opponent') {
                currentMatch2 = data.game;
                // Polling to wait for an opponent
                checkForOpponent(data.game.id, firstPlayer, numSquares);
            } else if (data.message === 'Game joined') {
                // Game started immediately
                startGame(data.game, firstPlayer, numSquares);
            }
        } else {
            handleServerResponse(data);
            alert(`Erro: ${data.message}`);
        }
    } catch (error) {
        console.error("Error in initiateMatchmaking:", error);
    }
};

// Polling para verificar se o oponente entrou
function checkForOpponent(gameId, preferredColor, numSquares) {
    console.log("Checking for opponent:", { gameId, preferredColor, numSquares });

    const timeoutDuration = 30000; // 30-second timeout
    matchTimeout = setTimeout(() => {
        alert("Nenhum oponente encontrado dentro do tempo limite.");
        console.log("Timeout reached: No opponent found.");
        leaveGame(gameId);
    }, timeoutDuration);

    // Periodically check for game updates
    const interval = setInterval(async () => {
        try {
            const nick = localStorage.getItem("nick");
            if (!nick) {
                clearInterval(interval);
                return;
            }
            const response = await fetch(serverURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: "update", game: gameId, nick })
            });
            const data = await response.json();

            if (data.status === 200 && data.type === 'success') {
                handleServerResponse(data);

                // Check if the game has two players
                if (data.players && data.players.length === 2) {
                    clearInterval(interval);
                    clearTimeout(matchTimeout);

                    console.log("Oponente encontrado, iniciando jogo...");
                    startGame({ id: gameId, players: data.players, size: numSquares }, preferredColor, numSquares);
                }
            } else {
                handleServerResponse(data);
            }
        } catch (error) {
            console.error("Error checking for opponent:", error);
        }
    }, 2000); // Check every 2 seconds
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
window.leaveGame = async function (gameId) {
    const nick = localStorage.getItem("nick");
    const password = localStorage.getItem("password");

    if (!nick || !password || !gameId) {
        console.warn("Cannot leave game without proper authentication or game ID.");
        return;
    }

    try {
        const response = await fetch(serverURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: "leave", nick, password, game: gameId })
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
window.processPlayerAction = async function (clickedCell, goalCell, gameId) {
    const nick = localStorage.getItem("nick");
    const password = localStorage.getItem("password");

    if (!nick || !password || !gameId) {
        console.warn("Cannot notify move without proper authentication or game ID.");
        return;
    }

    try {
        const response = await fetch(serverURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: "notify", nick, password, game: gameId, cell: { start: clickedCell, end: goalCell } })
        });
        const data = await response.json();
        handleServerResponse(data);

        if (data.status === 200 && data.type === 'success') {
            console.log("Move notified successfully.");
        }
    } catch (error) {
        console.error("Error in processPlayerAction:", error);
    }
};
