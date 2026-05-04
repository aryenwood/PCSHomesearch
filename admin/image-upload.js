// PCSHomes admin — reusable image uploader.
// Exposes window.createImageUploader({ targetDir, currentUrl, onChange, onBusyChange }).
// Returns { element, getUrl, isBusy }.
(function(global) {
  var MAX_RAW_BYTES = 10 * 1024 * 1024; // 10 MB pre-resize ceiling (catches accidental video selection)
  var MAX_EDGE_PX   = 1200;
  var JPEG_QUALITY  = 0.85;

  // Detect transparency by sampling alpha — every 16th pixel is plenty of signal.
  function canvasHasTransparency(ctx, w, h) {
    try {
      var data = ctx.getImageData(0, 0, w, h).data;
      for (var i = 3; i < data.length; i += 4 * 16) {
        if (data[i] < 255) return true;
      }
      // Also check the four corners explicitly
      var corners = [3, (w * 4) - 1, ((h - 1) * w * 4) + 3, (w * h * 4) - 1];
      for (var k = 0; k < corners.length; k++) {
        if (data[corners[k]] < 255) return true;
      }
      return false;
    } catch (e) {
      // Cross-origin or huge canvas — assume opaque
      return false;
    }
  }

  function slugifyFilename(name) {
    var dot = name.lastIndexOf('.');
    var stem = dot > 0 ? name.slice(0, dot) : name;
    var ext  = dot > 0 ? name.slice(dot) : '';
    var clean = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    if (!clean) clean = 'image';
    if (!/^[a-z0-9]/.test(clean)) clean = 'i-' + clean;
    return clean + ext.toLowerCase();
  }

  function fileToDataUrl(file) {
    return new Promise(function(resolve, reject) {
      var r = new FileReader();
      r.onload  = function() { resolve(r.result); };
      r.onerror = function() { reject(new Error('Could not read file')); };
      r.readAsDataURL(file);
    });
  }

  function fileToText(file) {
    return new Promise(function(resolve, reject) {
      var r = new FileReader();
      r.onload  = function() { resolve(r.result); };
      r.onerror = function() { reject(new Error('Could not read file')); };
      r.readAsText(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.onload  = function() { resolve(img); };
      img.onerror = function() { reject(new Error('Could not decode image')); };
      img.src = dataUrl;
    });
  }

  // Returns Promise<{filename, contentType, contentBase64}>
  function processImage(file) {
    var lowerName = (file.name || 'image').toLowerCase();
    var ext = (lowerName.match(/\.([a-z0-9]+)$/) || [, ''])[1];
    var isSvg = file.type === 'image/svg+xml' || ext === 'svg';

    if (isSvg) {
      return fileToText(file).then(function(text) {
        // Encode UTF-8 → base64
        var utf8 = unescape(encodeURIComponent(text));
        var base64 = btoa(utf8);
        return {
          filename: slugifyFilename(file.name).replace(/\.[^.]+$/, '') + '.svg',
          contentType: 'image/svg+xml',
          contentBase64: base64
        };
      });
    }

    return fileToDataUrl(file).then(loadImage).then(function(img) {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h) throw new Error('Image has zero dimensions');
      if (w > MAX_EDGE_PX || h > MAX_EDGE_PX) {
        var scale = MAX_EDGE_PX / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      var isPng = file.type === 'image/png';
      var hasAlpha = isPng ? canvasHasTransparency(ctx, w, h) : false;
      var keepPng = isPng && hasAlpha;
      var outType = keepPng ? 'image/png' : 'image/jpeg';
      var outExt  = keepPng ? '.png' : '.jpg';

      // toDataURL fails on extremely large canvases on some browsers; canvas blob would be safer
      var dataUrl = keepPng
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      var base64 = dataUrl.replace(/^data:[^,]+,/, '');

      return {
        filename: slugifyFilename(file.name).replace(/\.[^.]+$/, '') + outExt,
        contentType: outType,
        contentBase64: base64
      };
    });
  }

  function createImageUploader(opts) {
    opts = opts || {};
    var targetDir = opts.targetDir;
    var currentUrl = opts.currentUrl || null;
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : function() {};
    var onBusyChange = typeof opts.onBusyChange === 'function' ? opts.onBusyChange : function() {};

    var busy = false;
    function setBusy(v) {
      if (busy === v) return;
      busy = v;
      try { onBusyChange(busy); } catch (e) {}
    }

    var root = document.createElement('div');
    root.className = 'image-uploader';

    root.innerHTML =
      '<div class="iu-row">' +
        '<div class="iu-thumb" data-empty="' + (currentUrl ? 'false' : 'true') + '">' +
          (currentUrl ? '<img src="' + escapeAttr(currentUrl) + '" alt=""/>' : '<span class="iu-thumb-placeholder">No image</span>') +
        '</div>' +
        '<div class="iu-controls">' +
          '<button type="button" class="iu-upload-btn">Upload image</button>' +
          '<button type="button" class="iu-remove-btn"' + (currentUrl ? '' : ' style="display:none;"') + '>Remove</button>' +
          '<input type="file" class="iu-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style="display:none;" />' +
        '</div>' +
      '</div>' +
      '<input type="text" class="iu-url" placeholder="Or paste an external URL" value="' + escapeAttr(currentUrl) + '" />' +
      '<div class="iu-status" hidden></div>';

    var thumb = root.querySelector('.iu-thumb');
    var uploadBtn = root.querySelector('.iu-upload-btn');
    var removeBtn = root.querySelector('.iu-remove-btn');
    var fileInput = root.querySelector('.iu-file');
    var urlInput = root.querySelector('.iu-url');
    var statusEl = root.querySelector('.iu-status');

    function setStatus(kind, message) {
      if (!message) {
        statusEl.hidden = true;
        statusEl.textContent = '';
        statusEl.className = 'iu-status';
        return;
      }
      statusEl.hidden = false;
      statusEl.className = 'iu-status ' + kind;
      statusEl.textContent = message;
    }

    function setUrl(url) {
      currentUrl = url || null;
      urlInput.value = currentUrl || '';
      if (currentUrl) {
        thumb.innerHTML = '<img src="' + escapeAttr(currentUrl) + '" alt=""/>';
        thumb.setAttribute('data-empty', 'false');
        removeBtn.style.display = '';
      } else {
        thumb.innerHTML = '<span class="iu-thumb-placeholder">No image</span>';
        thumb.setAttribute('data-empty', 'true');
        removeBtn.style.display = 'none';
      }
      try { onChange(currentUrl); } catch (e) {}
    }

    uploadBtn.addEventListener('click', function() {
      if (busy) return;
      fileInput.click();
    });

    removeBtn.addEventListener('click', function() {
      if (busy) return;
      setUrl(null);
      setStatus('', '');
    });

    urlInput.addEventListener('blur', function() {
      var v = urlInput.value.trim();
      if (v === (currentUrl || '')) return;
      setUrl(v || null);
    });
    urlInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); urlInput.blur(); }
    });

    fileInput.addEventListener('change', function() {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = ''; // allow re-selecting the same file later
      if (!file) return;

      if (file.size > MAX_RAW_BYTES) {
        setStatus('error', 'File too large (' + Math.round(file.size / (1024*1024)) + ' MB > 10 MB max).');
        return;
      }
      var ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (file.type && ALLOWED.indexOf(file.type) === -1) {
        setStatus('error', 'Unsupported format: ' + file.type + '. Use PNG, JPEG, WebP, or SVG.');
        return;
      }

      setBusy(true);
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Processing…';
      setStatus('info', 'Processing image…');

      processImage(file).then(function(processed) {
        setStatus('info', 'Uploading ' + processed.filename + '…');
        uploadBtn.textContent = 'Uploading…';
        var headers = Object.assign({ 'Content-Type': 'application/json' }, (window.AdminAuth && window.AdminAuth.authHeader()) || {});
        return fetch('/.netlify/functions/upload-image', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            filename: processed.filename,
            contentType: processed.contentType,
            contentBase64: processed.contentBase64,
            targetDir: targetDir
          })
        }).then(function(r) {
          return r.json().then(function(body) { return { status: r.status, body: body }; });
        }).then(function(res) {
          if (res.status === 401) {
            window.AdminAuth.clearToken();
            window.location.href = 'index.html';
            return;
          }
          if (res.status !== 200 || !res.body || !res.body.url) {
            throw new Error((res.body && res.body.error) || 'HTTP ' + res.status);
          }
          setUrl(res.body.url);
          if (res.body.reused) {
            setStatus('success', 'Image already uploaded — reusing existing file.');
          } else {
            setStatus('success', 'Uploaded as ' + res.body.finalFilename + '.');
            // Bubble a short toast if AdminDash is available
            if (window.AdminDash && typeof window.AdminDash.showToast === 'function') {
              window.AdminDash.showToast({
                kind: 'success',
                title: 'Image uploaded',
                message: res.body.finalFilename + ' — saved to ' + targetDir,
                autoDismissMs: 4000
              });
            }
          }
        });
      }).catch(function(err) {
        console.error('image-upload error:', err);
        setStatus('error', 'Upload failed: ' + (err && err.message || 'unknown error'));
      }).finally(function() {
        setBusy(false);
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload image';
      });
    });

    return {
      element: root,
      getUrl: function() { return currentUrl; },
      isBusy: function() { return busy; }
    };
  }

  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  global.createImageUploader = createImageUploader;
})(window);
