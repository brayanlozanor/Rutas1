const fs = require('fs');
const path = require('path');

const ordenesHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'ordenes.html'), 'utf8');
const ordenesJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'ordenes.js'), 'utf8');

// Let's find all CSS files loaded in ordenes.html
const cssMatches = ordenesHtml.match(/<link[^>]+href="([^"]+\.css[^"]*)"/g);
console.log('CSS files in ordenes.html:', cssMatches);
