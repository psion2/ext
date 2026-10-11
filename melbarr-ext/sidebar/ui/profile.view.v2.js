// sidebar/ui/profile.view.v2.js
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmtDateLabel(d) {
  if (!d) return "";
  if (typeof d === "string") return d;
  return d.label || "";
}

function fmtRange(role) {
  const duration = role?.duration || role?.overallDuration || "";
  return duration || "-";
}

function renderExperienceCards(experience) {
  if (!Array.isArray(experience) || experience.length === 0) {
    return `<div class="empty-state">No experience found.</div>`;
  }

  return experience
    .slice(0, 12)
    .map((c) => {
      const companyName = escapeHtml(
        c?.cleanCompanyName || c?.companyName || c?.name || "Company"
      );

      let companyUrl = c?.companyUrl || "";

      if (companyUrl) {
        companyUrl = companyUrl.split("?")[0]; // remove query params

        if (!/\/about\/?$/i.test(companyUrl)) {
          companyUrl = companyUrl.replace(/\/$/, "") + "/about/";
        }
      }
      const companyId = escapeHtml(c?.companyId || "—");
      const totalDuration = escapeHtml(c?.overallExperience || "—");

      const roles = Array.isArray(c?.roles) ? c.roles : [];

      const rolesHtml =
        roles.length === 0
          ? `<div class="empty-state small">No roles found</div>`
          : roles
              .slice(0, 12)
              .map((r) => {
                const title = escapeHtml(r?.jobTitle || r?.title || "—");
                const range = escapeHtml(fmtRange(r) || "—");
                const currentChip = r?.isCurrent
                  ? `<span class="expRoleChip expRoleChipCurrent">Present</span>`
                  : "";

                return `
                  <div class="expRole">
                    <div class="expRoleTop">
                      <div class="expRoleTitle">${title}</div>
                      ${currentChip}
                    </div>
                    <div class="expRoleMeta">${range}</div>
                  </div>
                `;
              })
              .join("");

      const companyLine = companyUrl
        ? `<a class="expCompanyLink" href="${escapeHtml(
            companyUrl
          )}" target="_blank" rel="noreferrer">${companyName}</a>`
        : `<div class="expCompanyName">${companyName}</div>`;

      return `
        <details class="expItem">
          <summary class="expSummary">
            <div class="expSummaryLeft">
              ${companyLine}
              <div class="expSummaryMeta">${totalDuration}</div>
            </div>

            <div class="expSummaryRight">
              <div class="expCompanyIdInline">Company ID: ${companyId}</div>
              <div class="expChevron">▾</div>
            </div>
          </summary>

          <div class="expBody">
            ${rolesHtml}
          </div>
        </details>
      `;
    })
    .join("");
}

export function ProfileView(root) {
  root.innerHTML = `
    <div id="v2AppShell" class="hidden">

      <div class="tabbar">
        <button class="tab-btn active" data-tab="contact">Contacts</button>
        <button class="tab-btn" data-tab="company">Company</button>
        <button class="tab-btn" data-tab="bulk">Bulk</button>
      </div>

      <section id="tab-contact" class="tab-panel active">
        <div class="card">
          <div class="card-header card-header-with-action">
            <div>
              <div class="card-title">Contact Scraper</div>
              <div class="card-subtitle">Fetch and save LinkedIn profile data</div>
              <div class="scrape-options">
                <label class="checkbox-row">
                  <input
                    type="checkbox"
                    id="scrapeCompanyToggle"
                    checked
                  />

                  <span class="checkbox-text">
                    Scrape current company data
                  </span>
                </label>
              </div>
            </div>

            <button id="fetchContactBtn" class="btn btn-primary">Fetch Contact</button>
          </div>

          <div class="card-body">
            <div class="stack">
              <div class="field">
                <label class="label">Status</label>
                <div id="contact_status" class="value-box value-box-sm"></div>
              </div>
              <div class="row">
                <div class="field">
                  <label class="label">Profile ID</label>
                  <div id="contact_profileId" class="value-box value-box-sm"></div>
                </div>
                <div class="field">
                  <label class="label">Connections</label>
                  <div id="contact_connections" class="value-box value-box-sm"></div>
                </div>
              </div>

              <div class="row">
                <div class="field">
                  <label class="label">First Name</label>
                  <div id="contact_firstName" class="value-box value-box-sm"></div>
                </div>
                <div class="field">
                  <label class="label">Last Name</label>
                  <div id="contact_lastName" class="value-box value-box-sm"></div>
                </div>
              </div>

              <div class="row">
                <div class="field">
                  <label class="label">Location</label>
                  <div id="contact_location" class="value-box value-box-sm"></div>
                </div>
                <div class="field">
                  <label class="label">Country</label>
                  <div id="contact_country" class="value-box value-box-sm"></div>
                </div>
              </div>

              <div class="field">
                <label class="label">Current Job Title</label>
                <div id="contact_jobTitle" class="value-box value-box-sm"></div>
              </div>

              <div class="row">
                <div class="field">
                  <label class="label">Current Company</label>
                  <div id="contact_companyName" class="value-box value-box-sm"></div>
                </div>
                <div class="field">
                  <label class="label">Company ID</label>
                  <div id="contact_companyId" class="value-box value-box-sm"></div>
                </div>
              </div>

              <div class="row">
                <div class="field">
                  <label class="label">Company Location</label>
                  <div id="contact_companyLocation" class="value-box value-box-sm"></div>
                </div>
                <div class="field">
                  <label class="label">Company Country</label>
                  <div id="contact_companyCountry" class="value-box value-box-sm"></div>
                </div>
              </div>

              <div class="field">
                <label class="label">Profile URL</label>
                <div id="contact_profileUrl" class="value-box value-box-sm"></div>
              </div>

              <div class="field">
                <label class="label">Company URL</label>
                <div id="contact_companyUrl" class="value-box value-box-sm"></div>
              </div>

              <div class="field">
                <label class="label">Experience</label>
                <div id="contact_experience" class="experience-grid"></div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="actions">
              <button id="fetchSaveContactBtn" class="btn btn-primary">Fetch & Save</button>
              <button id="saveContactBtn" class="btn btn-success">Save Contact</button>
              <button id="copyProfileIdBtn" class="btn">Copy ID</button>
              <button id="clearContactBtn" class="btn">Clear</button>
            </div>
          </div>
        </div>
      </section>

      <section id="tab-company" class="tab-panel">
        <div class="card">
          <div class="card-header card-header-with-action">
            <div>
              <div class="card-title">Company Scraper</div>
              <div class="card-subtitle">Fetch and save LinkedIn company data</div>
            </div>

            <button id="fetchCompanyBtn" class="btn btn-primary">Fetch Company</button>
          </div>

          <div class="card-body">
            <div class="stack">
            <div class="field">
              <label class="label">Status</label>
              <div id="company_status" class="value-box value-box-sm"></div>
            </div>
              <div class="row">
                <div class="field">
                  <label class="label">Company Slug / ID</label>
                  <div id="company_companyId" class="value-box value-box-sm"></div>
                </div>
                <div class="field">
                  <label class="label">LinkedIn Company ID</label>
                  <div id="company_linkedinCompanyId" class="value-box value-box-sm"></div>
                </div>
              </div>

              <div class="field">
                <label class="label">Company Name</label>
                <div id="company_name" class="value-box value-box-sm"></div>
              </div>

              <div class="field">
                <label class="label">Company URL</label>
                <div id="company_url" class="value-box value-box-sm"></div>
              </div>

              <div class="field">
                <label class="label">Website</label>
                <div id="company_website" class="value-box value-box-sm"></div>
              </div>

              <div class="row">
                <div class="field">
                  <label class="label">Phone</label>
                  <div id="company_phone" class="value-box value-box-sm"></div>
                </div>
                <div class="field">
                  <label class="label">Industry</label>
                  <div id="company_industry" class="value-box value-box-sm"></div>
                </div>
              </div>

              <div class="row">
                <div class="field">
                  <label class="label">Company Size</label>
                  <div id="company_size" class="value-box value-box-sm"></div>
                </div>
                <div class="field">
                  <label class="label">Headquarter</label>
                  <div id="company_hq" class="value-box value-box-sm"></div>
                </div>
              </div>

              <div class="row">
                <div class="field">
                  <label class="label">Verified Page</label>
                  <div id="company_verified" class="value-box value-box-sm"></div>
                </div>
                <div class="field">
                  <label class="label">Verified Date</label>
                  <div id="company_verifiedDate" class="value-box value-box-sm"></div>
                </div>
              </div>

              <div class="field">
                <label class="label">Overview</label>
                <div id="company_overview" class="log-box"></div>
              </div>

              <div class="field">
                <label class="label">Specialities</label>
                <div id="company_specialities" class="log-box"></div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="actions">
              <button id="saveCompanyBtn" class="btn btn-success">Save Company</button>
              <button id="clearCompanyBtn" class="btn">Clear</button>
            </div>
          </div>
        </div>
      </section>

      <section id="tab-bulk" class="tab-panel">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Bulk Scraper</div>
            <div class="card-subtitle">Paste LinkedIn profile/company URLs and run bulk scraping</div>
          </div>
          <div class="card-body">
            <div class="stack">
              <div class="field">
                <label class="label">LinkedIn URLs</label>
                <textarea id="bulk_urls" class="textarea textarea-sm" placeholder="Paste one LinkedIn URL per line..."></textarea>
              </div>

              <div class="actions actions-spaced">
                <button id="bulkStartBtn" class="btn btn-primary">Start Bulk</button>
                <button id="bulkPauseBtn" class="btn">Pause</button>
                <button id="bulkStopBtn" class="btn btn-danger">Stop</button>
                <button id="bulkClearBtn" class="btn">Clear</button>
              </div>

              <div class="field">
                <label class="label">Progress</label>
                <div class="progress-wrap">
                  <div id="bulkProgressBar" class="progress-bar"></div>
                </div>
              </div>

              <div class="row">
                <div class="field">
                  <label class="label">Status</label>
                  <div id="bulk_status" class="value-box value-box-sm"></div>
                </div>
                <div class="field">
                  <label class="label">Summary</label>
                  <div id="bulk_summary" class="value-box value-box-sm"></div>
                </div>
              </div>

              <div class="field">
                <label class="label">Result Log</label>
                <div id="bulk_log" class="log-box"></div>
              </div>

              <div class="field">
                <label class="label">Failed URLs</label>
                <div id="bulk_failed" class="log-box"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  const appShell = root.querySelector("#v2AppShell");
  const tabButtons = Array.from(root.querySelectorAll(".tab-btn"));
  const panels = {
    contact: root.querySelector("#tab-contact"),
    company: root.querySelector("#tab-company"),
    bulk: root.querySelector("#tab-bulk"),
  };

  function showApp() {
    appShell.classList.remove("hidden");
  }

  function hideApp() {
    appShell.classList.add("hidden");
  }

  function setUserHeader(user) {
    return user;
  }  
  function setActiveTab(tab) {
    tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    Object.entries(panels).forEach(([key, panel]) => {
      panel.classList.toggle("active", key === tab);
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  const refs = {
    fetchContactBtn: root.querySelector("#fetchContactBtn"),
    fetchSaveContactBtn: root.querySelector("#fetchSaveContactBtn"),
    saveContactBtn: root.querySelector("#saveContactBtn"),
    copyProfileIdBtn: root.querySelector("#copyProfileIdBtn"),
    clearContactBtn: root.querySelector("#clearContactBtn"),

    contact_status: root.querySelector("#contact_status"),
    contact_profileId: root.querySelector("#contact_profileId"),
    contact_connections: root.querySelector("#contact_connections"),
    contact_firstName: root.querySelector("#contact_firstName"),
    contact_lastName: root.querySelector("#contact_lastName"),
    contact_location: root.querySelector("#contact_location"),
    contact_country: root.querySelector("#contact_country"),
    contact_jobTitle: root.querySelector("#contact_jobTitle"),
    contact_companyName: root.querySelector("#contact_companyName"),
    contact_companyId: root.querySelector("#contact_companyId"),
    contact_companyLocation: root.querySelector("#contact_companyLocation"),
    contact_companyCountry: root.querySelector("#contact_companyCountry"),
    contact_profileUrl: root.querySelector("#contact_profileUrl"),
    contact_companyUrl: root.querySelector("#contact_companyUrl"),
    contact_experience: root.querySelector("#contact_experience"),

    fetchCompanyBtn: root.querySelector("#fetchCompanyBtn"),
    saveCompanyBtn: root.querySelector("#saveCompanyBtn"),
    clearCompanyBtn: root.querySelector("#clearCompanyBtn"),

    company_status: root.querySelector("#company_status"),
    company_companyId: root.querySelector("#company_companyId"),
    company_linkedinCompanyId: root.querySelector("#company_linkedinCompanyId"),
    company_name: root.querySelector("#company_name"),
    company_url: root.querySelector("#company_url"),
    company_website: root.querySelector("#company_website"),
    company_phone: root.querySelector("#company_phone"),
    company_industry: root.querySelector("#company_industry"),
    company_size: root.querySelector("#company_size"),
    company_hq: root.querySelector("#company_hq"),
    company_verified: root.querySelector("#company_verified"),
    company_verifiedDate: root.querySelector("#company_verifiedDate"),
    company_overview: root.querySelector("#company_overview"),
    company_specialities: root.querySelector("#company_specialities"),

    bulk_urls: root.querySelector("#bulk_urls"),
    bulkStartBtn: root.querySelector("#bulkStartBtn"),
    bulkPauseBtn: root.querySelector("#bulkPauseBtn"),
    bulkStopBtn: root.querySelector("#bulkStopBtn"),
    bulkClearBtn: root.querySelector("#bulkClearBtn"),
    bulkProgressBar: root.querySelector("#bulkProgressBar"),
    bulk_status: root.querySelector("#bulk_status"),
    bulk_summary: root.querySelector("#bulk_summary"),
    bulk_log: root.querySelector("#bulk_log"),
    bulk_failed: root.querySelector("#bulk_failed"),
  };

  const scrapeCompanyToggle = root.querySelector("#scrapeCompanyToggle");


  function setText(el, value) {
    if (!el) return;
    el.textContent = value == null || value === "" ? "-" : String(value);
  }

  function clearStatusTone(el) {
    if (!el) return;

    el.classList.remove(
      "status-success",
      "status-error",
      "status-info",
      "status-warning"
    );
  }

  function setStatus(el, value, tone = "info") {
    if (!el) return;

    el.textContent = value == null || value === "" ? "-" : String(value);

    clearStatusTone(el);

    if (tone === "success") {
      el.classList.add("status-success");
      return;
    }

    if (tone === "warning") {
      el.classList.add("status-warning");
      return;
    }

    if (tone === "error") {
      el.classList.add("status-error");
      return;
    }
 
    el.classList.add("status-info");
  }

  function renderExperience(experience) {
    refs.contact_experience.innerHTML = renderExperienceCards(experience);
  }

  function clearContact() {
    clearStatusTone(refs.contact_status);
    setText(refs.contact_status, "");

    [
      "contact_profileId",
      "contact_connections",
      "contact_firstName",
      "contact_lastName",
      "contact_location",
      "contact_country",
      "contact_jobTitle",
      "contact_companyName",
      "contact_companyId",
      "contact_companyLocation",
      "contact_companyCountry",
      "contact_profileUrl",
      "contact_companyUrl",
    ].forEach((key) => setText(refs[key], ""));

    renderExperience([]);
  }

  function clearCompany() {
    clearStatusTone(refs.company_status);
    setText(refs.company_status, "");

    [
      "company_companyId",
      "company_linkedinCompanyId",
      "company_name",
      "company_url",
      "company_website",
      "company_phone",
      "company_industry",
      "company_size",
      "company_hq",
      "company_verified",
      "company_verifiedDate",
      "company_overview",
      "company_specialities",
    ].forEach((key) => setText(refs[key], ""));
  }

  function clearBulk() {
    refs.bulk_urls.value = "";
    refs.bulkProgressBar.style.width = "0%";
    setText(refs.bulk_status, "");
    setText(refs.bulk_summary, "");
    setText(refs.bulk_log, "");
    setText(refs.bulk_failed, "");
  }

  return {
    refs,
    showApp,
    hideApp,
    setUserHeader,
    getScrapeCompanyEnabled: () => scrapeCompanyToggle?.checked ?? true,
    setActiveTab,
    clearContact,
    clearCompany,
    clearBulk,
    setText,
    setStatus,
    renderExperience,
  };
}