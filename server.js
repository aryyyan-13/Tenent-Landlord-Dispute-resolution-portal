// Entry point for deployment platforms (Render, Heroku, etc.) executing from repository root
const path = require('path');
require(path.join(__dirname, 'backend', 'server.js'));
