import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed.${capture ? `\n${result.stderr ?? ''}` : ''}`,
    );
  }
  return result.stdout?.trim() ?? '';
}

try {
  const message = process.argv.slice(2).join(' ').trim() || 'Update Poker Bank';
  run('git', ['rev-parse', '--is-inside-work-tree'], true);
  const branch = run('git', ['branch', '--show-current'], true);
  if (branch !== 'main') {
    throw new Error('Deployment requires the main branch. Switch to main first.');
  }
  run('git', ['remote', 'get-url', 'origin'], true);
  const staged = run('git', ['diff', '--cached', '--name-only'], true);
  if (staged) {
    throw new Error('There are already staged files. Commit or unstage them before deployment.');
  }

  console.log('Running tests and production build...');
  // Invoke npm through Node to avoid Windows shell quoting and execution-policy issues.
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Run this script using npm run deploy.');
  run(process.execPath, [npmCli, 'run', 'test']);
  run(process.execPath, [npmCli, 'run', 'build']);

  const projectPaths = [
    'src', 'public', 'scripts', '.github', '.gitignore',
    'index.html', 'package.json', 'package-lock.json', 'README.md',
    'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json',
    'tsconfig.node.json', 'tailwind.config.js', 'postcss.config.js',
  ].filter((path) => existsSync(path));
  run('git', ['add', '--', ...projectPaths]);
  if (run('git', ['diff', '--cached', '--name-only'], true)) {
    run('git', [
      'commit', '-m', message,
      '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>',
    ]);
  } else {
    console.log('No new project changes to commit.');
  }
  run('git', ['push', '-u', 'origin', 'main']);
  console.log('Push completed. Check the Deploy to GitHub Pages workflow in GitHub Actions.');
  console.log('If nothing new was pushed, GitHub will not start another deployment.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('Deployment stopped. Existing commits and files have not been reverted.');
  process.exitCode = 1;
}
