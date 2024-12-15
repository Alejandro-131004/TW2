const fs = require('fs');
const path = require('path');
const { validatePassword, encryptPassword } = require('../utils/security');

// Caminho do ficheiro de utilizadores
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

// Leitura ou inicialização da BD de utilizadores
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users));
}

function handleRegister(res, { nick, password }) {
    if (!nick || !password) {
        res.writeHead(400);
        return res.end(JSON.stringify({status:400, type:'register', message:'Nickname and password are required.'}));
    }

    const users = loadUsers();
    const existingUser = users[nick];

    if (existingUser) {
        // Se existe e password não confere -> 401
        if (!validatePassword(password, existingUser.hash, existingUser.salt)) {
            res.writeHead(401);
            return res.end(JSON.stringify({status:401, type:'register', message:'Nickname is already taken with a different password.'}));
        } else {
            // Mesmo user, mesma password
            res.writeHead(200);
            return res.end(JSON.stringify({status:200, type:'register', message:'User already registered.'}));
        }
    }

    // Não existe user, cria
    const { salt, hash } = encryptPassword(password);
    users[nick] = { salt, hash };
    saveUsers(users);

    console.log(`User registered: ${nick}`);
    res.writeHead(200);
    return res.end(JSON.stringify({status:200, type:'register', message:'Registration successful.'}));
}

module.exports = { handleRegister };
