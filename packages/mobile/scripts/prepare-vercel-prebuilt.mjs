import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const distDir = resolve(root, 'dist');
const outputDir = resolve(root, '.vercel', 'output');
const staticDir = resolve(outputDir, 'static');
const configPath = resolve(outputDir, 'config.json');

const config = {
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.html' },
  ],
};

async function main() {
  await access(distDir, constants.R_OK);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(staticDir, { recursive: true });
  await cp(distDir, staticDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(config));

  console.log('Prepared Vercel prebuilt output at .vercel/output');
}

main().catch((error) => {
  console.error('Failed to prepare Vercel prebuilt output:', error);
  process.exit(1);
});