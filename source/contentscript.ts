/**
 * カスタムピクチャーインピクチャーボタンのクラス名
 */
const customButtonClassName = 'picture-in-picture_for_tver_pinp_button';

/**
 * プレイヤーコンテナのセレクタ
 */
const playerContainerSelector = '[class*="player_container"]';

/**
 * プレイヤーコンテナのセレクタ2
 */
const episodePlayerContainerSelector = '[class*="PlayerLayout_jail"]';

/**
 * ビデオ要素のセレクタ
 */
const videoSelector = 'video.vjs-tech';

/**
 * ピクチャーインピクチャーボタンのアイコンURL
 */
const buttonIconUrl = '/pinp.svg';

/**
 * 初期化: ビデオの再生イベントを監視し、ボタンを追加
 */
function initialize(): void {
	document.body.addEventListener('play', handlePlayEvent, {
		capture: true,
		passive: true,
	});
}

/**
 * 再生イベントハンドラ
 * @param event 再生イベント
 */
function handlePlayEvent(event: Event): void {
	if (event.target instanceof HTMLVideoElement && !isButtonAdded()) {
		observePlayerContainer();
	}
}

/**
 * ピクチャーインピクチャーボタンが既に存在するか確認
 * @returns ボタンが存在する場合はtrue
 */
function isButtonAdded(): boolean {
	return !!document.querySelector(`.${customButtonClassName}`);
}

/**
 * プレイヤーコンテナの変更を監視し、必要な場合にボタンを追加
 */
function observePlayerContainer(): void {
	const playerContainerElement = document.querySelector(
		playerContainerSelector,
	) || document.querySelector(episodePlayerContainerSelector);
	if (!playerContainerElement) return;

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.addedNodes.length > 0) {
				addPinpButton();
				observer.disconnect(); // ボタンが追加されたら監視を終了
			}
		}
	});

	observer.observe(playerContainerElement, { childList: true, subtree: true });
}

/**
 * ピクチャーインピクチャーボタンを追加
 */
function addPinpButton(): void {
	const controllerSpacerElement = document.querySelector(
		'[class*="VodController_spacer"]',
	) || document.querySelector('[class*="LiveController_spacer"]');
	if (!controllerSpacerElement || isButtonAdded()) return;

	const nextTooltipContainer = controllerSpacerElement.nextElementSibling;
	if (nextTooltipContainer instanceof HTMLDivElement) {
		const pinpTooltipContainer = cloneTooltipContainer(nextTooltipContainer);
		controllerSpacerElement.insertAdjacentElement(
			'afterend',
			pinpTooltipContainer,
		);
	}
}

/**
 * ツールチップコンテナーの複製と内容の更新
 * @param original 複製元のツールチップコンテナー
 * @returns 複製したツールチップコンテナー
 */
function cloneTooltipContainer(original: HTMLDivElement): HTMLDivElement {
	const clonedContainer = original.cloneNode(true) as HTMLDivElement;
	updateTooltipContent(clonedContainer);
	return clonedContainer;
}

/**
 * 複製したツールチップの内容を更新
 * @param container ツールチップコンテナー
 */
function updateTooltipContent(container: HTMLDivElement): void {
	const buttonContentDiv = container.querySelector('[class*="Button_content"]');
	if (buttonContentDiv) {
		const img = document.createElement('img');
		img.src = chrome.runtime.getURL(buttonIconUrl);
		img.alt = 'ピクチャーインピクチャー';
		img.style.filter = 'brightness(1.3)';
		img.style.display = 'block';
		img.style.inlineSize = '100%';
		buttonContentDiv.innerHTML = ''; // 既存の内容をクリア
		buttonContentDiv.appendChild(img);
	}

	const tooltip = container.querySelector('[class*="Tooltip_tooltip"]');
	if (tooltip) {
		tooltip.textContent = 'ピクチャーインピクチャー';
	}

	const button = container.querySelector('button');
	if (button) {
		button.setAttribute('aria-label', 'ピクチャーインピクチャー');
		button.removeAttribute('aria-haspopup');
		button.removeAttribute('aria-expanded');
		button.removeAttribute('aria-controls');
		button.removeAttribute('data-state');

		button.classList.add(customButtonClassName);
		button.addEventListener('click', pinp);
	}
}

/**
 * ピクチャーインピクチャー機能を実行
 */
function pinp(): void {
	const videoElement = document.querySelector(videoSelector);
	if (videoElement instanceof HTMLVideoElement) {
		// 無効化を解除
		videoElement.removeAttribute('disablepictureinpicture');
		videoElement.addEventListener('enterpictureinpicture', (event) => {
			event.stopImmediatePropagation();
		}, true);

		// ピクチャーインピクチャー開始
		videoElement.requestPictureInPicture().catch((error) => {
			console.error('ピクチャーインピクチャーのリクエストに失敗:', error);
			alert('ピクチャーインピクチャーに失敗しました。');
		});
	} else {
		console.error('適切なビデオ要素が見つかりません');
		alert('ピクチャーインピクチャーに失敗しました。');
	}
}

/**
 * メッセージリスナーを追加
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'trigger-pip') {
		pinp();
	}
});

// スクリプト初期化
initialize();
