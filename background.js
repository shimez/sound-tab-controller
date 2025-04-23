// コンテキストメニューの登録
function registerContextMenu() {
  chrome.contextMenus.remove("mute-other-tabs", () => {
    if (chrome.runtime.lastError) {
      console.log("No existing menu to remove:", chrome.runtime.lastError.message);
    }
    chrome.contextMenus.create({
      id: "mute-other-tabs",
      title: chrome.i18n.getMessage("muteOtherTabs"),
      contexts: ["page"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error creating context menu:", chrome.runtime.lastError.message);
      } else {
        console.log("Context menu created successfully");
      }
    });
  });
}

// サービスワーカー起動時にメニュー登録を遅延
setTimeout(registerContextMenu, 100);

// コンテキストメニュークリック時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "mute-other-tabs" && tab) {
    console.log(`Context menu clicked: Mute other tabs except tab ID ${tab.id}, active: ${tab.active}`);
    chrome.windows.getAll({ populate: true }, (windows) => {
      if (chrome.runtime.lastError) {
        console.error("Error in chrome.windows.getAll:", chrome.runtime.lastError);
        return;
      }

      console.log(`Found ${windows.length} windows`);
      // アクティブタブを特定（クリックされたタブがアクティブと仮定）
      const activeTab = tab;
      if (!activeTab) {
        console.warn("No active tab provided");
        return;
      }

      // すべてのウィンドウの音タブをチェック、アクティブタブ以外をミュート
      let audibleTabCount = 0;
      windows.forEach((window) => {
        const audibleTabs = window.tabs.filter((t) => t.audible && t.id !== activeTab.id);
        audibleTabCount += audibleTabs.length;
        audibleTabs.forEach((t) => {
          console.log(`Muting tab: ${t.title} (ID: ${t.id}) in window ${window.id}`);
          chrome.tabs.update(t.id, { muted: true }, () => {
            if (chrome.runtime.lastError) {
              console.error(`Tab mute failed for tab ${t.id}:`, chrome.runtime.lastError);
            } else {
              console.log(`Successfully muted tab ${t.id}`);
            }
          });
        });
      });
      console.log(`Total audible tabs muted: ${audibleTabCount}`);
    });
  } else {
    console.warn("Invalid context menu click: menuItemId or tab missing", info, tab);
  }
});

// バッジ更新処理（変更なし）
function updateBadge() {
  chrome.windows.getAll({ populate: true }, (windows) => {
    let audibleTabCount = 0;
    windows.forEach((window) => {
      audibleTabCount += window.tabs.filter((tab) => tab.audible).length;
    });
    chrome.action.setBadgeText({ text: audibleTabCount > 0 ? `${audibleTabCount}` : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  });
}

chrome.tabs.onUpdated.addListener(updateBadge);
chrome.windows.onCreated.addListener(updateBadge);
chrome.windows.onRemoved.addListener(updateBadge);
updateBadge();