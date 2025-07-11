#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env

import { parseArgs } from 'jsr:@std/cli';

interface UpdateResult {
  processed: number;
  errors: number;
  skipped: number;
}

interface UpdateOptions {
  cleanupBranches: boolean;
}

interface RepositoryInfo {
  name: string;
  path: string;
  mainBranch: string | null;
}

async function runCommand(
  cmd: string[],
  cwd?: string,
): Promise<{ success: boolean; output: string; error: string }> {
  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    cwd,
    stdout: 'piped',
    stderr: 'piped',
  });

  try {
    const { success, stdout, stderr } = await process.output();
    return {
      success,
      output: new TextDecoder().decode(stdout),
      error: new TextDecoder().decode(stderr),
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(`${dirPath}/.git`);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

async function hasUncommittedChanges(repoPath: string): Promise<boolean> {
  const result = await runCommand(
    ['git', 'diff-index', '--quiet', 'HEAD', '--'],
    repoPath,
  );
  return !result.success;
}

async function getMainBranch(repoPath: string): Promise<string | null> {
  // Check for main branch first
  const mainResult = await runCommand(
    ['git', 'show-ref', '--verify', '--quiet', 'refs/heads/main'],
    repoPath,
  );
  if (mainResult.success) {
    return 'main';
  }

  // Check for master branch
  const masterResult = await runCommand(
    ['git', 'show-ref', '--verify', '--quiet', 'refs/heads/master'],
    repoPath,
  );
  if (masterResult.success) {
    return 'master';
  }

  return null;
}

async function checkoutBranch(
  repoPath: string,
  branch: string,
): Promise<boolean> {
  const result = await runCommand(['git', 'checkout', branch], repoPath);
  return result.success;
}

async function pullLatest(repoPath: string, branch: string): Promise<boolean> {
  const result = await runCommand(['git', 'pull', 'origin', branch], repoPath);
  return result.success;
}

async function cleanupDeletedBranches(repoPath: string): Promise<boolean> {
  // Fetch all remotes and prune deleted remote branches
  const fetchResult = await runCommand(
    ['git', 'fetch', '--all', '--prune'],
    repoPath,
  );
  if (!fetchResult.success) {
    return false;
  }

  // Get list of local branches that track deleted remote branches
  const branchListResult = await runCommand(['git', 'branch', '-vv'], repoPath);
  if (!branchListResult.success) {
    return false;
  }

  // Parse the output to find branches with ": gone]" status
  const lines = branchListResult.output.split('\n');
  const branchesToDelete: string[] = [];

  for (const line of lines) {
    if (line.includes(': gone]')) {
      // Extract branch name (first field, trim whitespace)
      const branchName = line.trim().split(/\s+/)[0];
      if (branchName && branchName !== '*') {
        // Skip current branch marker
        branchesToDelete.push(branchName);
      }
    }
  }

  // Delete each branch that tracks a deleted remote
  for (const branchName of branchesToDelete) {
    const deleteResult = await runCommand(
      ['git', 'branch', '-D', branchName],
      repoPath,
    );
    if (!deleteResult.success) {
      console.log(
        `⚠️  Warning: Could not delete branch '${branchName}' in ${repoPath}`,
      );
    }
  }

  return true;
}

async function getRepositories(
  workspaceDir: string,
): Promise<RepositoryInfo[]> {
  const repositories: RepositoryInfo[] = [];

  try {
    for await (const entry of Deno.readDir(workspaceDir)) {
      if (!entry.isDirectory) continue;

      const repoPath = `${workspaceDir}/${entry.name}`;

      if (await isGitRepository(repoPath)) {
        const mainBranch = await getMainBranch(repoPath);
        repositories.push({
          name: entry.name,
          path: repoPath,
          mainBranch,
        });
      } else {
        // Only print if running in verbose mode in the future
      }
    }
  } catch (error) {
    console.error(
      `Error reading directory ${workspaceDir}:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  return repositories;
}

async function updateRepository(
  repo: RepositoryInfo,
  options: UpdateOptions,
): Promise<{ success: boolean; error?: string }> {
  console.log('');
  console.log(`Processing: ${repo.name}`);
  console.log('------------------------');

  // Check for uncommitted changes
  if (await hasUncommittedChanges(repo.path)) {
    return {
      success: false,
      error: `⚠️  Warning: ${repo.name} has uncommitted changes, skipping...`,
    };
  }

  // Check if we have a main branch
  if (!repo.mainBranch) {
    return {
      success: false,
      error:
        `⚠️  Warning: Could not find main or master branch in ${repo.name}`,
    };
  }

  // Checkout main/master branch
  console.log(`Checking out ${repo.mainBranch}...`);
  if (!(await checkoutBranch(repo.path, repo.mainBranch))) {
    return {
      success: false,
      error: `❌ Error: Could not checkout ${repo.mainBranch} in ${repo.name}`,
    };
  }

  // Pull latest changes
  console.log('Pulling latest changes...');
  if (!(await pullLatest(repo.path, repo.mainBranch))) {
    return {
      success: false,
      error: `❌ Error: Could not pull latest changes in ${repo.name}`,
    };
  }

  // Clean up local branches that track deleted remote branches (if enabled)
  if (options.cleanupBranches) {
    console.log(
      'Cleaning up local branches that track deleted remote branches...',
    );
    if (!(await cleanupDeletedBranches(repo.path))) {
      console.log(`⚠️  Warning: Branch cleanup failed in ${repo.name}`);
      // Don't count this as an error since the main operations succeeded
    }
  } else {
    console.log('Skipping branch cleanup (use --cleanup-branches to enable)');
  }

  console.log(`✅ Successfully updated ${repo.name}`);
  return { success: true };
}

function showHelp() {
  console.log(`
Usage: update-local-repos.ts [options] <workspace_dir>

Update all git repositories in a workspace directory by checking out the main branch, pulling latest changes, and optionally cleaning up old branches.

Options:
  -h, --help              Show this help message
  -c, --cleanup-branches  Delete local branches that track deleted remote branches

Arguments:
  workspace_dir           Path to workspace directory (required)

Examples:
  deno task update-repos ~/Workspace
  deno task update-repos ~/Projects --cleanup-branches
  deno run --allow-read --allow-run --allow-env ./git/update-local-repos.ts /path/to/workspace --cleanup-branches
`);
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ['help', 'cleanup-branches'],
    alias: { h: 'help', c: 'cleanup-branches' },
    stopEarly: true,
  });

  if (args.help) {
    showHelp();
    return;
  }

  const options: UpdateOptions = {
    cleanupBranches: args['cleanup-branches'] || false,
  };

  // The first positional argument is the workspace directory
  const workspaceDir = args._[0] ? String(args._[0]) : null;

  if (!workspaceDir) {
    console.error('❌ Error: Workspace directory is required.');
    showHelp();
    Deno.exit(1);
  }

  try {
    await Deno.stat(workspaceDir);
  } catch {
    console.error(
      `❌ Error: Workspace directory '${workspaceDir}' does not exist`,
    );
    Deno.exit(1);
  }

  console.log('Starting repository update process...');
  console.log('==========================================');
  console.log(`Workspace directory: ${workspaceDir}`);

  const repositories = await getRepositories(workspaceDir);

  if (repositories.length === 0) {
    console.log('No git repositories found in the workspace directory.');
    return;
  }

  const result: UpdateResult = {
    processed: 0,
    errors: 0,
    skipped: 0,
  };

  for (const repo of repositories) {
    const updateResult = await updateRepository(repo, options);
    if (updateResult.success) {
      result.processed++;
    } else {
      console.log(updateResult.error);
      result.errors++;
    }
  }

  console.log('');
  console.log('==========================================');
  console.log('Update process completed!');
  console.log(`Repositories processed: ${result.processed}`);
  console.log(`Errors encountered: ${result.errors}`);

  if (result.errors > 0) {
    console.log(
      '⚠️  Some repositories had issues. Please review the output above.',
    );
    Deno.exit(1);
  } else {
    console.log('🎉 All repositories updated successfully!');
  }
}

if (import.meta.main) {
  await main();
}
