// Copy this file to public/test/local-config.js for local self-hosting.
// local-config.js is ignored by git.
(function () {
  window.BugDropTestConfig = {
    ...(window.BugDropTestConfig || {}),
    repo: 'your-org/your-repo',
  };
})();
