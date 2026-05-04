// PCSHomes admin client-side auth helper.
// Stores a JWT in localStorage and provides helpers used by /admin pages.
// Server-side verification still happens on every protected function call.
(function(global) {
  var STORAGE_KEY = 'pcshomes_admin_token';

  function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    try { return atob(str); } catch (e) { return null; }
  }

  function decodePayload(token) {
    if (!token || typeof token !== 'string') return null;
    var parts = token.split('.');
    if (parts.length !== 3) return null;
    var json = base64UrlDecode(parts[1]);
    if (!json) return null;
    try { return JSON.parse(json); } catch (e) { return null; }
  }

  function saveToken(token) {
    try { localStorage.setItem(STORAGE_KEY, token); } catch (e) {}
  }

  function getToken() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function clearToken() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function isAuthenticated() {
    var token = getToken();
    var payload = decodePayload(token);
    if (!payload || typeof payload.exp !== 'number') return false;
    if (Date.now() / 1000 >= payload.exp) {
      clearToken();
      return false;
    }
    return true;
  }

  function requireAuth(redirectTo) {
    if (!isAuthenticated()) {
      window.location.href = redirectTo || 'index.html';
    }
  }

  function authHeader() {
    var token = getToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  global.AdminAuth = {
    saveToken: saveToken,
    getToken: getToken,
    clearToken: clearToken,
    isAuthenticated: isAuthenticated,
    requireAuth: requireAuth,
    authHeader: authHeader
  };
})(window);
