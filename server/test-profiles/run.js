import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const cases = ['strong', 'weak', 'non-tech'];

for (const name of cases) {
  const profile = JSON.parse(await readFile(path.join(dir, `${name}.json`), 'utf8'));
  try {
    const response = await fetch('http://localhost:8787/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile),
    });
    const data = await response.json();
    if (!response.ok) {
      console.log(`${name}: API ${response.status} — ${data.error}`);
      continue;
    }
    console.log(`${name}: ${data.overallScore}/100 | headline ${data.sectionScores.headline}, about ${data.sectionScores.about}, experience ${data.sectionScores.experience}, skills ${data.sectionScores.skills}`);
  } catch (error) {
    console.error(`${name}: Could not reach API — ${error.message}`);
    process.exitCode = 1;
  }
}
