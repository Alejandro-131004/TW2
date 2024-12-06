const SERVER_URL = "http://twserver.alunos.dcc.fc.up.pt:8008/";

async function register(nick, password) {
    const url = `${SERVER_URL}register`;
    const data = { nick, password };

    return await sendPostRequest(url, data);
}

async function sendPostRequest(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Erro: ${response.status} - ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Erro ao enviar requisição POST:", error);
        return { error: "Erro de conexão com o servidor." };
    }
}



async function join(group, nick, password, size) {
    if (!group || !nick || !password || !size) {
        throw new Error("Group, nickname, password, and size are required to join a game.");
    }

    const url = `${SERVER_URL}join`;
    const data = {
        group: group,
        nick: nick,
        password: password,
        size: size
    };

    return await sendPostRequest(url, data);
}

async function leave(nick, password, game) {
    if (!nick || !password || !game) {
        throw new Error("Nickname, password, and game ID are required to leave a game.");
    }

    const url = `${SERVER_URL}leave`;
    const data = {
        nick: nick,
        password: password,
        game: game
    };

    return await sendPostRequest(url, data);
}

async function notify(nick, password, game, move) {
    if (!nick || !password || !game || !move) {
        throw new Error("Nickname, password, game ID, and move data are required to notify a move.");
    }

    const url = `${SERVER_URL}notify`;
    const data = {
        nick: nick,
        password: password,
        game: game,
        cell: move
    };

    return await sendPostRequest(url, data);
}

function update(game, nick, onUpdate, onError) {
    if (!game || !nick) {
        throw new Error("Game ID and nickname are required to update the game.");
    }

    const url = `${SERVER_URL}update?game=${encodeURIComponent(game)}&nick=${encodeURIComponent(nick)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = function (event) {
        const gameUpdate = JSON.parse(event.data);
        onUpdate(gameUpdate); // Custom callback for handling updates
    };

    eventSource.onerror = function (error) {
        console.error("Erro ao atualizar o jogo:", error);
        eventSource.close(); // Close connection on error
        if (onError) onError(error); // Custom error callback
    };

    return eventSource;
}


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
