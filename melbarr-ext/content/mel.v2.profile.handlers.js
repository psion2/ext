// content/mel.v2.profile.handlers.js
(function () {
  const MEL_V2 = (window.MEL_V2 = window.MEL_V2 || {});

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "MEL_V2_SCRAPE_PROFILE_BASIC") {
      (async () => {
        try {
          if (!MEL_V2.isLinkedInProfilePage()) {
            sendResponse({
              ok: false,
              error:
                "This is not a valid LinkedIn profile page. Please open a LinkedIn profile URL like linkedin.com/in/... and try again.",
            });
            return;
          }

          const result = await MEL_V2.scrapeLinkedInProfileBasic();
          sendResponse(result);
        } catch (error) {
          sendResponse({
            ok: false,
            error: "Profile basic scrape crashed: " + (error?.message || "unknown"),
          });
        }
      })();

      return true;
    }

    if (msg?.type === "MEL_V2_GET_ACTIVE_URL") {
      sendResponse({
        ok: true,
        data: {
          url: location.href,
        },
      });
      return;
    }

    if (msg?.type === "MEL_V2_SCRAPE_COMPANY") {
      (async () => {
        try {
          const result = await MEL_V2.scrapeLinkedInCompany();
          sendResponse(result);
        } catch (error) {
          sendResponse({
            ok: false,
            error: "Company scrape crashed: " + (error?.message || "unknown"),
          });
        }
      })();

      return true;
    }
  });
})();