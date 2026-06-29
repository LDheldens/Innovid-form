(function () {
  'use strict';

  var ACTIVE_PATHS = [];
  var ZI_SCRIPT_DOMAIN = 'zoominfo.com';
  var TIMEOUT_MS = 4500;
  var POLL_INTERVAL_MS = 100;
  var SPINNER_COLOR = '#414bf9';

  function isActivePage() {
    if (ACTIVE_PATHS.length === 0) return true;
    var path = window.location.pathname;
    return ACTIVE_PATHS.some(function (p) { return path.indexOf(p) === 0; });
  }

  function revealWrapper(wrapper) {
    try {
      wrapper.classList.add('zi-ready');
      var overlay = wrapper.querySelector('.zi-overlay');
      if (overlay) {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 300);
      }
    } catch (e) {
      try { wrapper.classList.add('zi-ready'); } catch (e2) {}
    }
  }

  function hideWrapper(wrapper) {
    try {
      wrapper.style.visibility = 'hidden';
      wrapper.style.minHeight = '200px';
      wrapper.style.position = 'relative';
    } catch (e) {}
  }

  function addSpinner(wrapper) {
    try {
      if (wrapper.querySelector('.zi-overlay')) return;
      if (!document.getElementById('zi-spin-style')) {
        var s = document.createElement('style');
        s.id = 'zi-spin-style';
        s.textContent = '@keyframes zi-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
      }
      var overlay = document.createElement('div');
      overlay.className = 'zi-overlay';
      overlay.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.95);z-index:9999;border-radius:8px;gap:12px';
      overlay.innerHTML = '<div style="width:40px;height:40px;border:3px solid #e0e0e0;border-top-color:' + SPINNER_COLOR + ';border-radius:50%;animation:zi-spin 0.75s linear infinite"></div><span style="font-size:13px;color:#888;font-family:sans-serif">Loading form...</span>';
      wrapper.appendChild(overlay);
    } catch (e) {}
  }

  function isZILoaded() {
    return Array.from(document.querySelectorAll('script[src]')).some(function (s) { return s.src.indexOf(ZI_SCRIPT_DOMAIN) !== -1; });
  }

  function waitForZI(wrapper) {
    var start = Date.now();
    function check() {
      try {
        if (isZILoaded()) { setTimeout(function () { revealWrapper(wrapper); }, 150); return; }
        if (Date.now() - start >= TIMEOUT_MS) { revealWrapper(wrapper); return; }
        setTimeout(check, POLL_INTERVAL_MS);
      } catch (e) { revealWrapper(wrapper); }
    }
    check();
  }

  function waitForMarketo(wrapper) {
    var start = Date.now();
    function check() {
      try {
        var form = wrapper.querySelector('form');
        if (form) { waitForZI(wrapper); return; }
        if (Date.now() - start >= TIMEOUT_MS) { revealWrapper(wrapper); return; }
        setTimeout(check, POLL_INTERVAL_MS);
      } catch (e) { revealWrapper(wrapper); }
    }
    check();
  }

  function initWrapper(wrapper) {
    try {
      if (wrapper.hasAttribute('data-zi-init')) return;
      wrapper.setAttribute('data-zi-init', '1');
      hideWrapper(wrapper);
      addSpinner(wrapper);
      waitForMarketo(wrapper);
    } catch (e) { revealWrapper(wrapper); }
  }

  function init() {
    try {
      if (!isActivePage()) return;
      document.querySelectorAll('.marketoform_wrapper').forEach(function (w) { initWrapper(w); });
      var observer = new MutationObserver(function (mutations) {
        try {
          mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
              if (node.nodeType !== 1) return;
              if (node.classList && node.classList.contains('marketoform_wrapper')) { initWrapper(node); }
              if (node.querySelectorAll) { node.querySelectorAll('.marketoform_wrapper').forEach(function (w) { initWrapper(w); }); }
            });
          });
        } catch (e) {}
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
