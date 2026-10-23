(function () {
  'use strict';
  var timer;
  var finished = false;
  var app = document.getElementById('app');
  var status = document.getElementById('boot-status');
  var loopback = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function fail(error) {
    clearTimeout(timer);
    if (finished) return;
    app.textContent = '';
    var panel = document.createElement('div');
    panel.className = 'boot boot-error';
    var title = document.createElement('h1');
    title.textContent = 'MallWay could not finish starting.';
    var message = document.createElement('p');
    message.textContent =
      location.protocol === 'file:'
        ? 'Extract the whole ZIP and double-click start-windows.bat. Open the address printed in its window.'
        : loopback
          ? 'Close the old server window. Start the latest start-windows.bat and use the new address it opens.'
          : 'Refresh the page. If this continues, expand the technical details below.';
    var retry = document.createElement('button');
    retry.className = 'btn';
    retry.textContent = 'Retry loading';
    retry.onclick = function () {
      location.reload();
    };
    var details = document.createElement('details');
    var summary = document.createElement('summary');
    summary.textContent = 'Technical details';
    var technical = document.createElement('pre');
    technical.textContent = String((error && error.message) || error || 'Unknown startup error');
    details.appendChild(summary);
    details.appendChild(technical);
    panel.appendChild(title);
    panel.appendChild(message);
    panel.appendChild(retry);
    panel.appendChild(details);
    app.appendChild(panel);
  }

  window.mallwayBoot = {
    ready: function () {
      finished = true;
      clearTimeout(timer);
    },
    fail: fail,
  };
  if (location.protocol === 'file:') {
    fail(
      new Error(
        'This app must be served over HTTP. Opening index.html directly blocks its modules/data.',
      ),
    );
    return;
  }
  if (status) status.textContent = 'Loading the directory and floor plans…';
  timer = setTimeout(function () {
    fail(
      new Error(
        'Startup exceeded 15 seconds. Check the server window for missing files or blocked JavaScript requests.',
      ),
    );
  }, 15000);
  import('./app.mjs')
    .then(function () {
      window.mallwayBoot.ready();
    })
    .catch(fail);
})();
