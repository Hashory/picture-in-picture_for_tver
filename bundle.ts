import { bundle } from 'jsr:@deno/emit@0.45.0';
import { copy, emptyDir } from 'jsr:@std/fs@1.0.2';

async function bundleFile(sourcePath: string | URL, outputPath: string | URL) {
	const result = await bundle(sourcePath, {
		'minify': true,
	});
	await Deno.writeTextFile(outputPath, result.code);
}

async function main() {
	// Get directory URLs
	const sourceDir = new URL('./source/', import.meta.url);
	const distDir = new URL('./dist/', import.meta.url);
	const publicDir = new URL('./public/', import.meta.url);

	// Define the source files to bundle
	const sourceFiles = ['contentscript.ts'];

	// Clear the contents of the dist directory
	await emptyDir(distDir);

	// Bundle TypeScript files
	for (const file of sourceFiles) {
		await bundleFile(
			new URL(file, sourceDir),
			new URL(file.replace(/\.ts$/, '.js'), distDir),
		);
	}

	// Copy the contents of the public directory to dist
	await copy(publicDir, distDir, { overwrite: true });
}

main();
