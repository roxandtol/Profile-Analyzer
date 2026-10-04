import pucRawData from '../data/pucTables.json';

export interface PucChartInfo {
  inGameID: number;
  difficulty: string;
  title: string;
  constant: number;
  tierId: string;
  tierLabel: string;
  tableSlug: string;
  easeScore: number; // 1 (hardest PUC) to 10 (easiest PUC)
}

interface CompactPucData {
  updatedAt: string;
  totalCharts: number;
  charts: Record<string, [number, string, string, string, string]>; // [constant, tierId, tierLabel, slug, title]
  titleToId: Record<string, string>;
}

const pucData = pucRawData as unknown as CompactPucData;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates a 1-10 PUC ease score based on the table slug and community tier from sdvx.maya2silence.com/table.
 * 10 = easiest PUC, 1 = hardest PUC.
 */
export function calculatePucEaseScore(
  tableSlug: string,
  tierId: string,
  constant: number,
): number {
  const numericTier = parseInt(tierId, 10);

  switch (tableSlug) {
    case '18p': {
      // In 18p/tier: Tier 15 is easiest (cons 18.0), Tier 1 is hardest (cons 18.8-18.9)
      if (!isNaN(numericTier) && numericTier >= 1 && numericTier <= 15) {
        return Math.max(1, Math.min(10, Math.round(((numericTier - 1) / 14) * 9 + 1)));
      }
      break;
    }
    case '19p': {
      // In 19p/tier: Tier 13 (Label 0, cons 19.0) is easiest, Tier 0 (Label 13, cons 19.7) is hardest
      if (!isNaN(numericTier) && numericTier >= 0 && numericTier <= 13) {
        return Math.max(1, Math.min(10, Math.round((numericTier / 13) * 9 + 1)));
      }
      break;
    }
    case '17.5p': {
      // In 17.5p/tier: Tier 0 (~17.5) is easiest, Tier 5 (17.9) is hardest
      if (!isNaN(numericTier) && numericTier >= 0 && numericTier <= 5) {
        return Math.max(3, Math.min(10, Math.round(10 - numericTier * 1.4)));
      }
      break;
    }
    case '17p': {
      // In 17p/tier: Tier 0 (17.0) is easiest, Tier 4 (17.4) is hardest
      if (!isNaN(numericTier) && numericTier >= 0 && numericTier <= 4) {
        return Math.max(5, Math.min(10, Math.round(10 - numericTier)));
      }
      break;
    }
    case '16p': {
      // In 16p/tier: Tier 1 (16.0) is easiest, Tier 11 (16.999) is hardest
      if (!isNaN(numericTier) && numericTier >= 1 && numericTier <= 11) {
        return Math.max(4, Math.min(10, Math.round(10 - (numericTier - 1) * 0.6)));
      }
      break;
    }
    case '20p': {
      // In 20p/tier: Tier 7 (Label 0) is easiest, Tier 0 (SuddeИDeath) is hardest
      if (!isNaN(numericTier) && numericTier >= 0 && numericTier <= 7) {
        return Math.max(1, Math.min(8, Math.round(1 + (numericTier / 7) * 6)));
      }
      break;
    }
  }

  // Fallback: use constant decimal offset (e.g. .0 is easiest -> 10, .9 is hardest -> 1)
  const decimal = constant - Math.floor(constant);
  return Math.max(1, Math.min(10, Math.round(10 - decimal * 10)));
}

/**
 * Retrieves official PUC metadata from maya2silence tables for a chart.
 */
export function getPucChartInfo(
  inGameID?: number,
  difficulty?: string,
  title?: string,
): PucChartInfo | null {
  const diff = (difficulty || 'MXM').toUpperCase();

  // 1. Primary lookup by inGameID + difficulty
  if (inGameID !== undefined) {
    const raw = pucData.charts[`${inGameID}:${diff}`];
    if (raw) {
      const [constant, tierId, tierLabel, tableSlug, chartTitle] = raw;
      return {
        inGameID,
        difficulty: diff,
        title: chartTitle,
        constant,
        tierId,
        tierLabel,
        tableSlug,
        easeScore: calculatePucEaseScore(tableSlug, tierId, constant),
      };
    }
  }

  // 2. Secondary lookup by normalized title + difficulty
  if (title) {
    const idKey = pucData.titleToId[`${normalizeTitle(title)}:${diff}`];
    if (idKey && pucData.charts[idKey]) {
      const [constant, tierId, tierLabel, tableSlug, chartTitle] = pucData.charts[idKey];
      const parsedId = parseInt(idKey.split(':')[0], 10);
      return {
        inGameID: isNaN(parsedId) ? 0 : parsedId,
        difficulty: diff,
        title: chartTitle,
        constant,
        tierId,
        tierLabel,
        tableSlug,
        easeScore: calculatePucEaseScore(tableSlug, tierId, constant),
      };
    }
  }

  return null;
}

/**
 * Format human-readable badge text for PUC tier information.
 */
export function formatPucTierBadge(info: PucChartInfo): string {
  if (info.tableSlug === '18p') {
    return `${info.tierLabel} (${info.constant.toFixed(1)})`;
  }
  if (info.tableSlug === '19p') {
    return `Tier ${info.tierLabel} (${info.constant.toFixed(1)})`;
  }
  return `${info.tierLabel}`;
}

/**
 * Get direct URL to the corresponding table on sdvx.maya2silence.com
 */
export function getPucTableUrl(tableSlug?: string): string {
  if (!tableSlug) return 'https://sdvx.maya2silence.com/table';
  return `https://sdvx.maya2silence.com/table/${tableSlug}/tier`;
}
