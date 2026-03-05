import { Command } from 'jsr:@cliffy/command@1';
import { loadConfig, saveConfig } from '../../lib/config.ts';
import {
  DEFAULT_EXACT_MATCHES,
  DEFAULT_KEYWORD_PATTERNS,
} from './categorizer.ts';

export const initConfigCommand = new Command()
  .description('Write default budget categorizer config')
  .option('--force', 'Overwrite existing config')
  .action(async ({ force }: { force?: boolean }) => {
    const existing = await loadConfig('budget.json');
    if (existing && !force) {
      console.warn(
        'Config file already exists at ~/.config/toolbox/budget.json',
      );
      console.warn('Use --force to overwrite.');
      Deno.exit(1);
    }

    const config = {
      exactMatches: DEFAULT_EXACT_MATCHES,
      keywordPatterns: DEFAULT_KEYWORD_PATTERNS,
    };

    await saveConfig('budget.json', config);
    console.log('Wrote default config to ~/.config/toolbox/budget.json');
  });
