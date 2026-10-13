import { defineConfig } from 'tsdown';

const base = {
	format: 'iife' as const,
	minify: true,
	platform: 'browser' as const,
	target: 'es2022',
	outDir: 'dist',
	hash: false,
	dts: false,
	outputOptions: {
		// iife既定の `[name].iife.js` をやめ、manifest.jsonの参照と一致させる。
		entryFileNames: '[name].js',
	},
};

// iifeは複数エントリを1ビルドにできないため、1エントリずつ定義する。
// cleanは全configで1回だけ実行される。
export default defineConfig([
	{
		...base,
		entry: { contentscript: 'source/contentscript.ts' },
	},
	{
		...base,
		entry: { background: 'source/background.ts' },
		copy: [{ from: 'public/**/*', to: 'dist', flatten: false }],
	},
]);
