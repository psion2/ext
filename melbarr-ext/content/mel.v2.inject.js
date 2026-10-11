// Mel-DemandScraperV2/content/mel.v2.inject.js
(function () {
  const MEL_V2 = (window.MEL_V2 = window.MEL_V2 || {});

  const ROOT_ID = "mel-demandscraper-v2-root";
  const IFRAME_ID = "mel-demandscraper-v2-iframe";
  const LAUNCHER_ID = "mel-demandscraper-v2-launcher";

  function getSidebarUrl() {
   return chrome.runtime.getURL("sidebar/sidebar.v2.html");
  }

  function getDesiredTabFromLocation() {
    const url = window.location.href;

    if (/linkedin\.com\/company\//i.test(url)) return "company";
    if (/linkedin\.com\/school\//i.test(url)) return "company";
    if (/linkedin\.com\/showcase\//i.test(url)) return "company";
    if (/linkedin\.com\/in\//i.test(url)) return "contact";

    return "contact";
  }

  function postToIframe(payload) {
    const iframe = document.getElementById(IFRAME_ID);
    if (!iframe || !iframe.contentWindow) return false;

    iframe.contentWindow.postMessage(payload, "*");
    return true;
  }

  MEL_V2.postSetTab = function (tab) {
    return postToIframe({
      type: "MEL_V2_SET_ACTIVE_TAB",
      tab,
    });
  };

  MEL_V2.postTriggerFetchSave = function () {
    return postToIframe({
      type: "MEL_V2_TRIGGER_FETCH_SAVE",
    });
  };

  MEL_V2.triggerFetchSave = function () {
    MEL_V2.toggleSidebar(true);

    let tries = 0;
    const maxTries = 20;

    const timer = setInterval(() => {
      tries += 1;
      const ok = MEL_V2.postTriggerFetchSave();

      if (ok || tries >= maxTries) {
        clearInterval(timer);
      }
    }, 250);
  };

  function isScrapablePage(url) {
    return /linkedin\.com\/(in|company|school|showcase)\//i.test(
      url || window.location.href
    );
  }

  function shouldAutoOpenSidebar() {
    if (!isScrapablePage()) return false;
    // Ops workflow: LinkedIn tabs are almost always opened from ops-dashboard.
    // Default to auto-open so scraper is already visible — user can close with X.
    // If normal browsing gets noisy, change to referrer-only check.
    return true;
  }

  MEL_V2.openSidebarWithTab = function (tab) {
    MEL_V2.toggleSidebar(true);

    let tries = 0;
    const maxTries = 20;

    const timer = setInterval(() => {
      tries += 1;
      const ok = MEL_V2.postSetTab(tab);

      if (ok || tries >= maxTries) {
        clearInterval(timer);
      }
    }, 250);
  };

  MEL_V2.injectSidebar = function () {
    if (document.getElementById(ROOT_ID)) return;

    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.style.position = "fixed";
    root.style.top = "0";
    root.style.right = "0";
    root.style.width = "0";
    root.style.height = "100vh";
    root.style.zIndex = "2147483646";
    root.style.pointerEvents = "none";

    const iframe = document.createElement("iframe");
    iframe.id = IFRAME_ID;
    iframe.src = getSidebarUrl();
    iframe.title = "Mel-DemandScraperV2";
    iframe.style.position = "absolute";
    iframe.style.top = "0";
    iframe.style.right = "0";
    iframe.style.width = "420px";
    iframe.style.height = "100vh";
    iframe.style.border = "0";
    iframe.style.background = "#0b1220";
    iframe.style.boxShadow = "0 0 20px rgba(0,0,0,0.22)";
    iframe.style.transform = "translateX(100%)";
    iframe.style.transition = "transform 220ms ease";
    iframe.style.pointerEvents = "auto";

    root.appendChild(iframe);
    document.documentElement.appendChild(root);
  };

  MEL_V2.injectLauncher = function () {
    if (document.getElementById(LAUNCHER_ID)) return;

    const btn = document.createElement("button");
    btn.id = LAUNCHER_ID;
    btn.type = "button";
    btn.title = "Open Mel-DemandScraperV2";

    btn.style.position = "fixed";
    btn.style.left = "18px";
    btn.style.bottom = "18px";
    btn.style.zIndex = "2147483647";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.gap = "10px";
    btn.style.padding = "12px 16px";
    btn.style.border = "1px solid rgba(255,255,255,0.14)";
    btn.style.borderRadius = "999px";
    btn.style.background = "linear-gradient(135deg, #0f172a 0%, #111827 100%)";
    btn.style.color = "#fff";
    btn.style.fontSize = "13px";
    btn.style.fontWeight = "600";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 12px 30px rgba(0,0,0,0.24)";

    const icon = document.createElement("span");
    icon.textContent = "M";
    icon.style.width = "28px";
    icon.style.height = "28px";
    icon.style.display = "inline-flex";
    icon.style.alignItems = "center";
    icon.style.justifyContent = "center";
    icon.style.borderRadius = "50%";
    icon.style.background = "linear-gradient(135deg, #2563eb, #7c3aed)";
    icon.style.fontWeight = "800";

    const label = document.createElement("span");
    label.textContent = "Mel-DemandScraperV2";

    btn.appendChild(icon);
    btn.appendChild(label);

    btn.addEventListener("click", () => {
      MEL_V2.toggleSidebar();
    });

    document.documentElement.appendChild(btn);
  };

  MEL_V2.toggleSidebar = function (forceOpen) {
    const iframe = document.getElementById(IFRAME_ID);
    const root = document.getElementById(ROOT_ID);

    if (!iframe || !root) return;

    const isOpen = iframe.dataset.open === "true";
    const nextOpen = typeof forceOpen === "boolean" ? forceOpen : !isOpen;

    iframe.dataset.open = nextOpen ? "true" : "false";
    iframe.style.transform = nextOpen ? "translateX(0)" : "translateX(100%)";
    root.style.width = nextOpen ? "420px" : "0";
    root.style.pointerEvents = nextOpen ? "auto" : "none";

    if (nextOpen) {
      const desired = getDesiredTabFromLocation();
      setTimeout(() => MEL_V2.postSetTab(desired), 200);
    }
  };

  function init() {
    if (!/linkedin\.com/i.test(location.hostname)) return;

    MEL_V2.injectSidebar();
    MEL_V2.injectLauncher();

    // Phase 1b: auto-open so user skips the launcher/toolbar click.
    if (shouldAutoOpenSidebar()) {
      setTimeout(() => {
        try {
          const iframe = document.getElementById(IFRAME_ID);
          if (iframe?.dataset.open !== "true") {
            MEL_V2.toggleSidebar(true);
          }
        } catch {}
      }, 900);
    }
  }

  let lastUrl = location.href;

  function watchLinkedInSpa() {
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;

        if (document.getElementById(IFRAME_ID)?.dataset.open === "true") {
          const desired = getDesiredTabFromLocation();
          setTimeout(() => MEL_V2.postSetTab(desired), 200);
        }
      }
    }, 800);
  }

  window.addEventListener("message", (event) => {
    const msg = event?.data;
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "MEL_V2_CLOSE_SIDEBAR") {
      MEL_V2.toggleSidebar(false);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init();
      watchLinkedInSpa();
    });
  } else {
    init();
    watchLinkedInSpa();
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "MEL_V2_TOGGLE_SIDEBAR") {
      MEL_V2.toggleSidebar();
      sendResponse?.({ ok: true });
      return;
    }

    if (msg?.type === "MEL_V2_TRIGGER_FETCH_SAVE") {
      try {
        MEL_V2.triggerFetchSave();
        sendResponse?.({ ok: true });
      } catch (err) {
        sendResponse?.({ ok: false, error: err?.message });
      }
      return true;
    }
  });
})();