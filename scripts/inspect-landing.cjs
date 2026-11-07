const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split('\n');

for (let i = 104; i < 175; i++) {
  console.log((i + 1) + ': ' + lines[i]);
}
