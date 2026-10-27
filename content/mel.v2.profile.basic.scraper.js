// content/mel.v2.profile.basic.scraper.js
(function () {
  const MEL_V2 = (window.MEL_V2 = window.MEL_V2 || {});

  
  MEL_V2.scrapeConnections = function () {
    const candidates = Array.from(document.querySelectorAll("main *"))
      .filter((el) => {
        const text = MEL_V2.cleanText(el.textContent);
        return /connections/i.test(text) && /\d/.test(text) && text.length < 40;
      })
      .slice(0, 5);

    const best =
      candidates.map((el) => MEL_V2.cleanText(el.textContent)).find(Boolean) || "";

    return MEL_V2.parseConnections(best);
  };

  MEL_V2.isTopCardRetired = function (topCardPayload) {
    try {
      if (!Array.isArray(topCardPayload) || topCardPayload.length === 0) {
        return false;
      }

      return topCardPayload.some((item) => {
        const text = MEL_V2.cleanText(item || "");
        return MEL_V2.isRetiredText(text);
      });
    } catch {
      return false;
    }
  };

  MEL_V2.getProfileTopCardRoot = function () {
    return (
      document.querySelector("main h1")?.closest("section") ||
      document.querySelector(".pv-top-card") ||
      document.querySelector(".artdeco-card") ||
      document.querySelector("main")
    );
  };

  MEL_V2.getTopCardVisibleLines = function (root) {
    if (!root) return [];

    const rawText = root.innerText || root.textContent || "";

    return String(rawText)
      .split("\n")
      .map((line) => line.replace(/\u00A0/g, " ").trim())
      .filter(Boolean);
  };

  MEL_V2.isTopCardActionLine = function (text) {
    const clean = MEL_V2.cleanText(text).toLowerCase();

    if (!clean) return true;

    return [
      "follow",
      "message",
      "connect",
      "more",
      "open to",
      "add section",
      "enhance profile",
      "resources",
      "pending",
      "accept",
      "ignore",
      "send profile in a message",
      "save to pdf",
      "unsubscribe",
      "view in recruiter",
    ].includes(clean);
  };

  MEL_V2.isTopCardNoiseLine = function (text) {
    const clean = MEL_V2.cleanText(text).toLowerCase();

    if (!clean) return true;

    if (MEL_V2.isTopCardActionLine(clean)) return true;

    if (
      clean === "contact info" ||
      clean === "followers" ||
      clean === "connections" ||
      clean === "mutual connections"
    ) {
      return false;
    }

    return false;
  };

  MEL_V2.isLikelyWebsiteLine = function (text) {
    const clean = MEL_V2.cleanText(text);

    return (
      /^https?:\/\//i.test(clean) ||
      /^(www\.)/i.test(clean) ||
      /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(clean)
    );
  };

  MEL_V2.buildContactTopPayload = function ({
    fullName,
    location,
    connectionsText,
    topRoot,
    currentCompanyName,
  }) {
    try {
      const lines = MEL_V2.getTopCardVisibleLines(topRoot);

      if (!lines.length) return [];

      const cleanedLines = [];
      const seen = new Set();

      for (const line of lines) {
        const text = line.trim();
        if (!text) continue;
        if (MEL_V2.isTopCardActionLine(text)) break;

        const dedupeKey = text.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        cleanedLines.push(text);
      }

      if (!cleanedLines.length) return [];

      const payload = [];

      // 1) Name block: name + optional pronouns + optional degree connection line
      const nameIndex = cleanedLines.findIndex(
        (line) =>
          MEL_V2.cleanProfileName(line).toLowerCase() ===
          MEL_V2.cleanProfileName(fullName).toLowerCase()
      );

      let nameBlock = [];
      if (nameIndex >= 0) {
        nameBlock.push(cleanedLines[nameIndex]);

        for (let i = nameIndex + 1; i < cleanedLines.length; i++) {
          const line = cleanedLines[i];
          const low = line.toLowerCase();

          // stop when headline/location/company/website starts
          if (
            line === location ||
            MEL_V2.isLikelyWebsiteLine(line) ||
            /followers?/i.test(line) ||
            /connections?/i.test(line) ||
            line === currentCompanyName ||
            /university|school|college|institute|academy/i.test(line)
          ) {
            break;
          }

          // keep short pronouns or degree lines near name
          if (
            /^(she\/her|he\/him|they\/them|she\/they|he\/they|pronouns)/i.test(low) ||
            /^·\s*(1st|2nd|3rd|\d+(?:st|nd|rd|th)|out of network)/i.test(line) ||
            /^(1st|2nd|3rd|\d+(?:st|nd|rd|th)|out of network)$/i.test(low)
          ) {
            nameBlock.push(line);
            continue;
          }

          break;
        }
      }

      if (nameBlock.length) {
        payload.push(MEL_V2.cleanPayloadText(nameBlock.join(" ")));
      }

      // 2) Headline block
      const headlineCandidate = cleanedLines.find((line, idx) => {
        if (nameIndex >= 0 && idx <= nameIndex + Math.max(nameBlock.length - 1, 0)) {
          return false;
        }

        if (!line) return false;
        if (line === location) return false;
        if (line === currentCompanyName) return false;
        if (MEL_V2.isLikelyWebsiteLine(line)) return false;
        if (/followers?/i.test(line)) return false;
        if (/connections?/i.test(line)) return false;
        if (/contact info/i.test(line)) return false;
        if (/university|school|college|institute|academy/i.test(line)) return false;

        return true;
      });

      if (headlineCandidate) {
        payload.push(MEL_V2.cleanPayloadText(headlineCandidate));
      }

      // 3) Location + Contact info
      if (location) {
        const hasContactInfo = cleanedLines.some((line) =>
          /contact info/i.test(line)
        );

        payload.push(
          MEL_V2.cleanPayloadText(
            hasContactInfo ? `${location} · Contact info` : location
          )
        );
      }

      // 4) Website line
      const websiteLine = cleanedLines.find((line) => MEL_V2.isLikelyWebsiteLine(line));
      if (websiteLine) {
        payload.push(MEL_V2.cleanPayloadText(websiteLine));
      }

      // 5) Followers + connections block
      let followersLine = null;
      let connectionsLine = null;

      for (let i = 0; i < cleanedLines.length; i++) {
        const line = cleanedLines[i];

        // followers
        if (/followers?/i.test(line)) {
          followersLine = line;
        }

        // connections
        if (/connections?/i.test(line)) {
          const prev = cleanedLines[i - 1] || "";
          const prevClean = MEL_V2.cleanText(prev);

          if (/^\d[\d,]*\+?$/.test(prevClean)) {
            connectionsLine = `${prevClean} connections`;
          } else {
            connectionsLine = line;
          }
        }
      }

      // fallback
      if (!connectionsLine && connectionsText) {
        connectionsLine = connectionsText;
      }

      if (followersLine && connectionsLine) {
  if (
    MEL_V2.cleanText(followersLine).toLowerCase() !==
    MEL_V2.cleanText(connectionsLine || "").toLowerCase()
  ) {
    payload.push(
      MEL_V2.cleanPayloadText(`${followersLine} · ${connectionsLine}`)
    );
  } else {
    payload.push(MEL_V2.cleanPayloadText(followersLine));
  }
      } else if (followersLine) {
        payload.push(MEL_V2.cleanPayloadText(followersLine));
      } else if (connectionsLine) {
        payload.push(MEL_V2.cleanPayloadText(connectionsLine));
      }

      return payload.filter(Boolean);
    } catch (error) {
      console.error("contactTopPayload build failed:", error);
      return [];
    }
  };

  MEL_V2.scrapeLinkedInProfileBasic = async function () {
    const url = location.href;

    if (!/linkedin\.com\/in\//i.test(url)) {
      return {
        ok: false,
        error: "Not a LinkedIn profile page. Open linkedin.com/in/... and try again.",
      };
    }

    const hasReadyHeader =
      document.querySelector("main h1") ||
      document.querySelector("h1") ||
      document.querySelector(".text-heading-xlarge") ||
      document.querySelector(".pv-text-details__left-panel h1");

    if (!hasReadyHeader) {
      await MEL_V2.waitForSelector(
        [
          "main h1",
          "h1",
          ".text-heading-xlarge",
          ".pv-text-details__left-panel h1",
        ],
        1200,
        75
      );
    }

    const h1 =
      document.querySelector("main h1") ||
      document.querySelector("h1") ||
      document.querySelector(".text-heading-xlarge") ||
      document.querySelector(".pv-text-details__left-panel h1");

    const rawFullName =
      MEL_V2.cleanText(h1?.textContent) || MEL_V2.getFullNameFallback();

    const fullName = MEL_V2.cleanProfileName(rawFullName);
    const { firstName, lastName } = MEL_V2.splitName(fullName);

    let profileLocation = null;

    const contactEl = Array.from(document.querySelectorAll("a")).find((a) =>
      a.textContent?.toLowerCase().includes("contact info")
    );

    if (contactEl) {
      const parent = contactEl.closest("div");

      if (parent) {
        const texts = Array.from(parent.querySelectorAll("p"))
          .map((el) => MEL_V2.cleanText(el.textContent))
          .filter(Boolean);

        const filtered = texts.filter(
          (text) => !/contact info/i.test(text) && text !== "·"
        );

        profileLocation = filtered[0] || null;
      }
    }

    const profileCountry = MEL_V2.extractCountry(profileLocation);
    const profileUrl = MEL_V2.normalizeUrl(url.split("?")[0]);
    const profileId = MEL_V2.getProfileIdHeuristic();
    const { connectionsText, connectionsCount } = MEL_V2.scrapeConnections();

    const experience = MEL_V2.parseExperienceCompanies();

    let currentCompany = MEL_V2.getCurrentCompanyFromExperience(experience);
    const topRoot = MEL_V2.getProfileTopCardRoot();

    const contactTopPayload = MEL_V2.buildContactTopPayload({
      fullName,
      location: profileLocation,
      connectionsText,
      topRoot,
      currentCompanyName: currentCompany?.companyName || null,
    });

    const profileTopCardRetired = MEL_V2.isTopCardRetired(contactTopPayload);

    if (profileTopCardRetired && Array.isArray(experience) && experience.length > 0) {
      experience[0].isRetired = true;

      if (Array.isArray(experience[0].roles) && experience[0].roles.length > 0) {
        experience[0].roles[0].isRetired = true;
      }

      // Recalculate current company after retired flag update
      currentCompany = MEL_V2.getCurrentCompanyFromExperience(experience);
    }

    const experienceFound = Array.isArray(experience) && experience.length > 0;

    console.log("Experiance Final", experience);
    console.log("contact_top_payload", contactTopPayload);

    const warnings = [];

    if (!experienceFound) {
      warnings.push(
        "Profile scraped, but experience section was not found. Please scroll to Experience and try again, or refresh the page."
      );
    }

    return {
      ok: true,
      data: {
        profile: {
          profileId: profileId || null,
          profileUrl: profileUrl || null,
          firstName: firstName || "",
          lastName: lastName || "",
          fullName: [firstName, lastName].filter(Boolean).join(" "),
          location: profileLocation || null,
          country: profileCountry || null,
          connectionsText: connectionsText || null,
          connectionsCount: connectionsCount ?? null,

          jobTitle: currentCompany.jobTitle || null,
          companyName: currentCompany.companyName || null,
          companyId: currentCompany.companyId || null,
          companyLocation: currentCompany.companyLocation || null,
          companyCountry: currentCompany.companyCountry || null,
          companyUrl: currentCompany.companyUrl || null,
          profileTopCardRetired: profileTopCardRetired || false,

          experience: experience || [],
          contactTopPayload: contactTopPayload || [],
        },
        warnings,
        successMessage: experienceFound
          ? "Profile scraped successfully."
          : "Profile scraped with missing experience section.",
        meta: {
          scrapedAt: new Date().toISOString(),
          source: "extension_v2",
          pageUrl: MEL_V2.normalizeUrl(location.href),
        },
      },
    };
  };
})();