import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function syncPucTables() {
  const slugs = ['16p', '17p', '17.5p', '18p', '19p', '20p'];
  const charts = {};
  const titleToId = {};

  console.log('Fetching PUC tables from sdvx.maya2silence.com/table ...');

  for (const slug of slugs) {
    const url = `https://sdvx.maya2silence.com/table/${slug}/tier`;
    console.log(`Fetching ${slug} from ${url} ...`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
    }
    const html = await res.text();

    const parts = html.split(/<div class="tier_box"/);
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const tierIdMatch = part.match(/data-tier="([^"]+)"/);
      const tierId = tierIdMatch ? tierIdMatch[1] : 'unknown';

      const labelMatch =
        part.match(/<h4[^>]*>([\s\S]*?)<\/h4>/) ||
        part.match(/<div class="fw-bold">([\s\S]*?)<\/div>/);
      const tierLabel = labelMatch ? labelMatch[1].replace(/<[^>]+>/g, '').trim() : tierId;

      const chartRegex =
        /<div class="chart_data"[^>]+data-cid="(\d+)"[^>]+data-title="([^"]+)"(?:[^>]+data-ruby="([^"]*)")?(?:[^>]+data-artist="([^"]*)")?[^>]+data-diff_type="([^"]+)"[^>]+data-cons="([^"]+)"/g;
      let cm;
      while ((cm = chartRegex.exec(part)) !== null) {
        const inGameID = parseInt(cm[1], 10);
        const rawTitle = cm[2].replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"');
        const diff = cm[5].toUpperCase();
        const constant = parseFloat(cm[6]);
        const idKey = `${inGameID}:${diff}`;
        const titleKey = `${normalizeTitle(rawTitle)}:${diff}`;

        charts[idKey] = [constant, tierId, tierLabel, slug, rawTitle];
        titleToId[titleKey] = idKey;
      }
    }
  }

  const outDir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    totalCharts: Object.keys(charts).length,
    charts,
    titleToId,
  };

  const outFile = path.join(outDir, 'pucTables.json');
  fs.writeFileSync(outFile, JSON.stringify(payload));
  const stats = fs.statSync(outFile);
  console.log(`Wrote ${outFile} (${(stats.size / 1024).toFixed(1)} KB, ${payload.totalCharts} charts).`);
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncPucTables().catch((err) => {
    console.error('Failed to sync PUC tables:', err);
    process.exit(1);
  });
}
