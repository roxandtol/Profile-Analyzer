import { TachiClient } from './api/tachiClient';
import { analyzeProfile } from './core/analyzer';
import { findFarmables } from './core/farmable';
import { generateRoadmap } from './core/roadmap';
import { GameVersionFilter, RoadmapStrategy, VolforceVersion } from './core/types';
import { vfToClass } from './core/volforce';
import { formatChartLevel } from './utils/format';
import { getKamaiChartUrl } from './utils/tachiUrl';

interface CliArgs {
  user?: string;
  target?: number;
  version: VolforceVersion;
  konaste?: boolean;
  strategy: RoadmapStrategy;
  lamp?: any;
  minFeasibility: number;
  levels?: number[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    version: 'vf7',
    konaste: false,
    strategy: 'most-feasible',
    lamp: 'EXCESSIVE CLEAR',
    minFeasibility: 40,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--user' || arg === '-u') {
      result.user = args[++i];
    } else if (arg === '--target' || arg === '-t') {
      result.target = parseFloat(args[++i]);
    } else if (arg === '--version' || arg === '-v') {
      const v = args[++i]?.toLowerCase();
      result.version = v === 'vf6' ? 'vf6' : 'vf7';
    } else if (arg === '--strategy') {
      const strat = args[++i]?.toLowerCase();
      if (strat) result.strategy = strat as RoadmapStrategy;
    } else if (arg === '--min-feasibility') {
      result.minFeasibility = parseInt(args[++i], 10);
    } else if (arg === '--lamp') {
      const l = args[++i]?.toLowerCase();
      if (l === 'uc' || l === 'ultimate-chain' || l === 'ultimate_chain') {
        result.lamp = 'ULTIMATE CHAIN';
      } else if (l === 'maxxive' || l === 'max') {
        result.lamp = 'MAXXIVE CLEAR';
      } else if (l === 'clear') {
        result.lamp = 'CLEAR';
      } else {
        result.lamp = 'EXCESSIVE CLEAR';
      }
    } else if (arg === '--konaste') {
      result.konaste = true;
    } else if (arg === '--levels' || arg === '-l') {
      result.levels = args[++i]?.split(',').map((x) => parseInt(x.trim(), 10));
    }
  }

  return result;
}

function printDivider() {
  console.log('─'.repeat(78));
}

async function main() {
  const args = parseArgs();

  console.log('\n⚡ SDVX VOLFORCE PLANNER & PROFILE ANALYZER ⚡');
  printDivider();

  if (!args.user) {
    console.error('Error: Please provide a Kamaitachi username using --user <username>');
    console.log('\nUsage:');
    console.log('  npx tsx src/cli.ts --user zkldi --target 17.5 --version vf7');
    console.log('  npx tsx src/cli.ts --user zkldi --target 18.0 --version vf6');
    console.log('  npx tsx src/cli.ts --user zkldi --target 18.0 --version vf6 --konaste');
    process.exit(1);
  }

  const client = new TachiClient();

  const versionFilter: GameVersionFilter =
    args.version === 'vf6' ? (args.konaste ? 'konaste' : 'exceed') : 'all';

  console.log(`📡 Fetching data for user '${args.user}' from Kamaitachi...`);

  try {
    const profile = await client.getUserProfile(args.user);
    const pbsResponse = await client.getUserAllPBs(args.user);

    console.log(`✅ Loaded ${pbsResponse.pbs.length} personal bests across ${pbsResponse.charts.length} charts.`);

    const analysis = analyzeProfile(
      pbsResponse.pbs,
      pbsResponse.charts,
      pbsResponse.songs,
      args.version,
      versionFilter,
    );

    const currentVF = analysis.currentProfileVF;
    const defaultTarget = Math.ceil(currentVF * 2) / 2 + (currentVF % 0.5 === 0 ? 0.5 : 0);
    const targetVF = args.target || defaultTarget;
    const deltaVF = Math.max(0, targetVF - currentVF);

    const versionLabel =
      args.version === 'vf6'
        ? `VF6 (Exceed Gear${args.konaste ? ' - Konaste Only' : ''})`
        : 'VF7 (Decimal)';

    console.log('\n📊 PROFILE SUMMARY:');
    printDivider();
    console.log(`  Player:       ${args.user} (ID: ${profile.gameStats.userID})`);
    console.log(`  Current VF:   ${currentVF.toFixed(3)} [${analysis.currentClass}] (${versionLabel})`);
    console.log(`  Target VF:    ${targetVF.toFixed(3)} [${vfToClass(targetVF)}]`);
    console.log(`  Delta Needed: +${deltaVF.toFixed(3)} VF`);
    console.log(`  Top 50 Floor: ${analysis.top50Cutoff.toFixed(3)} VF (#50 cutoff threshold)`);

    console.log('\n  Top 50 Level Distribution:');
    const sortedLevels = Object.keys(analysis.levelDistribution)
      .map(Number)
      .sort((a, b) => b - a);
    for (const lvl of sortedLevels) {
      const count = analysis.levelDistribution[lvl];
      const bar = '█'.repeat(count);
      console.log(`    Level ${lvl.toString().padStart(2)}: ${count.toString().padStart(2)} plays ${bar}`);
    }

    // Determine relevant levels for farmable recommendations
    const minRecLevel = Math.max(16, Math.min(...sortedLevels) || 17);
    const maxRecLevel = Math.min(20, (Math.max(...sortedLevels) || 18) + 1);
    const candidateLevels = args.levels || [minRecLevel, minRecLevel + 1, maxRecLevel];

    console.log(`\n🔍 Searching catalog for farmable charts in levels: ${candidateLevels.join(', ')}...`);
    const catalog = await client.getMultiLevelCharts(args.user, candidateLevels);

    // Merge catalog charts and songs with user's PB charts and songs
    for (const c of catalog.charts) {
      if (!analysis.chartMap.has(c.chartID)) {
        analysis.chartMap.set(c.chartID, c);
      }
    }
    for (const s of catalog.songs) {
      if (!analysis.songMap.has(s.id)) {
        analysis.songMap.set(s.id, s);
      }
    }

    const existingPBsMap = new Map();
    for (const pb of pbsResponse.pbs) {
      existingPBsMap.set(pb.chartID, pb);
    }
    const top50ChartIDs = new Set(analysis.top50Scores.map((s) => s.chart.chartID));

    const farmables = findFarmables(
      Array.from(analysis.chartMap.values()),
      analysis.songMap,
      {
        version: args.version,
        versionFilter,
        top50Cutoff: analysis.top50Cutoff,
        top50ChartIDs,
        existingPBsMap,
        minLevel: minRecLevel,
        maxLevel: maxRecLevel,
        excludeGimmicks: false,
        targetLamp: args.lamp,
        minFeasibility: args.minFeasibility,
      },
    );

    console.log(`✅ Identified ${analysis.upscores.length} upscore opportunities and ${farmables.length} farmable charts (≥${args.minFeasibility}% Feasibility).`);

    // Top Upscores Preview
    console.log('\n🔥 TOP 5 LOW-HANGING UPSCORES:');
    printDivider();
    if (analysis.upscores.length === 0) {
      console.log('  No immediate near-milestone upscores detected.');
    } else {
      for (const u of analysis.upscores.slice(0, 5)) {
        const title = u.song.title.slice(0, 28).padEnd(28);
        const diff = `[${u.chart.difficulty} ${formatChartLevel(u.levelNum, args.version)}]`.padEnd(10);
        const curr = `${u.currentScore.toLocaleString()} (${u.currentGrade})`;
        const gain = `+${u.netVFGain.toFixed(3)} VF`;
        const feas = u.feasibility
          ? `[${u.feasibility.feasibilityPercent}% feas]`.padEnd(13)
          : ''.padEnd(13);
        console.log(`  ${title} ${diff} ${curr} -> ${u.targetGrade} (${u.targetLamp}) | ${gain} | ${feas} | ${u.description}`);
      }
    }

    // Top Farmables Preview
    console.log(`\n🎯 TOP 5 FARMABLE CHARTS (${args.version.toUpperCase()} Prioritized, Goal Lamp: ${args.lamp}, Min Feas: ≥${args.minFeasibility}%):`);
    printDivider();
    if (farmables.length === 0) {
      console.log('  No farmable charts found beating your current cutoff.');
    } else {
      for (const f of farmables.slice(0, 5)) {
        const title = f.song.title.slice(0, 28).padEnd(28);
        const diff = `[${f.difficulty} ${formatChartLevel(f.levelNum, args.version)}]`.padEnd(10);
        const gain = `+${f.netVFGain.toFixed(3)} VF`;
        const tier = f.sTier?.text ? `S-Tier: ${f.sTier.text}` : 'Standard';
        const feas = f.feasibility
          ? `[${f.feasibility.feasibilityPercent}% feas]`.padEnd(13)
          : ''.padEnd(13);
        console.log(`  ${title} ${diff} S-Rank (${f.projectedLamp}) -> ${gain} | ${tier.padEnd(14)} | ${feas} | ${f.primaryAdvantage}`);
      }
    }

    // Generate Roadmap
    const roadmap = generateRoadmap(
      currentVF,
      targetVF,
      analysis.upscores,
      farmables,
      args.version,
      args.strategy,
      args.lamp,
      args.minFeasibility,
    );

    console.log(`\n🚀 RECOMMENDED ROADMAP TO REACH ${targetVF.toFixed(3)} VF (Strategy: ${args.strategy.toUpperCase()}, Target Lamp: ${args.lamp}, Min Feas: ≥${args.minFeasibility}%):`);
    printDivider();
    if (roadmap.length === 0) {
      console.log('  Target VF is already achieved or no viable actions found.');
    } else {
      console.log(`  Steps required: ${roadmap.length}`);
      console.log('  ────────────────────────────────────────────────────────────────────────────');
      for (const step of roadmap) {
        const num = `#${step.stepNumber}`.padStart(3);
        const type = `[${step.type.toUpperCase()}]`.padEnd(10);
        const title = step.song.title.slice(0, 26).padEnd(26);
        const diff = `[${step.chart.difficulty} ${formatChartLevel(step.chart.levelNum, args.version)}]`.padEnd(10);
        const gain = `+${step.netVFGain.toFixed(3)} VF`.padEnd(11);
        const feas = step.feasibility ? `[${step.feasibility.feasibilityPercent}% feas] ` : '';
        const prog = `Running: ${step.cumulativeProfileVF.toFixed(3)} / ${targetVF.toFixed(3)}`;
        console.log(`  ${num} ${type} ${title} ${diff} ${gain} | ${feas}${prog}`);
        console.log(`      💡 ${step.rationale}`);
        console.log(`      🔗 ${getKamaiChartUrl(step.chart.chartID)}`);
        if (step.alternatives && step.alternatives.length > 0) {
          const altList = step.alternatives
            .map(
              (a) =>
                `${a.song.title} [${a.chart.difficulty} ${formatChartLevel(a.chart.levelNum, args.version)}] (+${a.netVFGain.toFixed(3)} VF, ${a.feasibility?.feasibilityPercent}% feas)`,
            )
            .join(' | ');
          console.log(`      🔄 Alternatives: ${altList}`);
        }
      }
      printDivider();
      const last = roadmap[roadmap.length - 1];
      console.log(`  🎉 Target ${targetVF.toFixed(3)} VF reached at Step #${roadmap.length} (Final VF: ${last.cumulativeProfileVF.toFixed(3)})!\n`);
    }
  } catch (err: any) {
    console.error('\n❌ Error executing planner:', err.message || err);
    process.exit(1);
  }
}

main();
