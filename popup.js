document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('audibleTabs');
  const muteButton = document.getElementById('muteOtherTabs');
  if (!list || !muteButton) {
    console.error('Error: audibleTabs or muteOtherTabs element not found');
    return;
  }

  // 翻訳処理を遅延実行
  function applyTranslations(attempt = 1, maxAttempts = 3) {
    const elements = document.querySelectorAll('[data-i18n]');
    console.log(`Attempt ${attempt}: Found ${elements.length} elements with data-i18n`);
    
    if (elements.length === 0 && attempt < maxAttempts) {
      console.warn(`No elements found, retrying in ${attempt * 100}ms`);
      setTimeout(() => applyTranslations(attempt + 1, maxAttempts), attempt * 100);
      return;
    }

    elements.forEach(elem => {
      const key = elem.getAttribute('data-i18n');
      const message = chrome.i18n.getMessage(key);
      console.log(`Translating key: ${key}, message: ${message}, language: ${chrome.i18n.getUILanguage()}`);
      if (message) {
        elem.textContent = message;
      } else {
        console.warn(`Translation missing for key: ${key}`);
      }
    });
  }

  // DOMロード後に翻訳を遅延実行
  setTimeout(() => applyTranslations(), 100);

  // ポップアップの内容を更新する関数
  function updatePopup() {
    list.innerHTML = ''; // リストをクリア
    chrome.windows.getAll({ populate: true }, (windows) => {
      if (chrome.runtime.lastError) {
        console.error('Error in chrome.windows.getAll:', chrome.runtime.lastError);
        const li = document.createElement('li');
        li.textContent = chrome.i18n.getMessage("errorLoadingTabs");
        li.className = 'no-tabs';
        list.appendChild(li);
        muteButton.disabled = true;
        return;
      }

      console.log('Windows retrieved:', windows.length);
      let audibleTabCount = 0;
      windows.forEach((window, windowIndex) => {
        const audibleTabs = window.tabs.filter((tab) => tab.audible);
        console.log(`Window ${windowIndex + 1}: ${audibleTabs.length} audible tabs, focused: ${window.focused}`);
        audibleTabs.forEach((tab) => {
          audibleTabCount++;
          const li = document.createElement('li');
          li.textContent = `${tab.title}${tab.muted ? chrome.i18n.getMessage("tabMuted") : ''}`;
          li.title = `Window ${windowIndex + 1}: ${tab.title}${tab.muted ? chrome.i18n.getMessage("tabMuted") : ''}`;
          li.addEventListener('click', () => {
            console.log(`Switching to tab: ${tab.title} in window ${window.id}`);
            chrome.windows.update(window.id, { focused: true }, () => {
              if (chrome.runtime.lastError) {
                console.error('Window update failed:', chrome.runtime.lastError);
                return;
              }
              chrome.tabs.update(tab.id, { active: true }, () => {
                if (chrome.runtime.lastError) {
                  console.error('Tab update failed:', chrome.runtime.lastError);
                }
              });
            });
          });
          list.appendChild(li);
        });
      });

      if (audibleTabCount === 0) {
        console.log('No audible tabs found');
        const li = document.createElement('li');
        li.textContent = chrome.i18n.getMessage("noAudibleTabs");
        li.className = 'no-tabs';
        list.appendChild(li);
        muteButton.disabled = true;
      } else {
        muteButton.disabled = false;
      }
    });
  }

  // 初回表示
  updatePopup();

  // ミュートボタンのクリック処理
  muteButton.addEventListener('click', () => {
    chrome.windows.getCurrent({ populate: true }, (activeWindow) => {
      if (chrome.runtime.lastError || !activeWindow) {
        console.error('Error in chrome.windows.getCurrent:', chrome.runtime.lastError || 'No current window');
        return;
      }

      chrome.windows.getAll({ populate: true }, (windows) => {
        if (chrome.runtime.lastError) {
          console.error('Error in chrome.windows.getAll:', chrome.runtime.lastError);
          return;
        }

        muteTabs(activeWindow, windows);
        window.close(); // ポップアップを閉じる
      });
    });
  });

  // ミュート処理の関数
  function muteTabs(activeWindow, windows) {
    console.log(`Active window ID: ${activeWindow.id}`);
    // アクティブウィンドウのアクティブタブを特定
    const activeTab = activeWindow.tabs.find((tab) => tab.active);
    if (!activeTab) {
      console.warn('No active tab found in active window');
    }

    // すべての音タブをチェックし、アクティブタブ以外をミュート
    windows.forEach((window) => {
      const audibleTabs = window.tabs.filter((tab) => 
        tab.audible && (!activeTab || tab.id !== activeTab.id)
      );
      audibleTabs.forEach((tab) => {
        console.log(`Muting tab: ${tab.title} in window ${window.id}`);
        chrome.tabs.update(tab.id, { muted: true }, () => {
          if (chrome.runtime.lastError) {
            console.error('Tab mute failed:', chrome.runtime.lastError);
          }
        });
      });
    });
  }
});