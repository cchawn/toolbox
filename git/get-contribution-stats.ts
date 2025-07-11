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
    per_page: 100, // Max per page
    advanced_search: 'true',
  } as any);
  return result.data.items as PullRequest[];
}

async function getCommitStats(
  octokit: Octokit,
  user: string,
  since: Date,
  days: number,
) {
  const sinceDateISO = since.toISOString().split('T')[0];
  const q = `is:pr is:merged author:${user} merged:>=${sinceDateISO}`;
  const prs = await searchGitHub(octokit, q);

  const mergeDates = new Set(
    prs
      .map((pr) => pr.pull_request?.merged_at)
      .filter((d): d is string => !!d)
      .map((d) => d.split('T')[0]),
  );

  const daysWithCommits = mergeDates.size;
  const avgDaysPerWeek = (daysWithCommits / days) * 7;
  return { daysWithCommits, avgDaysPerWeek };
}

async function getOpenedPRs(octokit: Octokit, user: string, since: Date) {
  const sinceDateISO = since.toISOString().split('T')[0];
  const q = `is:pr author:${user} created:>=${sinceDateISO}`;
  const prs = await searchGitHub(octokit, q);
  return prs.length;
}

async function getClosedPRs(octokit: Octokit, user: string, since: Date) {
  const sinceDateISO = since.toISOString().split('T')[0];
  const q = `is:pr author:${user} closed:>=${sinceDateISO}`;
  const prs = await searchGitHub(octokit, q);
  return prs.length;
}

async function getReviewedPRs(octokit: Octokit, user: string, since: Date) {
  const sinceDateISO = since.toISOString().split('T')[0];
  const q =
    `is:pr -author:${user} reviewed-by:${user} updated:>=${sinceDateISO}`;
  const prs = await searchGitHub(octokit, q);
  return prs.length;
}

async function getOpenPRs(
  octokit: Octokit,
  user: string,
): Promise<PullRequest[]> {
  const q = `is:pr is:open author:${user}`;
  return await searchGitHub(octokit, q);
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
    message:
      `🔍 Fetching contribution stats for "${user}" for the last ${days} days...`,
  });
  spinner.start();

  try {
    const [commitStats, openedPRs, closedPRs, reviewedPRs, openPRs] =
      await Promise.all([
        getCommitStats(octokit, user, since, days),
        getOpenedPRs(octokit, user, since),
        getClosedPRs(octokit, user, since),
        getReviewedPRs(octokit, user, since),
        getOpenPRs(octokit, user),
      ]);

    spinner.stop();
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Contribution Stats for: ${user}`);
    console.log(`📅 Period: Last ${days} days`);
    console.log('='.repeat(60));

    // Commits landed
    const commitTarget = 3;
    const commitStatus = commitStats.avgDaysPerWeek >= commitTarget
      ? '✅'
      : '⚠️';
    console.log(
      `\n🚀 Commits Landed (to main/master):`,
    );
    console.log(
      `   - ${commitStats.daysWithCommits} days with commits in the last ${days} days.`,
    );
    console.log(
      `   - Avg: ${
        commitStats.avgDaysPerWeek.toFixed(2)
      } days/week (${commitStatus} Target: ${commitTarget})`,
    );

    // PRs opened/closed
    console.log(`\n📦 Pull Requests:`);
    console.log(`   - ${openedPRs} opened`);
    console.log(`   - ${closedPRs} closed/merged`);

    // Reviews
    console.log(`\n👀 Reviews:`);
    console.log(
      `   - ${reviewedPRs} PRs reviewed (via comments or approvals)`,
    );
    console.log(
      `   - Note: This is an estimate based on recent PR updates.`,
    );

    // Open PRs
    console.log(`\n📖 Currently Open PRs (${openPRs.length}):`);
    if (openPRs.length > 0) {
      for (const pr of openPRs) {
        console.log(
          `   - ${pr.title} [${pr.html_url}]`,
        );
      }
    } else {
      console.log(`   - No open PRs found.`);
    }

    console.log('\n' + '='.repeat(60));
  } catch (error) {
    spinner.stop();
    console.error(
      '\n❌ Error:',
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
