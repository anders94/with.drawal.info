const signup = require('./signup');
const login = require('./login');
const logout = require('./logout');
const forgotPassword = require('./forgotPassword');
const nonce = require('./nonce');
const verify = require('./verify');

module.exports = {
    signup: signup,
    login: login,
    logout: logout,
    forgotPassword: forgotPassword,
    nonce: nonce,
    verify: verify
};
