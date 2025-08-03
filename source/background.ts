/**
 * ピクチャーインピクチャー for TVer - Service Worker
 */

// Commands APIのイベントリスナーを追加
chrome.commands.onCommand.addListener(async (command) => {
	// ピクチャーインピクチャーコマンドが実行された場合
	if (command === 'toggle-picture-in-picture') {
		// 現在アクティブなタブを取得
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

		if (tab?.id && tab.url?.includes('tver.jp')) {
			try {
				// content scriptにメッセージを送信
				await chrome.tabs.sendMessage(tab.id, { action: 'trigger-pip' });
			} catch (error) {
				console.error('Failed to send message to content script:', error);
			}
		}
	}
});