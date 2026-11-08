import { defineConfig } from 'vite-plus';

const base = {
	format: 'iife' as const,
	minify: true,
	platform: 'browser' as const,
	target: 'es2022',
	outDir: 'dist',
	hash: false,
	dts: false,
	outputOptions: {
		entryFileNames: '[name].js',
	},
};

export default defineConfig({
	pack: [
		{
			...base,
			entry: { contentscript: 'source/contentscript.ts' },
		},
		{
			...base,
			entry: { background: 'source/background.ts' },
			copy: [{ from: 'public/**/*', to: 'dist', flatten: false }],
		},
	],
	fmt: {
		useTabs: true,
		singleQuote: true,
		printWidth: 80,
	},
	lint: {
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
});
