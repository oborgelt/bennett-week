/* Check GitHub Pages for a newer BW_BUILD and reload so a deploy is what Bennett actually runs. */
(function (global) {
  var RELOAD_KEY = "bw-build-reload";

  function parseBuild(src) {
    var m = String(src || "").match(/build:\s*(\d+)/);
    return m ? Number(m[1]) : 0;
  }

  function hereBuild() {
    var meta = global.BW_BUILD;
    return meta && Number(meta.build) ? Number(meta.build) : 0;
  }

  function canReload() {
    try {
      var proto = String((global.location && global.location.protocol) || "");
      return proto === "http:" || proto === "https:";
    } catch (_) {
      return false;
    }
  }

  function reloadTo(live) {
    if (!canReload() || !live) return;
    try {
      if (global.sessionStorage && sessionStorage.getItem(RELOAD_KEY) === String(live)) return;
      if (global.sessionStorage) sessionStorage.setItem(RELOAD_KEY, String(live));
    } catch (_) {}
    try {
      var url = new URL(global.location.href);
      url.searchParams.set("b", String(live));
      url.searchParams.set("_", String(Date.now()));
      global.location.replace(url.toString());
    } catch (_) {
      global.location.reload();
    }
  }

  function check() {
    var here = hereBuild();
    fetch("js/build.js?t=" + Date.now(), { cache: "no-store" })
      .then(function (res) { return res && res.ok ? res.text() : ""; })
      .then(function (src) {
        var live = parseBuild(src);
        if (live && here && live !== here) {
          reloadTo(live);
          return;
        }
        try {
          if (live && global.sessionStorage) sessionStorage.removeItem(RELOAD_KEY);
        } catch (_) {}
      })
      .catch(function () {});
  }

  function registerWorker() {
    if (!canReload()) return;
    if (!global.navigator || !navigator.serviceWorker) return;
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  function boot() {
    check();
    registerWorker();
  }

  if (global.document && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : this);
