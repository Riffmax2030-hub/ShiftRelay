const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('fetch(') || l.includes('/api/admin')) {
    console.log((idx + 1) + ': ' + l.trim());
  }
});
