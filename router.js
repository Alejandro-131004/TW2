const { handleRegister } = require('./controllers/registerController');
const { handleJoin, handleLeave, handleNotify, handleUpdate, handleMove } = require('./controllers/gameController');

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                resolve(data);
            } catch (error) {
                reject(error);
            }
        });
    });
}

async function handleRequest(req, res) {
    // Permitir CORS e JSON
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') {
        // Apenas POST é suportado
        res.writeHead(404);
        return res.end(JSON.stringify({status:404, type:'error', message:'Unknown request type'}));
    }

    try {
        const data = await parseBody(req);
        const url = req.url;

        switch(url) {
            case '/register':
                return handleRegister(res, data);

            case '/join':
                return handleJoin(res, data);

            case '/leave':
                return handleLeave(res, data);

            case '/notify':
                return handleNotify(res, data);

            case '/update':
                return handleUpdate(res, data);

            case '/move':
                return handleMove(res, data);

            default:
                res.writeHead(404);
                return res.end(JSON.stringify({status:404, type:'error', message:'Unknown request type'}));
        }

    } catch (err) {
        console.error('Error processing request:', err);
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'error', message:'Invalid message format'}));
    }
}

module.exports = { handleRequest };
