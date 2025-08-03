/**
 * ピクチャーインピクチャー for TVer - Service Worker
 */

// Commands APIのイベントリスナーを追加
chrome.commands.onCommand.addListener((command) => {
	console.log(`Command "${command}" triggered`);
	
	// ピクチャーインピクチャーコマンドが実行された場合
	if (command === 'toggle-picture-in-picture') {
		// 現在アクティブなタブを取得
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs[0] && tabs[0].url && tabs[0].url.includes('tver.jp')) {
				// content scriptにメッセージを送信
				chrome.tabs.sendMessage(tabs[0].id!, { action: 'trigger-pip' });
			}
		});
	}
}); 