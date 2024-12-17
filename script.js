let phase = 1;
let piecesPlaced = 0;
let redPiecesPlaced = 0; // Peças colocadas pelo jogador Red
let bluePiecesPlaced = 0; // Peças colocadas pelo jogador Blue
let currentPlayer = 'red';
let selectedPiece = null;
let maxPieces = 0;
let board = [];
const status = document.getElementById('status');
const boardElement = document.getElementById('board');
let movesWithoutMill = 0; // contador de movimentos sem moinho
let lastMillFormedTurn = 0;
let humanColor, computerColor;
var clickSound;
let waitingForRemoval = false;
let win=false;
let pecas_fora_red;
let pecas_fora_blue;
let aiLevel ;
let alerta = 1;
let isAiTurn = false;
let gameEnded = false;
let checkInterval;

/*----------------------------------------------------------------------------------COMEÇAR O JOGO----------------------------------------------------------------------------------*/
function updateFirstPlayerOptions() {
    const gameMode = document.getElementById("game-mode").value;
    const firstPlayer = document.getElementById("first-player");

    // Limpa as opções existentes
    firstPlayer.innerHTML = "";

    if (gameMode === "player") {
        // Adiciona opções para Dois Jogadores
        const optionRed = document.createElement("option");
        optionRed.value = "red";
        optionRed.textContent = "Red";
        firstPlayer.appendChild(optionRed);

        const optionBlue = document.createElement("option");
        optionBlue.value = "blue";
        optionBlue.textContent = "Blue";
        firstPlayer.appendChild(optionBlue);
    } else if (gameMode === "computer") {
        // Adiciona opções para Contra o Computador
        const optionComputer = document.createElement("option");
        optionComputer.value = "red";
        optionComputer.textContent = "Computador";
        firstPlayer.appendChild(optionComputer);

        const optionHuman = document.createElement("option");
        optionHuman.value = "blue";
        optionHuman.textContent = "Humano";
        firstPlayer.appendChild(optionHuman);
    }
}

// Adiciona um ouvinte ao seletor de modo de jogo para chamar a função quando o valor muda
document.getElementById("game-mode").addEventListener("change", updateFirstPlayerOptions);

// Chama a função uma vez para definir as opções iniciais
document.addEventListener("DOMContentLoaded", updateFirstPlayerOptions);

async function authenticateUser(event) {
    event.preventDefault(); // Impede o envio do formulário

    // Obtém os valores do formulário
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    try {
        // Tenta registrar ou autenticar o usuário
        const success = await window.register(username, password); // A função agora faz tanto login quanto registro

        if (!success) {
            alert("Erro na autenticação: Usuário ou senha inválidos.");
            return;
        }

        // Autenticação bem-sucedida
        alert("Autenticação realizada com sucesso!");
        document.getElementById('identification').style.display = 'none';
        document.getElementById('config-area').style.display = 'block';

        // Atualiza a mensagem de status
        document.getElementById('status').textContent = "Configurações de Jogo";

        // Salva as credenciais localmente para uso posterior
        localStorage.setItem('nick', username);
        localStorage.setItem('password', password);
    } catch (error) {
        console.error("Erro ao autenticar o jogador:", error);
        alert("Ocorreu um erro ao tentar autenticar. Tente novamente.");
    }
}



// Updated initializeGame function
function initializeGame() {
    clickSound = new sound("sound.wav");
    document.getElementById('quit-game').style.display = 'block';
    document.getElementById('config-area').style.display = 'none';

    let gameMode = document.getElementById("game-mode").value;
    const firstPlayer = document.getElementById("first-player").value;
    const numSquares = parseInt(document.getElementById('numSquares').value);

    if (numSquares < 2) {
        alert("Número inválido. Escolha um número maior que 2.");
        return;
    }

    if (gameMode === "computer") {
        startGameWithAI(firstPlayer);
    } else {
        window.initiateMatchmaking(firstPlayer, numSquares);
    }
}


function sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function () {
        this.sound.play();
    }
}
function startTwoPlayerGame(playerColor, opponentColor, numSquares) {
    console.log("Initializing game with parameters:", { playerColor, opponentColor, numSquares });

    clearTimeout(matchTimeout);
    resetBoard();
    console.log("Board reset");

    generateBoard(numSquares);
    console.log("Board generated");

    createPieceStorage(numSquares);
    console.log("Piece storage created");

    // Initialize game state
    currentPlayer = playerColor === "red" ? "red" : "blue";
    status.textContent = `Vez de ${currentPlayer}. Continue jogando!`;

    board = Array.from({ length: numSquares }, () => Array(8).fill(null));
    console.log("Game board initialized:", board);

    phase = 1;
    piecesPlaced = 0;
    redPiecesPlaced = 0;
    bluePiecesPlaced = 0;

    maxPieces = getNumberOfPieces(numSquares) / 2;
    console.log(`Game started: Player color: ${playerColor}, Opponent color: ${opponentColor}`);
}
window.startTwoPlayerGame = startTwoPlayerGame
/*--------------------------------------------------------------------------------IMPLEMENTAÃ‡ÃƒO DO JOGO--------------------------------------------------------------------------------*/

function startGame(firstPlayer) {
    const numSquares = parseInt(document.getElementById('numSquares').value);
    pecas_fora_red=numSquares*3-1;
    pecas_fora_blue=numSquares*3-1;
    status.textContent = `Vez de ${currentPlayer}. Continue jogando!`;

    if (numSquares < 2) {
        status.textContent = "Número inválido. Escolha um número maior que 2.";
        return;
    }

    resetBoard();
    generateBoard(numSquares);
    createPieceStorage(numSquares);

    board = Array.from({ length: numSquares }, () => Array(8).fill(null));

    phase = 1;
    piecesPlaced = 0;
    redPiecesPlaced = 0;
    bluePiecesPlaced = 0;

    currentPlayer = firstPlayer; // Define o jogador inicial
    if (win===false){

        status.textContent = `Vez de ${firstPlayer.charAt(0).toUpperCase() + firstPlayer.slice(1)}`;
    }


    maxPieces = getNumberOfPieces(numSquares) / 2;
}


function generateBoard(numSquares) {
    board = [];  // Inicializa o tabuleiro como uma matriz vazia

    for (let square = 0; square < numSquares; square++) {
        const positions = new Array(8).fill(null); // Cria um circulo com 8 posições vazias
        board.push(positions);  // Adiciona o circulo ao tabuleiro
    }

    // Também cria visualmente o tabuleiro na interface
    boardElement.innerHTML = ''; // Limpar tabuleiro anterior
    const boardCenter = 400; // Centro do tabuleiro (800px / 2)
    const maxRadius = 400; // Raio máximo ajustado para o quadrado maior
    

    for (let square = 0; square < numSquares; square++) {
        const radius = maxRadius - (square * (maxRadius / numSquares));
        const positions = calculatePositions(radius);

        positions.forEach((pos, index) => {
            createCircle(boardElement, boardCenter + pos.x, boardCenter + pos.y, `cell-${square}-${index}`);
        });

        // Desenhar linhas horizontais e verticais no tabuleiro
        if (square !== numSquares - 1) {
            createLine(boardElement, boardCenter - radius, boardCenter, boardCenter + radius, boardCenter); // Linha horizontal
            createLine(boardElement, boardCenter, boardCenter - radius, boardCenter, boardCenter + radius); // Linha vertical
        }

        // Desenhar linhas entre os ci­rculos
        for (let i = 0; i < positions.length; i++) {
            const nextPos = positions[(i + 1) % positions.length];
            createLine(boardElement, boardCenter + positions[i].x, boardCenter + positions[i].y, boardCenter + nextPos.x, boardCenter + nextPos.y);
        }
    }
}

function calculatePositions(radius) {
    return [
        { x: -radius, y: -radius },
        { x: 0-4, y: -radius },
        { x: radius, y: -radius },
        { x: radius, y: 0 },
        { x: radius, y: radius },
        { x: 0-4, y: radius },
        { x: -radius, y: radius },
        { x: -radius, y: 0 }
    ];
}

function createCircle(boardElement, x, y, id) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.style.left = `${x - 15}px`; // Ajuste para centralizar os circulos
    cell.style.top = `${y - 15}px`; 
    cell.id = id;
    cell.addEventListener('click', () => handleCellClick(cell));
    boardElement.appendChild(cell);
}

function createLine(boardElement, x1, y1, x2, y2) {
    const line = document.createElement('div');
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

    line.classList.add('line');
    line.style.width = `${length}px`;
    line.style.left = `${x1}px`;
    line.style.top = `${y1}px`;
    line.style.transformOrigin = '0 0';
    line.style.transform = `rotate(${angle}deg)`;

    boardElement.appendChild(line);
}

function createPieceStorage(numSquares) {
    const pieceStorageElement = document.getElementById('pieceStorage');
    pieceStorageElement.innerHTML = ''; // Limpa peças anteriores

    const piecesPerColumn = 3; 
    const bluePieces = numSquares * piecesPerColumn;
    const redPieces = numSquares * piecesPerColumn;

    const boardRect = boardElement.getBoundingClientRect(); // Dimensões do tabuleiro
    const boardWidth = boardRect.width;
    const boardHeight = boardRect.height;

    const blueStartX = boardRect.left - 140; // Ajusta a distância ao lado esquerdo para fora do tabuleiro
    const redStartX = boardRect.right + 60; // Ajusta a distância ao lado direito para fora do tabuleiro
    const startY = boardRect.top + boardHeight / 2 - (piecesPerColumn * 20); // Centraliza verticalmente

    // Adiciona peças azuis
    for (let i = 0; i < bluePieces; i++) {
        const piece = document.createElement('div');
        piece.classList.add('piece', 'blue-piece');
        piece.style.position = 'absolute';

        // Calcula a posição relativa das peças azuis
        piece.style.left = `${blueStartX + Math.floor(i / piecesPerColumn) * 30}px`; // Ajuste: Organiza em colunas e move mais para a esquerda
        piece.style.top = `${startY + (i % piecesPerColumn) * 40}px`; // Organiza em linhas
        piece.id = `blue-piece-${i}`;
        pieceStorageElement.appendChild(piece);
    }

    // Adiciona peças vermelhas
    for (let i = 0; i < redPieces; i++) {
        const piece = document.createElement('div');
        piece.classList.add('piece', 'red-piece');
        piece.style.position = 'absolute';

        // Calcula a posição relativa das peças vermelhas
        piece.style.left = `${redStartX + Math.floor(i / piecesPerColumn) * 30}px`; // Ajuste: Organiza em colunas e move mais para a direita
        piece.style.top = `${startY + (i % piecesPerColumn) * 40}px`; // Organiza em linhas
        piece.id = `red-piece-${i}`;
        pieceStorageElement.appendChild(piece);
    }
}



window.onresize = function () {
    const numSquares = parseInt(document.getElementById('numSquares').value);
    createPieceStorage(numSquares); // Reposiciona as peças
};




function retirarPeca(cor, indice) {
    const piece = document.getElementById(`${cor}-piece-${indice}`);
    if (piece) {
        piece.style.visibility = 'hidden';
    }
}

// Função para repor uma peça no armazenamento (mostrar a peça novamente)
function reporPeca(cor, indice) {
    const piece = document.getElementById(`${cor}-piece-${indice}`);
    if (piece) {
        piece.style.visibility = 'visible';
    } else {
        console.error(`Peça não encontrada: ${cor}-piece-${indice}`);
    }
}


function handleCellClick(cell) {
    // Block actions if it's the opponent's turn
    if (isAiTurn || currentPlayer !== playerColor) {
        console.log("It's not your turn!");
        return;
    }
    const [square, index] = cell.id.split('-').slice(1).map(Number);

    if (phase === 1 && board[square][index] === null) {
        placePiece(cell);
    } else if (phase === 1 && board[square][index] !== null) {
        // Uncomment if you want to handle piece removal in phase 1
        // removePieceIfValid(cell); 
    } else if (phase === 2) {
        handleMove(cell);
    }
}

function placePiece(cell) {
    const numSquares = board.length; // número de círculos
    const [square, index] = cell.id.split('-').slice(1).map(Number);

    // Verificar se a posição já está ocupada
    if (board[square][index] !== null) {
        status.textContent = "Essa posição já está ocupada!";
        return;
    }

    // Atualizar o tabuleiro com a peça do jogador atual
    if (currentPlayer === 'red' && redPiecesPlaced < maxPieces) {
        cell.style.backgroundColor = 'red';
        redPiecesPlaced++;
        retirarPeca('red', pecas_fora_red);
        pecas_fora_red--;
        board[square][index] = 'red';

    } else if (currentPlayer === 'blue' && bluePiecesPlaced < maxPieces) {
        cell.style.backgroundColor = 'blue';
        bluePiecesPlaced++;
        retirarPeca('blue', pecas_fora_blue);
        pecas_fora_blue--;
        board[square][index] = 'blue';
    }

    // Tocar som ao colocar a peça
    clickSound.play();

    // Verifica se um moinho foi formado
    const isMillFormed = checkForMill(square, index, board, currentPlayer, numSquares);

    if (isMillFormed) {
        // Atualiza o status com a mensagem do moinho, mas não remove peça na fase 1
        status.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} formou um moinho! Mas a remoção de peças não é permitida nesta fase.`;
    }

    // Verifica se todas as peças foram colocadas para iniciar a fase 2
    if (redPiecesPlaced === maxPieces && bluePiecesPlaced === maxPieces) {
        startMovingPhase(); // Inicia a fase de movimentação
        togglePlayer();
    } else {
        // Alterna o jogador para o próximo turno
        togglePlayer();
    }
}



function togglePlayer() {
    currentPlayer = currentPlayer === 'red' ? 'blue' : 'red';
    console.log("Jogador:", currentPlayer);

    if (gameMode === "computer") {
        togglePlayerAI();
    } else if (gameMode === "multiplayer" && currentPlayer !== localPlayerColor) {
        // If it's the opponent's turn, wait for their move
        window.processPlayerAction();
    }

    if (!win) {
        status.textContent = `Vez de ${currentPlayer}.`;
    }

    updatePieceCount();
}




function togglePlayerAI() {
    // Alternate between 'red' (human) and 'computerColor' (AI)
    if(currentPlayer == computerColor){
        currentPlayer = humanColor
    }
    else{
        currentPlayer = computerColor
    }

    if (win === false) {
        status.textContent = `Vez de ${currentPlayer === 'red' ? 'Jogador Humano' : 'Computador'}.`;
    }

    // If it's the computer's turn, make a random move with a slight delay
    if (currentPlayer === computerColor) {
        makeRandomMove(); // Delay for natural pacing of AI's move
    }

    updatePieceCount();
}


function updatePieceCount() {
    if (win===false){
        status.textContent = `
        Vez de ${currentPlayer}. 
        Red: ${redPiecesPlaced}/${maxPieces} peças colocadas. 
        Blue: ${bluePiecesPlaced}/${maxPieces} peças colocadas.
    `;
    }
    
}


function getNumberOfPieces(numSquares) {
    return 3 * numSquares * 2; // 3*n peças para cada jogador, multiplicado por 2 para dois jogadores
}

function resetBoard() {
    boardElement.innerHTML = '';
    board = [];
}

function checkForMill(square, index, board, currentPlayer, numSquares) {
    if (waitingForRemoval) return false; // Evitar verificar moinho enquanto aguardamos remoção

    const millLines = getMillLines(square, index, numSquares);
    for (let line of millLines) {
        const isMill = line.every(cell => board[cell.square][cell.index] === currentPlayer);
        if (isMill) {
            waitingForRemoval = true;
            return true;
        }
    }
    return false;
}

function getMillLines(square, index, numSquares) {
    const millLines = [];

    // Função auxiliar para obter subconjuntos de 3 elementos de uma linha
    function getSubsetsOfThree(line) {
        const subsets = [];
        for (let i = 0; i <= line.length - 3; i++) {
            subsets.push(line.slice(i, i + 3));
        }
        return subsets;
    }

    // 1. Linhas horizontais no mesmo ci­rculo
    if (index === 0 || index === 2 || index === 4 || index === 6) {
        // Linha horizontal no circulo
        if (index === 0 || index === 2) {
            millLines.push([{ square, index: 0 }, { square, index: 1 }, { square, index: 2 }]);
        }
        if (index === 4 || index === 6) {
            millLines.push([{ square, index: 4 }, { square, index: 5 }, { square, index: 6 }]);
        }

        // Linhas verticais dentro do mesmo circulo
        if (index === 0 || index === 6) {
            millLines.push([{ square, index: 0 }, { square, index: 7 }, { square, index: 6 }]);
        }
        if (index === 2 || index === 4 ) {
            millLines.push([{ square, index: 2 }, { square, index: 3 }, { square, index: 4 }]);
        }

    } else if (index === 1 || index === 3 || index === 5 || index === 7) {
        // 2. Linhas verticais (entre circulos) - apenas conjuntos de 3
        const verticalLine = [];
        for (let s = 0; s < numSquares; s++) {
            verticalLine.push({ square: s, index });
        }
        // Adiciona apenas subconjuntos de 3 peças possÃ­veis para formar um moinho
        millLines.push(...getSubsetsOfThree(verticalLine));

        // Linhas horizontais no mesmo ci­rculo
        if (index === 1 || index === 2) {
            millLines.push([{ square, index: 0 }, { square, index: 1 }, { square, index: 2 }]);
        }
        if (index === 4 || index === 5) {
            millLines.push([{ square, index: 4 }, { square, index: 5 }, { square, index: 6 }]);
        }
        if (index === 6 || index === 7) {
            millLines.push([{ square, index: 0 }, { square, index: 7 }, { square, index: 6 }]);
        }
        if (index === 3 || index === 4) {
            millLines.push([{ square, index: 2 }, { square, index: 3 }, { square, index: 4 }]);
        }


    }

    return millLines;
}

// Função para obter todas as peças do adversário que podem ser removidas (não estão em um moinho)
function get_possible_removes(currentPlayer) {
    const opponent = currentPlayer === 'red' ? 'blue' : 'red'; //Se currentPlayer for igual a 'red', então opponent será 'blue'. Caso contrário, opponent será 'red'.
    const possibleRemoves = [];

    board.forEach((square, squareIndex) => {
        square.forEach((cell, cellIndex) => {
            // Verifica se a célula pertence ao oponente e não está em um moinho
            if (cell === opponent && !checkForMill(squareIndex, cellIndex, board, opponent, board.length)) {
                possibleRemoves.push({ square: squareIndex, index: cellIndex });
            }
        });
    });

    
    return possibleRemoves;
}

function removePieceIfValid(cell, possibleRemoves) {
    const [square, index] = cell.id.split('-').slice(1).map(Number);
    const opponent = opponentPlayer();
    if (!Array.isArray(possibleRemoves)) {
        console.error("Erro: possibleRemoves está indefinido ou não um array.", possibleRemoves);
        return false;
    }

    // Verifica se a peça está entre as possÃ­veis para remoção
    const isRemovable = possibleRemoves.some(
        (removable) => removable.square === square && removable.index === index
    );

    if (!isRemovable) {
        return false;
    }

    // Verifica se a célula selecionada é uma peça do oponente
    if (board[square][index] === opponent) {
            if (opponent==='blue'){
                pecas_fora_blue++;
                reporPeca('blue',pecas_fora_blue);
                
            }
            else{
                pecas_fora_red++;
                reporPeca('red',pecas_fora_red);
                

            }
        // Remove a peça do tabuleiro
        board[square][index] = null;
        cell.style.backgroundColor = "";  // Remove visualmente a peça do tabuleiro
        clickSound.play();
        
        status.textContent = `Peça removida com sucesso. Vez de ${currentPlayer}.`;
        waitingForRemoval = false;
        
        if(phase===2){
            checkEndGameConditions();
        }
        if(gameMode === "computer"){
            togglePlayerAI();}
        else{
            togglePlayer();
        }
        return true;
    } else {
        
        return false;
    }
}


function startRemoveOpponentPiece() {
    const possibleRemoves = get_possible_removes(currentPlayer); 

    // Verifique se há peças para remover
    if (possibleRemoves.length === 0) {
        return;
    }
    const cells = boardElement.querySelectorAll('.cell');
    // Função de evento para tentar remover a peça
    function handleRemovePiece(event) {
        const cell = event.target;
        // Tenta remover a peça e avança o turno apenas se for bem-sucedido
        if (removePieceIfValid(cell, possibleRemoves)) {
            cells.forEach(c => c.removeEventListener('click', handleRemovePiece)); // Remove os listeners de todas as células
            clickSound.play();
            if (win===false){
                status.textContent = `Vez de ${currentPlayer}. Continue jogando!`;
            }
            
        } else {
            status.textContent = "Tens de escolher uma peça do adversário para remover";
        }
    }

    // Adiciona o evento de clique para todas as células
    cells.forEach(cell => {
        cell.addEventListener('click', handleRemovePiece);
    });
}

function opponentPlayer() {
    return currentPlayer === 'red' ? 'blue' : 'red';
}

function startMovingPhase() {
    phase = 2;
    waitingForRemoval = false; 
    status.textContent = `Fase de mover peças! Vez de ${currentPlayer}.`;
    if(gameMode === "computer" && currentPlayer === "blue"){
        togglePlayerAI();
    }
}
 
//fase 2 de mover pecas 
function isMoveValid(from, to, numSquares) {
    const playerPieces = board.flat().filter(piece => piece === currentPlayer).length;
    const playerPieces_oponent = board.flat().filter(piece => piece === opponentPlayer).length;
    
    // Se o jogador tem exatamente 3 peças, ele pode se mover para qualquer célula livre
    if (playerPieces === 3) {
        if (playerPieces_oponent===3){
            movesWithoutMill++;
        }

        
        return board[to.square][to.index] === null; // Verifica se a célula de destino está vazia
    }

    // Se o jogador tem mais de 3 peças, ele só pode se mover para células adjacentes
    const adjacentCells = getAdjacentCells(from.square, from.index, numSquares);
    
    // Verifica se a célula de destino é adjacente e está vazia
    return adjacentCells.some(cell => 
        cell.square === to.square && cell.index === to.index && board[to.square][to.index] === null
    );
} 



function handleMove(cell) {
    if (phase !== 2 || waitingForRemoval) return; // Verifica se estamos na Fase 2

    const [square, index] = cell.id.split('-').slice(1).map(Number);

    if (selectedPiece === null) {
        // Seleciona a peça do jogador se nenhuma peça estiver selecionada
        if (board[square][index] === currentPlayer) {
            selectedPiece = { square, index };
            cell.classList.add('selected');
            status.textContent = `Movendo ${currentPlayer}, selecione uma casa contígua vazia.`;
        } else {
            status.textContent = `Escolha uma de suas peças para mover!`;
        }
    } else {
        const numSquares = board.length;

        // Desseleciona a peças se a mesma célula for clicada novamente
        if (selectedPiece.square === square && selectedPiece.index === index) {
            cell.classList.remove('selected');
            selectedPiece = null;
            status.textContent = `Seleção cancelada. Escolha uma peças para mover.`;
        } 
        // Verifica se o movimento é válido
        else if (board[square][index] === null && isMoveValid(selectedPiece, { square, index }, numSquares)) {
            movePiece(selectedPiece, { square, index });
            document.getElementById(`cell-${selectedPiece.square}-${selectedPiece.index}`).classList.remove('selected');
            selectedPiece = null;

            // Verifica se o movimento formou um moinho
            if (checkForMill(square, index, board, currentPlayer, numSquares)) {
                status.textContent = `${currentPlayer} formou um moinho! Remova uma peça  do adversário.`;
                startRemoveOpponentPiece();
                movesWithoutMill = 0;  // Reseta o contador porque um moinho foi formado
            } else {
                // Incrementa o contador apenas se ambos os jogadores tiverem exatamente 3 peças
                const redPieces = board.flat().filter(piece => piece === 'red').length;
                const bluePieces = board.flat().filter(piece => piece === 'blue').length;

                if (redPieces === 3 && bluePieces === 3) {
                    movesWithoutMill++;
                }

                if(gameMode === "computer"){
                    togglePlayerAI();}
                else{
                    togglePlayer();
                }
                status.textContent = `Vez de ${currentPlayer}. Continue jogando!`;
            }

            // Verifica condições de fim de jogo ou empate
            checkForDraw();
            checkEndGameConditions();
        } else {
            status.textContent = `Movimento inválido. Escolha uma casa vazia e contígua.`;
        }
    }
}

function getAdjacentCells(square, index, numSquares) {
    const adjacentCells = [];
    // Adiciona adjacentes com base no í­ndice
    switch (index) {
        case 0:
            // (ci­rculo, 1) e (ci­rculo, 7)
            adjacentCells.push({ square, index: 1 });
            adjacentCells.push({ square, index: 7 });
            
            break;

        case 1:
            // (ci­rculo, 0), (ci­rculo, 2), (ci­rculo+1, 1) caso exista, (ci­rculo-1, 1) caso exista
            adjacentCells.push({ square, index: 0 });
            adjacentCells.push({ square, index: 2 });
            if (square + 1 < numSquares) {
                adjacentCells.push({ square: square + 1, index: 1 });
            }
            if (square - 1 >= 0) {
                adjacentCells.push({ square: square - 1, index: 1 });
            }
            break;

        case 2:
            // (ci­rculo, 1), (ci­rculo, 7)
            adjacentCells.push({ square, index: 1 });
            adjacentCells.push({ square, index: 3 });
            break;

        case 3:
            // (ci­rculo, 0), (ci­rculo, 4), (ci­rculo+1, 3) caso exista, (ci­rculo-1, 3) caso exista
            adjacentCells.push({ square, index: 2 });
            adjacentCells.push({ square, index: 4 });
            if (square + 1 <= numSquares) {
                adjacentCells.push({ square: square + 1, index: 3 });
            }
            if (square - 1 >= 0) {
                adjacentCells.push({ square: square - 1, index: 3 });
            }
            break;

        case 4:
            // (ci­rculo, 3), (ci­rculo, 5)
            adjacentCells.push({ square, index: 3 });
            adjacentCells.push({ square, index: 5 });
            break;

        case 5:
            // (ci­rculo, 4), (ci­rculo, 6), (ci­rculo+1, 5) caso exista, (ci­rculo-1, 5) caso exista
            adjacentCells.push({ square, index: 4 });
            adjacentCells.push({ square, index: 6 });
            if (square + 1 <= numSquares) {
                adjacentCells.push({ square: square + 1, index: 5 });
            }
            if (square - 1 >= 0) {
                adjacentCells.push({ square: square - 1, index: 5 });
            }
            break;

        case 6:
            // (ci­rculo, 5), (ci­rculo, 7)
            adjacentCells.push({ square, index: 5 });
            adjacentCells.push({ square, index: 7 });
            break;

        case 7:
            // (ci­rculo, 6), (ci­rculo, 2), (ci­rculo+1, 7) caso exista, (ci­rculo-1, 7) caso exista
            adjacentCells.push({ square, index: 6 });
            adjacentCells.push({ square, index: 0 });
            if (square + 1 <= numSquares) {
                adjacentCells.push({ square: square + 1, index: 7 });
            }
            if (square - 1 >= 0) {
                adjacentCells.push({ square: square - 1, index: 7 });
            }
            break;

        default:
            // Caso não reconhecido
            break;
    }
    return adjacentCells;
}

function movePiece(from, to) {
    // Atualiza o estado do tabuleiro
    clickSound.play();
    board[to.square][to.index] = currentPlayer;
    board[from.square][from.index] = null;

    // Atualiza visualmente as células
    document.getElementById(`cell-${from.square}-${from.index}`).style.backgroundColor = '';
    document.getElementById(`cell-${to.square}-${to.index}`).style.backgroundColor = currentPlayer;

    status.textContent = `Peça movida. Vez de ${opponentPlayer()}`;
    
}

function getCurrentPlayerPieces(player) {
    return board.flatMap((circle, square) => 
        circle.map((piece, index) => 
            piece === player ? { square, index } : null
        )
    ).filter(piece => piece !== null);
}

function checkEndGameConditions() {
    const redPieces = getCurrentPlayerPieces('red').length;
    const bluePieces = getCurrentPlayerPieces('blue').length;

    if (redPieces < 3) {
        win=true;
        status.textContent = "Jogador Blue venceu!";
        endGame(1);
    } else if (bluePieces < 3) {
        win=true;
        status.textContent = "Jogador Red venceu!";
        endGame(2);
    }
}

function endGame(winner) {
    let resultMessage;
    if(alerta === 1){
    switch (winner) {
        case 0:
            resultMessage = "Empate!";
            
            break;
        case 1:
            resultMessage = "Vitória do Azul!";
            
            break;
        case 2:
            resultMessage = "Vitória do Vermelho!";
            
            break;
        default:
            resultMessage = "Resultado indefinido.";
            
            break;
    }
    
        alerta = 0;
        gameEnded = true;
        alert(resultMessage);
    
        incrementWins(winner);  
        const cells = document.querySelectorAll('.cell'); // Assuming cells have the class "cell"
        cells.forEach(cell => {
            cell.style.pointerEvents = "none"; // Disables clicking
        });
    // Show the "quit-game" button and change its text to "Jogar Novamente"
    const quitButton = document.getElementById('quit-game');
    quitButton.style.display = "block";
    quitButton.textContent = "Jogar Novamente";
 }   
}

function checkForDraw() {
    const redPieces = board.flat().filter(piece => piece === 'red').length;
    const bluePieces = board.flat().filter(piece => piece === 'blue').length;

    // 1. Verifica se passaram 10 movimentos sem formação de moinho
    if (movesWithoutMill ===10) {
        status.textContent = "Empate! Foram feitas 10 jogadas com 3 peças em cada jogador"
        endGame(0);

    // 2. Verifica se ambos os jogadores não têm jogadas válidas
    const redHasMoves = hasValidMoves('red');
    const blueHasMoves = hasValidMoves('blue');
            
    if (!redHasMoves && !blueHasMoves) {
        status.textContent = "Empate! Ambos os jogadores não têm movimentos válidos.";
        endGame(0);
        return;
    }
        
    }
}

function hasValidMoves(player) {
    const playerPieces = getCurrentPlayerPieces(player);

    for (const piece of playerPieces) {
        const adjacentCells = getAdjacentCells(piece.square, piece.index, board.length);
        // Verifica se há uma célula adjacente vazia para pelo menos uma peça
        if (adjacentCells.some(cell => board[cell.square][cell.index] === null)) {
            return true; // há pelo menos um movimento válido
        }
    }

    return false; // Nenhum movimento válido encontrado
}

function incrementWins(winner) {
    // Get game settings from the HTML
    const gameMode = document.getElementById("game-mode").value;
    const aiLevel = document.getElementById("ai-level").value;
    const numSquares = parseInt(document.getElementById("numSquares").value);

    // If the game mode is not "computer", do not update wins
    if (gameMode !== "computer") return;

    // Since the first player is always red and the human is always blue:
    let winnerType;
    if (winner === 1) {
        // Blue (human) wins
        winnerType = "me";
    } else if(winner == 2){
        // Red (computer) wins
        winnerType = "computer";
    }else{
        return;
    }

    // Increment the win count for the winner
    if (numSquares >= 2 && numSquares <= 9) {
        wins[winnerType][numSquares][aiLevel]++;
    }
    
    
    

    
}

function toggleScoresPanel() {
    const panel = document.getElementById("scores-panel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    resetUI();
}

function resetUI() {
    document.getElementById("board-size-buttons").style.display = "none";
    document.getElementById("difficulty-buttons").style.display = "none";
    document.getElementById("offline-classification-table").style.display = "none";
    document.getElementById("multiplayer-classification-table").style.display = "none";
}

function selectMode(mode) {
    resetUI();
    showBoardSizeButtons(mode);
}

function showBoardSizeButtons(mode) {
    const container = document.getElementById("board-size-buttons");
    container.style.display = "block";
    container.innerHTML = ""; // Clear old buttons

    for (let size = 2; size <= 9; size++) {
        const button = document.createElement("button");
        button.textContent = `${size} Quadrados`;
        button.onclick = () => {
            if (mode === "offline") showDifficultyButtons(size);
            else loadMultiplayerLeaderboard(size);
        };
        container.appendChild(button);
    }
}

function showDifficultyButtons(size) {
    const container = document.getElementById("difficulty-buttons");
    container.style.display = "block";
    container.innerHTML = ""; // Clear old buttons

    ["easy", "medium", "hard"].forEach(difficulty => {
        const button = document.createElement("button");
        button.textContent = `Dificuldade: ${difficulty}`;
        button.onclick = () => showOfflineClassificationTable(size, difficulty);
        container.appendChild(button);
    });
}

function showOfflineClassificationTable(size, difficulty) {
    document.getElementById("offline-classification-table").style.display = "block";
    document.getElementById("offline-my-wins").textContent = wins.me[size][difficulty];
    document.getElementById("offline-computer-wins").textContent = wins.computer[size][difficulty];
}

function loadMultiplayerLeaderboard(size) {
    fetch(`${serverURL}/leaderboard?size=${size}`)
        .then(response => response.json())
        .then(data => {
            // Valida a resposta e verifica erros
            if (data.error) {
                console.error("Erro ao buscar leaderboard:", data.error);
                alert(`Erro ao buscar leaderboard: ${data.error}`);
                return;
            }

            // Exibir a tabela de classificação no HTML
            updateLeaderboardTable(data.players);
        })
        .catch(err => {
            console.error("Falha ao carregar a leaderboard:", err);
            alert("Erro de rede ao carregar leaderboard. Verifique sua conexão.");
        });
}

// Função para atualizar a tabela HTML com os dados do leaderboard
function updateLeaderboardTable(players) {
    const table = document.getElementById("multiplayer-classification-table");
    table.style.display = "block"; // Mostra a tabela

    const tbody = table.querySelector("tbody");
    tbody.innerHTML = ""; // Limpa os dados anteriores da tabela

    players.forEach((player, index) => {
        const row = `<tr>
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${player.wins}</td>
            <td>${player.losses}</td>
            <td>${player.gamesPlayed}</td>
        </tr>`;
        tbody.insertAdjacentHTML("beforeend", row); // Insere cada linha no tbody
    });
}


// Example wins object
let wins = {
    me: {
        2: { easy: 0, medium: 0, hard: 0 },
        3: { easy: 0, medium: 0, hard: 0 },
        4: { easy: 0, medium: 0, hard: 0 },
        5: { easy: 0, medium: 0, hard: 0 },
        6: { easy: 0, medium: 0, hard: 0 },
        7: { easy: 0, medium: 0, hard: 0 },
        8: { easy: 0, medium: 0, hard: 0 },
        9: { easy: 0, medium: 0, hard: 0 }
    },
    computer: {
        2: { easy: 0, medium: 0, hard: 0 },
        3: { easy: 0, medium: 0, hard: 0 },
        4: { easy: 0, medium: 0, hard: 0 },
        5: { easy: 0, medium: 0, hard: 0 },
        6: { easy: 0, medium: 0, hard: 0 },
        7: { easy: 0, medium: 0, hard: 0 },
        8: { easy: 0, medium: 0, hard: 0 },
        9: { easy: 0, medium: 0, hard: 0 }
    }
};




function startGameTwoPlayers(firstPlayer) {
    currentPlayer = firstPlayer; // Define o jogador inicial com base na seleção
    startGame(firstPlayer); // Passa o jogador inicial para a função startGame
}

/*-------------------------------------------------------------------------------------------AI-------------------------------------------------------------------------------------------*/



// Função de exemplo para iniciar o jogo
function startGameWithAI(firstPlayer) {
    currentPlayer = firstPlayer;
    startGame(firstPlayer); // Configura o tabuleiro e variáveis
    if(firstPlayer == computerColor){
     makeRandomMove(); // Computador faz a primeira jogada se for o jogador inicial
    }
    


}
function placePieceAI({ square, index, cell }) {
    if (!cell) {
        console.error("Cell element not found");
        return;
    }
    clickSound.play();
    const numSquares = board.length;

    // Place the computer's piece and update the cell visually
    if (computerColor === 'red' && redPiecesPlaced < maxPieces) {
        cell.style.backgroundColor = 'red';
        redPiecesPlaced++;
        retirarPeca('red', pecas_fora_red);
        pecas_fora_red--;
        board[square][index] = 'red';
    } else if (computerColor === 'blue' && bluePiecesPlaced < maxPieces) {
        cell.style.backgroundColor = 'blue';
        bluePiecesPlaced++;
        retirarPeca('blue', pecas_fora_blue);
        pecas_fora_blue--;
        board[square][index] = 'blue';
    }

    // Check if a mill was formed
    const isMillFormed = checkForMill(square, index, board, computerColor, numSquares);

    // Check if it's the final placement move
    const isFinalPlacement = redPiecesPlaced === maxPieces && bluePiecesPlaced === maxPieces;

    if (isMillFormed) {
        waitingForRemoval = true;
        status.textContent = "Computador formou um moinho! Removendo uma peça do jogador.";
        removePlayerPieceAI(); // Automatically remove a player piece for AI
    } else if (isFinalPlacement) {
        //togglePlayerAI();
        // If final placement move, start moving phase and toggle to player
        startMovingPhase();
    } else {
        // Toggle to the human player after the AI's move
        togglePlayerAI();
    }
}
// Delay function with a Promise
function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// Modified `makeRandomMove` to select a random move with a delay
async function makeRandomMove() {
    
    isAiTurn = true;
    // Wait before performing the move to add delay
        await sleep(1000); // Delay by 1000 milliseconds (1 second)
        const availableMove = availableMoves();  // Get the next valid move
    if (availableMove) {
        const { selectedPiece, move } = availableMove;
        const { square, index } = move;
        const cell = document.getElementById(`cell-${square}-${index}`);
        if (phase === 1) {
            if (checkForMill(square, index, board, computerColor, board.length)) {
                status.textContent = "Computador formou um moinho! Removendo uma peça do jogador.";
                removePlayerPieceAI();
                
            } else {
                placePieceAI({ square, index, cell });  // Handle placing the piece for Phase 1
            }
        } else {
            if(gameEnded){
                handleMoveAI(null,null);
            }
            handleMoveAI(selectedPiece, cell);  // Handle movement for Phase 2 or 3
        }
    }
    isAiTurn = false;
}


function handleMoveAI(selectedPiece, cell) {
    // Ensure we're in Phase 2 (Movement phase) and not waiting for removal
    if (phase !== 2 || waitingForRemoval) {
        return;
    }

    const [square, index] = cell.id.split('-').slice(1).map(Number);
    const targetCell = { square, index };

    // Validate that `selectedPiece` exists and `targetCell` is a valid target using isMoveValid
    if (selectedPiece && isMoveValid(selectedPiece, targetCell, board.length, board, currentPlayer, opponentPlayer)) {
        movePiece(selectedPiece, targetCell);

        // Clear the selected class from the previous piece
        document.getElementById(`cell-${selectedPiece.square}-${selectedPiece.index}`).classList.remove('selected');

        selectedPiece = null;

        // Check if the move forms a mill
        if (checkForMill(square, index, board, currentPlayer, board.length)) {
            if (currentPlayer === humanColor) {
                status.textContent = `${currentPlayer} formou um moinho! Remova uma peça do adversário.`;
                startRemoveOpponentPiece();
            } else {
                removePlayerPieceAI();
            }
            movesWithoutMill = 0; // Reset the counter because a mill was formed
        } else {
            // Track moves if both players have exactly 3 pieces
            const redPieces = board.flat().filter(piece => piece === 'red').length;
            const bluePieces = board.flat().filter(piece => piece === 'blue').length;

            if (redPieces === 3 && bluePieces === 3) {
                movesWithoutMill++;
            }

            // Toggle player or switch to AI depending on game mode
            if (gameMode === "computer") {
                checkForDraw();
                checkEndGameConditions();
                togglePlayerAI(); // Switch to AI's turn
            } else {
                togglePlayer(); // Normal player turn switching
            }

            status.textContent = `Vez de ${currentPlayer}. Continue jogando!`;
        }

        // Check for game-ending conditions
        checkForDraw();
        checkEndGameConditions();

    } else {
        console.warn("Movimento inválido ou nenhuma peça selecionada para a IA.");
    }
}




function availableMoves() {
    const availableMoves = [];
    const computerPieces = [];
    let possibleMoves = [];
    const numSquares = board.length;

    if (phase === 1) {
        // Phase 1: Look for empty cells on the board
        for (let square = 0; square < numSquares; square++) {
            for (let index = 0; index < board[square].length; index++) {
                if (board[square][index] === null) { // Only add if cell is empty
                    // Temporarily place the piece to simulate the move
                    board[square][index] = currentPlayer;

                    // For medium difficulty, randomly check for mill
                    if (aiLevel === 'medium' && Math.random() < 0.5) {
                        if (checkForMill(square, index, board, currentPlayer, numSquares)) {
                            waitingForRemoval = false;  // Reset waiting flag
                            board[square][index] = null; // Revert the placement
                            return { selectedPiece: null, move: { square, index } }; // Return move
                        }
                    } 
                    // For hard difficulty, always check for mill
                    else if (aiLevel === 'hard' && checkForMill(square, index, board, currentPlayer, numSquares)) {
                        waitingForRemoval = false; // Reset waiting flag
                        board[square][index] = null; // Revert the placement
                        return { selectedPiece: null, move: { square, index } }; // Return move
                    }

                    // Revert the temporary placement after check
                    board[square][index] = null;
                    
                    // Add the move to available moves if no mill or mill checking not required
                    availableMoves.push({ square, index, createsMill: false });
                }
            }
        }
    } else if (phase === 2) {
        // Phase 2: Find all computer's pieces and check adjacent cells for valid moves
for (let square = 0; square < numSquares; square++) {
    for (let index = 0; index < board[square].length; index++) {
        if (board[square][index] === computerColor) {
            computerPieces.push({ square, index });
        }
    }
}

// Check piece counts for both players
const computerPiecesCount = board.flat().filter(piece => piece === computerColor).length;


    if(computerPiecesCount === 3){
    // Phase 3 logic: Move to any empty cell on the board
    for (let piece of computerPieces) {
        for (let square = 0; square < numSquares; square++) {
            for (let index = 0; index < board[square].length; index++) {
                if (board[square][index] === null) { // Only consider empty cells
                    // Temporarily move the piece to simulate the move
                    board[piece.square][piece.index] = null;
                    board[square][index] = computerColor;

                    // Check for mill based on difficulty
                    if ((aiLevel === 'medium' && Math.random() < 0.5) || aiLevel === 'hard') {
                        if (checkForMill(square, index, board, computerColor, numSquares)) {
                            waitingForRemoval = false;  // Reset waiting flag
                            // Revert the temporary move
                            board[square][index] = null;
                            board[piece.square][piece.index] = computerColor;
                            return { selectedPiece: piece, move: { square, index } }; // Return move
                        }
                    }

                    // Revert temporary move after check
                    board[square][index] = null;
                    board[piece.square][piece.index] = computerColor;

                    // Add move to available moves if no mill or mill checking not required
                    availableMoves.push({ piece, square, index, createsMill: false });
                }
            }
        }
    }
} else {
    // Phase 2 logic: Move to adjacent cells only
    for (let piece of computerPieces) {
        const possibleMoves = getAdjacentCells(piece.square, piece.index, numSquares);

        for (let move of possibleMoves) {
            const { square, index } = move;

            // Check that the destination cell is within bounds and empty
            if (square >= 0 && square < numSquares &&
                index >= 0 && index < board[square].length &&
                isMoveValid(piece, move, numSquares) &&
                board[square][index] === null) {

                // Temporarily move the piece to simulate the move
                board[piece.square][piece.index] = null;
                board[square][index] = computerColor;

                // Check for mill based on difficulty
                if ((aiLevel === 'medium' && Math.random() < 0.5) || aiLevel === 'hard') {
                    if (checkForMill(square, index, board, computerColor, numSquares)) {
                        waitingForRemoval = false;  // Reset waiting flag
                        // Revert the temporary move
                        board[square][index] = null;
                        board[piece.square][piece.index] = computerColor;
                        return { selectedPiece: piece, move: { square, index } }; // Return move
                    }
                }

                // Revert temporary move after check
                board[square][index] = null;
                board[piece.square][piece.index] = computerColor;

                // Add move to available moves if no mill or mill checking not required
                availableMoves.push({ piece, square, index, createsMill: false });
            }
        }
    }
}}
    // Select a random move from available moves if no mill was found to return immediately
    if (availableMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableMoves.length);
        const { piece, square, index } = availableMoves[randomIndex];
        return { selectedPiece: piece, move: { square, index }};
    }

    return null;  // No valid moves available

}





function removePlayerPieceAI() {
    const playerPieces = [];
    for (let square = 0; square < board.length; square++) {
        for (let index = 0; index < board[square].length; index++) {
            if (board[square][index] === humanColor) {
                playerPieces.push({ square, index });
            }
        }
    }

    if (playerPieces.length > 0) {
        const randomIndex = Math.floor(Math.random() * playerPieces.length);
        const { square, index } = playerPieces[randomIndex];
        board[square][index] = null;
        document.getElementById(`cell-${square}-${index}`).style.backgroundColor = '';
        // Check the color of the piece being removed and increment the appropriate counter
        if (humanColor === 'blue') {
            pecas_fora_blue++;
            reporPeca('blue', pecas_fora_blue); // Call reporPeca with updated count for blue
        } else {
            pecas_fora_red++;
            reporPeca('red', pecas_fora_red); // Call reporPeca with updated count for red
        }
        waitingForRemoval = false
        togglePlayerAI(); // Alterna para o jogador humano apÃ³s remover a peÃ§a
        status.textContent = "Vez do jogador humano.";
    }
}

// Lógica para quando o computador precisar remover uma peça do oponente
function computerRemoveOpponentPiece() {
    const possibleRemoves = get_possible_removes(currentPlayer);
    if (possibleRemoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * possibleRemoves.length);
        const { square, index } = possibleRemoves[randomIndex];
        const cell = document.querySelector(`#cell-${square}-${index}`);

        // Tenta remover a peça do oponente (usando removeOpponentPiece) e valida a remoção
        if (removeOpponentPiece(cell)) {
            console.log("Computador removeu uma peça válida.");
        } else {
            console.log("Erro: Computador tentou remover uma peça inválida.");
        }
    } else {
        console.log("Nenhuma peça disponí­vel para remoção.");
    }
}
/*-------------------------------------------------------------------------------------------BOTÕES-------------------------------------------------------------------------------------------*/


function openInstructions() {
    document.getElementById("instructionsModal").style.display = "block";
}

function closeInstructions() {
    document.getElementById("instructionsModal").style.display = "none";
}

// Fecha o modal ao clicar fora do conteúdo
window.onclick = function(event) {
    const modal = document.getElementById("instructionsModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

// Referências para elementos de configurações
const gameModeSelect = document.getElementById("game-mode");
const firstPlayerSelect = document.getElementById("first-player");
const aiLevelSelect = document.getElementById("ai-level");
const startGameButton = document.getElementById("start-game");

// Variáveis de controle
let gameMode = "player"; // Dois jogadores por padrão
let firstPlayer = "red"; // Red inicia por padrão 



document.addEventListener("DOMContentLoaded", () => {
    // Match IDs with your HTML
    const startGameButton = document.querySelector('button[onclick="initializeGame()"]'); // Adjusted for the button
    const firstPlayerSelect = document.getElementById("first-player"); // Fixed ID
    const aiLevelSelect = document.getElementById("ai-level"); // Fixed ID
    const gameModeSelect = document.getElementById("game-mode"); // Fixed ID
    const quitGameButton = document.getElementById("quit-game");

    // Check if elements exist
    if (!startGameButton || !firstPlayerSelect || !aiLevelSelect || !gameModeSelect || !quitGameButton) {
        console.error("Required elements not found in the DOM.");
        return;
    }

    // Add event listener for start game button
    startGameButton.addEventListener("click", () => {
        const firstPlayer = firstPlayerSelect.value;
        const aiLevel = aiLevelSelect.value;
        const gameMode = gameModeSelect.value;

        // Initialize the game with selected settings
        initializeGame(gameMode, firstPlayer, aiLevel);
    });

    // Enable or disable AI level based on game mode
    gameModeSelect.addEventListener("change", () => {
        aiLevelSelect.disabled = gameModeSelect.value !== "computer";
    });

    // Quit game functionality
    quitGameButton.addEventListener("click", () => {
        quitGame();
    });
});


// Função para desistir do jogo
function quitGame() {
    const quitButton = document.getElementById('quit-game');
    
    // Check if the button is in "Jogar Novamente" mode
    if (quitButton.textContent === "Jogar Novamente") {
        const confirmRestart = confirm("Deseja jogar novamente com as mesmas configurações?");
        if (confirmRestart) {
            console.log("O jogador optou por reiniciar o jogo.");
            alert("O jogo reiniciou");
            phase = 1;
            piecesPlaced = 0;
            redPiecesPlaced = 0; // Peças colocadas pelo jogador Red
            bluePiecesPlaced = 0; // Peças colocadas pelo jogador Blue
            currentPlayer = 'red';
            selectedPiece = null;
            maxPieces = 0;
            board = [];
            movesWithoutMill = 0; // contador de movimentos sem moinho
            lastMillFormedTurn = 0;
            waitingForRemoval = false;
            win=false;
            alerta = 1;
            isAiTurn = false;
            createPieceStorage(numSquares);
            gameEnded = false;
            document.getElementById("config-area").style.display = "block";
            quitButton.style.display = "none";
            quitButton.textContent = "Desistir do Jogo";
            document.getElementById("status").innerText = "Você pode recomeçar o jogo!";
            generateBoard(numSquares);        
        
        }
    } else {
        // Execute a função original de "Desistir do Jogo"
        const confirmQuit = confirm("Tem certeza de que deseja desistir do jogo?");
        const opponent = currentPlayer === 'red' ? 'blue' : 'red';
        if (confirmQuit) {
                console.log("Jogo finalizado pelo jogador.");
                if(gameMode === "player"){
                    alert(`${currentPlayer} desistiu do jogo. ${opponent} venceu!`);
                }
                if (gameMode === "computer") {
                    alert("Você desistiu do jogo!");
                    endGame(2);
                }
            
            createPieceStorage(numSquares);
            phase = 1;
            piecesPlaced = 0;
            redPiecesPlaced = 0; // Peças colocadas pelo jogador Red
            bluePiecesPlaced = 0; // Peças colocadas pelo jogador Blue
            currentPlayer = 'red';
            selectedPiece = null;
            maxPieces = 0;
            board = [];
            movesWithoutMill = 0; // contador de movimentos sem moinho
            lastMillFormedTurn = 0;
            waitingForRemoval = false;
            win=false;
            alerta = 1;
            isAiTurn = false;
            gameEnded = false;
            document.getElementById("config-area").style.display = "block";
            quitButton.style.display = "none";
            quitButton.textContent = "Desistir do Jogo";
            document.getElementById("status").innerText = "Você pode recomeçar o jogo!";
            generateBoard(numSquares);
        
    }
}}

// Função para mostrar/ocultar configurações e comandos
function toggleConfig() {
    const configArea = document.getElementById("config-area");
    const isHidden = configArea.style.display === "none";
    configArea.style.display = isHidden ? "block" : "none";
    
    document.getElementById("quit-game").style.display="none";

}

function toggleCommands() {
    const commands = document.getElementById("commands");
    commands.style.display = commands.style.display === "none" ? "block" : "none";
}

function showInstructionContent(topicId) {
    // Oculta todos os conteúdos de instruções
    const contents = document.querySelectorAll('.instruction-text');
    contents.forEach(content => {
        content.style.display = 'none';
    });

    // Mostra o conteúdo selecionado
    const selectedContent = document.getElementById(topicId);
    if (selectedContent) {
        selectedContent.style.display = 'block';
    }
}

/*--------------------------------------------------------------------------------------IDENTIFICAÇÃO--------------------------------------------------------------------------------------*/


// Função para alternar a área de identificação
function toggleAuth() {
    const authArea = document.getElementById('identification');
    if (authArea.style.display === 'none') {
        authArea.style.display = 'block';
    } else {
        authArea.style.display = 'none';
    }
}




