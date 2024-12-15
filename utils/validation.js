const fs = require('fs');
const path = require('path');
const { validatePassword } = require('./security');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function validateUser(nick, password) {
    const users = loadUsers();
    const user = users[nick];
    if (!user) return false;
    if (!password) return true; // se não for estritamente necessário password aqui
    return validatePassword(password, user.hash, user.salt);
}

module.exports = { validateUser };
