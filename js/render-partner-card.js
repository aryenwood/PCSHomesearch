// Shared partner card renderer.
// Used by:
//   - pcshomes-network.html (public Network page)
//   - admin/dashboard.js   (live preview pane in the partner add/edit form)
//
// Public API: window.renderPartnerCard(partner) -> HTML string
//
// Pixel parity is the contract: any change to the public card markup
// belongs HERE so the admin preview stays in sync automatically.
(function(global) {
  var SHIELD_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';

  var ICON_SVGS = {
    magnifier: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    house: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    wrench: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function escapeAttr(s) { return escapeHtml(s); }

  function deriveInitials(name) {
    return String(name || '').trim().split(/\s+/).map(function(p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }

  function avatarHtml(p) {
    var borderStyle = '';
    if (p.iconAccent === 'blue') borderStyle = ' style="border-color: #60a5fa;"';
    else if (p.iconAccent === 'blue-muted') borderStyle = ' style="border-color: rgba(96,165,250,0.3);"';

    var inner;
    if (p.photoUrl) {
      inner = '<img src="' + escapeAttr(p.photoUrl) + '" alt="' + escapeAttr(p.name) + '"/>';
    } else if (p.iconKind === 'initials') {
      inner = '<span class="initials">' + escapeHtml(deriveInitials(p.name)) + '</span>';
    } else if (p.iconKind === 'dollar') {
      inner = '<span class="icon-placeholder">$</span>';
    } else if (p.iconKind && ICON_SVGS[p.iconKind]) {
      var iconStyle = p.iconAccent === 'blue-muted' ? ' style="opacity:0.4;"' : '';
      inner = '<span class="icon-placeholder"' + iconStyle + '>' + ICON_SVGS[p.iconKind] + '</span>';
    } else {
      inner = '<span class="initials">' + escapeHtml(deriveInitials(p.name)) + '</span>';
    }
    return '<div class="vendor-avatar"' + borderStyle + '>' + inner + '</div>';
  }

  function tagsHtml(tags) {
    if (!tags || !tags.length) return '';
    return '<div class="vendor-tags">' + tags.map(function(t) {
      return '<span class="vendor-tag">' + escapeHtml(t) + '</span>';
    }).join('') + '</div>';
  }

  function ctaHtml(p) {
    var label = p.ctaLabel || 'Request Info';
    if (p.isPlaceholder) {
      return '<a class="vendor-cta" href="' + escapeAttr(p.ctaHref || 'pcshomes-contact.html#partner-inquiry') + '" style="text-decoration:none;display:block;text-align:center;">' + escapeHtml(label) + '</a>';
    }
    if (p.websiteUrl) {
      return '<a class="vendor-cta" href="' + escapeAttr(p.websiteUrl) + '" target="_blank" style="text-decoration:none;display:block;text-align:center;">' + escapeHtml(label) + '</a>';
    }
    if (p.phone && (p.ctaLabel || '').toLowerCase().indexOf('call') === 0) {
      return '<a class="vendor-cta" href="tel:' + escapeAttr(p.phone) + '" style="text-decoration:none;display:block;text-align:center;">' + escapeHtml(label) + '</a>';
    }
    var displayCategory = p.category === 'agent' ? 'Real Estate Agent'
      : p.category === 'lender' ? 'VA Lender'
      : (p.badgeLabel || 'Partner');
    return '<button class="vendor-cta" onclick="openVendorRequest(' + JSON.stringify(p.name) + ', ' + JSON.stringify(displayCategory) + ')">' + escapeHtml(label) + '</button>';
  }

  function badgeKindFor(p) {
    return p.badgeKind || (p.category === 'agent' ? 'agent' : p.category === 'lender' ? 'lender' : 'services');
  }

  function dataCategoryFor(p) {
    return p.badgeKind || p.category;
  }

  function renderStandard(p) {
    var phoneCta = '';
    if (p.phone && (!p.websiteUrl) && (!p.ctaLabel || (p.ctaLabel || '').toLowerCase().indexOf('call') !== 0)) {
      phoneCta = '';
    }
    var classes = 'vendor-card' + (p.isPlaceholder ? ' placeholder' : '');
    return '<div class="' + classes + '" data-category="' + escapeAttr(dataCategoryFor(p)) + '">' +
      '<span class="category-badge ' + escapeAttr(badgeKindFor(p)) + '">' + escapeHtml(p.badgeLabel || '') + '</span>' +
      '<div class="vendor-header">' +
        avatarHtml(p) +
        '<div class="vendor-info">' +
          '<div class="vendor-company">' + escapeHtml(p.org) + '</div>' +
          '<div class="vendor-name">' + escapeHtml(p.name) + '</div>' +
          (p.trustedLabel
            ? '<div class="vendor-trusted">' + SHIELD_SVG + ' ' + escapeHtml(p.trustedLabel) + '</div>'
            : '') +
        '</div>' +
      '</div>' +
      tagsHtml(p.tags) +
      '<p class="vendor-desc">' + escapeHtml(p.blurb || '') + '</p>' +
      ctaHtml(p) +
    '</div>';
  }

  function renderFeatured(p) {
    var photoBlock = p.photoUrl
      ? '<div style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:3px solid #C9A84C;flex-shrink:0;"><img src="' + escapeAttr(p.photoUrl) + '" alt="' + escapeAttr(p.name) + '" style="width:100%;height:100%;object-fit:cover;"/></div>'
      : '';
    var tags = (p.tags || []).map(function(t) {
      return '<span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:100px;background:rgba(201,168,76,0.15);color:#C9A84C;">' + escapeHtml(t) + '</span>';
    }).join('');
    var reviews = (p.reviews || []).map(function(r) {
      return '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;">' +
               '<div style="font-size:13px;color:rgba(255,255,255,0.65);line-height:1.65;font-style:italic;">"' + escapeHtml(r.quote) + '"</div>' +
               '<div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:6px;">' + escapeHtml(r.attribution) + '</div>' +
             '</div>';
    }).join('');

    var primaryCta = '<button class="vendor-cta" onclick="openVendorRequest(' + JSON.stringify(p.name) + ', ' + JSON.stringify('Real Estate Agent') + ')" style="flex:1;">Request Info</button>';
    var phoneCta = p.phone
      ? '<a href="tel:' + escapeAttr(p.phone) + '" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:11px 20px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);font-size:13px;font-weight:600;text-decoration:none;font-family:\'DM Sans\',sans-serif;min-height:44px;">Call/Text</a>'
      : '';
    var reviewsLink = p.reviewsUrl
      ? '<a href="' + escapeAttr(p.reviewsUrl) + '" target="_blank" style="display:inline-flex;align-items:center;gap:6px;margin-top:14px;font-size:12px;font-weight:600;color:#C9A84C;text-decoration:none;">Read all reviews on Zillow →</a>'
      : '';

    return '<div class="vendor-card featured-agent" data-category="' + escapeAttr(dataCategoryFor(p)) + '" style="grid-column:1/-1;background:var(--navy);border:1px solid rgba(201,168,76,0.2);padding:0;overflow:hidden;">' +
      '<div style="display:flex;gap:0;flex-wrap:wrap;">' +
        '<div style="flex:1;min-width:0;padding:28px;">' +
          '<div style="display:flex;align-items:center;gap:4px;margin-bottom:12px;">' +
            '<span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#C9A84C;">' + escapeHtml(p.badgeLabel || 'Featured') + '</span>' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">' +
            photoBlock +
            '<div>' +
              '<div style="font-family:\'Libre Baskerville\',serif;font-size:20px;font-weight:700;color:#fff;">' + escapeHtml(p.name) + '</div>' +
              '<div style="font-size:13px;color:rgba(255,255,255,0.55);">' + escapeHtml(p.subtitle || p.org) + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.75;margin-bottom:16px;">' + escapeHtml(p.blurb) + '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;">' + tags + '</div>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;">' + primaryCta + phoneCta + '</div>' +
        '</div>' +
        '<div style="flex:1;min-width:0;padding:28px;background:rgba(255,255,255,0.03);border-left:1px solid rgba(255,255,255,0.06);">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">' +
            '<div style="font-size:13px;font-weight:700;color:#fff;">' + escapeHtml(p.trustedLabel || '') + '</div>' +
            '<div style="color:#C9A84C;font-size:13px;">★★★★★</div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:12px;">' + reviews + '</div>' +
          reviewsLink +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderCard(p) {
    return p.tier === 'featured' ? renderFeatured(p) : renderStandard(p);
  }

  global.renderPartnerCard = renderCard;
})(typeof window !== 'undefined' ? window : globalThis);
