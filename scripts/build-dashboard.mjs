import { build } from 'esbuild-wasm';

await build({
  entryPoints: ['server/public/app.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  outfile: 'server/public/app.bundle.js',
  logLevel: 'info',
});
