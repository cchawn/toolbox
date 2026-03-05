import { Command } from 'jsr:@cliffy/command@1';
import { contributionStatsCommand } from './commands/git/contribution-stats.ts';
import { updateReposCommand } from './commands/git/update-repos.ts';
import { parseTransactionsCommand } from './commands/budget/parse-transactions.ts';
import { initConfigCommand } from './commands/budget/init-config.ts';
import { oldDirsCommand } from './commands/cleanup/old-dirs.ts';

const git = new Command()
  .description('Git utilities')
  .command('contribution-stats', contributionStatsCommand)
  .command('update-repos', updateReposCommand);

const budget = new Command()
  .description('Budget utilities')
  .command('parse-transactions', parseTransactionsCommand)
  .command('init-config', initConfigCommand);

const cleanup = new Command()
  .description('Cleanup utilities')
  .command('old-dirs', oldDirsCommand);

await new Command()
  .name('toolbox')
  .version('0.1.0')
  .description('A collection of CLI tools for day-to-day productivity.')
  .command('git', git)
  .command('budget', budget)
  .command('cleanup', cleanup)
  .parse(Deno.args);
