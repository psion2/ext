// sidebar/ui/auth.view.v2.js
export function AuthView(root) {
  root.innerHTML = `
    <div id="authCardRoot" class="card">
      <div class="card-header">
        <div class="card-title">Authentication</div>
        <div class="card-subtitle">Login from web app or use browser token</div>
      </div>

      <div class="card-body">
        <div class="stack">
          <div class="field">
            <label class="label">Access Token</label>
            <textarea
              id="melV2TokenInput"
              class="textarea textarea-sm"
              placeholder="Paste token here or click Read Browser Token"
            ></textarea>
          </div>

          <div class="actions">
            <button id="melV2OpenLoginBtn" class="btn">Open Login</button>
            <button id="melV2ReadCookieBtn" class="btn">Read Browser Token</button>
            <button id="melV2VerifyBtn" class="btn btn-primary">Verify Token</button>
            <button id="melV2ClearBtn" class="btn btn-danger">Clear</button>
          </div>

          <div>
            <div id="melV2AuthStatus" class="status-pill">Not verified</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const authCardRoot = root.querySelector("#authCardRoot");
  const tokenInput = root.querySelector("#melV2TokenInput");
  const openLoginBtn = root.querySelector("#melV2OpenLoginBtn");
  const readCookieBtn = root.querySelector("#melV2ReadCookieBtn");
  const verifyBtn = root.querySelector("#melV2VerifyBtn");
  const clearBtn = root.querySelector("#melV2ClearBtn");
  const authStatus = root.querySelector("#melV2AuthStatus");

  function setStatus(text, type = "") {
    authStatus.className = `status-pill${type ? ` ${type}` : ""}`;
    authStatus.textContent = text;
  }

  function getToken() {
    return (tokenInput.value || "").trim();
  }

  function setToken(value) {
    tokenInput.value = value || "";
  }

  function show() {
    authCardRoot.classList.remove("hidden");
  }

  function hide() {
    authCardRoot.classList.add("hidden");
  }

  function setChecking(text = "Checking token...") {
    setStatus(text, "warn");
  }

  function setVerified() {
    setStatus("Token verified", "success");
  }

  function setError(message) {
    setStatus(message || "Verification failed", "error");
  }

  function reset() {
    setStatus("Not verified");
  }

  return {
    els: {
      tokenInput,
      openLoginBtn,
      readCookieBtn,
      verifyBtn,
      clearBtn,
    },
    getToken,
    setToken,
    show,
    hide,
    setChecking,
    setVerified,
    setError,
    reset,
  };
}