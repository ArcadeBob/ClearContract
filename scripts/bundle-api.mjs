import { build } from 'esbuild';
import { readdirSync, rmSync, renameSync, existsSync } from 'fs';

// Find all non-test .ts files in api/ (top-level only)
const apiDir = 'api';
const outdir = 'api-bundled';

const files = readdirSync(apiDir)
  .filter(f => f.endsWith('.ts') && !f.includes('.test.'));
// nosemgrep: path-join-resolve-traversal — filenames from hardcoded readdirSync, not user input
const entryPoints = files.map(f => `${apiDir}/${f}`);

console.log('[bundle-api] Bundling %d functions', entryPoints.length);

await build({
  entryPoints,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir,
  outExtension: { '.js': '.js' },
  external: [
    '@anthropic-ai/sdk',
    '@supabase/supabase-js',
    '@vercel/node',
    'zod',
    'zod-to-json-schema',
    'undici',
    'crypto',
  ],
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  sourcemap: false,
  minify: false,
});

// Move bundled .js files into api/, replacing .ts source for Vercel
for (const f of files) {
  const jsName = f.replace('.ts', '.js');
  const src = `${outdir}/${jsName}`;
  const dst = `${apiDir}/${jsName}`;
  if (existsSync(src)) {
    renameSync(src, dst);
  }
}

rmSync(outdir, { recursive: true, force: true });
console.log('[bundle-api] Done');
