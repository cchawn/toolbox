#!/usr/bin/env -S deno run --allow-net --allow-env

import { parseArgs } from 'jsr:@std/cli';
import { Spinner } from 'jsr:@std/cli/unstable-spinner';
import { Octokit } from 'npm:octokit';
import type { components } from 'npm:@octokit/openapi-types';

type PullRequest = components['schemas']['issue-search-result-item'];

function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Required environment variable missing: ${key}`);
  }
  return value;
}

async function searchGitHub(
  octokit: Octokit,
  query: string,
): Promise<PullRequest[]> {
  const result = await octokit.request('GET /search/issues', {
    q: query,
    per_page: 100,
    advanced_search: 'true',
  } as any);
  return result.data.items as PullRequest[];
}

interface PRStats {
  daysWithCommits: number;
  avgDaysPerWeek: number;
  openedPRs: number;
  mergedPRs: number;
  closedNotMergedPRs: number;
  reviewedPRs: number;
  openPRs: PullRequest[];
}

async function getAllPRStats(
  octokit: Octokit,
  user: string,
  since: Date,
  days: number,
): Promise<PRStats> {
  const userPRs = await searchGitHub(octokit, `is:pr author:${user} archived:false`);
  const reviewedPRs = await searchGitHub(octokit, `is:pr -author:${user} reviewed-by:${user} archived:false`);

  const sinceTimestamp = since.getTime();

  const openedPRs = userPRs.filter(pr => new Date(pr.created_at).getTime() >= sinceTimestamp);
  const mergedPRs = userPRs.filter(pr => {
    const mergedAt = pr.pull_request?.merged_at;
    return mergedAt && new Date(mergedAt).getTime() >= sinceTimestamp;
  });
  const closedNotMergedPRs = userPRs.filter(pr => {
    const closedAt = pr.closed_at;
    return closedAt && !pr.pull_request?.merged_at && new Date(closedAt).getTime() >= sinceTimestamp;
  });
  const openPRs = userPRs.filter(pr => pr.state === 'open');
  const reviewedPRsInPeriod = reviewedPRs.filter(pr => new Date(pr.updated_at).getTime() >= sinceTimestamp);

  const mergeDates = new Set(
    mergedPRs
      .map((pr) => pr.pull_request?.merged_at)
      .filter((d): d is string => !!d)
      .map((d) => d.split('T')[0]),
  );

  const daysWithCommits = mergeDates.size;
  const avgDaysPerWeek = (daysWithCommits / days) * 7;

  return {
    daysWithCommits,
    avgDaysPerWeek,
    openedPRs: openedPRs.length,
    mergedPRs: mergedPRs.length,
    closedNotMergedPRs: closedNotMergedPRs.length,
    reviewedPRs: reviewedPRsInPeriod.length,
    openPRs,
  };
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ['user', 'days'],
    boolean: ['help'],
    alias: {
      h: 'help',
      u: 'user',
      d: 'days',
    },
  });

  if (args.help || !args.user) {
    console.log(`
Usage: get-contribution-stats.ts [options]

Get contribution statistics for a GitHub user.

Options:
  -u, --user <username>   GitHub username to get stats for (required)
  -d, --days <number>     Number of days to look back (default: 7)
  -h, --help              Show this help message

Environment Variables:
  GITHUB_TOKEN            GitHub personal access token (required)
`);
    return;
  }

  const { user, days: daysStr } = args;
  const days = daysStr ? parseInt(daysStr, 10) : 7;

  if (isNaN(days) || days <= 0) {
    console.error('❌ Error: --days must be a positive number.');
    Deno.exit(1);
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const token = getEnv('GITHUB_TOKEN');
  const octokit = new Octokit({ auth: token });

  const spinner = new Spinner({
    message: `🔍 Fetching contribution stats for "${user}" for the last ${days} days...`,
  });
  spinner.start();

  try {
    const stats = await getAllPRStats(octokit, user, since, days);

    spinner.stop();
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Contribution Stats for: ${user}`);
    console.log(`📅 Period: Last ${days} days`);
    console.log('='.repeat(60));

    const commitTarget = 3;
    const commitStatus = stats.avgDaysPerWeek >= commitTarget ? '✅' : '⚠️';
    console.log(`\n🚀 Commits Landed (to main/master):`);
    console.log(`   - ${stats.daysWithCommits} days with commits in the last ${days} days.`);
    console.log(`   - Avg: ${stats.avgDaysPerWeek.toFixed(2)} days/week (${commitStatus} Target: ${commitTarget})`);

    console.log(`\n📦 Pull Requests:`);
    console.log(`   - ${stats.openedPRs} opened`);
    console.log(`   - ${stats.mergedPRs} merged`);
    console.log(`   - ${stats.closedNotMergedPRs} closed`);

    console.log(`\n👀 Reviews:`);
    console.log(`   - ${stats.reviewedPRs} PRs reviewed (via comments or approvals)`);
    console.log(`   - Note: This is an estimate based on recent PR updates.`);

    console.log(`\n📖 Currently Open PRs (${stats.openPRs.length}):`);
    if (stats.openPRs.length > 0) {
      for (const pr of stats.openPRs) {
        console.log(`   - ${pr.title} [${pr.html_url}]`);
      }
    } else {
      console.log(`   - No open PRs found.`);
    }

    console.log('\n' + '='.repeat(60));
  } catch (error) {
    spinner.stop();
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
