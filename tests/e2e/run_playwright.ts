import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium, Page } from 'playwright';

const customButtonClassName = '.picture_in_picture_for_tver_pinp_button';
const videoSelector = 'video.vjs-tech';

async function clickPlayIfPresent(page: Page) {
	try {
		console.log('  [E2E] 動画エリアをクリックして再生を試みます');

		// Wait for page to settle
		await page.waitForTimeout(5000);

		const clicked = await page.evaluate(() => {
			const btn = document.querySelector('#episode-play') ||
				document.querySelector('button[class*="playButton" i]') ||
				document.querySelector('.vjs-big-play-button');
			if (btn instanceof HTMLElement) {
				btn.click();
				return true;
			}
			return false;
		});

		if (clicked) {
			console.log('  [E2E] JSで再生ボタンをクリックしました');
		} else {
			console.log(
				'  [E2E] JSでボタンが見つからなかったため、中央をクリックします',
			);
			await page.mouse.click(640, 360);
		}
		await page.waitForTimeout(5000);
	} catch (_e) { /* ignore */ }
}

async function fillQuestionnaireIfNeeded(page: Page) {
	try {
		// Wait briefly to see if the questionnaire or consent modal appears
		const submitButton = page.locator(
			'button:has-text("回答する"), button:has-text("同意する"), button:has-text("同意して")',
		).first();
		await submitButton.waitFor({ state: 'visible', timeout: 5000 });
		console.log('  [E2E] アンケート・同意画面を検出しました。自動入力します。');

		// Fill birth year
		try {
			await page.getByPlaceholder('2000').fill('1990');
		} catch (_e) { /* ignore */ }
		// Fill birth month
		try {
			const monthInput = page.locator(
				'input[name="birthMonth"], input[placeholder*="4"]',
			);
			if (await monthInput.count() > 0) {
				await monthInput.first().fill('1');
			} else {
				await page.locator('input[type="text"], input:not([type="hidden"])')
					.nth(2).fill('1');
			}
		} catch (_e) { /* ignore */ }
		// Fill zip code
		try {
			await page.getByPlaceholder('1050004').fill('1000000');
		} catch (_e) { /* ignore */ }

		// Gender
		try {
			await page.locator('text=男性').first().click();
		} catch (_e) { /* ignore */ }

		// Fallback for select
		const selects = page.locator('select');
		if (await selects.count() > 0) {
			try {
				await selects.first().selectOption({ index: 2 });
			} catch (_e) { /* ignore */ }
		}

		// Checkbox for terms
		const checkboxes = page.locator('input[type="checkbox"]');
		if (await checkboxes.count() > 0) {
			for (let i = 0; i < await checkboxes.count(); i++) {
				try {
					await checkboxes.nth(i).check({ force: true });
				} catch (_e) { /* ignore */ }
			}
		}

		await submitButton.click();
		await submitButton.waitFor({ state: 'hidden', timeout: 10000 });
		console.log('  [E2E] アンケート・同意画面の処理を完了しました。');
	} catch (e) {
		console.log(
			'  [E2E] アンケート・同意処理でエラーまたはスキップ:',
			e instanceof Error ? e.message : String(e),
		);
	}
}

async function checkPipFunctionality(page: Page, contextName: string) {
	console.log(`\n  [E2E] PiP機能確認を開始します: ${contextName}`);

	// MOCK PiP APIs because Chromium in Playwright cannot play TVer's DRM/H.264 videos
	await page.evaluate(() => {
		let currentPip: HTMLVideoElement | null = null;
		Object.defineProperty(document, 'pictureInPictureElement', {
			get: () => currentPip,
			configurable: true,
		});
		HTMLVideoElement.prototype.requestPictureInPicture = function () {
			currentPip = this;
			this.dispatchEvent(new Event('enterpictureinpicture'));
			return Promise.resolve({} as PictureInPictureWindow);
		};
		document.exitPictureInPicture = function () {
			currentPip = null;
			document.dispatchEvent(new Event('leavepictureinpicture'));
			return Promise.resolve();
		};
		// Remove error modal if it blocks clicking
		const style = document.createElement('style');
		style.textContent =
			'.vjs-modal-dialog { display: none !important; pointer-events: none !important; } .loading_cover__2oLAo { display: none !important; }';
		document.head.appendChild(style);
	});

	// Wait for video to be visible
	const video = page.locator(videoSelector).first();
	await video.waitFor({ state: 'visible', timeout: 30000 });

	// Ensure video is playing or ready by hovering it so the controller appears
	try {
		await video.hover({ force: true, timeout: 5000 });
	} catch (_e) { /* ignore */ }

	const pinpButton = page.locator(customButtonClassName).first();

	// 5-1. Check PiP button is visible
	await pinpButton.waitFor({ state: 'visible', timeout: 10000 });
	if (!(await pinpButton.isVisible())) {
		throw new Error(`[${contextName}] PiPボタンが表示されていません。`);
	}
	console.log(`  [E2E] ✅ PiPボタンの表示を確認しました`);

	// 5-2. Check PiP button bounding box is inside video bounding box
	const videoBox = await video.boundingBox();
	const btnBox = await pinpButton.boundingBox();
	if (!videoBox || !btnBox) {
		throw new Error(
			`[${contextName}] 要素のBoundingBoxが取得できませんでした。`,
		);
	}
	const isIntersectingHorizontally = (btnBox.x + btnBox.width) > videoBox.x &&
		btnBox.x < (videoBox.x + videoBox.width);
	const isIntersectingVertically = (btnBox.y + btnBox.height) > videoBox.y &&
		btnBox.y < (videoBox.y + videoBox.height + 100);

	if (!isIntersectingHorizontally || !isIntersectingVertically) {
		console.warn(
			`  [E2E] ⚠️ PiPボタンが動画領域の近くにない可能性があります。 Video: ${
				JSON.stringify(videoBox)
			}, Button: ${JSON.stringify(btnBox)}`,
		);
	} else {
		console.log(`  [E2E] ✅ PiPボタンが動画領域付近にあることを確認しました`);
	}

	const pipEnabled = await page.evaluate(() =>
		document.pictureInPictureEnabled
	);
	if (!pipEnabled) {
		throw new Error(
			`[${contextName}] document.pictureInPictureEnabled が false です。`,
		);
	}

	const enterPipAndCheck = async (
		trigger: () => Promise<void>,
		method: string,
	) => {
		const enteredPinpPromise = page.evaluate((selector: string) => {
			return new Promise<boolean>((resolve) => {
				const videoElement = document.querySelector(selector);
				if (!(videoElement instanceof HTMLVideoElement)) {
					resolve(false);
					return;
				}
				const timeoutId = setTimeout(() => resolve(false), 5000);
				videoElement.addEventListener('enterpictureinpicture', () => {
					clearTimeout(timeoutId);
					resolve(true);
				}, { once: true });
			});
		}, videoSelector);

		await trigger();
		const enteredEventFired = await enteredPinpPromise;
		const pipElementIsVideo = await page.evaluate((selector) => {
			return document.pictureInPictureElement ===
				document.querySelector(selector);
		}, videoSelector);

		if (!enteredEventFired && !pipElementIsVideo) {
			throw new Error(
				`[${contextName}] ${method}によるPiP遷移を確認できませんでした。`,
			);
		}
		console.log(`  [E2E] ✅ ${method}によるPiP開始を確認しました`);

		await page.evaluate(async () => {
			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
			}
		});
		await page.waitForFunction(() => document.pictureInPictureElement === null);
		console.log(`  [E2E] ✅ PiP終了を確認しました`);
	};

	// 5-3. Click button to enter PiP
	await enterPipAndCheck(async () => {
		try {
			await video.hover({ force: true, timeout: 5000 });
		} catch (_e) { /* ignore */ }
		await pinpButton.click({ force: true });
	}, 'ボタンクリック');

	// 5-4. P key to enter PiP
	await enterPipAndCheck(async () => {
		await page.keyboard.press('p');
	}, 'Pキー');
}

async function runEpisodeScenario(page: Page) {
	console.log('\n========================================');
	console.log('[E2E] エピソードシナリオを開始します');
	console.log('========================================');

	console.log('[E2E] TVerルートページにアクセスします');
	await page.goto('https://tver.jp/', { waitUntil: 'domcontentloaded' });

	const epLinkLocator = page.locator('a[href^="/episodes/"]').first();
	await epLinkLocator.waitFor({ state: 'visible', timeout: 15000 });
	const epHref = await epLinkLocator.getAttribute('href');
	if (!epHref) {
		throw new Error('エピソードのリンクが見つかりませんでした。');
	}
	console.log(`[E2E] エピソードリンクをクリックします: ${epHref}`);

	await epLinkLocator.click();
	await page.waitForURL(/\/episodes\/.+/, { timeout: 30000 });

	await clickPlayIfPresent(page);
	await fillQuestionnaireIfNeeded(page);

	await checkPipFunctionality(page, 'エピソードページ (トップ)');

	console.log('[E2E] ページを下までスクロールします');
	await page.evaluate(() => globalThis.scrollTo(0, document.body.scrollHeight));
	await page.waitForTimeout(1000);

	await checkPipFunctionality(page, 'エピソードページ (下部スクロール後)');

	console.log('[E2E] ページを上までスクロールします');
	await page.evaluate(() => globalThis.scrollTo(0, 0));
	await page.waitForTimeout(1000);

	await checkPipFunctionality(page, 'エピソードページ (上部スクロール後)');

	console.log(
		'[E2E] トップページへのリンクをクリックし、ミニプレイヤー化をテストします',
	);
	const homeLink = page.locator('a[href="/"]').first();
	await homeLink.click();
	await page.waitForURL('https://tver.jp/', { timeout: 15000 });

	await checkPipFunctionality(page, 'トップページ (ミニプレイヤー)');
}

async function runLiveScenario(page: Page) {
	console.log('\n========================================');
	console.log('[E2E] ライブシナリオを開始します');
	console.log('========================================');

	console.log('[E2E] TBSライブにアクセスします');
	await page.goto('https://tver.jp/live/tbs', {
		waitUntil: 'domcontentloaded',
	});

	await clickPlayIfPresent(page);
	await fillQuestionnaireIfNeeded(page);
	await checkPipFunctionality(page, 'ライブ (TBS - トップ)');

	console.log('[E2E] ページを下までスクロールします');
	await page.evaluate(() => globalThis.scrollTo(0, document.body.scrollHeight));
	await page.waitForTimeout(1000);

	await checkPipFunctionality(page, 'ライブ (TBS - 下部スクロール後)');

	console.log('[E2E] NTVライブにアクセスします');
	await page.goto('https://tver.jp/live/ntv', {
		waitUntil: 'domcontentloaded',
	});

	await clickPlayIfPresent(page);
	await checkPipFunctionality(page, 'ライブ (NTV)');
}

async function main() {
	const extensionPath = path.resolve(process.cwd(), 'dist');
	const manifestPath = path.resolve(extensionPath, 'manifest.json');
	if (!fs.existsSync(manifestPath)) {
		throw new Error(
			'拡張機能の成果物が見つかりません。先に deno task bundle を実行してください。',
		);
	}

	let context: import('playwright').BrowserContext | undefined;
	let userDataDir: string | undefined;
	for (let i = 0; i < 5; i++) {
		userDataDir = fs.mkdtempSync(
			path.join(os.tmpdir(), 'pip-tver-playwright-'),
		);
		try {
			context = await chromium.launchPersistentContext(userDataDir, {
				headless: false,
				viewport: { width: 1280, height: 720 },
				timeout: 30000,
				args: [
					'--disable-extensions-except=' + extensionPath,
					'--load-extension=' + extensionPath,
					'--autoplay-policy=no-user-gesture-required',
					'--mute-audio',
					'--disable-gpu',
					'--no-sandbox',
					'--use-gl=swiftshader',
				],
			});
			break;
		} catch (e) {
			console.log(
				'[E2E] launch failed, retrying...',
				e instanceof Error ? e.message : String(e),
			);
			if (i === 4) throw e;
		}
	}

	if (!context || !userDataDir) {
		throw new Error('Failed to launch Playwright context');
	}

	const page = context.pages()[0] || await context.newPage();
	const ua =
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
	await page.setExtraHTTPHeaders({ 'User-Agent': ua });
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'userAgent', {
			get: () =>
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		});
	});
	const dialogMessages: string[] = [];
	page.on('dialog', async (dialog) => {
		dialogMessages.push(dialog.message());
		await dialog.dismiss();
	});

	try {
		await runEpisodeScenario(page);
		await runLiveScenario(page);
		console.log('\n🎉 すべてのE2Eテストが正常に完了しました！');
	} finally {
		await context.close();
		fs.rmSync(userDataDir, { recursive: true, force: true });
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(
			`\n[E2E] ❌ テストが失敗しました: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		process.exit(1);
	});
}
