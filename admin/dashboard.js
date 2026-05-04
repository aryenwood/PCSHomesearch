// PCSHomes admin dashboard — partner CRUD.
// Phase 2. Vendors UI is Phase 3, image upload is Phase 4.
(function() {
  // ===== Auth gate =====
  if (!window.AdminAuth || !window.AdminAuth.isAuthenticated()) {
    window.location.href = 'index.html';
    return;
  }

  // ===== State =====
  var partners = [];
  var saveInFlight = false;
  var savingToastId = null;

  // ===== Constants (mirrors of Phase 1 renderer expectations) =====
  var TIERS = [
    { id: 'featured', label: 'Featured' },
    { id: 'network',  label: 'Network'  },
    { id: 'founding', label: 'Founding' }
  ];
  var KNOWN_CATEGORIES = ['agent', 'lender', 'inspector', 'services', 'other'];
  var ICON_KINDS = [
    { id: '',          label: 'Default (initials from name)' },
    { id: 'initials',  label: 'Initials' },
    { id: 'dollar',    label: 'Dollar ($)' },
    { id: 'magnifier', label: 'Magnifier (inspector)' },
    { id: 'house',     label: 'House (brokerage)' },
    { id: 'wrench',    label: 'Wrench (services)' },
    { id: 'plus',      label: 'Plus (placeholder)' }
  ];
  var ICON_ACCENTS = [
    { id: '',           label: 'Gold (default)' },
    { id: 'blue',       label: 'Blue' },
    { id: 'blue-muted', label: 'Blue (muted, for placeholders)' }
  ];
  var BADGE_KINDS = [
    { id: '',          label: 'Auto (use category)' },
    { id: 'agent',     label: 'Agent (gold)' },
    { id: 'lender',    label: 'Lender (navy)' },
    { id: 'inspector', label: 'Inspector (green)' },
    { id: 'services',  label: 'Services (blue)' }
  ];

  // ===== Utility =====
  function $(sel, parent) { return (parent || document).querySelector(sel); }
  function $all(sel, parent) { return Array.prototype.slice.call((parent || document).querySelectorAll(sel)); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function slugify(name) {
    return String(name || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  // ===== Toasts =====
  var nextToastId = 1;
  function showToast(opts) {
    var id = nextToastId++;
    var container = $('#toastContainer');
    var el = document.createElement('div');
    el.className = 'toast ' + (opts.kind || 'info');
    el.setAttribute('data-id', String(id));
    el.innerHTML =
      '<div class="body">' +
        (opts.title ? '<div class="title">' + escapeHtml(opts.title) + '</div>' : '') +
        '<div class="message">' + escapeHtml(opts.message || '') + '</div>' +
      '</div>' +
      '<button type="button" class="close-btn" aria-label="Dismiss">&times;</button>';
    el.querySelector('.close-btn').addEventListener('click', function() { dismissToast(id); });
    container.appendChild(el);
    if (opts.autoDismissMs) {
      setTimeout(function() { dismissToast(id); }, opts.autoDismissMs);
    }
    return id;
  }
  function dismissToast(id) {
    var el = document.querySelector('.toast[data-id="' + id + '"]');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (savingToastId === id) savingToastId = null;
  }

  // ===== Confirm dialog =====
  function confirmDialog(opts) {
    return new Promise(function(resolve) {
      var root = $('#modalRoot');
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
      backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) close(false);
      });
      backdrop.querySelector('[data-action="ok"]').addEventListener('click', function() { close(true); });
      backdrop.querySelector('[data-action="cancel"]').addEventListener('click', function() { close(false); });
      document.addEventListener('keydown', onKey);
      root.appendChild(backdrop);
      backdrop.querySelector('[data-action="ok"]').focus();
    });
  }

  // ===== Load =====
  function loadPartners() {
    return fetch('/data/partners.json?ts=' + Date.now(), { cache: 'no-cache' })
      .then(function(r) {
        if (!r.ok) throw new Error('partners.json HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        if (!Array.isArray(data)) throw new Error('partners.json is not an array');
        partners = data.slice();
        renderList();
        return data;
      })
      .catch(function(err) {
        console.error('loadPartners failed:', err);
        $('#partnerList').innerHTML = '<div class="empty-state"><h3>Could not load partners</h3><p>' + escapeHtml(err.message) + '</p></div>';
      });
  }

  // ===== Render list =====
  function renderList() {
    var list = $('#partnerList');
    if (!partners.length) {
      list.innerHTML = '<div class="empty-state"><h3>No partners yet.</h3><p>Add your first.</p></div>';
      return;
    }
    var sorted = partners.slice().sort(function(a, b) {
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
    var html = sorted.map(function(p, idx) {
      var isFirst = idx === 0;
      var isLast = idx === sorted.length - 1;
      var inactive = p.active === false;
      return (
        '<div class="partner-row' + (inactive ? ' inactive' : '') + '" data-id="' + escapeHtml(p.id) + '">' +
          '<div class="reorder-cell">' +
            '<button type="button" class="btn-reorder" data-action="up" title="Move up"' + (isFirst ? ' disabled' : '') + '>↑</button>' +
            '<button type="button" class="btn-reorder" data-action="down" title="Move down"' + (isLast ? ' disabled' : '') + '>↓</button>' +
          '</div>' +
          '<div class="partner-name">' +
            (p.logoUrl
              ? '<span class="row-thumb"><img src="' + window.AdminDash.escapeAttr(p.logoUrl) + '" alt="" loading="lazy" onerror="this.parentNode.classList.add(\'broken\');this.remove();"/></span>'
              : '') +
            '<span class="row-name-text">' + escapeHtml(p.name) +
              '<span class="org">' + escapeHtml(p.org) + '</span>' +
            '</span>' +
          '</div>' +
          '<div class="row-meta">' +
            '<span class="tier-badge ' + escapeHtml(p.tier) + '">' + escapeHtml(p.tier) + '</span>' +
            '<span class="cat-badge">' + escapeHtml(p.category) + '</span>' +
            '<button type="button" class="toggle' + (inactive ? '' : ' on') + '" data-action="toggle" aria-label="' + (inactive ? 'Activate' : 'Deactivate') + '"></button>' +
          '</div>' +
          '<div class="row-actions">' +
            '<button type="button" data-action="edit">Edit</button>' +
            '<button type="button" class="danger" data-action="delete">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
    list.innerHTML = html;
    applySaveInFlightDisable();
  }

  function applySaveInFlightDisable() {
    var dis = !!saveInFlight;
    $all('#partnerList button').forEach(function(b) { b.disabled = dis; });
    $('#addPartnerBtn').disabled = dis;
  }

  // ===== List action handlers (event-delegated) =====
  $('#partnerList').addEventListener('click', function(e) {
    if (saveInFlight) return;
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var row = btn.closest('.partner-row');
    if (!row) return;
    var id = row.getAttribute('data-id');
    var action = btn.getAttribute('data-action');
    if (action === 'up')      handleReorder(id, -1);
    else if (action === 'down') handleReorder(id, 1);
    else if (action === 'toggle') handleToggleActive(id);
    else if (action === 'delete') handleDelete(id);
    else if (action === 'edit')   openEditModal(id);
  });

  $('#addPartnerBtn').addEventListener('click', function() {
    if (saveInFlight) return;
    openAddModal();
  });

  $('#logoutBtn').addEventListener('click', function() {
    window.AdminAuth.clearToken();
    window.location.href = 'index.html';
  });

  // ===== Reorder =====
  function handleReorder(id, delta) {
    var sorted = partners.slice().sort(function(a, b) {
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
    var idx = sorted.findIndex(function(p) { return p.id === id; });
    if (idx < 0) return;
    var newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    var swapWith = sorted[newIdx];
    var moving = sorted[idx];
    var movingOrder = moving.displayOrder;
    var swapOrder = swapWith.displayOrder;

    // Build new array with swapped displayOrder values
    var newPartners = partners.map(function(p) {
      if (p.id === moving.id) return Object.assign({}, p, { displayOrder: swapOrder });
      if (p.id === swapWith.id) return Object.assign({}, p, { displayOrder: movingOrder });
      return p;
    });

    var direction = delta < 0 ? 'up' : 'down';
    savePartnersWithMessage(newPartners, 'Reorder partners: moved ' + moving.name + ' ' + direction);
  }

  // ===== Toggle active =====
  function handleToggleActive(id) {
    var p = partners.find(function(x) { return x.id === id; });
    if (!p) return;
    var newActive = !(p.active !== false);
    var newPartners = partners.map(function(x) {
      return x.id === id ? Object.assign({}, x, { active: newActive }) : x;
    });
    var msg = (newActive ? 'Activate ' : 'Deactivate ') + p.name;
    savePartnersWithMessage(newPartners, msg);
  }

  // ===== Delete =====
  function handleDelete(id) {
    var p = partners.find(function(x) { return x.id === id; });
    if (!p) return;
    confirmDialog({
      title: 'Remove partner?',
      message: 'Permanently remove "' + p.name + '" from the public site? This is committed to GitHub and cannot be undone here.',
      okLabel: 'Remove',
      cancelLabel: 'Keep',
      danger: true
    }).then(function(ok) {
      if (!ok) return;
      var newPartners = partners.filter(function(x) { return x.id !== id; });
      savePartnersWithMessage(newPartners, 'Remove partner: ' + p.name);
    });
  }

  // ===== Modal: Add / Edit form =====
  function openAddModal() {
    var maxOrder = partners.reduce(function(m, p) { return Math.max(m, p.displayOrder || 0); }, 0);
    openModal({
      mode: 'add',
      partner: {
        id: '',
        name: '',
        org: '',
        tier: 'network',
        category: '',
        tags: [],
        phone: null,
        email: null,
        blurb: '',
        logoUrl: null,
        photoUrl: null,
        active: true,
        displayOrder: maxOrder + 1
      }
    });
  }

  function openEditModal(id) {
    var p = partners.find(function(x) { return x.id === id; });
    if (!p) return;
    openModal({ mode: 'edit', partner: p });
  }

  function fmt(v) { return v == null ? '' : String(v); }

  function openModal(opts) {
    var partner = JSON.parse(JSON.stringify(opts.partner)); // deep clone
    var mode = opts.mode;
    var slugLocked = (mode === 'edit'); // editing existing record locks the slug by default
    var advancedHasContent = (
      partner.logoUrl || partner.photoUrl || partner.subtitle ||
      partner.websiteUrl || partner.ctaLabel || partner.ctaHref ||
      (partner.reviews && partner.reviews.length) ||
      partner.reviewsUrl || partner.badgeKind || partner.badgeLabel ||
      partner.trustedLabel || partner.iconKind || partner.iconAccent ||
      partner.isPlaceholder
    );

    var root = $('#modalRoot');
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    function close() {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape' && !saveInFlight) close(); }
    document.addEventListener('keydown', onKey);

    backdrop.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
        '<div class="modal-header">' +
          '<div class="modal-title" id="modalTitle">' + escapeHtml(mode === 'add' ? 'Add Partner' : 'Edit Partner') + '</div>' +
          '<button type="button" class="modal-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<form class="modal-body" id="partnerForm" novalidate>' +
          '<div class="field-error-banner" id="formErrorBanner"></div>' +
          buildBasicHtml(partner, slugLocked, mode) +
          buildAdvancedHtml(partner, advancedHasContent) +
        '</form>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>' +
          '<button type="submit" class="btn-primary" id="saveBtn" form="partnerForm">Save Partner</button>' +
        '</div>' +
      '</div>';

    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop && !saveInFlight) close();
    });
    backdrop.querySelector('.modal-close').addEventListener('click', function() {
      if (!saveInFlight) close();
    });
    backdrop.querySelector('#cancelBtn').addEventListener('click', function() {
      if (!saveInFlight) close();
    });

    root.appendChild(backdrop);

    // Wire up form behaviors and submit
    wireForm(backdrop, partner, mode, close);
  }

  function buildBasicHtml(p, slugLocked, mode) {
    var slugRow = '<div class="form-row full">' +
      '<label>Slug</label>' +
      '<div class="slug-display">' +
        '<span class="slug-value" id="slugValue">' + escapeHtml(p.id || '(auto from name)') + '</span>' +
        (slugLocked
          ? '<button type="button" class="slug-edit" id="editSlugBtn">Edit slug</button>'
          : '') +
      '</div>' +
      '<input type="text" id="slugInput" name="slug" style="display:none;" pattern="[a-z0-9][a-z0-9-]*" />' +
      '<div class="help">Auto-generated from the name. Lower-case letters, digits, and dashes only.</div>' +
    '</div>';

    var tierRadios = TIERS.map(function(t) {
      return '<div class="radio-pill"><input type="radio" name="tier" id="tier-' + t.id + '" value="' + t.id + '"' + (p.tier === t.id ? ' checked' : '') + ' /><label for="tier-' + t.id + '">' + t.label + '</label></div>';
    }).join('');

    var datalistOptions = KNOWN_CATEGORIES.map(function(c) {
      return '<option value="' + escapeHtml(c) + '"></option>';
    }).join('');

    return (
      '<div class="form-section-title">Basic</div>' +
      slugRow +
      '<div class="form-grid">' +
        '<div class="form-row">' +
          '<label for="f-name">Name<span class="req">*</span></label>' +
          '<input type="text" id="f-name" name="name" value="' + escapeHtml(p.name) + '" required maxlength="120" />' +
        '</div>' +
        '<div class="form-row">' +
          '<label for="f-org">Org / Company<span class="req">*</span></label>' +
          '<input type="text" id="f-org" name="org" value="' + escapeHtml(p.org) + '" required maxlength="120" />' +
        '</div>' +
        '<div class="form-row full">' +
          '<label>Tier<span class="req">*</span></label>' +
          '<div class="radio-group">' + tierRadios + '</div>' +
        '</div>' +
        '<div class="form-row">' +
          '<label for="f-category">Category<span class="req">*</span></label>' +
          '<input type="text" id="f-category" name="category" list="categoryOptions" value="' + escapeHtml(p.category) + '" required maxlength="40" />' +
          '<datalist id="categoryOptions">' + datalistOptions + '</datalist>' +
          '<div class="help">Standard values: agent, lender, inspector, services, other. Free text allowed for new categories.</div>' +
        '</div>' +
        '<div class="form-row">' +
          '<label for="f-phone">Phone</label>' +
          '<input type="tel" id="f-phone" name="phone" value="' + escapeHtml(p.phone) + '" maxlength="40" />' +
        '</div>' +
        '<div class="form-row full">' +
          '<label>Tags</label>' +
          '<div class="chip-input-wrap" id="chipWrap">' +
            (p.tags || []).map(function(t) {
              return '<span class="chip" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '<button type="button" aria-label="Remove tag">&times;</button></span>';
            }).join('') +
            '<input type="text" id="chipInput" class="chip-input" placeholder="Type a tag, press Enter" maxlength="60" />' +
          '</div>' +
          '<div class="help">Press Enter or comma to add. Backspace removes the last.</div>' +
        '</div>' +
        '<div class="form-row">' +
          '<label for="f-email">Email</label>' +
          '<input type="email" id="f-email" name="email" value="' + escapeHtml(p.email) + '" maxlength="120" />' +
        '</div>' +
        '<div class="form-row">' +
          '<label for="f-displayOrder">Display order</label>' +
          '<input type="number" id="f-displayOrder" name="displayOrder" value="' + escapeHtml(p.displayOrder) + '" step="1" />' +
          '<div class="help">Lower = earlier in the list. Reorder buttons handle this for you; only edit if needed.</div>' +
        '</div>' +
        '<div class="form-row full">' +
          '<label for="f-blurb">Blurb</label>' +
          '<textarea id="f-blurb" name="blurb" rows="4" maxlength="800">' + escapeHtml(p.blurb) + '</textarea>' +
          '<div class="help">3–5 sentences. Shown on the public partner card.</div>' +
        '</div>' +
        '<div class="form-row full">' +
          '<div class="checkbox-row">' +
            '<input type="checkbox" id="f-active"' + (p.active === false ? '' : ' checked') + ' />' +
            '<label for="f-active">Active (visible on public site)</label>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function buildAdvancedHtml(p, openByDefault) {
    var iconKindOptions = ICON_KINDS.map(function(k) {
      return '<option value="' + escapeHtml(k.id) + '"' + (String(p.iconKind || '') === k.id ? ' selected' : '') + '>' + escapeHtml(k.label) + '</option>';
    }).join('');
    var iconAccentOptions = ICON_ACCENTS.map(function(k) {
      return '<option value="' + escapeHtml(k.id) + '"' + (String(p.iconAccent || '') === k.id ? ' selected' : '') + '>' + escapeHtml(k.label) + '</option>';
    }).join('');
    var badgeKindOptions = BADGE_KINDS.map(function(k) {
      return '<option value="' + escapeHtml(k.id) + '"' + (String(p.badgeKind || '') === k.id ? ' selected' : '') + '>' + escapeHtml(k.label) + '</option>';
    }).join('');

    var reviewsHtml = '';
    var reviews = p.reviews || [];
    reviewsHtml = reviews.map(function(r, i) { return reviewRowHtml(r, i); }).join('');

    return (
      '<section class="collapsible' + (openByDefault ? ' open' : '') + '" id="advancedSection">' +
        '<button type="button" class="collapsible-toggle" id="advancedToggle">' +
          '<span>Advanced</span>' +
          '<span class="arrow">›</span>' +
        '</button>' +
        '<div class="collapsible-body">' +
          '<div class="form-grid">' +
            '<div class="form-row full">' +
              '<label>Logo</label>' +
              '<div id="f-logoUrl-mount"></div>' +
              '<div class="help">Used as the avatar on standard partner cards (in place of initials).</div>' +
            '</div>' +
            '<div class="form-row full">' +
              '<label>Photo</label>' +
              '<div id="f-photoUrl-mount"></div>' +
              '<div class="help">Headshot for the featured-tier card. Resized to ≤1200px on upload.</div>' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="f-subtitle">Subtitle</label>' +
              '<input type="text" id="f-subtitle" name="subtitle" value="' + escapeHtml(p.subtitle) + '" maxlength="160" />' +
              '<div class="help">Appears under the name on the featured card.</div>' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="f-websiteUrl">Website URL</label>' +
              '<input type="url" id="f-websiteUrl" name="websiteUrl" value="' + escapeHtml(p.websiteUrl) + '" />' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="f-ctaLabel">CTA label</label>' +
              '<input type="text" id="f-ctaLabel" name="ctaLabel" value="' + escapeHtml(p.ctaLabel) + '" maxlength="60" />' +
              '<div class="help">Defaults to "Request Info" or, if a website is set, "Learn More →".</div>' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="f-ctaHref">CTA href</label>' +
              '<input type="text" id="f-ctaHref" name="ctaHref" value="' + escapeHtml(p.ctaHref) + '" />' +
              '<div class="help">Used for placeholder cards (e.g. "Refer a Partner" → contact form).</div>' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="f-reviewsUrl">Reviews URL</label>' +
              '<input type="url" id="f-reviewsUrl" name="reviewsUrl" value="' + escapeHtml(p.reviewsUrl) + '" />' +
              '<div class="help">Linked from "Read all reviews on Zillow →".</div>' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="f-trustedLabel">Trusted label</label>' +
              '<input type="text" id="f-trustedLabel" name="trustedLabel" value="' + escapeHtml(p.trustedLabel) + '" maxlength="120" />' +
              '<div class="help">Small line under the name, e.g. "PCSHomes Trusted" or "120+ Five-Star Reviews".</div>' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="f-badgeKind">Badge style</label>' +
              '<select id="f-badgeKind" name="badgeKind">' + badgeKindOptions + '</select>' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="f-badgeLabel">Badge label</label>' +
              '<input type="text" id="f-badgeLabel" name="badgeLabel" value="' + escapeHtml(p.badgeLabel) + '" maxlength="40" />' +
              '<div class="help">Shown in the corner of the card, e.g. "Agent", "Brokerage".</div>' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="f-iconKind">Avatar icon</label>' +
              '<select id="f-iconKind" name="iconKind">' + iconKindOptions + '</select>' +
              '<div class="help">Used when no photo is set.</div>' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="f-iconAccent">Avatar border accent</label>' +
              '<select id="f-iconAccent" name="iconAccent">' + iconAccentOptions + '</select>' +
            '</div>' +
            '<div class="form-row full">' +
              '<div class="checkbox-row">' +
                '<input type="checkbox" id="f-isPlaceholder"' + (p.isPlaceholder ? ' checked' : '') + ' />' +
                '<label for="f-isPlaceholder">Render as a "coming soon" placeholder (faded card, generic CTA)</label>' +
              '</div>' +
            '</div>' +
            '<div class="form-row full">' +
              '<label>Reviews</label>' +
              '<div id="reviewsList">' + reviewsHtml + '</div>' +
              '<button type="button" class="btn-add-review" id="addReviewBtn">+ Add review</button>' +
              '<div class="help">Quote + attribution. Featured-tier cards display the first 1–2.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function reviewRowHtml(r, i) {
    return (
      '<div class="review-row" data-idx="' + i + '">' +
        '<div class="row-head"><span>Review #' + (i + 1) + '</span><button type="button" class="btn-remove" data-action="remove-review">Remove</button></div>' +
        '<div class="form-row"><label>Quote</label><textarea name="reviewQuote" rows="2" maxlength="600">' + escapeHtml(r.quote || '') + '</textarea></div>' +
        '<div class="form-row"><label>Attribution</label><input type="text" name="reviewAttribution" value="' + escapeHtml(r.attribution || '') + '" maxlength="160" /></div>' +
      '</div>'
    );
  }

  function wireForm(backdrop, partner, mode, close) {
    var form = backdrop.querySelector('#partnerForm');
    var nameInput = backdrop.querySelector('#f-name');
    var slugValueEl = backdrop.querySelector('#slugValue');
    var slugInput = backdrop.querySelector('#slugInput');
    var editSlugBtn = backdrop.querySelector('#editSlugBtn');
    var advancedSection = backdrop.querySelector('#advancedSection');
    var advancedToggle = backdrop.querySelector('#advancedToggle');
    var addReviewBtn = backdrop.querySelector('#addReviewBtn');
    var reviewsList = backdrop.querySelector('#reviewsList');
    var chipWrap = backdrop.querySelector('#chipWrap');
    var chipInput = backdrop.querySelector('#chipInput');
    var errorBanner = backdrop.querySelector('#formErrorBanner');
    var saveBtn = backdrop.querySelector('#saveBtn');
    var cancelBtn = backdrop.querySelector('#cancelBtn');

    var slugManuallyEdited = (mode === 'edit'); // existing partners keep their slug as-is unless explicitly unlocked
    var slugUnlocked = (mode === 'add'); // add mode auto-derives until user types in slug field

    // ===== Image uploaders (Phase 4) =====
    var logoUrlState = partner.logoUrl || null;
    var photoUrlState = partner.photoUrl || null;
    var imageBusy = { logo: false, photo: false };
    function anyImageBusy() { return imageBusy.logo || imageBusy.photo; }
    function refreshSaveDisabled() {
      saveBtn.disabled = saveInFlight || anyImageBusy();
      // Cancel/Close behave normally when only an image upload is in flight; only the modal-internal save is gated.
    }

    var logoUploader = (typeof window.createImageUploader === 'function')
      ? window.createImageUploader({
          targetDir: 'images/partners',
          currentUrl: logoUrlState,
          onChange: function(url) { logoUrlState = url || null; },
          onBusyChange: function(busy) { imageBusy.logo = busy; refreshSaveDisabled(); }
        })
      : null;
    var photoUploader = (typeof window.createImageUploader === 'function')
      ? window.createImageUploader({
          targetDir: 'images/partners',
          currentUrl: photoUrlState,
          onChange: function(url) { photoUrlState = url || null; },
          onBusyChange: function(busy) { imageBusy.photo = busy; refreshSaveDisabled(); }
        })
      : null;
    var logoMount = backdrop.querySelector('#f-logoUrl-mount');
    var photoMount = backdrop.querySelector('#f-photoUrl-mount');
    if (logoMount && logoUploader)   logoMount.appendChild(logoUploader.element);
    if (photoMount && photoUploader) photoMount.appendChild(photoUploader.element);
    // Fallback: if image-upload.js failed to load, render plain text inputs so the form remains usable.
    if (logoMount && !logoUploader) {
      logoMount.innerHTML = '<input type="url" id="f-logoUrl-fallback" value="' + window.AdminDash.escapeAttr(logoUrlState || '') + '" />';
      logoMount.querySelector('input').addEventListener('input', function(e) { logoUrlState = e.target.value.trim() || null; });
    }
    if (photoMount && !photoUploader) {
      photoMount.innerHTML = '<input type="url" id="f-photoUrl-fallback" value="' + window.AdminDash.escapeAttr(photoUrlState || '') + '" />';
      photoMount.querySelector('input').addEventListener('input', function(e) { photoUrlState = e.target.value.trim() || null; });
    }

    // Slug auto-derive
    nameInput.addEventListener('input', function() {
      if (mode === 'add' && !slugManuallyEdited) {
        var s = slugify(nameInput.value);
        slugValueEl.textContent = s || '(auto from name)';
        slugInput.value = s;
      }
    });

    // Edit slug (Edit mode)
    if (editSlugBtn) {
      editSlugBtn.addEventListener('click', function() {
        confirmDialog({
          title: 'Edit slug?',
          message: 'Changing the slug breaks any external links pointing to this partner. Continue?',
          okLabel: 'Yes, edit',
          cancelLabel: 'Cancel',
          danger: true
        }).then(function(ok) {
          if (!ok) return;
          slugInput.style.display = '';
          slugInput.value = partner.id;
          slugInput.focus();
          slugInput.select();
          slugValueEl.style.display = 'none';
          editSlugBtn.style.display = 'none';
          slugUnlocked = true;
          slugInput.addEventListener('input', function() {
            slugValueEl.textContent = slugInput.value || '(empty)';
          });
        });
      });
    }

    // Slug input (Add mode — visible only after the user types into nameInput, or explicitly)
    if (mode === 'add') {
      slugInput.addEventListener('input', function() {
        slugManuallyEdited = true;
        slugValueEl.textContent = slugInput.value || '(empty)';
      });
      // Allow click on the slug display to edit directly
      slugValueEl.addEventListener('click', function() {
        slugInput.style.display = '';
        slugInput.value = slugify(nameInput.value);
        slugInput.focus();
      });
    }

    // Advanced section toggle
    advancedToggle.addEventListener('click', function() {
      advancedSection.classList.toggle('open');
    });

    // Reviews repeater
    addReviewBtn.addEventListener('click', function() {
      var i = reviewsList.querySelectorAll('.review-row').length;
      var wrapper = document.createElement('div');
      wrapper.innerHTML = reviewRowHtml({ quote: '', attribution: '' }, i);
      reviewsList.appendChild(wrapper.firstChild);
    });
    reviewsList.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action="remove-review"]');
      if (!btn) return;
      var row = btn.closest('.review-row');
      if (row && row.parentNode) row.parentNode.removeChild(row);
    });

    // Chip input
    function addChip(value) {
      var v = String(value || '').trim();
      if (!v) return;
      // Avoid duplicates
      var existing = $all('.chip', chipWrap).map(function(c) { return c.getAttribute('data-tag'); });
      if (existing.indexOf(v) !== -1) return;
      var span = document.createElement('span');
      span.className = 'chip';
      span.setAttribute('data-tag', v);
      span.innerHTML = escapeHtml(v) + '<button type="button" aria-label="Remove tag">&times;</button>';
      chipWrap.insertBefore(span, chipInput);
    }
    chipWrap.addEventListener('focusin', function() { chipWrap.classList.add('focused'); });
    chipWrap.addEventListener('focusout', function(e) {
      // Commit any pending text on blur
      if (chipInput.value.trim()) {
        addChip(chipInput.value);
        chipInput.value = '';
      }
      chipWrap.classList.remove('focused');
    });
    chipWrap.addEventListener('click', function(e) {
      var rmBtn = e.target.closest('.chip > button');
      if (rmBtn) {
        rmBtn.parentNode.parentNode.removeChild(rmBtn.parentNode);
        return;
      }
      if (e.target === chipWrap) chipInput.focus();
    });
    chipInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (chipInput.value.trim()) {
          addChip(chipInput.value);
          chipInput.value = '';
        }
      } else if (e.key === 'Backspace' && !chipInput.value) {
        var chips = $all('.chip', chipWrap);
        var last = chips[chips.length - 1];
        if (last && last.parentNode) last.parentNode.removeChild(last);
      }
    });

    // Submit
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      if (saveInFlight) return;
      if (anyImageBusy()) {
        showFormError('Wait for the image upload to finish before saving.');
        return;
      }
      handleSubmit();
    });

    function showFormError(msg, fieldId) {
      errorBanner.textContent = msg;
      errorBanner.classList.add('show');
      $all('.error', form).forEach(function(el) { el.classList.remove('error'); });
      if (fieldId) {
        var el = backdrop.querySelector('#' + fieldId);
        if (el) {
          el.classList.add('error');
          el.focus();
        }
      }
    }

    function clearFormError() {
      errorBanner.classList.remove('show');
      errorBanner.textContent = '';
      $all('.error', form).forEach(function(el) { el.classList.remove('error'); });
    }

    function collect() {
      // Slug
      var slug;
      if (mode === 'add') {
        slug = (slugInput.value && slugManuallyEdited) ? slugify(slugInput.value) : slugify(nameInput.value);
      } else {
        slug = slugUnlocked ? slugify(slugInput.value) : partner.id;
      }

      // Tier
      var tier = ((form.querySelector('input[name="tier"]:checked') || {}).value) || 'network';

      // Tags
      var tags = $all('.chip', chipWrap).map(function(c) { return c.getAttribute('data-tag'); });

      // Reviews
      var reviews = $all('.review-row', reviewsList).map(function(row) {
        var quote = (row.querySelector('[name="reviewQuote"]').value || '').trim();
        var attribution = (row.querySelector('[name="reviewAttribution"]').value || '').trim();
        if (!quote && !attribution) return null;
        return { quote: quote, attribution: attribution };
      }).filter(Boolean);

      // Numeric displayOrder
      var orderRaw = form.querySelector('#f-displayOrder').value;
      var orderNum = Number(orderRaw);
      if (!isFinite(orderNum)) orderNum = partner.displayOrder || 0;

      var nullIfEmpty = function(v) { v = (v || '').trim(); return v ? v : null; };
      var trimOrEmpty = function(v) { return (v || '').trim(); };

      var out = {
        id: slug,
        name: trimOrEmpty(form.querySelector('#f-name').value),
        org: trimOrEmpty(form.querySelector('#f-org').value),
        tier: tier,
        category: trimOrEmpty(form.querySelector('#f-category').value),
        tags: tags,
        phone: nullIfEmpty(form.querySelector('#f-phone').value),
        email: nullIfEmpty(form.querySelector('#f-email').value),
        blurb: trimOrEmpty(form.querySelector('#f-blurb').value),
        logoUrl: logoUrlState ? String(logoUrlState).trim() : null,
        photoUrl: photoUrlState ? String(photoUrlState).trim() : null,
        active: form.querySelector('#f-active').checked,
        displayOrder: orderNum
      };

      // Optional advanced fields — only set if non-empty so we don't clutter JSON
      var maybe = {
        subtitle:     trimOrEmpty(form.querySelector('#f-subtitle').value),
        websiteUrl:   trimOrEmpty(form.querySelector('#f-websiteUrl').value),
        ctaLabel:     trimOrEmpty(form.querySelector('#f-ctaLabel').value),
        ctaHref:      trimOrEmpty(form.querySelector('#f-ctaHref').value),
        reviewsUrl:   trimOrEmpty(form.querySelector('#f-reviewsUrl').value),
        trustedLabel: trimOrEmpty(form.querySelector('#f-trustedLabel').value),
        badgeKind:    trimOrEmpty(form.querySelector('#f-badgeKind').value),
        badgeLabel:   trimOrEmpty(form.querySelector('#f-badgeLabel').value),
        iconKind:     trimOrEmpty(form.querySelector('#f-iconKind').value),
        iconAccent:   trimOrEmpty(form.querySelector('#f-iconAccent').value)
      };
      Object.keys(maybe).forEach(function(k) { if (maybe[k]) out[k] = maybe[k]; });

      if (form.querySelector('#f-isPlaceholder').checked) out.isPlaceholder = true;
      if (reviews.length) out.reviews = reviews;

      return out;
    }

    function validate(out) {
      if (!out.id || !/^[a-z0-9][a-z0-9-]*$/.test(out.id)) {
        return { msg: 'Slug must be lower-case letters, digits, or dashes.', fieldId: nameInput.id };
      }
      if (!out.name) return { msg: 'Name is required.', fieldId: 'f-name' };
      if (!out.org)  return { msg: 'Org / Company is required.', fieldId: 'f-org' };
      if (!out.category) return { msg: 'Category is required.', fieldId: 'f-category' };
      if (TIERS.findIndex(function(t) { return t.id === out.tier; }) === -1) {
        return { msg: 'Choose a tier.', fieldId: null };
      }
      // Slug uniqueness (skip self in edit mode)
      var clash = partners.find(function(p) { return p.id === out.id && p.id !== partner.id; });
      if (clash) return { msg: 'Slug "' + out.id + '" is already used by ' + clash.name + '.', fieldId: 'slugInput' };
      return null;
    }

    function handleSubmit() {
      var out = collect();
      var err = validate(out);
      if (err) {
        showFormError(err.msg, err.fieldId);
        return;
      }
      clearFormError();

      // Build full updated array
      var newPartners;
      var commitMsg;
      if (mode === 'add') {
        newPartners = partners.concat([out]);
        commitMsg = 'Add partner: ' + out.name;
      } else {
        newPartners = partners.map(function(p) { return p.id === partner.id ? out : p; });
        commitMsg = 'Update partner: ' + out.name;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      savePartnersWithMessage(newPartners, commitMsg).then(function(ok) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Partner';
        if (ok) close();
      });
    }
  }

  // ===== Save flow =====
  function savePartnersWithMessage(newPartners, commitMessage) {
    if (saveInFlight) return Promise.resolve(false);
    saveInFlight = true;
    applySaveInFlightDisable();

    if (savingToastId) dismissToast(savingToastId);
    savingToastId = showToast({
      kind: 'info',
      title: 'Saving…',
      message: commitMessage
    });

    return fetch('/.netlify/functions/save-partners', {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        window.AdminAuth.authHeader()
      ),
      body: JSON.stringify({ partners: newPartners, commitMessage: commitMessage })
    }).then(function(r) {
      return r.json().then(function(body) { return { status: r.status, body: body }; });
    }).then(function(res) {
      if (res.status === 401) {
        // Auth expired; force re-login
        window.AdminAuth.clearToken();
        window.location.href = 'index.html';
        return false;
      }
      if (res.status === 200 && res.body.success) {
        partners = (res.body.partners || newPartners).slice();
        renderList();
        if (savingToastId) dismissToast(savingToastId);
        showToast({
          kind: 'success',
          title: 'Saved',
          message: 'Site rebuilding (~45s).',
          autoDismissMs: 5000
        });
        return true;
      }
      // Error path
      if (savingToastId) dismissToast(savingToastId);
      showToast({
        kind: 'error',
        title: 'Save failed (HTTP ' + res.status + ')',
        message: (res.body && res.body.error) || 'Unknown error'
      });
      // Refetch to recover ground truth
      return loadPartners().then(function() { return false; });
    }).catch(function(err) {
      console.error('save-partners failed:', err);
      if (savingToastId) dismissToast(savingToastId);
      showToast({
        kind: 'error',
        title: 'Save failed',
        message: (err && err.message) ? err.message : String(err || 'unknown error')
      });
      return loadPartners().then(function() { return false; });
    }).finally(function() {
      saveInFlight = false;
      applySaveInFlightDisable();
    });
  }

  // ===== Init =====
  loadPartners();
})();
