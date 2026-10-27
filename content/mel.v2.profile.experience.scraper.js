// content/mel.v2.profile.experience.scraper.js
(function () {
  const MEL_V2 = (window.MEL_V2 = window.MEL_V2 || {});

  MEL_V2.findExperienceSection = function () {
    try {
      const headings = Array.from(document.querySelectorAll("h2"));

      const expHeading = headings.find((h2) => {
        const text = MEL_V2.cleanText(h2.textContent).toLowerCase();
        return text === "experience";
      });

      if (!expHeading) return null;

      const headingContainer = expHeading.closest("div");
      const mainExperienceBlock = headingContainer?.parentElement || null;

      if (!mainExperienceBlock) return null;

      const companyBlocks = mainExperienceBlock.querySelectorAll(
        '[componentkey^="entity-collection-item"]'
      );

      return {
        heading: expHeading,
        container: mainExperienceBlock,
        companies: companyBlocks.length,
      };
    } catch {
      return null;
    }
  };

  MEL_V2.extractDescriptionFromDom = function (root) {
    if (!root) return "";

    const descEl = root.querySelector('[data-testid="expandable-text-box"]');

    if (descEl) {
      return MEL_V2.cleanText(descEl.innerText);
    }

    return "";
  };

  MEL_V2.isSkillLineElement = function (el) {
    if (!el) return false;

    const parent = el.closest("a[href*='/skill-associations-details/']");
    if (parent) return true;

    const skillSvg = el.closest("div")?.querySelector("svg#skills-small");
    if (skillSvg) return true;

    return false;
  };

  MEL_V2.getTextLines = function (root) {
    if (!root) return [];

    return Array.from(root.querySelectorAll("p"))
      .filter((p) => !MEL_V2.isSkillLineElement(p))
      .map((p) => MEL_V2.cleanText(p.textContent))
      .filter(Boolean);
  };

  MEL_V2.getUniqueTextLines = function (root) {
    const lines = MEL_V2.getTextLines(root);
    return lines.filter((line, index, arr) => arr.indexOf(line) === index);
  };

  MEL_V2.hasNestedRoles = function (block) {
    if (!block) return false;
    return block.querySelectorAll(":scope > ul > li").length > 0;
  };

  MEL_V2.extractCompanyLink = function (block) {
    if (!block) {
      return {
        companyUrl: null,
        companyId: null,
        companyType: null,
      };
    }

    let topLinks = Array.from(block.querySelectorAll(":scope > div a[href]"));

    // Fallback near top
    if (!topLinks.length) {
      topLinks = Array.from(block.querySelectorAll("a[href]")).slice(0, 5);
    }

    const firstOrgLink = topLinks.find((a) => {
      const href = (a.getAttribute("href") || "").trim();
      return /linkedin\.com\/(company|school|showcase)\//i.test(href);
    });

    const companyUrl = firstOrgLink ? firstOrgLink.href : null;

    let companyId = null;
    let companyType = null;

    if (companyUrl) {
      const match = companyUrl.match(
        /linkedin\.com\/(company|school|showcase)\/([^/?#]+)/i
      );

      if (match) {
        companyType = match[1].toLowerCase();
        companyId = match[2];
      }
    }

    return {
      companyUrl: companyUrl ? MEL_V2.normalizeUrl(companyUrl) : null,
      companyId,
      companyType,
    };
  };

  MEL_V2.isEmploymentTypeLine = function (text) {
    const t = MEL_V2.cleanText(text).toLowerCase();
    if (!t) return false;

    return /\b(full[-\s]?time|part[-\s]?time|freelance|contractor|contract(?!ual)|internship|self-employed|temporary|apprenticeship|seasonal|volunteer)\b/i.test(
      t
    );
  };

  MEL_V2.isDurationLine = function (text) {
    const t = MEL_V2.cleanText(text).toLowerCase();
    if (!t) return false;

    const hasMonthName =
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(t);

    const hasYearMonthCount =
      /\b\d+\s*(yr|yrs|year|years|mo|mos|month|months)\b/i.test(t);

    const hasPresent = /\bpresent\b/i.test(t);
    const hasYearRange = /\b\d{4}\b/i.test(t);

    return hasMonthName || hasYearMonthCount || hasPresent || hasYearRange;
  };

  MEL_V2.parseRoleDurationParts = function (text) {
    const t = MEL_V2.cleanText(text);

    if (!t) {
      return {
        startDate: null,
        endDate: null,
        overallDuration: null,
      };
    }

    let startDate = null;
    let endDate = null;
    let overallDuration = null;

    const parts = t.split("·").map((x) => MEL_V2.cleanText(x)).filter(Boolean);
    const rangePart = parts[0] || "";
    overallDuration = parts[1] || null;

    if (rangePart && rangePart.includes("-")) {
      const rangeSplit = rangePart.split("-").map((x) => MEL_V2.cleanText(x));
      startDate = rangeSplit[0] || null;
      endDate = rangeSplit[1] || null;
    } else {
      startDate = rangePart || null;
    }

    return {
      startDate,
      endDate,
      overallDuration,
    };
  };

  MEL_V2.isPresentDuration = function (text) {
    const t = MEL_V2.cleanText(text);
    if (!t) return false;

    return /\bpresent\b/i.test(t);
  };

  MEL_V2.isDescriptionLine = function (text) {
    const t = MEL_V2.cleanText(text);
    if (!t) return false;

    return t.length > 200;
  };

  MEL_V2.normalizeLocationText = function (text) {
    return MEL_V2.cleanText(text)
      .toLowerCase()
      .replace(/[–—]/g, "-");
  };

  MEL_V2.getAllCountryNames = function () {
    try {
      if (MEL_V2._allCountryNamesCache) return MEL_V2._allCountryNamesCache;

      const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

      const codes = [
        "AF","AL","DZ","AR","AU","AT","BD","BE","BR","BG","CA","CL","CN","CO",
        "HR","CZ","DK","EG","EE","FI","FR","DE","GR","HK","HU","IS","IN","ID",
        "IE","IL","IT","JP","JO","KE","KW","LV","LT","LU","MY","MX","MA","NL",
        "NZ","NG","NO","OM","PK","PE","PH","PL","PT","QA","RO","RU","SA","SG",
        "SK","SI","ZA","KR","ES","LK","SE","CH","TW","TH","TR","UA","AE","GB",
        "US","VN"
      ];

      const names = new Set();

      for (const code of codes) {
        const name = regionNames.of(code);
        if (name) names.add(name.toLowerCase());
      }

      [
        "united states",
        "united states of america",
        "usa",
        "u.s.a",
        "u.s.",
        "uk",
        "u.k.",
        "united kingdom",
        "england",
        "scotland",
        "wales",
        "uae",
        "u.a.e.",
        "united arab emirates",
        "south korea",
        "viet nam",
        "czech republic",
        "taiwan",
      ].forEach((x) => names.add(x.toLowerCase()));

      MEL_V2._allCountryNamesCache = Array.from(names);
      return MEL_V2._allCountryNamesCache;
    } catch {
      return [
        "india",
        "united states",
        "usa",
        "united kingdom",
        "uk",
        "canada",
        "australia",
        "germany",
        "france",
        "uae",
      ];
    }
  };

  MEL_V2.getLocationAliases = function () {
    return [
      "usa",
      "u.s.a",
      "u.s.",
      "us",
      "uk",
      "u.k.",
      "uae",
      "u.a.e.",
      "eu",
      "remote",
      "headquarters",
      "hybrid",
      "on-site",
      "onsite",
      "worldwide",
    ];
  };

  MEL_V2.escapeRegex = function (str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  MEL_V2.isLocationLine = function (text) {
    const raw = MEL_V2.cleanText(text);
    const t = MEL_V2.normalizeLocationText(raw);

    if (!t) return false;

    // Reject obvious non-location
    if (MEL_V2.isDurationLine(t)) return false;
    if (MEL_V2.isEmploymentTypeLine(t)) return false;
    if (MEL_V2.isDescriptionLine(t)) return false;
    if (/\b\d+\s*(yr|yrs|year|years|mo|mos|month|months)\b/i.test(t)) return false;
    if (/\b\d{4}\b/.test(t)) return false;
    if (t.length > 80) return false;

    const countryNames = MEL_V2.getAllCountryNames();
    const aliases = MEL_V2.getLocationAliases();

    const allGeoTerms = [...new Set([...countryNames, ...aliases])]
      .sort((a, b) => b.length - a.length);

    const geoRegex = new RegExp(
      `\\b(?:${allGeoTerms.map(MEL_V2.escapeRegex).join("|")})\\b`,
      "i"
    );

    const hasCountryOrAlias = geoRegex.test(t);

    const hasCityStateAbbr =
      /^[a-z .'-]+,\s?[a-z]{2}(?:\s*\(.+\))?$/i.test(t);

    const hasCommaPlace =
      /^[a-z .'/()-]+,\s?[a-z .'/()-]+(?:,\s?[a-z .'/()-]+)?(?:\s*\(.+\))?$/i.test(
        t
      );

    const hasAreaPattern =
      /^[a-z .'/()-]+(?:\/[a-z .'/()-]+)?\s+area$/i.test(t) ||
      /^[a-z .'/()-]+\s+metropolitan area$/i.test(t) ||
      /^[a-z .'/()-]+\s+region$/i.test(t);

    const hasRemotePattern =
      /\b(remote|hybrid|on-site|onsite|headquarters|worldwide)\b/i.test(t);

    const looksLikeJobTitle =
      /\b(manager|director|engineer|developer|consultant|founder|analyst|specialist|lead|president|officer|intern)\b/i.test(
        t
      );

    if (
      looksLikeJobTitle &&
      !hasCountryOrAlias &&
      !hasCommaPlace &&
      !hasAreaPattern
    ) {
      return false;
    }

    return (
      hasCountryOrAlias ||
      hasCityStateAbbr ||
      hasCommaPlace ||
      hasAreaPattern ||
      hasRemotePattern
    );
  };

  MEL_V2.cleanSingleCompanyName = function (text) {
    const t = MEL_V2.cleanText(text);
    if (!t) return null;

    return t.split("·")[0].trim();
  };

  MEL_V2.extractEmploymentTypeFromMixedLine = function (text) {
    const t = MEL_V2.cleanText(text);
    if (!t) return null;

    const match = t.match(
      /\b(full[-\s]?time|part[-\s]?time|freelance|contractor|contract(?!ual)|internship|self-employed|temporary|apprenticeship|seasonal|volunteer)\b/i
    );

    return match ? match[1] : null;
  };

    MEL_V2.normalizeEmploymentType = function (text) {
    const t = MEL_V2.cleanText(text).toLowerCase();
    if (!t) return null;

    const map = {
      "full time": "Full-time",
      "full-time": "Full-time",
      "part time": "Part-time",
      "part-time": "Part-time",
      freelance: "Freelance",
      contract: "Contract",
      contractor: "Contractor",
      internship: "Internship",
      "self employed": "Self-employed",
      "self-employed": "Self-employed",
      temporary: "Temporary",
      apprenticeship: "Apprenticeship",
      seasonal: "Seasonal",
      volunteer: "Volunteer",
    };

    return map[t] || text;
  };

  MEL_V2.findEmploymentTypeInExperienceLines = function (lines) {
    if (!Array.isArray(lines) || !lines.length) return null;

    const candidateLines = lines
      .slice(0, 8)
      .map((line) => MEL_V2.cleanText(line))
      .filter((line) => {
        if (!line) return false;

        // skip description / bullets
        if (line.startsWith("•")) return false;
        if (MEL_V2.isDescriptionLine(line)) return false;
        if (line.length > 90) return false;

        const wordCount = line.split(/\s+/).length;
        if (wordCount > 8) return false;

        return true;
      });

    for (const line of candidateLines) {
      const match = line.match(
        /\b(full[-\s]?time|part[-\s]?time|freelance|contractor|contract(?!ual)|internship|self-employed|temporary|apprenticeship|seasonal|volunteer)\b/i
      );

      if (match?.[1]) {
        return MEL_V2.normalizeEmploymentType(match[1]);
      }
    }

    return null;
  };

  MEL_V2.getFirstRoleLocation = function (roles) {
    if (!Array.isArray(roles) || !roles.length) return null;

    for (const role of roles) {
      const loc = MEL_V2.cleanText(role?.location);
      if (loc) return loc;
    }

    return null;
  };

  MEL_V2.isRetiredText = function (text) {
    const t = MEL_V2.cleanText(text);
    if (!t) return false;

    return /\bsemi[-\s]?retired\b|\bretired\b|\bretiree\b|\bretd\.?\b|\bretire\b/i.test(t);
  };
  
  MEL_V2.parseSingleRoleCompany = function (block, index) {
    const rawTextLines = MEL_V2.getUniqueTextLines(block);
    const { companyUrl, companyId, companyType } = MEL_V2.extractCompanyLink(block);

    const jobTitle = rawTextLines[0] || null;
    const companyLine = rawTextLines[1] || null;

    const companyName = MEL_V2.cleanSingleCompanyName(companyLine || "");
    const employmentTypeFromCompanyLine =
      MEL_V2.extractEmploymentTypeFromMixedLine(companyLine || "");

    let duration = null;
    let location = null;
    let description = MEL_V2.extractDescriptionFromDom(block) || null;
    let employmentType =
      MEL_V2.findEmploymentTypeInExperienceLines(rawTextLines) ||
      (employmentTypeFromCompanyLine
        ? MEL_V2.normalizeEmploymentType(employmentTypeFromCompanyLine)
        : null);

    for (let i = 2; i < rawTextLines.length; i += 1) {
      const line = rawTextLines[i];

      const cleanLine = MEL_V2.cleanText(line);

if (
  !employmentType &&
  !cleanLine.startsWith("•") &&
  !MEL_V2.isDescriptionLine(cleanLine) &&
  cleanLine.length <= 90 &&
  cleanLine.split(/\s+/).length <= 8 &&
  MEL_V2.isEmploymentTypeLine(cleanLine)
) {
        console.log("⚠️ Single fallback employment matched:", line);
        employmentType = MEL_V2.normalizeEmploymentType(
          MEL_V2.extractEmploymentTypeFromMixedLine(line) || line
        );
        continue;
      }

      if (!duration && MEL_V2.isDurationLine(line)) {
        duration = line;
        continue;
      }

      if (!location && MEL_V2.isLocationLine(line)) {
        location = line;
        continue;
      }

      if (!description && MEL_V2.isDescriptionLine(line)) {
        description = line;
      }
    }

    const parsedDuration = MEL_V2.parseRoleDurationParts(duration);

    const roleIsRetired =
      MEL_V2.isRetiredText(jobTitle) ||
      MEL_V2.isRetiredText(duration) ||
      MEL_V2.isRetiredText(companyName);

    const roles = [];

    if (jobTitle && companyName) {
      roles.push({
        index: 1,
        jobTitle,
        employmentType: employmentType || null,
        duration: duration || null,
        startDate: parsedDuration.startDate,
        endDate: parsedDuration.endDate,
        overallDuration: parsedDuration.overallDuration,
        location: location || null,
        description: description || null,
        isRetired: roleIsRetired,
        isCurrent: MEL_V2.isPresentDuration(duration),
        rawTextLines,
      });
    }

    const companyLocation = MEL_V2.getFirstRoleLocation(roles);
    const isPresent = MEL_V2.isPresentDuration(duration);
    const isRetired =
      MEL_V2.isRetiredText(companyName) ||
      roles.some((role) => role?.isRetired);

    return {
      index: index + 1,
      hasNestedRoles: false,
      companyName: companyName || null,
      cleanCompanyName: companyName || null,
      companyUrl,
      companyId,
      companyType,
      companyLocation,
      overallExperience: roles[0]?.overallDuration || null,
      overallEmploymentType: roles[0]?.employmentType || null,
      isPresent,
      isRetired,
      roles,
      rawTextLines,
    };
  };

  MEL_V2.parseNestedRoleLi = function (li, roleIndex) {
    const textLines = MEL_V2.getUniqueTextLines(li);
    if (!textLines.length) return null;

    const jobTitle = textLines[0] || null;

    let duration = null;
    let location = null;
    let description = MEL_V2.extractDescriptionFromDom(li) || null;
    let employmentType = MEL_V2.findEmploymentTypeInExperienceLines(textLines);

    for (let i = 1; i < textLines.length; i += 1) {
      const line = textLines[i];

      const cleanLine = MEL_V2.cleanText(line);

if (
  !employmentType &&
  !cleanLine.startsWith("•") &&
  !MEL_V2.isDescriptionLine(cleanLine) &&
  cleanLine.length <= 90 &&
  cleanLine.split(/\s+/).length <= 8 &&
  MEL_V2.isEmploymentTypeLine(cleanLine)
) {
        console.log("⚠️ Nested fallback employment matched:", line);
        employmentType = MEL_V2.normalizeEmploymentType(
          MEL_V2.extractEmploymentTypeFromMixedLine(line) || line
        );
        continue;
      }

      if (!duration && MEL_V2.isDurationLine(line)) {
        duration = line;
        continue;
      }

      if (!location && MEL_V2.isLocationLine(line)) {
        location = line;
        continue;
      }

      if (!description && MEL_V2.isDescriptionLine(line)) {
        description = line;
      }
    }

    if (!jobTitle) return null;

    const parsedDuration = MEL_V2.parseRoleDurationParts(duration);
    const isRetired =
      MEL_V2.isRetiredText(jobTitle) ||
      MEL_V2.isRetiredText(duration);

    return {
      index: roleIndex + 1,
      jobTitle,
      employmentType: employmentType || null,
      duration: duration || null,
      startDate: parsedDuration.startDate,
      endDate: parsedDuration.endDate,
      overallDuration: parsedDuration.overallDuration,
      location: location || null,
      description: description || null,
      isRetired,
      isCurrent: MEL_V2.isPresentDuration(duration),
      rawTextLines: textLines,
    };
  };

  MEL_V2.parseMultiRoleCompany = function (block, index) {
    const rawTextLines = MEL_V2.getUniqueTextLines(block);
    const { companyUrl, companyId, companyType } = MEL_V2.extractCompanyLink(block);

    const companyName = rawTextLines[0] || null;
    const secondLine = rawTextLines[1] || null;

    let overallExperience = null;
    let overallEmploymentType =
      MEL_V2.findEmploymentTypeInExperienceLines(rawTextLines);

    if (secondLine) {
      if (!overallEmploymentType) {
        const extractedType =
          MEL_V2.extractEmploymentTypeFromMixedLine(secondLine);
        overallEmploymentType = extractedType
          ? MEL_V2.normalizeEmploymentType(extractedType)
          : null;
      }

      const parts = secondLine
        .split("·")
        .map((x) => MEL_V2.cleanText(x))
        .filter(Boolean);

      overallExperience =
        parts.find((part) => MEL_V2.isDurationLine(part)) || null;
    }

    const nestedRoleLis = Array.from(block.querySelectorAll(":scope > ul > li"));

    const roles = nestedRoleLis
      .map((li, roleIndex) => MEL_V2.parseNestedRoleLi(li, roleIndex))
      .filter(Boolean);

    const companyLocation = MEL_V2.getFirstRoleLocation(roles);

    const isPresent =
      MEL_V2.isPresentDuration(overallExperience) ||
      roles.some((role) => MEL_V2.isPresentDuration(role?.duration));

    const isRetired =
      MEL_V2.isRetiredText(companyName) ||
      MEL_V2.isRetiredText(overallExperience) ||
      roles.some((role) => role?.isRetired);

    return {
      index: index + 1,
      hasNestedRoles: true,
      companyName: companyName || null,
      cleanCompanyName: companyName || null,
      companyUrl,
      companyId,
      companyType,
      companyLocation,
      overallExperience: overallExperience || null,
      overallEmploymentType: overallEmploymentType || null,
      isPresent,
      isRetired,
      roles,
      rawTextLines,
    };
  };

  MEL_V2.parseExperienceCompanies = function () {
    try {
      const sectionResult = MEL_V2.findExperienceSection();

      if (!sectionResult?.container) return [];

      const companyBlocks = Array.from(
        sectionResult.container.querySelectorAll(
          '[componentkey^="entity-collection-item"]'
        )
      );

      return companyBlocks
        .map((block, index) => {
          const hasNestedRoles = MEL_V2.hasNestedRoles(block);

          if (hasNestedRoles) {
            return MEL_V2.parseMultiRoleCompany(block, index);
          }

          return MEL_V2.parseSingleRoleCompany(block, index);
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  MEL_V2.getCurrentCompanyFromExperience = function (experience) {
    if (!Array.isArray(experience) || !experience.length) {
      return {
        companyName: null,
        companyId: null,
        companyUrl: null,
        companyLocation: null,
        companyCountry: null,
        jobTitle: null,
      };
    }

    const currentCompany = experience[0] || null;
    const firstRole = Array.isArray(currentCompany?.roles)
      ? currentCompany.roles[0] || null
      : null;

    const companyLocation =
      currentCompany?.companyLocation ||
      firstRole?.location ||
      null;

    return {
      companyName:
        currentCompany?.cleanCompanyName ||
        currentCompany?.companyName ||
        null,
      companyId: currentCompany?.companyId || null,
      companyUrl: currentCompany?.companyUrl || null,
      companyLocation,
      companyCountry: MEL_V2.extractCountry(companyLocation),
      jobTitle: firstRole?.jobTitle || null,
    };
  };


})();