const SERVER_URL = "http://twserver.alunos.dcc.fc.up.pt:8008/";

// Função para registar um jogador
async function register(nick, password) {
    const url = `${SERVER_URL}register`;
    const data = { nick, password };

    return await sendPostRequest(url, data);
}

// Função para juntar jogadores e iniciar o jogo
async function join(group, nick, password, size) {
    const url = `${SERVER_URL}join`;
    const data = {
        group: group,
        nick: nick,
        password: password,
        size: size
    };

    return await sendPostRequest(url, data);
}

// Função para abandonar o jogo
async function leave(nick, password, game) {
    const url = `${SERVER_URL}leave`;
    const data = {
        nick: nick,
        password: password,
        game: game
    };

    return await sendPostRequest(url, data);
}

// Função para notificar o servidor sobre uma jogada
async function notify(nick, password, game, cell) {
    const url = `${SERVER_URL}notify`;
    const data = {
        nick: nick,
        password: password,
        game: game,
        cell: cell
    };

    return await sendPostRequest(url, data);
}

// Função para atualizar a situação do jogo usando Server-Sent Events (SSE)
function update(game, nick) {
    const url = `${SERVER_URL}update?game=${encodeURIComponent(game)}&nick=${encodeURIComponent(nick)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = function (event) {
        const gameUpdate = JSON.parse(event.data);
        console.log("Atualização do jogo:", gameUpdate);
        // Aqui você pode chamar uma função para atualizar o tabuleiro do jogo com os dados recebidos
    };

    eventSource.onerror = function (error) {
        console.error("Erro ao atualizar o jogo:", error);
        eventSource.close(); // Fechar a conexão em caso de erro
    };

    // Retornar a referência do EventSource para poder fechar posteriormente
    return eventSource;
}


// Função auxiliar para enviar requisições POST ao servidor
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
    }
}

// Exemplo de como usar as funções
// Registar um utilizador
register('jogador1', 'senha123').then(response => {
    console.log('Registro:', response);
});

// Juntar jogadores ao jogo
join(1, 'jogador1', 'senha123', 3).then(response => {
    console.log('Entrar no jogo:', response);
    if (response && response.game) {
        // Iniciar o evento de atualização do jogo
        const gameUpdateSource = update(response.game, 'jogador1');
        // Você pode armazenar `gameUpdateSource` para fechar posteriormente
    }
});

// Notificar jogada
notify('jogador1', 'senha123', 'game_id', {
    square: 2,
    position: 5,
    phase: "drop"
}).then(response => {
    console.log('Notificação de jogada:', response);
});

// Abandonar o jogo
leave('jogador1', 'senha123', 'game_id').then(response => {
    console.log('Sair do jogo:', response);
});
