const http = require('http');
const { handleRequest } = require('./router');

// Porta do servidor
const PORT = 8008;

const server = http.createServer((req, res) => {
    // handleRequest fará todo o processamento e enviará a resposta
    handleRequest(req, res);
});

server.listen(PORT, () => {
    console.log(`HTTP server running on http://localhost:${PORT}/`);
});
