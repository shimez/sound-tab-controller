// コンテキストメニューの登録
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

// コンテキストメニュークリック時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "mute-other-tabs" && tab) {
    console.log(`Context menu clicked: Mute other tabs except tab ID ${tab.id}`);
    chrome.windows.getAll({ populate: true }, (windows) => {
      if (chrome.runtime.lastError) {
        console.error('Error in chrome.windows.getAll:', chrome.runtime.lastError);
        return;
      }

      windows.forEach((window) => {
        const audibleTabs = window.tabs.filter((tab) => tab.audible && tab.id !== tab.id);
        audibleTabs.forEach((tab) => {
          console.log(`Muting tab: ${tab.title} in window ${window.id}`);
          chrome.tabs.update(tab.id, { muted: true }, () => {
            if (chrome.runtime.lastError) {
              console.error('Tab mute failed:', chrome.runtime.lastError);
            }
          });
        });
      });
    });
  }
});

// バッジ更新処理
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