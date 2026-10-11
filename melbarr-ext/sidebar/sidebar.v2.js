// sidebar/sidebar.v2.js
import { AuthView } from "./ui/auth.view.v2.js";
import { ProfileView } from "./ui/profile.view.v2.js";
import { storageGetToken, storageSetToken, storageClearToken } from "./ui/storage.v2.js";
import { fetchMeWithToken, saveContactToDb, saveCompanyToDb, checkCompanyInDb, WEBAPP_LOGIN_URL } from "./ui/api.v2.js";

const authMount = document.getElementById("authMount");
const profileMount = document.getElementById("profileMount");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const brandSubtitle = document.getElementById("brandSubtitle");

const auth = AuthView(authMount);
const profile = ProfileView(profileMount);
let lastScrapedContactPayload = null;
let lastScrapedCompanyPayload = null;

const COOKIE_CANDIDATES = [
  // { url: "http://localhost", name: "access_token" },
  { url: "https://app.mel-demandscraper.com", name: "access_token" },
  { url: "https://api.mel-demandscraper.com", name: "access_token" },
];

function postToParent(payload) {
  window.parent.postMessage(payload, "*");
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function toCompanyAboutUrl(companyUrl) {
  try {
    if (!companyUrl) return null;

    const url = new URL(companyUrl);
    const match = url.pathname.match(/^\/(company|school|showcase)\/([^/]+)/i);

    if (!match) {
      try {
        const fallback = new URL(companyUrl, "https://www.linkedin.com");
        fallback.search = "";
        fallback.hash = "";
        return fallback.toString();
      } catch {
        return companyUrl;
      }
    }

    return `${url.origin}/${match[1]}/${match[2]}/about/`;
  } catch {
    return companyUrl || null;
  }
}

function copyTextToClipboard(text) {
  const value = String(text ?? "").trim();
  if (!value) return Promise.resolve(false);
  try {
    if (navigator?.clipboard?.writeText) {
      return navigator.clipboard.writeText(value).then(
        () => true,
        () => false
      );
    }
  } catch {
    // fall through to textarea fallback
  }
  return new Promise((resolve) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      resolve(!!ok);
    } catch {
      resolve(false);
    }
  });
}

async function scrapeCompanyByUrlInBackground(companyUrl) {
  return await chrome.runtime.sendMessage({
    type: "MEL_V2_SCRAPE_COMPANY_BY_URL",
    companyUrl,
  });
}

function setLoggedInUi(isLoggedIn, user = null) {
  if (isLoggedIn) {
    auth.hide();
    profile.showApp();

    const firstName = user?.first_name || "";
    const lastName = user?.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    if (brandSubtitle) {
      brandSubtitle.textContent = fullName
        ? `Hello ${fullName} 👋`
        : "Hello 👋";
    }
  } else {
    auth.show();
    profile.hideApp();

    if (brandSubtitle) {
      brandSubtitle.textContent = "LinkedIn Scraper Panel";
    }
  }
}

function getCookie(details) {
  return new Promise((resolve) => {
    chrome.cookies.get(details, (cookie) => {
      resolve(cookie || null);
    });
  });
}

async function readAccessTokenFromCookies() {
  for (const entry of COOKIE_CANDIDATES) {
    const cookie = await getCookie(entry);
    if (cookie?.value) {
      return {
        token: cookie.value,
        source: `${entry.url} → ${entry.name}`,
      };
    }
  }
  return null;
}

async function verifyTokenValue(token) {
  if (!token) throw new Error("Token is required");

  await storageSetToken(token);

  const me = await fetchMeWithToken(token);
  const user = me?.user || me || {};

  auth.setVerified();
  setLoggedInUi(true, user);

  return user;
}

async function verifyCurrentToken() {
  const token = auth.getToken();

  if (!token) {
    auth.setError("Token is required");
    setLoggedInUi(false);
    return false;
  }

  try {
    auth.setChecking("Verifying token...");
    await verifyTokenValue(token);
    return true;
  } catch (err) {
    auth.setError(err?.message || "Verification failed");
    setLoggedInUi(false);
    return false;
  }
}

async function tryAutoLoginFromCookie() {
  try {
    auth.setChecking("Reading browser token...");
    const cookieData = await readAccessTokenFromCookies();

    if (!cookieData?.token) {
      auth.setError("No browser token found");
      setLoggedInUi(false);
      return false;
    }

    auth.setToken(cookieData.token);
    auth.setChecking("Verifying browser token...");
    await verifyTokenValue(cookieData.token);
    return true;
  } catch (err) {
    auth.setError(err?.message || "Browser token verification failed");
    setLoggedInUi(false);
    return false;
  }
}

async function boot() {
  profile.clearContact();
  profile.clearCompany();
  profile.clearBulk();
  
  profile.refs.saveContactBtn.disabled = true;
  profile.refs.saveContactBtn.textContent = "Fetch profile first";

  lastScrapedContactPayload = null;
  lastScrapedCompanyPayload = null;
  
  profile.setText(profile.refs.bulk_status, "Idle");
  profile.setText(profile.refs.bulk_summary, "0 / 0");
  profile.setText(profile.refs.bulk_log, "Bulk actions will appear here.");
  profile.setText(profile.refs.bulk_failed, "No failed URLs.");

  setLoggedInUi(false);

  const savedToken = await storageGetToken();

  if (savedToken) {
    auth.setToken(savedToken);
    try {
      auth.setChecking("Checking saved token...");
      await verifyTokenValue(savedToken);
    } catch (err) {
      auth.setError(err?.message || "Stored token invalid");
      setLoggedInUi(false);
    }
  } else {
    auth.reset();
    setLoggedInUi(false);
  }
}

auth.els.openLoginBtn.addEventListener("click", () => {
  window.open(WEBAPP_LOGIN_URL, "_blank");
});

if (auth.els.readCookieBtn) {
  auth.els.readCookieBtn.addEventListener("click", async () => {
    await tryAutoLoginFromCookie();
  });
}

auth.els.verifyBtn.addEventListener("click", async () => {
  const token = auth.getToken();

  if (!token) {
    await tryAutoLoginFromCookie();
    return;
  }

  await verifyCurrentToken();
});

auth.els.clearBtn.addEventListener("click", async () => {
  await storageClearToken();
  auth.setToken("");
  auth.reset();
  setLoggedInUi(false);
});

closeSidebarBtn.addEventListener("click", () => {
  postToParent({ type: "MEL_V2_CLOSE_SIDEBAR" });
});

window.addEventListener("message", (event) => {
  const msg = event?.data;
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "MEL_V2_SET_ACTIVE_TAB") {
    profile.setActiveTab(
      msg.tab === "company" ? "company" : msg.tab === "bulk" ? "bulk" : "contact"
    );
    return;
  }

  if (msg.type === "MEL_V2_TRIGGER_FETCH_SAVE") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const url = tab?.url || "";
        const isCompany = /linkedin\.com\/(company|school|showcase)\//i.test(url);
        if (isCompany) {
          profile.setActiveTab("company");
          profile.refs.fetchCompanyBtn?.click();
        } else {
          profile.setActiveTab("contact");
          // Prefer 1-click Fetch & Save; fallback to Fetch if button missing
          if (profile.refs.fetchSaveContactBtn) {
            profile.refs.fetchSaveContactBtn.click();
          } else {
            profile.refs.fetchContactBtn?.click();
          }
        }
      } catch (err) {
        console.warn("Auto fetch-save trigger failed:", err);
        profile.refs.fetchSaveContactBtn?.click();
      }
    })();
  }
});

/* Contact actions */
async function fetchContactFlow() {
  const btn = profile.refs.fetchContactBtn;
  const defaultBtnText = "Fetch Contact";

  try {
    btn.disabled = true;
    btn.textContent = "Fetching...";
    profile.clearContact();
    profile.setStatus(profile.refs.contact_status, "Scraping profile...", "info");

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      throw new Error("Active LinkedIn tab not found");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "MEL_V2_SCRAPE_PROFILE_BASIC",
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Profile scrape failed");
    }

    const scrapedPayload = response?.data || {};
    const profileData = scrapedPayload?.profile || {};
    
    console.log("Scraped contact_top_payload from sidebar:", profileData.contactTopPayload);
    const warnings = Array.isArray(scrapedPayload?.warnings)
      ? scrapedPayload.warnings
      : [];
    const successMessage =
      scrapedPayload?.successMessage || "Profile scraped successfully.";

    lastScrapedContactPayload = scrapedPayload;

    profile.setText(profile.refs.contact_profileId, profileData.profileId || "");
    profile.setText(
      profile.refs.contact_connections,
      profileData.connectionsText || profileData.connectionsCount || ""
    );
    profile.setText(profile.refs.contact_firstName, profileData.firstName || "");
    profile.setText(profile.refs.contact_lastName, profileData.lastName || "");
    profile.setText(profile.refs.contact_location, profileData.location || "");
    profile.setText(profile.refs.contact_country, profileData.country || "");
    profile.setText(profile.refs.contact_jobTitle, profileData.jobTitle || "");
    profile.setText(profile.refs.contact_companyName, profileData.companyName || "");
    profile.setText(profile.refs.contact_companyId, profileData.companyId || "");

    profile.setText(
      profile.refs.contact_companyLocation,
      profileData.companyLocation || ""
    );
    profile.setText(
      profile.refs.contact_companyCountry,
      profileData.companyCountry || ""
    );
    profile.setText(profile.refs.contact_profileUrl, profileData.profileUrl || "");
    profile.setText(profile.refs.contact_companyUrl, profileData.companyUrl || "");
    profile.renderExperience(profileData.experience || []);

    let finalMessage = warnings.length ? warnings[0] : successMessage;
    let finalType = warnings.length ? "error" : "success";

    // Only check company DB if profile scrape itself succeeded
    if (!warnings.length && profileData.companyId) {
      try {
        const token = await storageGetToken();

        console.log("CompanyFreshnessCheckId is", profileData.companyId);
        console.log("CompanyFreshnessCheckUrl is", profileData.companyUrl);
        console.log("CompanyFreshnessCheckName is", profileData.companyName);

        if (token) {
          const companyCheck = await checkCompanyInDb(
            {
              companyUrl: toCompanyAboutUrl(profileData.companyUrl),
              companyLinkedinId: profileData.companyId || null,
              companyName: profileData.companyName || null,
            },
            token
          );

          console.log("Company DB check response:", companyCheck);

          const exists = companyCheck?.data?.exists;
          const shouldScrape = companyCheck?.data?.shouldScrape;

          if (exists && !shouldScrape) {
            finalMessage =
              "Profile scraped successfully and company data already in DB";
            finalType = "success";
          } else if (exists && shouldScrape) {
            finalMessage =
              "Profile scraped successfully but company information is outdated please scrape company info to get full profile data";
            finalType = "warning";
          } else {
            finalMessage =
              "Profile scraped successfully but company information is missing please scrape company info to get full profile data";
            finalType = "warning";
          }
        } else {
          finalMessage = successMessage;
          finalType = "success";
        }
      } catch (err) {
        console.error("Company DB check failed:", err);
        finalMessage = successMessage;
        finalType = "success";
      }
    }
    
    // Check wether the profile is scrapped fully with expreiance or not then remove disabled button
    const hasExperience =
      Array.isArray(profileData.experience) && profileData.experience.length > 0;

    if (hasExperience) {
      profile.refs.saveContactBtn.textContent = "Save Contact";
      profile.refs.saveContactBtn.disabled = false;
    } else {
      profile.refs.saveContactBtn.textContent = "Fetch full profile first";
      profile.refs.saveContactBtn.disabled = true;
    }

    profile.setStatus(profile.refs.contact_status, finalMessage, finalType);

  } catch (error) {
    profile.clearContact();
    profile.refs.saveContactBtn.disabled = true;
    profile.refs.saveContactBtn.textContent = "Fetch profile first";
    profile.setStatus(
      profile.refs.contact_status,
      error?.message || "Failed to scrape profile",
      "error"
    );
  } finally {
    btn.disabled = false;
    btn.textContent = defaultBtnText;
  }
}
profile.refs.fetchContactBtn.addEventListener("click", fetchContactFlow);

async function saveContactFlow() {
  const btn = profile.refs.saveContactBtn;
  const defaultBtnText = "Save Contact";

  try {
    const token = await storageGetToken();

    if (!token) {
      throw new Error("Please login first to save contact");
    }

    if (!lastScrapedContactPayload?.profile?.profileUrl) {
      throw new Error("No scraped contact data found. Please fetch contact first.");
    }

    if (
      !Array.isArray(lastScrapedContactPayload?.profile?.experience) ||
      lastScrapedContactPayload.profile.experience.length === 0
    ) {
      throw new Error(
        "Experience data is missing. Please scroll to Experience and fetch profile again."
      );
    }

    btn.disabled = true;
    btn.textContent = "Saving...";
    profile.setStatus(profile.refs.contact_status, "Saving contact...", "info");

    const out = await saveContactToDb(lastScrapedContactPayload, token);

    const saveStatus = out?.data?.status;
    const leadId = out?.data?.leadId;

    const leadSavedMessage =
      saveStatus === "inserted"
        ? `Saved to database successfully${leadId ? ` (ID: ${leadId})` : ""}`
        : saveStatus === "updated"
        ? `Lead already existed — updated${leadId ? ` (ID: ${leadId})` : ""}`
        : out?.message || "Contact saved successfully";

    // Phase 1: auto-copy LinkedIn profile slug for ops-dashboard green-tick paste.
    const dashboardProfileId =
      lastScrapedContactPayload?.profile?.profileId || "";
    let copyHint = "";
    if (dashboardProfileId) {
      try {
        const copied = await copyTextToClipboard(dashboardProfileId);
        if (copied) {
          copyHint = ` Profile ID ${dashboardProfileId} auto-copied — paste in dashboard.`;
          if (profile.refs.copyProfileIdBtn) {
            profile.refs.copyProfileIdBtn.textContent = "Copied!";
            setTimeout(() => {
              if (profile.refs.copyProfileIdBtn) {
                profile.refs.copyProfileIdBtn.textContent = "Copy ID";
              }
            }, 1500);
          }
        }
      } catch {
        copyHint = "";
      }
    }

    const shouldAutoScrapeCompany = profile.getScrapeCompanyEnabled();

    if (!shouldAutoScrapeCompany) {
      profile.setStatus(
        profile.refs.contact_status,
        `${leadSavedMessage}.${copyHint}`,
        "success"
      );
      return;
    }

    const profileData = lastScrapedContactPayload?.profile || {};
    const rawCompanyUrl = profileData.companyUrl || "";
    const companyUrl = toCompanyAboutUrl(rawCompanyUrl);
    const companyName = profileData.companyName || "";
    const companySlugOrId = profileData.companyId || "";

    if (!companyUrl) {
      profile.setStatus(
        profile.refs.contact_status,
        `${leadSavedMessage}. Current company URL not found, so company scrape was skipped.${copyHint}`,
        "warning"
      );
      return;
    }

    profile.setStatus(
      profile.refs.contact_status,
      "Lead saved. Checking company freshness in DB...",
      "info"
    );

    let companyCheck = null;
    try {
      // Prefer URL-based lookup because profile companyId is usually slug,
      // while DB stores linkedin_company_id and /about URL.
      companyCheck = await checkCompanyInDb(
        {
          companyUrl,
          companyLinkedinId: companySlugOrId || null,
          companyName: companyName || null,
        },
        token
      );
    } catch (err) {
      console.error("Company DB check after contact save failed:", err);
    }

    const exists = companyCheck?.data?.exists;
    const shouldScrape = companyCheck?.data?.shouldScrape;

    if (exists && !shouldScrape) {
      profile.setStatus(
        profile.refs.contact_status,
        `${leadSavedMessage}. Company already exists in DB and was updated within the last 1 year.${copyHint}`,
        "success"
      );
      return;
    }

    profile.setStatus(
      profile.refs.contact_status,
      "Lead saved. Scraping current company...",
      "info"
    );

    const companyScrapeResponse = await scrapeCompanyByUrlInBackground(companyUrl);

    if (!companyScrapeResponse?.ok) {
      profile.setStatus(
        profile.refs.contact_status,
        `${leadSavedMessage}. Company scrape failed: ${
          companyScrapeResponse?.error || "Unknown error"
        }.${copyHint}`,
        "warning"
      );
      return;
    }

    const scrapedCompanyPayload = companyScrapeResponse?.data || {};
    const companyData = scrapedCompanyPayload?.company || {};

    if (!companyData?.url) {
      profile.setStatus(
        profile.refs.contact_status,
        `${leadSavedMessage}. Company was opened, but no company data was returned.${copyHint}`,
        "warning"
      );
      return;
    }

    profile.setStatus(
      profile.refs.contact_status,
      "Lead saved. Saving company...",
      "info"
    );

    const companySaveOut = await saveCompanyToDb(scrapedCompanyPayload, token);
    const companySaveStatus = companySaveOut?.data?.status;
    const companyDbId = companySaveOut?.data?.companyId;

    lastScrapedCompanyPayload = scrapedCompanyPayload;

    profile.setText(profile.refs.company_companyId, companyData.companyId || "");
    profile.setText(
      profile.refs.company_linkedinCompanyId,
      companyData.linkedinCompanyId || ""
    );
    profile.setText(profile.refs.company_name, companyData.name || "");
    profile.setText(profile.refs.company_url, companyData.url || "");
    profile.setText(profile.refs.company_website, companyData.website || "");
    profile.setText(profile.refs.company_phone, companyData.phone || "");
    profile.setText(profile.refs.company_industry, companyData.industry || "");
    profile.setText(profile.refs.company_size, companyData.size || "");
    profile.setText(profile.refs.company_hq, companyData.headquarter || "");
    profile.setText(profile.refs.company_verified, companyData.verifiedPage || "");
    profile.setText(profile.refs.company_verifiedDate, companyData.verifiedDate || "");
    profile.setText(profile.refs.company_overview, companyData.overview || "");
    profile.setText(
      profile.refs.company_specialities,
      companyData.specialities || ""
    );

    if (companySaveStatus === "inserted") {
      profile.setStatus(
        profile.refs.contact_status,
        `${leadSavedMessage}. Company scraped and saved successfully${
          companyDbId ? ` (Company ID: ${companyDbId})` : ""
        }.${copyHint}`,
        "success"
      );
      return;
    }

    if (companySaveStatus === "updated") {
      profile.setStatus(
        profile.refs.contact_status,
        `${leadSavedMessage}. Company scraped and updated successfully${
          companyDbId ? ` (Company ID: ${companyDbId})` : ""
        }.${copyHint}`,
        "success"
      );
      return;
    }

    profile.setStatus(
      profile.refs.contact_status,
      `${leadSavedMessage}. Company scraped and saved successfully.${copyHint}`,
      "success"
    );
  } catch (error) {
    profile.setStatus(
      profile.refs.contact_status,
      error?.message || "Failed to save contact",
      "error"
    );
    throw error;
  } finally {
    btn.disabled = false;
    btn.textContent = defaultBtnText;
  }
}
profile.refs.saveContactBtn.addEventListener("click", () => {
  saveContactFlow().catch(() => {});
});

async function copyCurrentProfileId(manual = false) {
  const raw =
    lastScrapedContactPayload?.profile?.profileId ||
    profile.refs.contact_profileId?.textContent ||
    "";
  const pid = String(raw).trim();
  if (!pid || pid === "-") {
    if (manual) {
      profile.setStatus(
        profile.refs.contact_status,
        "No profile ID to copy. Fetch contact first.",
        "warning"
      );
    }
    return false;
  }
  const ok = await copyTextToClipboard(pid);
  if (manual) {
    profile.setStatus(
      profile.refs.contact_status,
      ok ? `Profile ID copied: ${pid} — paste in ops-dashboard.` : "Copy failed. Copy manually from Profile ID box.",
      ok ? "success" : "error"
    );
  } else if (ok && profile.refs.copyProfileIdBtn) {
    const orig = profile.refs.copyProfileIdBtn.textContent;
    profile.refs.copyProfileIdBtn.textContent = "Copied!";
    setTimeout(() => {
      if (profile.refs.copyProfileIdBtn) {
        profile.refs.copyProfileIdBtn.textContent = orig || "Copy ID";
      }
    }, 1500);
  }
  return ok;
}

if (profile.refs.copyProfileIdBtn) {
  profile.refs.copyProfileIdBtn.addEventListener("click", () => {
    copyCurrentProfileId(true).catch(() => {});
  });
}

if (profile.refs.fetchSaveContactBtn) {
  profile.refs.fetchSaveContactBtn.addEventListener("click", async () => {
    const btn = profile.refs.fetchSaveContactBtn;
    const defaultText = "Fetch & Save";
    try {
      btn.disabled = true;
      btn.textContent = "Fetching...";
      await fetchContactFlow();
      const hasExp =
        Array.isArray(lastScrapedContactPayload?.profile?.experience) &&
        lastScrapedContactPayload.profile.experience.length > 0;
      if (!hasExp) {
        // fetchContactFlow already showed warning; stop before save
        return;
      }
      btn.textContent = "Saving...";
      await saveContactFlow();
      // saveContactFlow already auto-copies ID; reinforce feedback
      await copyCurrentProfileId(false);
    } catch (err) {
      // fetch/save already set status; nothing extra needed
      console.warn("Fetch & Save failed:", err);
    } finally {
      btn.disabled = false;
      btn.textContent = defaultText;
    }
  });
}

profile.refs.clearContactBtn.addEventListener("click", () => {
  lastScrapedContactPayload = null;

  profile.refs.saveContactBtn.disabled = true;
  profile.refs.saveContactBtn.textContent = "Fetch profile first";
  if (profile.refs.copyProfileIdBtn) {
    profile.refs.copyProfileIdBtn.textContent = "Copy ID";
  }

  profile.clearContact();
});

/* Company actions */
profile.refs.fetchCompanyBtn.addEventListener("click", async () => {
  try {
    profile.clearCompany();
    profile.setStatus(profile.refs.company_status, "Scraping company...", "info");

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    
    if (!tab?.id) {
      throw new Error("Active LinkedIn tab not found");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "MEL_V2_SCRAPE_COMPANY",
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Company scrape failed");
    }

    const scrapedCompanyPayload = response?.data || {};
    const companyData = scrapedCompanyPayload?.company || {};
    lastScrapedCompanyPayload = scrapedCompanyPayload;

    profile.setText(profile.refs.company_companyId, companyData.companyId || "");
    profile.setText(
      profile.refs.company_linkedinCompanyId,
      companyData.linkedinCompanyId || ""
    );
    profile.setText(profile.refs.company_name, companyData.name || "");
    profile.setText(profile.refs.company_url, companyData.url || "");
    profile.setText(profile.refs.company_website, companyData.website || "");
    profile.setText(profile.refs.company_phone, companyData.phone || "");
    profile.setText(profile.refs.company_industry, companyData.industry || "");
    profile.setText(profile.refs.company_size, companyData.size || "");
    profile.setText(profile.refs.company_hq, companyData.headquarter || "");
    profile.setText(profile.refs.company_verified, companyData.verifiedPage || "");
    profile.setText(
      profile.refs.company_verifiedDate,
      companyData.verifiedDate || ""
    );
    profile.setText(profile.refs.company_overview, companyData.overview || "");
    profile.setText(
      profile.refs.company_specialities,
      companyData.specialities || ""
    );

    profile.setStatus(
      profile.refs.company_status,
      "Company scraped successfully.",
      "success"
    );
  } catch (error) {
    profile.clearCompany();
    profile.setStatus(
      profile.refs.company_status,
      error?.message || "Failed to scrape company",
      "error"
    );
  }
});

profile.refs.saveCompanyBtn.addEventListener("click", async () => {
  const btn = profile.refs.saveCompanyBtn;
  const defaultBtnText = "Save Company";

  try {
    const token = await storageGetToken();

    if (!token) {
      throw new Error("Please login first to save company");
    }

    if (!lastScrapedCompanyPayload?.company?.url) {
      throw new Error("No scraped company data found. Please fetch company first.");
    }

    btn.disabled = true;
    btn.textContent = "Saving...";
    profile.setStatus(profile.refs.company_status, "Saving company...", "info");

    const out = await saveCompanyToDb(lastScrapedCompanyPayload, token);

    const saveStatus = out?.data?.status;
    const companyDbId = out?.data?.companyId;

    if (saveStatus === "inserted") {
      profile.setStatus(
        profile.refs.company_status,
        `Company saved successfully${companyDbId ? ` (ID: ${companyDbId})` : ""}`,
        "success"
      );
      return;
    }

    if (saveStatus === "updated") {
      profile.setStatus(
        profile.refs.company_status,
        `Company already existed — updated${companyDbId ? ` (ID: ${companyDbId})` : ""}`,
        "success"
      );
      return;
    }

    profile.setStatus(
      profile.refs.company_status,
      out?.message || "Company saved successfully",
      "success"
    );
  } catch (error) {
    profile.setStatus(
      profile.refs.company_status,
      error?.message || "Failed to save company",
      "error"
    );
  } finally {
    btn.disabled = false;
    btn.textContent = defaultBtnText;
  }
});

profile.refs.clearCompanyBtn.addEventListener("click", () => {
  lastScrapedCompanyPayload = null;
  profile.clearCompany();
});

/* Bulk actions */
profile.refs.bulkStartBtn.addEventListener("click", () => {
  const urls = profile.refs.bulk_urls.value || "";
  const lines = urls.split("\n").map((x) => x.trim()).filter(Boolean);

  profile.refs.bulkProgressBar.style.width = lines.length ? "8%" : "0%";
  profile.setText(profile.refs.bulk_status, lines.length ? "Bulk queued (UI only)" : "No URLs");
  profile.setText(profile.refs.bulk_summary, `${lines.length} URL(s) loaded`);
  profile.setText(profile.refs.bulk_log, safeStringify(lines));
});

profile.refs.bulkPauseBtn.addEventListener("click", () => {
  profile.setText(profile.refs.bulk_status, "Paused (UI only)");
});

profile.refs.bulkStopBtn.addEventListener("click", () => {
  profile.setText(profile.refs.bulk_status, "Stopped (UI only)");
});

profile.refs.bulkClearBtn.addEventListener("click", () => {
  profile.clearBulk();
  profile.setText(profile.refs.bulk_status, "Idle");
  profile.setText(profile.refs.bulk_summary, "0 / 0");
});

boot();