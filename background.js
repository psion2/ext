chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "MEL_V2_TOGGLE_SIDEBAR",
    });
  } catch (err) {
    console.error("Failed to toggle sidebar:", err);
  }
});

function toCompanyAboutUrl(companyUrl) {
  try {
    if (!companyUrl) return null;

    const url = new URL(companyUrl);
    const match = url.pathname.match(/^\/(company|school|showcase)\/([^/]+)/i);

    if (!match) return companyUrl;

    return `${url.origin}/${match[1]}/${match[2]}/about/`;
  } catch {
    return companyUrl || null;
  }
}

function waitForTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let done = false;

    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(handleUpdated);
      reject(new Error("Timed out waiting for company page to load."));
    }, timeoutMs);

    function handleUpdated(updatedTabId, changeInfo, tab) {
      if (done) return;
      if (updatedTabId !== tabId) return;
      if (changeInfo.status !== "complete") return;

      done = true;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
      resolve(tab);
    }

    chrome.tabs.onUpdated.addListener(handleUpdated);
  });
}

async function scrapeCompanyByUrl(companyUrl) {
  const aboutUrl = toCompanyAboutUrl(companyUrl);

  if (!aboutUrl) {
    throw new Error("Company URL is missing.");
  }

  let tempTabId = null;

  try {
    const createdTab = await chrome.tabs.create({
      url: aboutUrl,
      active: false,
    });

    tempTabId = createdTab?.id;

    if (!tempTabId) {
      throw new Error("Failed to open temporary company tab.");
    }

    await waitForTabComplete(tempTabId, 15000);

    // Small extra wait for LinkedIn SPA hydration
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const response = await chrome.tabs.sendMessage(tempTabId, {
      type: "MEL_V2_SCRAPE_COMPANY",
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Company scrape failed.");
    }

    return response;
  } finally {
    if (tempTabId) {
      try {
        await chrome.tabs.remove(tempTabId);
      } catch (err) {
        console.warn("Failed to close temp company tab:", err);
      }
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "MEL_V2_SCRAPE_COMPANY_BY_URL") {
    scrapeCompanyByUrl(message.companyUrl)
      .then((result) => sendResponse(result))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error?.message || "Failed to scrape company by URL.",
        });
      });

    return true;
  }
});
