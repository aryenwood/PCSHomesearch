// PCSHomes admin shell.
// Tab switching with localStorage persistence + shared UI helpers
// exposed as window.AdminDash for the partners and vendors modules.
(function() {
  // ===== Auth gate (also re-checked by per-module IIFEs) =====
  if (!window.AdminAuth || !window.AdminAuth.isAuthenticated()) {
    window.location.href = 'index.html';
    return;
  }

  var TAB_STORAGE_KEY = 'pcshomes_admin_tab';
  var activationCallbacks = Object.create(null);
  var activatedOnce = Object.create(null);

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ===== Tab switching =====
  function activatePane(paneId) {
    var tabs = document.querySelectorAll('.tab[data-pane]');
    var validPanes = [];
    tabs.forEach(function(t) {
      var p = t.getAttribute('data-pane');
      validPanes.push(p);
      var isActive = (p === paneId);
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    if (validPanes.indexOf(paneId) === -1) return;

    var panes = document.querySelectorAll('main > .pane');
    panes.forEach(function(p) {
      if (p.id === paneId) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
    try { localStorage.setItem(TAB_STORAGE_KEY, paneId); } catch (e) {}

    var firstActivation = !activatedOnce[paneId];
    activatedOnce[paneId] = true;
    var cbs = activationCallbacks[paneId] || [];
    cbs.forEach(function(cb) {
      try { cb({ first: firstActivation }); }
      catch (e) { console.error('pane activation callback error:', e); }
    });
  }

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.tab[data-pane]');
    if (!btn || btn.disabled) return;
    activatePane(btn.getAttribute('data-pane'));
  });

  // ===== Shared toast =====
  var nextToastId = 1;
  function showToast(opts) {
    var id = nextToastId++;
    var container = document.getElementById('toastContainer');
    if (!container) return id;
    var el = document.createElement('div');
    el.className = 'toast ' + (opts.kind || 'info');
    el.setAttribute('data-id', String(id));
    var titleHtml = opts.title ? '<div class="title">' + escapeHtml(opts.title) + '</div>' : '';
    el.innerHTML =
      '<div class="body">' + titleHtml + '<div class="message">' + escapeHtml(opts.message || '') + '</div></div>' +
      '<button type="button" class="close-btn" aria-label="Dismiss">&times;</button>';
    el.querySelector('.close-btn').addEventListener('click', function() { dismissToast(id); });
    container.appendChild(el);
    if (opts.autoDismissMs) setTimeout(function() { dismissToast(id); }, opts.autoDismissMs);
    return id;
  }
  function dismissToast(id) {
    var el = document.querySelector('.toast[data-id="' + id + '"]');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // ===== Shared confirm dialog =====
  function confirmDialog(opts) {
    return new Promise(function(resolve) {
      var root = document.getElementById('modalRoot');
      var backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML =
        '<div class="confirm-card" role="dialog" aria-modal="true">' +
          '<h3>' + escapeHtml(opts.title || 'Confirm') + '</h3>' +
          '<p>' + escapeHtml(opts.message || '') + '</p>' +
          '<div class="actions">' +
            '<button type="button" class="btn-secondary" data-action="cancel">' + escapeHtml(opts.cancelLabel || 'Cancel') + '</button>' +
            '<button type="button" class="' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-action="ok">' + escapeHtml(opts.okLabel || 'OK') + '</button>' +
          '</div>' +
        '</div>';
      function close(result) {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') close(false);
        else if (e.key === 'Enter') close(true);
      }
      backdrop.addEventListener('click', function(e) { if (e.target === backdrop) close(false); });
      backdrop.querySelector('[data-action="ok"]').addEventListener('click', function() { close(true); });
      backdrop.querySelector('[data-action="cancel"]').addEventListener('click', function() { close(false); });
      document.addEventListener('keydown', onKey);
      root.appendChild(backdrop);
      backdrop.querySelector('[data-action="ok"]').focus();
    });
  }

  // ===== Module activation hooks =====
  function onPaneActivated(paneId, cb) {
    if (!activationCallbacks[paneId]) activationCallbacks[paneId] = [];
    activationCallbacks[paneId].push(cb);
  }

  // ===== Cached admin config (Mapbox public token) =====
  var configPromise = null;
  function getAdminConfig() {
    if (configPromise) return configPromise;
    configPromise = fetch('/.netlify/functions/admin-config', {
      method: 'GET',
      headers: window.AdminAuth.authHeader()
    }).then(function(r) {
      if (r.status === 401) {
        window.AdminAuth.clearToken();
        window.location.href = 'index.html';
        throw new Error('Auth expired');
      }
      if (!r.ok) throw new Error('admin-config HTTP ' + r.status);
      return r.json();
    }).catch(function(err) {
      // Allow retry next time
      configPromise = null;
      throw err;
    });
    return configPromise;
  }

  // ===== Public API =====
  window.AdminDash = {
    showToast: showToast,
    dismissToast: dismissToast,
    confirmDialog: confirmDialog,
    onPaneActivated: onPaneActivated,
    activatePane: activatePane,
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    getAdminConfig: getAdminConfig
  };

  // Initial activation on DOMContentLoaded (after all sync scripts have
  // had a chance to register their pane callbacks).
  document.addEventListener('DOMContentLoaded', function() {
    var saved = null;
    try { saved = localStorage.getItem(TAB_STORAGE_KEY); } catch (e) {}
    var validPanes = Array.prototype.slice.call(document.querySelectorAll('.tab[data-pane]')).map(function(t) {
      return t.getAttribute('data-pane');
    });
    var initial = (saved && validPanes.indexOf(saved) !== -1) ? saved : 'partnersPane';
    activatePane(initial);
  });
})();
