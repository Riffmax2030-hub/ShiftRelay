import fs from 'node:fs';

for (const file of ['server.mjs', 'index.html', 'app.js']) {
  if (!fs.existsSync(file)) continue;
  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  const fakeNamesRegex = /CleanPro|Apex Logistics|Amara Okafor|Emeka Obi|Tunde Fashola|October 1|Oct 29|demo|seed|simulation/gi;
  console.log(`\n=== SCANNING ${file} ===`);
  lines.forEach((line, i) => {
    const m = line.match(fakeNamesRegex);
    if (m) {
      console.log(`Line ${i + 1}: [${m.join(', ')}] -> ${line.trim().slice(0, 110)}`);
    }
  });
}
