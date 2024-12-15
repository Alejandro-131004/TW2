const crypto = require('crypto');

function encryptPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

function validatePassword(inputPassword, storedHash, storedSalt) {
    const hash = crypto.pbkdf2Sync(inputPassword, storedSalt, 1000, 64, 'sha512').toString('hex');
    return hash === storedHash;
}

module.exports = { encryptPassword, validatePassword };
