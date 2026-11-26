(function () {
  if (window.__geminiLiteTheme || !window.geminiLiteTheme) return;
  window.__geminiLiteTheme = true;
  var last = "";
  function send() {
    try {
      var c = getComputedStyle(document.body).backgroundColor;
      if (!c || c === "transparent" || c === "rgba(0, 0, 0, 0)") {
        c = getComputedStyle(document.documentElement).backgroundColor;
      }
      if (c && c !== "transparent" && c !== "rgba(0, 0, 0, 0)" && c !== last) {
        last = c;
        window.geminiLiteTheme.postMessage(c);
      }
    } catch (e) {}
  }
  function changed() {
    send();
    setTimeout(send, 400);
  }
  function start() {
    send();
    try {
      new MutationObserver(changed).observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
    } catch (e) {}
    try {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) mq.addEventListener("change", changed);
    } catch (e) {}
    document.addEventListener("visibilitychange", send);
    setTimeout(send, 800);
    setTimeout(send, 2500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
