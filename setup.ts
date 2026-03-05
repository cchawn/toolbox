#!/usr/bin/env -S deno run --allow-run --allow-env

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const proc = new Deno.Command('which', {
      args: [cmd],
      stdout: 'null',
      stderr: 'null',
    });
    const { success } = await proc.output();
    return success;
  } catch {
    return false;
  }
}

async function install(cmd: string, script: string): Promise<void> {
  if (await commandExists(cmd)) {
    console.log(`  ${cmd} ✓`);
    return;
  }

  console.log(`  Installing ${cmd}...`);
  const proc = new Deno.Command('bash', {
    args: ['-c', script],
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const { success } = await proc.output();
  if (!success) {
    console.error(`  Failed to install ${cmd}`);
    Deno.exit(1);
  }
}

async function main() {
  console.log('Setting up toolbox...');
  console.log('');
  console.log('Checking dependencies:');
  await install('direnv', 'brew install direnv');
  console.log('');
  console.log('Done.');
}

if (import.meta.main) {
  await main();
}
