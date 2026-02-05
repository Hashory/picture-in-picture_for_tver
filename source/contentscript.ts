import { pinpIconUrl } from './pinp_icon.ts';

/**
 * カスタムピクチャーインピクチャーボタンのクラス名
 */
const customButtonClassName = 'picture_in_picture_for_tver_pinp_button';

/**
 * 監視用アニメーション名
 */
const animationName = 'picture_in_picture_for_tver_pinp_button_appeared';

/**
 * ビデオ要素のセレクタ
 */
const videoSelector = 'video.vjs-tech';

/**
 * 初期化
 */
function initialize(): void {
	// CSSアニメーションによるDOM出現検知の準備
	injectDetectionStyle();

	// Next.jsのルーターイベントの監視
	initializeNextJsWatcher();

	// アニメーションイベントリスナー
	document.addEventListener('animationstart', handleAnimationStart, true);

	// サポート用のCSSを注入
	injectSupportStyle();

	// キーボードショートカット
	document.addEventListener('keydown', handleKeydownEvent);
}

/**
 * Next.jsのルーターイベントを監視する
 */
function initializeNextJsWatcher() {
	// MAINワールドなのでwindowオブジェクトからnextにアクセス可能
	// deno-lint-ignore no-explicit-any
	const next = (window as any).next;

	if (next && next.router && next.router.events) {
		// routeChangeComplete: ルート変更が完了した時
		next.router.events.on('routeChangeComplete', () => {
			// DOMの更新待ちで少し遅延させる
			setTimeout(addPinpButton, 500);
		});
	}
}

/**
 * サポート用のCSSを注入
 */
function injectSupportStyle() {
	const style = document.createElement('style');

	// ミニプレイヤーのボタンとツールチップの位置の調整
	style.textContent = `
    [class*="MiniPlayerController_buttons"] {
			& [class*="Tooltip_wrapper"][class*="Volume_wrapper"] {
				flex: 1;
			}

			& .${customButtonClassName} {
				+ [class*="Tooltip_tooltip"] {
					right: 0;
					left: auto;
					transform: translateX(0);
				}
			}
		}
	`;
	document.head.appendChild(style);
}

/**
 * DOM出現検知用のCSSを注入
 * コントローラーエリアが表示された瞬間にanimationstartイベントを発火させる
 */
function injectDetectionStyle() {
	const style = document.createElement('style');
	style.textContent = `
		@keyframes ${animationName} {
			from { opacity: 0.99; }
			to { opacity: 1; }
		}
` +
		// コントローラーエリア (VodController_spacer または LiveController_spacer)
		// が出現・再描画されたらアニメーションを発火
		`
		[class*="VodController_spacer"],
		[class*="LiveController_spacer"],
		[class*="Tooltip_wrapper"][class*="Volume_wrapper"] {
			animation: ${animationName} 0.001s;
		}
	`;
	document.head.appendChild(style);
}

/**
 * アニメーション開始イベントハンドラ
 * ターゲット要素が出現したタイミングでボタン追加処理を行う
 */
function handleAnimationStart(event: AnimationEvent): void {
	if (event.animationName === animationName) {
		// アニメーションターゲット自体は Spacer なので、その周辺にボタンを追加する
		addPinpButton();
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
 * ピクチャーインピクチャーボタンを追加
 */
function addPinpButton(): void {
	// 既にボタンがある場合は何もしない
	if (isButtonAdded()) return;

	// コントローラーエリアの要素のスペーサーを取得
	const controllerSpacerElement = document.querySelector(
		'[class*="VodController_spacer"]',
	) || document.querySelector('[class*="LiveController_spacer"]') ||
		// ミニプレイヤーのコントローラーの音量ボタン要素を取得
		document.querySelector(
			'[class*="Tooltip_wrapper"][class*="Volume_wrapper"]',
		) ||
		document.querySelector('[class*="Tooltip_wrapper"]');

	if (!controllerSpacerElement) return;

	// 再生ボタンのツールチップ付き要素を取得
	const buttonTooltipContainer = document.querySelector(
		'[class*="Tooltip_wrapper"]:has([class*="Button_button"][class*="Play_icon"])',
	) ||
		// 再生ボタンのツールチップ付き要素を取得
		document.querySelector(
			'[class*="Tooltip_wrapper"]:has([class*="Button_button"])',
		);
	if (buttonTooltipContainer instanceof HTMLDivElement) {
		const pinpTooltipContainer = cloneTooltipContainer(buttonTooltipContainer);
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
		img.src = pinpIconUrl; // Base64のDATA URIを使用
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
function pinp(event?: Event): void {
	if (event) {
		event.preventDefault();
		event.stopPropagation();
	}

	const videoElement = document.querySelector(videoSelector);
	if (videoElement instanceof HTMLVideoElement) {
		// 無効化を解除
		videoElement.removeAttribute('disablepictureinpicture');
		videoElement.addEventListener('enterpictureinpicture', (event) => {
			event.stopImmediatePropagation();
		}, true);

		// ピクチャーインピクチャー開始
		// 既にPiP状態なら終了、そうでなければ開始
		if (document.pictureInPictureElement) {
			document.exitPictureInPicture().catch((error) => {
				console.error('ピクチャーインピクチャーの終了に失敗:', error);
			});
		} else {
			videoElement.requestPictureInPicture().catch((error) => {
				console.error('ピクチャーインピクチャーのリクエストに失敗:', error);
				alert('ピクチャーインピクチャーに失敗しました。');
			});
		}
	} else {
		console.error('適切なビデオ要素が見つかりません');
		// ボタンをクリックしたのに動画が見つからない場合はユーザーに通知
		if (event) {
			alert('再生中の動画が見つかりません。');
		}
	}
}

/**
 * キーボードショートカットの追加
 * @param event キーボードイベント
 */
function handleKeydownEvent(event: KeyboardEvent): void {
	// 入力フォーム等では反応させない
	const target = event.target as HTMLElement;
	if (
		['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
		target.isContentEditable
	) {
		return;
	}

	if (event.key === 'P' || event.key === 'p') {
		pinp();
	}
}

// スクリプト初期化
initialize();
