// content/mel.v2.profile.utils.js
(function () {
  const MEL_V2 = (window.MEL_V2 = window.MEL_V2 || {});

  MEL_V2.cleanText = function (value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  };

  MEL_V2.cleanProfileName = function (fullName) {
    let name = MEL_V2.cleanText(fullName || "");

    if (!name) return "";

    // Remove invisible / direction control chars
    name = name.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");

    // Remove emojis / pictographs / symbols that often appear before names
    name = name.replace(
      /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{So}\p{Cs}]/gu,
      ""
    );

    // Remove honorifics/titles only from the beginning
    name = name.replace(
      /^(?:mr|mr\.|mrs|mrs\.|ms|ms\.|miss|dr|dr\.|prof|prof\.|sir|madam)\s+/i,
      ""
    );

    // Remove leading punctuation/symbols left after emoji/title cleanup
    name = name.replace(/^[\s,.\-_|:;]+/, "");

    // Remove commas stuck to the first token like "Mark, Harburn"
    name = name.replace(/\s*,\s*/g, " ");

    // Collapse repeated whitespace
    name = name.replace(/\s+/g, " ").trim();

    return name;
  };

  MEL_V2.normalizeUrl = function (value) {
    if (!value) return null;

    try {
      const url = new URL(value, location.origin);
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return value;
    }
  };

  MEL_V2.splitName = function (fullName) {
    const cleanedName = MEL_V2.cleanProfileName(fullName);
    const parts = cleanedName.split(" ").filter(Boolean);

    const firstName = (parts[0] || "").replace(/^[,.\-]+|[,.\-]+$/g, "");
    const lastName = parts
      .slice(1)
      .join(" ")
      .replace(/^[,.\-]+|[,.\-]+$/g, "")
      .trim();

    return {
      firstName: firstName || "",
      lastName: lastName || "",
    };
  };

  MEL_V2.parseConnections = function (text) {
    const clean = MEL_V2.cleanText(text);

    if (!clean) {
      return {
        connectionsText: null,
        connectionsCount: null,
      };
    }

    const match = clean.match(/(\d[\d,]*)\s*\+?\s*connections/i);

    if (!match) {
      return {
        connectionsText: clean,
        connectionsCount: null,
      };
    }

    const raw = match[1].replace(/,/g, "");
    const count = Number(raw);

    return {
      connectionsText: clean,
      connectionsCount: Number.isFinite(count) ? count : null,
    };
  };

  MEL_V2.getProfileIdHeuristic = function () {
    if (!MEL_V2.isLinkedInProfilePage()) return null;

    const ogUrl = document
      .querySelector('meta[property="og:url"]')
      ?.getAttribute("content");

    const cleanUrl = MEL_V2.normalizeUrl(ogUrl || location.href);
    if (!cleanUrl) return null;

    const match = cleanUrl.match(/linkedin\.com\/in\/([^/?#]+)/i);
    return match ? match[1] : null;
  };

  MEL_V2.getFullNameFallback = function () {
    const title = MEL_V2.cleanText(document.title);
    return title.split("|")[0]?.trim() || "";
  };

    MEL_V2.cleanPayloadText = function (value) {
    return String(value || "")
      .replace(/\u00A0/g, " ")     // non-breaking space
      .replace(/\n+/g, " ")        // new lines -> single space
      .replace(/\s*·\s*/g, " · ")  // normalize dot separator
      .replace(/\s{2,}/g, " ")     // extra spaces
      .trim();
  };

  MEL_V2.waitForSelector = function (selectors, timeoutMs = 8000, intervalMs = 200) {
    const list = Array.isArray(selectors) ? selectors : [selectors];

    return new Promise((resolve) => {
      const start = Date.now();

      const tick = () => {
        for (const selector of list) {
          const el = document.querySelector(selector);
          if (el) return resolve(el);
        }

        if (Date.now() - start >= timeoutMs) {
          return resolve(null);
        }

        setTimeout(tick, intervalMs);
      };

      tick();
    });
  };

  MEL_V2.getCountryAliasMap = function () {
  return {
    usa: "United States",
    us: "United States",
    "u.s.": "United States",
    "u.s.a": "United States",
    "u.s.a.": "United States",
    "united states of america": "United States",
    america: "United States",

    uk: "United Kingdom",
    "u.k.": "United Kingdom",
    britain: "United Kingdom",
    "great britain": "United Kingdom",
    england: "United Kingdom",
    scotland: "United Kingdom",
    wales: "United Kingdom",

    uae: "United Arab Emirates",
    "u.a.e.": "United Arab Emirates",
    ksa: "Saudi Arabia",
    korea: "South Korea",
    "south korea": "South Korea",
    czechia: "Czech Republic",
    "viet nam": "Vietnam",
  };
};

MEL_V2.getCountryNamesMap = function () {
  try {
    if (MEL_V2._countryNamesMapCache) return MEL_V2._countryNamesMapCache;

    const countries = [
      "India",
      "United States",
      "United Kingdom",
      "Canada",
      "Australia",
      "Germany",
      "France",
      "United Arab Emirates",
      "Singapore",
      "Saudi Arabia",
      "South Korea",
      "Czech Republic",
      "Vietnam",
      "Pakistan",
      "Bangladesh",
      "Sri Lanka",
      "China",
      "Japan",
      "Thailand",
      "Malaysia",
      "Indonesia",
      "Philippines",
      "Netherlands",
      "Italy",
      "Spain",
      "Sweden",
      "Switzerland",
      "Ireland",
      "Poland",
      "Brazil",
      "Mexico",
      "South Africa",
      "New Zealand",
      "Qatar",
      "Kuwait",
      "Oman",
      "Bahrain",
    ];

    const map = new Map();

    countries.forEach((country) => {
      map.set(country.toLowerCase(), country);
    });

    Object.entries(MEL_V2.getCountryAliasMap()).forEach(([alias, country]) => {
      map.set(alias.toLowerCase(), country);
    });

    MEL_V2._countryNamesMapCache = map;
    return map;
  } catch {
    const map = new Map();

    ["India", "United States", "United Kingdom", "Canada", "Australia"].forEach(
      (country) => map.set(country.toLowerCase(), country)
    );

    return map;
  }
};

MEL_V2.extractCountry = function (locationText) {
  const cleanLocation = MEL_V2.cleanText(locationText);
  if (!cleanLocation) return null;

  const countryMap = MEL_V2.getCountryNamesMap();
  const normalized = cleanLocation.toLowerCase();

  const parts = cleanLocation
    .split(/[,|•·]/)
    .map((item) => MEL_V2.cleanText(item).toLowerCase())
    .filter(Boolean);

  // 1) First check comma-separated location parts.
  // Example: "Delhi, India" => India
  // This must run before United States fallback.
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];

    if (countryMap.has(part)) {
      return countryMap.get(part);
    }

    const aliasCountry = MEL_V2.getCountryAliasMap()[part];

    if (aliasCountry) {
      return aliasCountry;
    }
  }

  // 2) Then check country names anywhere in text.
  const countriesByLength = Array.from(countryMap.keys()).sort(
    (a, b) => b.length - a.length
  );

  for (const key of countriesByLength) {
    const escaped = MEL_V2.escapeRegex
      ? MEL_V2.escapeRegex(key)
      : String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const pattern = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i");

    if (pattern.test(normalized)) {
      return countryMap.get(key);
    }
  }

  // 3) Only after explicit country check, infer US.
  if (MEL_V2.isUnitedStatesLocation(cleanLocation)) {
    return "United States";
  }

  return null;
};

MEL_V2.isUnitedStatesLocation = function (locationText) {
  const text = MEL_V2.cleanText(locationText).toLowerCase();
  if (!text) return false;

  const countryMap = MEL_V2.getCountryNamesMap
    ? MEL_V2.getCountryNamesMap()
    : new Map();

  const aliases = MEL_V2.getCountryAliasMap
    ? MEL_V2.getCountryAliasMap()
    : {};

  const parts = text
    .split(/[,|•·]/)
    .map((x) => MEL_V2.cleanText(x).toLowerCase())
    .filter(Boolean);

  // Important safety guard:
  // If location has explicit non-US country, never return United States.
  // Example: "Delhi, India" should not become United States because "IN" is Indiana code.
  for (const part of parts) {
    const exactCountry = countryMap.get(part) || aliases[part];

    if (exactCountry && exactCountry !== "United States") {
      return false;
    }
  }

  const usAliases = new Set([
    "united states",
    "united states of america",
    "usa",
    "u.s.a",
    "u.s.a.",
    "u.s.",
    "us",
    "america",
  ]);

  const usStates = new Set([
    "alabama",
    "alaska",
    "arizona",
    "arkansas",
    "california",
    "colorado",
    "connecticut",
    "delaware",
    "florida",
    "georgia",
    "hawaii",
    "idaho",
    "illinois",
    "indiana",
    "iowa",
    "kansas",
    "kentucky",
    "louisiana",
    "maine",
    "maryland",
    "massachusetts",
    "michigan",
    "minnesota",
    "mississippi",
    "missouri",
    "montana",
    "nebraska",
    "nevada",
    "new hampshire",
    "new jersey",
    "new mexico",
    "new york",
    "north carolina",
    "north dakota",
    "ohio",
    "oklahoma",
    "oregon",
    "pennsylvania",
    "rhode island",
    "south carolina",
    "south dakota",
    "tennessee",
    "texas",
    "utah",
    "vermont",
    "virginia",
    "washington",
    "west virginia",
    "wisconsin",
    "wyoming",
    "district of columbia",
  ]);

  for (const part of parts) {
    if (usAliases.has(part)) return true;
    if (usStates.has(part)) return true;
  }


  for (const state of usStates) {
    const escaped = MEL_V2.escapeRegex
      ? MEL_V2.escapeRegex(state)
      : String(state).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const pattern = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i");

    if (pattern.test(text)) {
      return true;
    }
  }

  const knownUSMetroTerms = [
    "san francisco bay area",
    "greater new york city area",
    "new york city metropolitan area",
    "greater boston",
    "greater chicago area",
    "greater seattle area",
    "greater los angeles area",
    "washington dc-baltimore area",
    "washington dc metro area",
    "dallas-fort worth metroplex",
  ];

  if (knownUSMetroTerms.some((term) => text.includes(term))) {
    return true;
  }

  return false;
};

  MEL_V2.isLinkedInProfilePage = function (url = window.location.href) {
    if (!url || typeof url !== "string") return false;

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      const path = parsed.pathname || "";

      return host === "linkedin.com" && /^\/in\/[^/]+\/?$/.test(path);
    } catch {
      return false;
    }
  };

})();