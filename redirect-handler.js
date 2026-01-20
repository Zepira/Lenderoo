// GitHub Pages client-side routing handler
// This script restores the correct URL after a 404 redirect
(function() {
  var redirect = sessionStorage.getItem('redirect');
  if (redirect) {
    sessionStorage.removeItem('redirect');
    // Use history.replaceState to restore the URL without a page reload
    history.replaceState(null, null, '/Lenderoo' + redirect);
  }
})();
