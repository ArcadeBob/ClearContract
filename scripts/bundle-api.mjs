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

// Move bundled .js files into api/ and hide .ts sources so Vercel uses .js
for (const f of files) {
  const jsName = f.replace('.ts', '.js');
  const bundledSrc = `${outdir}/${jsName}`;
  const jsDst = `${apiDir}/${jsName}`;
  const tsSrc = `${apiDir}/${f}`;
  if (existsSync(bundledSrc)) {
    renameSync(bundledSrc, jsDst);
    // Rename .ts to .ts.bak so Vercel only sees .js
    if (existsSync(tsSrc)) {
      renameSync(tsSrc, `${tsSrc}.bak`);
    }
  }
}

rmSync(outdir, { recursive: true, force: true });
console.log('[bundle-api] Done');
