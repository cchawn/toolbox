import { join } from 'jsr:@std/path';
import { ensureDir } from 'jsr:@std/fs';

export function getConfigDir(): string {
  const xdgConfigHome = Deno.env.get('XDG_CONFIG_HOME');
  if (xdgConfigHome) {
    return join(xdgConfigHome, 'toolbox');
  }
  const home = Deno.env.get('HOME') ?? Deno.env.get('USERPROFILE') ?? '';
  return join(home, '.config', 'toolbox');
}

export async function loadConfig<T>(filename: string): Promise<T | null> {
  const configPath = join(getConfigDir(), filename);
  try {
    const text = await Deno.readTextFile(configPath);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function saveConfig(
  filename: string,
  data: unknown,
): Promise<void> {
  const configDir = getConfigDir();
  await ensureDir(configDir);
  const configPath = join(configDir, filename);
  await Deno.writeTextFile(configPath, JSON.stringify(data, null, 2) + '\n');
}
