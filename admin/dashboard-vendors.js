// PCSHomes admin dashboard — vendor CRUD + category management.
// Phase 3. Loaded after dashboard-shell.js (provides AdminDash) and
// dashboard.js (Phase 2 partner module — untouched).
(function() {
  if (!window.AdminAuth || !window.AdminAuth.isAuthenticated()) {
    window.location.href = 'index.html';
    return;
  }
  if (!window.AdminDash) {
    console.error('AdminDash shell missing — dashboard-shell.js must load first.');
    return;
  }

  var Dash = window.AdminDash;
  var escapeHtml = Dash.escapeHtml;

  // ===== State =====
  var vendors = null;       // Array — null means not loaded yet
  var categories = null;
  var saveInFlight = false;
  var savingToastId = null;
  var currentFilter = 'all';
  var mapboxPublicToken = null;

  // Active modal state for the vendor form so we can clean up the map
  var activeVendorMap = null;
  var activeVendorMarker = null;

  // ===== Mapbox proximity for forward geocode =====
  var DEFAULT_CENTER = { lat: 43.9748, lng: -75.9094 }; // Watertown NY

  // ===== Utility =====
  function $(sel, parent) { return (parent || document).querySelector(sel); }
  function $all(sel, parent) { return Array.prototype.slice.call((parent || document).querySelectorAll(sel)); }

  function slugify(s) {
    return String(s || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }

  function isFiniteNumber(n) { return typeof n === 'number' && isFinite(n); }

  function categoryById(id) {
    if (!categories) return null;
    return categories.find(function(c) { return c.id === id; }) || null;
  }

  function activeCategories() {
    return (categories || []).filter(function(c) { return c.active !== false; });
  }

  function vendorCountByCategory(catId) {
    if (!vendors) return 0;
    return vendors.filter(function(v) { return v.category === catId; }).length;
  }

  function vendorNamesByCategory(catId) {
    if (!vendors) return [];
    return vendors.filter(function(v) { return v.category === catId; }).map(function(v) { return v.name; });
  }

  // ===== Loaders =====
  function loadVendors() {
    return fetch('/data/vendors.json?ts=' + Date.now(), { cache: 'no-cache' }).then(function(r) {
      if (!r.ok) throw new Error('vendors.json HTTP ' + r.status);
      return r.json();
    });
  }
  function loadCategories() {
    return fetch('/data/categories.json?ts=' + Date.now(), { cache: 'no-cache' }).then(function(r) {
      if (!r.ok) throw new Error('categories.json HTTP ' + r.status);
      return r.json();
    });
  }

  function loadAll(force) {
    var loaders = [];
    if (force || !vendors)    loaders.push(loadVendors().then(function(d) { vendors = d.slice(); }));
    if (force || !categories) loaders.push(loadCategories().then(function(d) { categories = d.slice(); }));
    return Promise.all(loaders).then(renderAll).catch(function(err) {
      console.error('vendors module load failed:', err);
      $('#vendorList').innerHTML = '<div class="empty-state"><h3>Could not load vendors</h3><p>' + escapeHtml(err.message) + '</p></div>';
    });
  }

  // ===== Render: filter dropdown + list =====
  function renderAll() {
    renderFilter();
    renderList();
  }

  function renderFilter() {
    var sel = $('#vendorFilter');
    if (!sel) return;
    var current = sel.value;
    var opts = ['<option value="all">All categories</option>'];
    activeCategories().forEach(function(c) {
      opts.push('<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.label) + '</option>');
    });
    // Include any category referenced by an existing vendor even if currently inactive
    if (vendors) {
      var seen = Object.create(null);
      activeCategories().forEach(function(c) { seen[c.id] = true; });
      vendors.forEach(function(v) {
        if (v.category && !seen[v.category]) {
          var c = categoryById(v.category);
          opts.push('<option value="' + escapeHtml(v.category) + '">' + escapeHtml((c && c.label) || v.category) + ' (inactive)</option>');
          seen[v.category] = true;
        }
      });
    }
    sel.innerHTML = opts.join('');
    sel.value = (current && Array.prototype.some.call(sel.options, function(o) { return o.value === current; })) ? current : 'all';
    currentFilter = sel.value;
  }

  function renderList() {
    var list = $('#vendorList');
    if (!list) return;
    if (!vendors) {
      list.innerHTML = '<div class="loading-state">Loading vendors…</div>';
      return;
    }
    if (!vendors.length) {
      list.innerHTML = '<div class="empty-state"><h3>No vendors yet.</h3><p>Add your first.</p></div>';
      return;
    }
    var filtered = vendors.slice();
    if (currentFilter !== 'all') {
      filtered = filtered.filter(function(v) { return v.category === currentFilter; });
    }
    filtered.sort(function(a, b) {
      return String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase());
    });
    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state"><h3>No vendors match this filter.</h3></div>';
      return;
    }
    var html = filtered.map(function(v) {
      var inactive = v.active === false;
      var cat = categoryById(v.category);
      var catLabel = (cat && cat.label) || v.category || '—';
      var catColor = (cat && cat.color) || '#999';
      var addr = v.address || '';
      var addrTrunc = addr.length > 40 ? addr.slice(0, 40) + '…' : addr;
      return (
        '<div class="vendor-row' + (inactive ? ' inactive' : '') + '" data-id="' + escapeHtml(v.id) + '">' +
          '<div class="color-dot" style="background:' + escapeHtml(catColor) + ';" title="' + escapeHtml(catLabel) + '"></div>' +
          '<div class="vendor-name">' + escapeHtml(v.name) + '</div>' +
          '<div class="row-meta">' +
            '<span class="vendor-cat-badge">' + escapeHtml(catLabel) + '</span>' +
            '<span class="vendor-address" title="' + escapeHtml(addr) + '">' + escapeHtml(addrTrunc) + '</span>' +
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
    $all('#vendorList button').forEach(function(b) { b.disabled = dis; });
    $('#addVendorBtn').disabled = dis;
    $('#manageCategoriesBtn').disabled = dis;
    $('#vendorFilter').disabled = dis;
  }

  // ===== Bind list, header, and filter =====
  $('#vendorList').addEventListener('click', function(e) {
    if (saveInFlight) return;
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var row = btn.closest('.vendor-row');
    if (!row) return;
    var id = row.getAttribute('data-id');
    var action = btn.getAttribute('data-action');
    if (action === 'toggle') return toggleActive(id);
    if (action === 'delete') return deleteVendor(id);
    if (action === 'edit')   return openVendorModal(id);
  });

  $('#addVendorBtn').addEventListener('click', function() {
    if (saveInFlight) return;
    openVendorModal(null);
  });

  $('#manageCategoriesBtn').addEventListener('click', function() {
    if (saveInFlight) return;
    openCategoryManager();
  });

  $('#vendorFilter').addEventListener('change', function(e) {
    currentFilter = e.target.value;
    renderList();
  });

  // ===== Lazy-load on tab activation =====
  Dash.onPaneActivated('vendorsPane', function(info) {
    if (info.first) loadAll();
    // Eagerly fetch the public Mapbox token (cached)
    Dash.getAdminConfig().then(function(cfg) {
      mapboxPublicToken = cfg && cfg.mapboxPublicToken;
    }).catch(function(err) {
      console.warn('admin-config fetch failed:', err);
    });
  });

  // ===== Toggle active =====
  function toggleActive(id) {
    var v = vendors.find(function(x) { return x.id === id; });
    if (!v) return;
    var newActive = !(v.active !== false);
    var newVendors = vendors.map(function(x) { return x.id === id ? Object.assign({}, x, { active: newActive }) : x; });
    var msg = (newActive ? 'Activate ' : 'Deactivate ') + v.name;
    saveVendors(newVendors, msg);
  }

  function deleteVendor(id) {
    var v = vendors.find(function(x) { return x.id === id; });
    if (!v) return;
    Dash.confirmDialog({
      title: 'Remove vendor?',
      message: 'Permanently remove "' + v.name + '" from the public map? This is committed to GitHub and cannot be undone here.',
      okLabel: 'Remove',
      cancelLabel: 'Keep',
      danger: true
    }).then(function(ok) {
      if (!ok) return;
      var newVendors = vendors.filter(function(x) { return x.id !== id; });
      saveVendors(newVendors, 'Remove vendor: ' + v.name);
    });
  }

  // ===== Vendor modal =====
  function openVendorModal(id) {
    var isAdd = (id == null);
    var existing = isAdd ? null : vendors.find(function(x) { return x.id === id; });
    if (!isAdd && !existing) return;
    var v = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: '',
      name: '',
      address: '',
      lat: null,
      lng: null,
      category: '',
      phone: null,
      website: null,
      hours: null,
      description: null,
      active: true
    };

    var slugLocked = !isAdd;
    var manualLatLng = false;
    var lastFormatted = null;

    var root = $('#modalRoot');
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = renderVendorFormHtml(v, isAdd);

    function close() {
      destroyVendorMap();
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape' && !saveInFlight) close(); }
    document.addEventListener('keydown', onKey);

    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop && !saveInFlight) close();
    });
    backdrop.querySelector('.modal-close').addEventListener('click', function() { if (!saveInFlight) close(); });
    backdrop.querySelector('#cancelBtn').addEventListener('click', function() { if (!saveInFlight) close(); });

    root.appendChild(backdrop);

    var nameInput = backdrop.querySelector('#vf-name');
    var slugValueEl = backdrop.querySelector('#vf-slug-value');
    var slugInput = backdrop.querySelector('#vf-slug-input');
    var editSlugBtn = backdrop.querySelector('#vf-slug-edit');
    var addressInput = backdrop.querySelector('#vf-address');
    var findBtn = backdrop.querySelector('#vf-findbtn');
    var geocodeStatus = backdrop.querySelector('#vf-geocode-status');
    var geocodeMatches = backdrop.querySelector('#vf-geocode-matches');
    var latLngDisplay = backdrop.querySelector('#vf-latlng-display');
    var latLngValue = backdrop.querySelector('#vf-latlng-value');
    var editLatLngBtn = backdrop.querySelector('#vf-latlng-edit');
    var manualLatLngWrap = backdrop.querySelector('#vf-latlng-manual');
    var latInput = backdrop.querySelector('#vf-lat');
    var lngInput = backdrop.querySelector('#vf-lng');
    var mapWrap = backdrop.querySelector('#vf-map');
    var mapEmpty = backdrop.querySelector('#vf-map-empty');
    var errorBanner = backdrop.querySelector('#vf-form-error');
    var saveBtn = backdrop.querySelector('#vf-save');

    var slugManuallyEdited = !isAdd;

    nameInput.addEventListener('input', function() {
      if (isAdd && !slugManuallyEdited) {
        var s = slugify(nameInput.value);
        slugValueEl.textContent = s || '(auto from name)';
        slugInput.value = s;
      }
    });

    if (editSlugBtn) {
      editSlugBtn.addEventListener('click', function() {
        Dash.confirmDialog({
          title: 'Edit slug?',
          message: 'Changing the slug breaks any external links pointing to this vendor. Continue?',
          okLabel: 'Yes, edit',
          cancelLabel: 'Cancel',
          danger: true
        }).then(function(ok) {
          if (!ok) return;
          slugInput.style.display = '';
          slugInput.value = v.id;
          slugInput.focus();
          slugLocked = false;
        });
      });
    }

    if (isAdd) {
      slugInput.addEventListener('input', function() {
        slugManuallyEdited = true;
        slugValueEl.textContent = slugInput.value || '(empty)';
      });
      slugValueEl.addEventListener('click', function() {
        slugInput.style.display = '';
        slugInput.focus();
      });
    } else {
      slugInput.addEventListener('input', function() {
        slugValueEl.textContent = slugInput.value || '(empty)';
      });
    }

    // Geocode
    findBtn.addEventListener('click', function() {
      var addr = (addressInput.value || '').trim();
      if (!addr) {
        setGeocodeStatus('error', 'Enter an address first.');
        addressInput.focus();
        return;
      }
      findBtn.disabled = true;
      findBtn.textContent = 'Finding…';
      setGeocodeStatus('info', 'Looking up address…');
      geocodeMatches.innerHTML = '';

      fetch('/.netlify/functions/geocode', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, window.AdminAuth.authHeader()),
        body: JSON.stringify({ address: addr })
      }).then(function(r) {
        return r.json().then(function(body) { return { status: r.status, body: body }; });
      }).then(function(res) {
        if (res.status === 401) {
          window.AdminAuth.clearToken();
          window.location.href = 'index.html';
          return;
        }
        if (res.status === 429) {
          setGeocodeStatus('error', 'Rate limited. Try again in a moment.');
          return;
        }
        if (res.status !== 200) {
          setGeocodeStatus('error', (res.body && res.body.error) || 'Geocoding failed.');
          return;
        }
        var matches = (res.body && res.body.matches) || [];
        if (!matches.length) {
          setGeocodeStatus('error', 'No match found. Enter lat/lng manually below.');
          revealManualLatLng();
          return;
        }
        if (matches.length === 1 || (matches[0].confidence === 'exact' || matches[0].confidence === 'high')) {
          // Auto-apply top match
          applyMatch(matches[0]);
          if (matches.length > 1) renderMatchPicker(matches.slice(1), false);
        } else {
          setGeocodeStatus('info', 'Found ' + matches.length + ' matches. Pick the right one:');
          renderMatchPicker(matches, true);
        }
      }).catch(function(err) {
        console.error('geocode error:', err);
        setGeocodeStatus('error', 'Network error: ' + (err.message || 'unknown'));
      }).finally(function() {
        findBtn.disabled = false;
        findBtn.textContent = 'Find on Map';
      });
    });

    function setGeocodeStatus(kind, msg) {
      geocodeStatus.className = 'geocode-status ' + kind;
      geocodeStatus.textContent = msg;
    }

    function applyMatch(m) {
      v.lat = m.lat;
      v.lng = m.lng;
      lastFormatted = m.formatted_address;
      latInput.value = m.lat;
      lngInput.value = m.lng;
      updateLatLngDisplay();
      updateMap();
      var conf = m.confidence ? ' (confidence: ' + m.confidence + ')' : '';
      setGeocodeStatus('success', 'Mapbox returned: ' + m.formatted_address + conf);
    }

    function renderMatchPicker(matches, asPrimary) {
      if (!matches.length) {
        geocodeMatches.innerHTML = '';
        return;
      }
      var hdr = asPrimary ? '' : '<div class="geocode-status">Other matches:</div>';
      var html = hdr + matches.map(function(m, i) {
        return (
          '<div class="geocode-match" data-idx="' + i + '">' +
            '<div class="match-info">' +
              '<div class="addr">' + escapeHtml(m.formatted_address) + '</div>' +
              '<div class="conf">' + escapeHtml(m.confidence || 'unknown') + ' · ' + m.lat.toFixed(5) + ', ' + m.lng.toFixed(5) + '</div>' +
            '</div>' +
            '<button type="button">Use this</button>' +
          '</div>'
        );
      }).join('');
      geocodeMatches.innerHTML = html;
      $all('.geocode-match', geocodeMatches).forEach(function(el, i) {
        el.querySelector('button').addEventListener('click', function() {
          applyMatch(matches[i]);
          geocodeMatches.innerHTML = '';
        });
      });
    }

    function updateLatLngDisplay() {
      if (isFiniteNumber(v.lat) && isFiniteNumber(v.lng)) {
        latLngValue.textContent = v.lat.toFixed(5) + ', ' + v.lng.toFixed(5);
      } else {
        latLngValue.textContent = 'not set';
      }
    }

    function revealManualLatLng() {
      manualLatLngWrap.style.display = '';
      manualLatLng = true;
    }

    if (editLatLngBtn) {
      editLatLngBtn.addEventListener('click', function() {
        revealManualLatLng();
      });
    }

    function readManualLatLng() {
      var latVal = parseFloat(latInput.value);
      var lngVal = parseFloat(lngInput.value);
      if (isFiniteNumber(latVal) && latVal >= -90 && latVal <= 90 &&
          isFiniteNumber(lngVal) && lngVal >= -180 && lngVal <= 180) {
        v.lat = latVal;
        v.lng = lngVal;
        updateLatLngDisplay();
        updateMap();
      }
    }
    latInput.addEventListener('input', readManualLatLng);
    lngInput.addEventListener('input', readManualLatLng);

    // Initial state
    updateLatLngDisplay();
    if (existing && existing.lat != null && existing.lng != null) {
      latInput.value = existing.lat;
      lngInput.value = existing.lng;
    }

    // Init map preview
    initVendorMap(mapWrap, mapEmpty);

    // Submit
    backdrop.querySelector('#vf-form').addEventListener('submit', function(e) {
      e.preventDefault();
      if (saveInFlight) return;
      handleVendorSubmit();
    });

    function showFormError(msg) {
      errorBanner.textContent = msg;
      errorBanner.classList.add('show');
    }
    function clearFormError() {
      errorBanner.textContent = '';
      errorBanner.classList.remove('show');
    }

    function collect() {
      var slug = isAdd
        ? (slugInput.value && slugManuallyEdited ? slugify(slugInput.value) : slugify(nameInput.value))
        : (slugLocked ? v.id : slugify(slugInput.value));

      var nullIfEmpty = function(s) { s = (s || '').trim(); return s ? s : null; };

      return {
        id: slug,
        name: (nameInput.value || '').trim(),
        address: (addressInput.value || '').trim(),
        category: (backdrop.querySelector('#vf-category').value || '').trim(),
        lat: isFiniteNumber(v.lat) ? v.lat : null,
        lng: isFiniteNumber(v.lng) ? v.lng : null,
        phone: nullIfEmpty(backdrop.querySelector('#vf-phone').value),
        website: nullIfEmpty(backdrop.querySelector('#vf-website').value),
        hours: nullIfEmpty(backdrop.querySelector('#vf-hours').value),
        description: nullIfEmpty(backdrop.querySelector('#vf-description').value),
        active: backdrop.querySelector('#vf-active').checked
      };
    }

    function validate(out) {
      if (!out.id || !/^[a-z0-9][a-z0-9-]*$/.test(out.id))
        return 'Slug must be lower-case letters, digits, or dashes.';
      if (!out.name) return 'Name is required.';
      if (!out.address) return 'Address is required.';
      if (!out.category) return 'Category is required.';
      if (!isFiniteNumber(out.lat) || out.lat < -90 || out.lat > 90)
        return 'Lat is missing or out of range. Use "Find on Map" or enter manually.';
      if (!isFiniteNumber(out.lng) || out.lng < -180 || out.lng > 180)
        return 'Lng is missing or out of range. Use "Find on Map" or enter manually.';
      var clash = vendors.find(function(p) { return p.id === out.id && p.id !== v.id; });
      if (clash) return 'Slug "' + out.id + '" is already used by ' + clash.name + '.';
      return null;
    }

    function handleVendorSubmit() {
      var out = collect();
      var err = validate(out);
      if (err) { showFormError(err); return; }
      clearFormError();
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      var newVendors;
      var msg;
      if (isAdd) {
        newVendors = vendors.concat([out]);
        msg = 'Add vendor: ' + out.name;
      } else {
        newVendors = vendors.map(function(x) { return x.id === v.id ? out : x; });
        msg = 'Update vendor: ' + out.name;
      }
      saveVendors(newVendors, msg).then(function(ok) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Vendor';
        if (ok) close();
      });
    }
  }

  function renderVendorFormHtml(v, isAdd) {
    var cats = activeCategories();
    // If editing a vendor whose category is currently inactive, include it so the form doesn't lose data
    if (!isAdd && v.category && !cats.find(function(c) { return c.id === v.category; })) {
      var existingCat = categoryById(v.category);
      cats = cats.concat([existingCat || { id: v.category, label: v.category + ' (inactive)' }]);
    }
    var catOptions = '<option value="">— pick a category —</option>' + cats.map(function(c) {
      return '<option value="' + escapeHtml(c.id) + '"' + (v.category === c.id ? ' selected' : '') + '>' + escapeHtml(c.label) + '</option>';
    }).join('');

    return (
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="vfTitle">' +
        '<div class="modal-header">' +
          '<div class="modal-title" id="vfTitle">' + escapeHtml(isAdd ? 'Add Vendor' : 'Edit Vendor') + '</div>' +
          '<button type="button" class="modal-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<form class="modal-body" id="vf-form" novalidate>' +
          '<div class="field-error-banner" id="vf-form-error"></div>' +
          '<div class="form-section-title">Basic</div>' +

          '<div class="form-row full">' +
            '<label>Slug</label>' +
            '<div class="slug-display">' +
              '<span class="slug-value" id="vf-slug-value">' + escapeHtml(v.id || '(auto from name)') + '</span>' +
              (isAdd ? '' : '<button type="button" class="slug-edit" id="vf-slug-edit">Edit slug</button>') +
            '</div>' +
            '<input type="text" id="vf-slug-input" name="slug" style="display:none;" pattern="[a-z0-9][a-z0-9-]*" />' +
            '<div class="help">Lower-case letters, digits, and dashes only.</div>' +
          '</div>' +

          '<div class="form-grid">' +
            '<div class="form-row">' +
              '<label for="vf-name">Name<span class="req">*</span></label>' +
              '<input type="text" id="vf-name" name="name" value="' + escapeHtml(v.name) + '" required maxlength="120" />' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="vf-category">Category<span class="req">*</span></label>' +
              '<select id="vf-category" name="category" required>' + catOptions + '</select>' +
            '</div>' +
            '<div class="form-row full">' +
              '<label for="vf-address">Address<span class="req">*</span></label>' +
              '<div class="find-on-map-row">' +
                '<input type="text" id="vf-address" name="address" value="' + escapeHtml(v.address) + '" required maxlength="240" placeholder="123 Main St, Watertown NY 13601" />' +
                '<button type="button" id="vf-findbtn">Find on Map</button>' +
              '</div>' +
              '<div class="geocode-status" id="vf-geocode-status"></div>' +
              '<div class="geocode-matches" id="vf-geocode-matches"></div>' +
            '</div>' +

            '<div class="form-row full">' +
              '<label>Coordinates<span class="req">*</span></label>' +
              '<div class="latlng-display" id="vf-latlng-display">' +
                '<span class="latlng-value" id="vf-latlng-value">not set</span>' +
                '<button type="button" class="latlng-edit" id="vf-latlng-edit">Edit manually</button>' +
              '</div>' +
              '<div class="latlng-manual" id="vf-latlng-manual" style="display:none;margin-top:8px;">' +
                '<div class="form-row">' +
                  '<label for="vf-lat">Lat</label>' +
                  '<input type="number" id="vf-lat" step="any" min="-90" max="90" />' +
                '</div>' +
                '<div class="form-row">' +
                  '<label for="vf-lng">Lng</label>' +
                  '<input type="number" id="vf-lng" step="any" min="-180" max="180" />' +
                '</div>' +
              '</div>' +
              '<div class="map-preview-wrap" id="vf-map" style="margin-top:10px;">' +
                '<div class="map-preview-empty" id="vf-map-empty">Map preview unavailable</div>' +
              '</div>' +
            '</div>' +

            '<div class="form-row">' +
              '<label for="vf-phone">Phone</label>' +
              '<input type="tel" id="vf-phone" name="phone" value="' + escapeHtml(v.phone) + '" maxlength="40" />' +
            '</div>' +
            '<div class="form-row">' +
              '<label for="vf-website">Website</label>' +
              '<input type="url" id="vf-website" name="website" value="' + escapeHtml(v.website) + '" maxlength="240" />' +
            '</div>' +
            '<div class="form-row full">' +
              '<label for="vf-hours">Hours</label>' +
              '<input type="text" id="vf-hours" name="hours" value="' + escapeHtml(v.hours) + '" maxlength="120" placeholder="Mon-Fri 9-5, Sat 10-2" />' +
              '<div class="help">Free text. Single line.</div>' +
            '</div>' +
            '<div class="form-row full">' +
              '<label for="vf-description">Description</label>' +
              '<textarea id="vf-description" name="description" rows="3" maxlength="600">' + escapeHtml(v.description) + '</textarea>' +
              '<div class="help">Shown in the map’s side panel when this pin is clicked.</div>' +
            '</div>' +
            '<div class="form-row full">' +
              '<div class="checkbox-row">' +
                '<input type="checkbox" id="vf-active"' + (v.active === false ? '' : ' checked') + ' />' +
                '<label for="vf-active">Active (visible on public map)</label>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</form>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>' +
          '<button type="submit" class="btn-primary" id="vf-save" form="vf-form">Save Vendor</button>' +
        '</div>' +
      '</div>'
    );
  }

  // ===== Mapbox map preview =====
  function initVendorMap(wrapEl, emptyEl) {
    if (!wrapEl) return;

    function fail(msg) {
      emptyEl.textContent = msg;
      emptyEl.classList.remove('hidden');
    }

    if (!window.mapboxgl) {
      fail('Mapbox GL JS failed to load.');
      return;
    }
    if (!mapboxPublicToken) {
      // Try once more
      Dash.getAdminConfig().then(function(cfg) {
        mapboxPublicToken = cfg && cfg.mapboxPublicToken;
        if (!mapboxPublicToken) fail('Set MAPBOX_PUBLIC_TOKEN in Netlify to enable map preview.');
        else doInit();
      }).catch(function() { fail('Could not fetch Mapbox token.'); });
      return;
    }
    doInit();

    function doInit() {
      try {
        window.mapboxgl.accessToken = mapboxPublicToken;
        var center = [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat];
        var zoom = 9;
        if (isFiniteNumber(window.__currentVendorLat) && isFiniteNumber(window.__currentVendorLng)) {
          center = [window.__currentVendorLng, window.__currentVendorLat];
          zoom = 14;
        }
        activeVendorMap = new window.mapboxgl.Map({
          container: wrapEl,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: zoom,
          attributionControl: true
        });
        emptyEl.classList.add('hidden');

        activeVendorMap.on('load', function() {
          updateMap(); // sync marker once tiles ready
        });
      } catch (e) {
        console.error('Mapbox init failed:', e);
        fail('Map preview failed to load.');
      }
    }
  }

  function updateMap() {
    if (!activeVendorMap) return;
    // Read lat/lng from DOM (since we don't capture v in this scope)
    var modal = document.querySelector('.modal-backdrop .modal');
    if (!modal) return;
    var latStr = modal.querySelector('#vf-lat') && modal.querySelector('#vf-lat').value;
    var lngStr = modal.querySelector('#vf-lng') && modal.querySelector('#vf-lng').value;
    var lat = parseFloat(latStr);
    var lng = parseFloat(lngStr);
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return;

    if (activeVendorMarker) {
      activeVendorMarker.setLngLat([lng, lat]);
    } else {
      activeVendorMarker = new window.mapboxgl.Marker({ color: '#C9A84C' })
        .setLngLat([lng, lat])
        .addTo(activeVendorMap);
    }
    activeVendorMap.flyTo({ center: [lng, lat], zoom: 14, duration: 600 });
  }

  function destroyVendorMap() {
    if (activeVendorMarker) {
      try { activeVendorMarker.remove(); } catch (e) {}
      activeVendorMarker = null;
    }
    if (activeVendorMap) {
      try { activeVendorMap.remove(); } catch (e) {}
      activeVendorMap = null;
    }
  }

  // ===== Vendor save =====
  function saveVendors(newVendors, commitMessage) {
    if (saveInFlight) return Promise.resolve(false);
    saveInFlight = true;
    applySaveInFlightDisable();
    if (savingToastId) Dash.dismissToast(savingToastId);
    savingToastId = Dash.showToast({ kind: 'info', title: 'Saving…', message: commitMessage });

    return fetch('/.netlify/functions/save-vendors', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, window.AdminAuth.authHeader()),
      body: JSON.stringify({ vendors: newVendors, commitMessage: commitMessage })
    }).then(function(r) {
      return r.json().then(function(body) { return { status: r.status, body: body }; });
    }).then(function(res) {
      if (res.status === 401) {
        window.AdminAuth.clearToken();
        window.location.href = 'index.html';
        return false;
      }
      if (savingToastId) Dash.dismissToast(savingToastId);
      if (res.status === 200 && res.body.success) {
        vendors = (res.body.vendors || newVendors).slice();
        renderAll();
        Dash.showToast({ kind: 'success', title: 'Saved', message: 'Site rebuilding (~45s).', autoDismissMs: 5000 });
        return true;
      }
      Dash.showToast({ kind: 'error', title: 'Save failed (HTTP ' + res.status + ')', message: (res.body && res.body.error) || 'Unknown error' });
      return loadAll(true).then(function() { return false; });
    }).catch(function(err) {
      console.error('save-vendors failed:', err);
      if (savingToastId) Dash.dismissToast(savingToastId);
      Dash.showToast({ kind: 'error', title: 'Save failed', message: (err && err.message) ? err.message : String(err || 'unknown error') });
      return loadAll(true).then(function() { return false; });
    }).finally(function() {
      saveInFlight = false;
      applySaveInFlightDisable();
    });
  }

  // =================================================================
  // ===== CATEGORY MANAGER =========================================
  // =================================================================

  function openCategoryManager() {
    var root = $('#modalRoot');
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="cmTitle">' +
        '<div class="modal-header">' +
          '<div class="modal-title" id="cmTitle">Manage Categories</div>' +
          '<button type="button" class="modal-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div style="display:flex;justify-content:flex-end;margin-bottom:14px;">' +
            '<button type="button" class="btn-primary" id="cm-add">+ Add Category</button>' +
          '</div>' +
          '<div class="category-list" id="cm-list"></div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn-secondary" id="cm-close">Done</button>' +
        '</div>' +
      '</div>';

    function close() {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape' && !saveInFlight) close(); }
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop && !saveInFlight) close();
    });
    backdrop.querySelector('.modal-close').addEventListener('click', function() { if (!saveInFlight) close(); });
    backdrop.querySelector('#cm-close').addEventListener('click', function() { if (!saveInFlight) close(); });
    backdrop.querySelector('#cm-add').addEventListener('click', function() { if (!saveInFlight) openCategoryForm(null, backdrop); });

    root.appendChild(backdrop);
    renderCategoryList(backdrop);
  }

  function renderCategoryList(backdrop) {
    var listEl = backdrop.querySelector('#cm-list');
    if (!categories || !categories.length) {
      listEl.innerHTML = '<div class="empty-state"><h3>No categories yet.</h3><p>Add your first.</p></div>';
      return;
    }
    var html = categories.slice().sort(function(a, b) {
      return String(a.label || '').toLowerCase().localeCompare(String(b.label || '').toLowerCase());
    }).map(function(c) {
      var inactive = c.active === false;
      var count = vendorCountByCategory(c.id);
      return (
        '<div class="category-row' + (inactive ? ' inactive' : '') + '" data-id="' + escapeHtml(c.id) + '">' +
          '<div class="color-dot" style="background:' + escapeHtml(c.color) + ';"></div>' +
          '<div class="label">' + escapeHtml(c.label) + '</div>' +
          '<div class="row-meta">' +
            '<span class="hex">' + escapeHtml(c.color) + '</span>' +
            '<span class="count">' + count + ' vendor' + (count === 1 ? '' : 's') + ' using</span>' +
            '<button type="button" class="toggle' + (inactive ? '' : ' on') + '" data-action="toggle" aria-label="' + (inactive ? 'Activate' : 'Deactivate') + '"></button>' +
          '</div>' +
          '<div class="row-actions">' +
            '<button type="button" data-action="edit">Edit</button>' +
            '<button type="button" class="danger" data-action="delete">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
    listEl.innerHTML = html;

    listEl.addEventListener('click', function(e) {
      if (saveInFlight) return;
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var row = btn.closest('.category-row');
      if (!row) return;
      var id = row.getAttribute('data-id');
      var action = btn.getAttribute('data-action');
      if (action === 'edit')   return openCategoryForm(id, backdrop);
      if (action === 'toggle') return toggleCategoryActive(id, backdrop);
      if (action === 'delete') return deleteCategory(id, backdrop);
    });
  }

  function toggleCategoryActive(id, managerBackdrop) {
    var c = categories.find(function(x) { return x.id === id; });
    if (!c) return;
    var newActive = !(c.active !== false);
    var newCats = categories.map(function(x) { return x.id === id ? Object.assign({}, x, { active: newActive }) : x; });
    var msg = (newActive ? 'Activate category: ' : 'Deactivate category: ') + c.label;
    saveCategories(newCats, msg, managerBackdrop);
  }

  function deleteCategory(id, managerBackdrop) {
    var c = categories.find(function(x) { return x.id === id; });
    if (!c) return;
    var inUse = vendorNamesByCategory(id);
    if (inUse.length) {
      Dash.confirmDialog({
        title: 'Cannot delete this category',
        message: inUse.length + ' vendor' + (inUse.length === 1 ? '' : 's') + ' still use "' + c.label + '": ' + inUse.slice(0, 5).join(', ') + (inUse.length > 5 ? ', …' : '') + '. Reassign or delete those vendors first.',
        okLabel: 'OK',
        cancelLabel: 'Cancel'
      });
      return;
    }
    Dash.confirmDialog({
      title: 'Remove category?',
      message: 'Remove "' + c.label + '" from the public map?',
      okLabel: 'Remove',
      cancelLabel: 'Keep',
      danger: true
    }).then(function(ok) {
      if (!ok) return;
      var newCats = categories.filter(function(x) { return x.id !== id; });
      saveCategories(newCats, 'Remove category: ' + c.label, managerBackdrop);
    });
  }

  function openCategoryForm(id, managerBackdrop) {
    var isAdd = (id == null);
    var existing = isAdd ? null : categories.find(function(x) { return x.id === id; });
    if (!isAdd && !existing) return;
    var c = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: '', label: '', color: '#C9A84C', active: true
    };

    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML =
      '<div class="modal" style="max-width:480px;" role="dialog" aria-modal="true">' +
        '<div class="modal-header">' +
          '<div class="modal-title">' + escapeHtml(isAdd ? 'Add Category' : 'Edit Category') + '</div>' +
          '<button type="button" class="modal-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<form class="modal-body" id="cf-form" novalidate>' +
          '<div class="field-error-banner" id="cf-error"></div>' +
          '<div class="form-row" style="margin-bottom:14px;">' +
            '<label for="cf-label">Label<span class="req">*</span></label>' +
            '<input type="text" id="cf-label" value="' + escapeHtml(c.label) + '" required maxlength="60" />' +
          '</div>' +
          '<div class="form-row" style="margin-bottom:14px;">' +
            '<label>ID / slug</label>' +
            '<input type="text" id="cf-id" value="' + escapeHtml(c.id) + '"' + (isAdd ? '' : ' readonly') + ' pattern="[a-z0-9][a-z0-9-]*" maxlength="40" />' +
            '<div class="help">' + (isAdd ? 'Auto-generated from label.' : 'Read-only — id changes would break vendor references.') + '</div>' +
          '</div>' +
          '<div class="form-row" style="margin-bottom:14px;">' +
            '<label for="cf-color">Color<span class="req">*</span></label>' +
            '<div class="color-picker-row">' +
              '<input type="color" id="cf-color" value="' + escapeHtml(c.color) + '" />' +
              '<input type="text" id="cf-color-hex" class="hex-input" value="' + escapeHtml(c.color) + '" pattern="#[0-9a-fA-F]{6}" maxlength="7" />' +
            '</div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="checkbox-row">' +
              '<input type="checkbox" id="cf-active"' + (c.active === false ? '' : ' checked') + ' />' +
              '<label for="cf-active">Active (shown in vendor dropdown and map legend)</label>' +
            '</div>' +
          '</div>' +
        '</form>' +
        '<div class="modal-footer">' +
          '<button type="button" class="btn-secondary" id="cf-cancel">Cancel</button>' +
          '<button type="submit" class="btn-primary" id="cf-save" form="cf-form">Save Category</button>' +
        '</div>' +
      '</div>';

    function close() {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape' && !saveInFlight) close(); }
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', function(e) { if (e.target === backdrop && !saveInFlight) close(); });
    backdrop.querySelector('.modal-close').addEventListener('click', function() { if (!saveInFlight) close(); });
    backdrop.querySelector('#cf-cancel').addEventListener('click', function() { if (!saveInFlight) close(); });

    document.body.appendChild(backdrop);

    var labelInput = backdrop.querySelector('#cf-label');
    var idInput = backdrop.querySelector('#cf-id');
    var colorPicker = backdrop.querySelector('#cf-color');
    var colorHex = backdrop.querySelector('#cf-color-hex');
    var activeCb = backdrop.querySelector('#cf-active');
    var errEl = backdrop.querySelector('#cf-error');
    var saveBtn = backdrop.querySelector('#cf-save');

    if (isAdd) {
      labelInput.addEventListener('input', function() {
        idInput.value = slugify(labelInput.value);
      });
    }

    colorPicker.addEventListener('input', function() {
      colorHex.value = colorPicker.value.toUpperCase();
    });
    colorHex.addEventListener('input', function() {
      var v = colorHex.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) colorPicker.value = v;
    });

    function showErr(msg) { errEl.textContent = msg; errEl.classList.add('show'); }
    function clearErr() { errEl.textContent = ''; errEl.classList.remove('show'); }

    backdrop.querySelector('#cf-form').addEventListener('submit', function(e) {
      e.preventDefault();
      if (saveInFlight) return;
      var label = labelInput.value.trim();
      var id = (idInput.value || slugify(label)).trim();
      var hex = colorHex.value.trim();
      var active = activeCb.checked;

      if (!label) return showErr('Label is required.');
      if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) return showErr('ID must be lower-case letters, digits, or dashes.');
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return showErr('Color must be a 6-digit hex like #C9A84C.');
      var clash = categories.find(function(x) { return x.id === id && x.id !== c.id; });
      if (clash) return showErr('A category with id "' + id + '" already exists ("' + clash.label + '").');
      clearErr();

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      var newCat = { id: id, label: label, color: hex.toUpperCase(), active: active };
      var newCats;
      var msg;
      if (isAdd) {
        newCats = categories.concat([newCat]);
        msg = 'Add category: ' + label;
      } else {
        newCats = categories.map(function(x) { return x.id === c.id ? newCat : x; });
        msg = 'Update category: ' + label;
      }

      saveCategories(newCats, msg, managerBackdrop).then(function(ok) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Category';
        if (ok) close();
      });
    });
  }

  function saveCategories(newCats, commitMessage, managerBackdrop) {
    if (saveInFlight) return Promise.resolve(false);
    saveInFlight = true;
    applySaveInFlightDisable();
    if (savingToastId) Dash.dismissToast(savingToastId);
    savingToastId = Dash.showToast({ kind: 'info', title: 'Saving…', message: commitMessage });

    return fetch('/.netlify/functions/save-categories', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, window.AdminAuth.authHeader()),
      body: JSON.stringify({ categories: newCats, commitMessage: commitMessage })
    }).then(function(r) {
      return r.json().then(function(body) { return { status: r.status, body: body }; });
    }).then(function(res) {
      if (res.status === 401) {
        window.AdminAuth.clearToken();
        window.location.href = 'index.html';
        return false;
      }
      if (savingToastId) Dash.dismissToast(savingToastId);
      if (res.status === 200 && res.body.success) {
        categories = (res.body.categories || newCats).slice();
        renderFilter();
        renderList();
        if (managerBackdrop && managerBackdrop.parentNode) renderCategoryList(managerBackdrop);
        Dash.showToast({ kind: 'success', title: 'Saved', message: 'Site rebuilding (~45s).', autoDismissMs: 5000 });
        return true;
      }
      if (res.status === 409 && res.body && res.body.blocked) {
        var lines = res.body.blocked.map(function(b) {
          return '• ' + b.categoryId + ': ' + (b.vendors || []).join(', ');
        }).join('\n');
        Dash.showToast({ kind: 'error', title: 'Cannot save (vendors still reference removed category)', message: lines });
      } else {
        Dash.showToast({ kind: 'error', title: 'Save failed (HTTP ' + res.status + ')', message: (res.body && res.body.error) || 'Unknown error' });
      }
      return loadAll(true).then(function() { return false; });
    }).catch(function(err) {
      console.error('save-categories failed:', err);
      if (savingToastId) Dash.dismissToast(savingToastId);
      Dash.showToast({ kind: 'error', title: 'Save failed', message: (err && err.message) ? err.message : String(err || 'unknown error') });
      return loadAll(true).then(function() { return false; });
    }).finally(function() {
      saveInFlight = false;
      applySaveInFlightDisable();
    });
  }
})();
