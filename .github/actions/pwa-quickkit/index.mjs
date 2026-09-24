import fs from 'node:fs/promises';
import { auditPwa } from '../../../server/pwa-audit.js';

const url = process.env.PWA_QUICKKIT_URL;
if (!url) {
  console.error('PWA QuickKit: input "url" is required.');
  process.exit(2);
}

try {
  const result = await auditPwa(url);
  console.log(JSON.stringify(result, null, 2));

  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    await fs.appendFile(output, `score=${result.score}\ngrade=${result.grade}\n`);
  }

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const rows = result.recommendations.slice(0, 8)
      .map(r => `| ${r.priority} | ${r.title.replaceAll('|','\\|')} | ${r.fix.replaceAll('|','\\|')} |`)
      .join('\n');
    await fs.appendFile(summary,
`# PWA QuickKit
**Score:** ${result.score}/100 · **Grade:** ${result.grade}

| Priority | Check | Recommended fix |
|---|---|---|
${rows || '| — | No priority issue detected | — |'}

> Static audit. Browser-only behavior can require a manual or Pro verification.
`);
  }

  if (result.score < 60) process.exitCode = 1;
} catch (error) {
  console.error('PWA QuickKit audit failed:', error?.message || error);
  process.exit(1);
}
