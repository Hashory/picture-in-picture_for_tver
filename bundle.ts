import { copy, emptyDir } from 'jsr:@std/fs@1.0.2';

async function bundleFile(sourcePath: string | URL, outputPath: string | URL) {
	console.log(`Bundling ${sourcePath} to ${outputPath}`);
	const result = await Deno.bundle({
		entrypoints: [sourcePath.toString()],
		output: outputPath.toString(),
		platform: "browser",
		minnify: true,
		write: true,
	})
	console.log(result)
	// await Deno.writeTextFile(outputPath, result.code);
}

async function main() {
	// Get directory URLs
	const sourceDir = new URL('./source/', import.meta.url);
	const distDir = new URL('./dist/', import.meta.url);
	const publicDir = new URL('./public/', import.meta.url);

	// Define the source files to bundle
	const sourceFiles = ['contentscript.ts', 'background.ts'];

	// Clear the contents of the dist directory
	await emptyDir(distDir);

	// Bundle TypeScript files
	for (const file of sourceFiles) {
		await bundleFile(
			new URL(file, sourceDir),
			new URL(distDir),
		);
	}

	// Copy the contents of the public directory to dist
	await copy(publicDir, distDir, { overwrite: true });
}

main();
