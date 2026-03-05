#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env

import { parseArgs } from 'jsr:@std/cli';

const CUTOFF_DAYS = 180;

interface DirInfo {
  name: string;
  path: string;
  modifiedAt: Date;
}

async function getDirectories(targetDir: string): Promise<DirInfo[]> {
  const dirs: DirInfo[] = [];

  for await (const entry of Deno.readDir(targetDir)) {
    if (!entry.isDirectory || entry.name.startsWith('.')) continue;

    const fullPath = `${targetDir}/${entry.name}`;
    const stat = await Deno.stat(fullPath);
    if (stat.mtime) {
      dirs.push({
        name: entry.name,
        path: fullPath,
        modifiedAt: stat.mtime,
      });
    }
  }

  return dirs.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function listAllDirs(targetDir: string): Promise<void> {
  const cmd = new Deno.Command('ls', {
    args: ['-laht'],
    cwd: targetDir,
    stdout: 'piped',
  });
  const { stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout);
  const dirLines = output
    .split('\n')
    .filter((line) => line.startsWith('d') && !line.endsWith('.'));
  console.log('All directories (newest first):');
  console.log('--------------------------------');
  for (const line of dirLines) {
    console.log(line);
  }
  console.log('');
}

function showHelp() {
  console.log(`
Usage: cleanup-old-dirs.ts [options] <target_dir>

Remove directories not modified in the last ${CUTOFF_DAYS} days.

Options:
  -h, --help     Show this help message
  --delete       Actually delete (default is dry run)

Arguments:
  target_dir     Path to directory to clean up (required)

Examples:
  deno task cleanup-old-dirs ~/Workspace
  deno task cleanup-old-dirs ~/Workspace --delete
`);
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ['help', 'delete'],
    alias: { h: 'help' },
    stopEarly: true,
  });

  if (args.help) {
    showHelp();
    return;
  }

  const targetDir = args._[0] ? String(args._[0]) : null;

  if (!targetDir) {
    console.error('Error: Target directory is required.');
    showHelp();
    Deno.exit(1);
  }

  try {
    await Deno.stat(targetDir);
  } catch {
    console.error(`Error: Directory '${targetDir}' does not exist`);
    Deno.exit(1);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CUTOFF_DAYS);

  console.log(`Target: ${targetDir}`);
  console.log(`Cutoff: ${formatDate(cutoffDate)} (${CUTOFF_DAYS} days ago)`);
  console.log('');

  await listAllDirs(targetDir);

  const dirs = await getDirectories(targetDir);
  const oldDirs = dirs.filter((d) => d.modifiedAt < cutoffDate);

  if (oldDirs.length === 0) {
    console.log(`No directories older than ${CUTOFF_DAYS} days found.`);
    return;
  }

  console.log(
    `Directories to remove (not modified in ${CUTOFF_DAYS} days):`,
  );
  console.log('-----------------------------------------------------------');
  for (const dir of oldDirs) {
    console.log(
      `  ${dir.name.padEnd(40)} (last modified: ${formatDate(dir.modifiedAt)})`,
    );
  }
  console.log('');
  console.log(`Total: ${oldDirs.length} directories`);

  if (!args.delete) {
    console.log('');
    console.log('[DRY RUN] No files deleted. Run with --delete to remove.');
    return;
  }

  console.log('');
  const buf = new Uint8Array(1024);
  const encoder = new TextEncoder();
  await Deno.stdout.write(
    encoder.encode(`Delete these ${oldDirs.length} directories? (y/N) `),
  );
  const n = await Deno.stdin.read(buf);
  const answer = new TextDecoder().decode(buf.subarray(0, n ?? 0)).trim();

  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted.');
    return;
  }

  for (const dir of oldDirs) {
    console.log(`Removing: ${dir.name}`);
    await Deno.remove(dir.path, { recursive: true });
  }

  console.log(`Done. Removed ${oldDirs.length} directories.`);
}

if (import.meta.main) {
  await main();
}
