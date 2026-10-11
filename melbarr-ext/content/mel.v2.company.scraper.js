// content/mel.v2.company.scraper.js
(function () {
  const MEL_V2 = (window.MEL_V2 = window.MEL_V2 || {});

  MEL_V2.getCompanySlugFromUrl = function (url) {
    const cleanUrl = MEL_V2.normalizeUrl(url || location.href);
    if (!cleanUrl) return null;

    const match = cleanUrl.match(/linkedin\.com\/(company|school|showcase)\/([^/?#]+)/i);
    return match ? match[2] : null;
  };

  MEL_V2.getCompanyLinkedinIdFromCodeTag = function () {
    try {
      const codeTags = Array.from(document.querySelectorAll("code"));

      for (let i = 0; i < codeTags.length; i++) {
        const tag = codeTags[i];
        const content = (tag.innerHTML || tag.textContent || "").trim();

        if (!content) continue;

        const match = content.match(/urn:li:fsd_company:(\d+)/);

        if (match?.[1]) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      console.warn(
        "Failed to extract LinkedIn company id from code tag:",
        error
      );
      return null;
    }
  };

  MEL_V2.getCompanyLinkedinIdFromTopCardEmployeeLink = function () {
    try {
      const employeeLinks = Array.from(
        document.querySelectorAll(
          'a[href*="/search/results/people/"][href*="currentCompany="]'
        )
      );

      for (const link of employeeLinks) {
        const href = link.getAttribute("href") || "";
        if (!href) continue;

        const decodedHref = decodeURIComponent(href);

        // Example decoded:
        // /search/results/people/?currentCompany=["4284359","106808902","106809896"]&origin=...
        const currentCompanyMatch = decodedHref.match(
          /currentCompany=\[([^\]]+)\]/i
        );

        if (currentCompanyMatch?.[1]) {
          const firstIdMatch = currentCompanyMatch[1].match(/"?(\d+)"?/);

          if (firstIdMatch?.[1]) {
            return firstIdMatch[1];
          }
        }

        // Extra fallback for single encoded ID:
        // currentCompany=%5B%224284359%22%5D
        const encodedMatch = href.match(
          /currentCompany=%5B%22(\d+)%22/i
        );

        if (encodedMatch?.[1]) {
          return encodedMatch[1];
        }
      }

      return null;
    } catch (error) {
      console.warn(
        "Failed to extract LinkedIn company id from top card employee link:",
        error
      );
      return null;
    }
  };
  
  MEL_V2.getAboutTopText = function () {
    const main = document.querySelector("main");
    return MEL_V2.cleanText(main?.innerText || "");
  };

  MEL_V2.findOrgAboutSection = function () {
    const sections = Array.from(document.querySelectorAll("main section"));

    const about = sections.find((section) => {
      const h2s = Array.from(section.querySelectorAll("h2"));
      const hasOverviewHeading = h2s.some(
        (h2) => MEL_V2.cleanText(h2.textContent || "").toLowerCase() === "overview"
      );

      const hasDl = !!section.querySelector("dl");
      return hasOverviewHeading && hasDl;
    });

    return about || null;
  };

  MEL_V2.getDlValue = function (root, label) {
    if (!root) return null;

    const norm = (s) => MEL_V2.cleanText(s || "").toLowerCase();
    const want = norm(label);

    const dts = Array.from(root.querySelectorAll("dt"));

    for (const dt of dts) {
      const h3 = dt.querySelector("h3");
      const dtText = norm(h3?.innerText || h3?.textContent || dt.innerText || dt.textContent);

      if (!dtText) continue;
      if (dtText !== want) continue;

      let dd = dt.nextElementSibling;
      while (dd && dd.tagName !== "DD") dd = dd.nextElementSibling;
      if (!dd) return null;

      const anchor = dd.querySelector("a[href]");
      if (anchor && anchor.getAttribute("href")) {
        const href = (anchor.getAttribute("href") || "").trim();
        const text = MEL_V2.cleanText(anchor.textContent || "");

        if (/^tel:/i.test(href)) {
          const mTxt = text.match(/\+?[\d().\-\s]{7,}/);
          if (mTxt) return MEL_V2.cleanText(mTxt[0]);

          const raw = href.replace(/^tel:/i, "");
          const mHref = raw.match(/\+?[\d().\-\s]{7,}/);
          return mHref ? MEL_V2.cleanText(mHref[0]) : MEL_V2.cleanText(raw);
        }

        return href || text || null;
      }

      return MEL_V2.cleanText(dd.innerText || dd.textContent);
    }

    return null;
  };

  MEL_V2.findLabeledValue = function (label) {
    const aboutSection = MEL_V2.findOrgAboutSection();
    return MEL_V2.getDlValue(aboutSection, label);
  };

  MEL_V2.getCompanyWebsite = function () {
    const aboutSection = MEL_V2.findOrgAboutSection();
    return MEL_V2.getDlValue(aboutSection, "Website");
  };

  MEL_V2.getCompanyOverview = function () {
    const aboutSection = MEL_V2.findOrgAboutSection();
    if (!aboutSection) return null;

    const h2s = Array.from(aboutSection.querySelectorAll("h2"));
    const overviewHeading = h2s.find(
      (el) => MEL_V2.cleanText(el.innerText || el.textContent || "").toLowerCase() === "overview"
    );

    if (!overviewHeading) return null;

    let node = overviewHeading.nextElementSibling;

    while (node) {
      if (node.tagName === "DL") break;

      if (node.tagName === "P") {
        const text = MEL_V2.cleanText(node.innerText || node.textContent);
        if (text) return text;
      }

      const nestedPara = node.querySelector?.("p");
      if (nestedPara) {
        const text = MEL_V2.cleanText(nestedPara.innerText || nestedPara.textContent);
        if (text) return text;
      }

      node = node.nextElementSibling;
    }

    return null;
  };

  MEL_V2.getCompanySpecialities = function () {
    const aboutSection = MEL_V2.findOrgAboutSection();
    const specialtiesRaw = MEL_V2.getDlValue(aboutSection, "Specialties") || null;

    if (!specialtiesRaw) return null;

    return specialtiesRaw
      .split(",")
      .map((x) => MEL_V2.cleanText(x))
      .filter(Boolean)
      .join(", ");
  };

  MEL_V2.getVerifiedInfo = function () {
    const aboutSection = MEL_V2.findOrgAboutSection();
    const verifiedDate = MEL_V2.getDlValue(aboutSection, "Verified page");

    return {
      verifiedPage: !!verifiedDate,
      verifiedDate: verifiedDate || null,
    };
  };

  MEL_V2.scrapeLinkedInCompany = async function () {
    const pageUrl = MEL_V2.normalizeUrl(location.href);

    // Guard: must be company OR school AND must be /about/ page
    if (
      !/linkedin\.com\/(company|school|showcase)\//i.test(pageUrl || "") ||
      !/\/about\/?$/i.test(pageUrl || "")
    ) {
      return {
        ok: false,
        error: "Not a LinkedIn company/school/showcase about page.",
      };
    }

    const hasReadyHeading =
      document.querySelector("main h1") ||
      document.querySelector(".org-top-card-summary__title") ||
      document.querySelector(".ph5 h1");

    // Small wait only if needed
    if (!hasReadyHeading) {
      await MEL_V2.waitForSelector(
        ["main h1", ".org-top-card-summary__title", ".ph5 h1"],
        1800,
        80
      );
    }

    const h1 =
      document.querySelector("main h1") ||
      document.querySelector(".org-top-card-summary__title") ||
      document.querySelector(".ph5 h1");

    const companyName = MEL_V2.cleanText(h1?.textContent) || null;
    const companyUrl = MEL_V2.normalizeUrl((location.href || "").split("?")[0]);
    const companyId = MEL_V2.getCompanySlugFromUrl(companyUrl);

    let linkedinCompanyId = MEL_V2.getCompanyLinkedinIdFromTopCardEmployeeLink() || MEL_V2.getCompanyLinkedinIdFromCodeTag();

    console.log("Scraped company slug/companyId:", companyId);
    console.log("Scraped linkedinCompanyId:", linkedinCompanyId);
    console.log("Scraped companyUrl:", companyUrl);

    const website = MEL_V2.getCompanyWebsite();
    const phone = MEL_V2.findLabeledValue("Phone");
    const industry = MEL_V2.findLabeledValue("Industry");
    const size =
      MEL_V2.findLabeledValue("Company size") ||
      MEL_V2.findLabeledValue("Employees");
    const hq =
      MEL_V2.findLabeledValue("Headquarters") ||
      MEL_V2.findLabeledValue("Headquarter");
    const founded = MEL_V2.findLabeledValue("Founded");

    const overview = MEL_V2.getCompanyOverview();
    const specialities = MEL_V2.getCompanySpecialities();
    const { verifiedPage, verifiedDate } = MEL_V2.getVerifiedInfo();

    return {
      ok: true,
      data: {
        company: {
          companyId: companyId || null,
          linkedinCompanyId,
          name: companyName || null,
          url: companyUrl || null,
          website: website || null,
          phone: phone || null,
          industry: industry || null,
          size: size || null,
          headquarter: hq || null,
          founded: founded || null,
          verifiedPage: verifiedPage ? "Yes" : "No",
          verifiedDate: verifiedDate || null,
          overview: overview || null,
          specialities: specialities || null,
        },
        meta: {
          scrapedAt: new Date().toISOString(),
          source: "extension_v2",
          pageUrl: pageUrl || null,
        },
      },
    };
  };
})();