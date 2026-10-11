// Mel-DemandScraperV2/sidebar/ui/storage.v2.js

const TOKEN_KEY = "mel_demandscraper_v2_token";

export function storageGetToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get([TOKEN_KEY], (result) => {
      resolve(result?.[TOKEN_KEY] || "");
    });
  });
}

export function storageSetToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TOKEN_KEY]: token || "" }, () => resolve(true));
  });
}

export function storageClearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([TOKEN_KEY], () => resolve(true));
  });
}