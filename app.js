/* CD 7 — self-learning platform for the 7-day crime documentary course.
   Vanilla JS, no build step, no dependencies. All progress is stored in localStorage under KEY. */
(function () {
  'use strict';

  var D = window.CURRICULUM;
  var DAYS = D.days;
  var TOTAL = DAYS.length;
  var TOTAL_STEPS = DAYS.reduce(function (a, d) { return a + d.steps.length; }, 0);
  var KEY = 'cd7.progress.v1';
  var MILESTONES = {};
  D.deliverables.forEach(function (p) { if (p.day) MILESTONES[p.day] = p; });

  /* ---------------- tiny DOM helper ---------------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'checked' || k === 'value' || k === 'disabled' || k === 'selected') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) kid.forEach(function (k) { add(el, k); });
    else if (kid.nodeType) el.appendChild(kid);
    else el.appendChild(document.createTextNode(String(kid)));
  }
  function $(s, el) { return (el || document).querySelector(s); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------------- persistence ---------------- */
  var S = load();
  function norm(o) { return { v: 1, days: o.days || {}, wins: o.wins || [], theme: o.theme || 'auto' }; }
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) return norm(JSON.parse(raw)); } catch (e) {}
    return norm({});
  }
  var warned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { if (!warned) { warned = true; toast('Progress could not be saved in this browser. Download a backup to be safe.'); } }
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ---------------- progress model ---------------- */
  function dget(n) {
    if (!S.days[n]) S.days[n] = { status: 'todo', steps: {}, notes: '', secs: 0 };
    return S.days[n];
  }
  function status(n) { return (S.days[n] && S.days[n].status) || 'todo'; }
  function stepsDone(n) {
    var s = S.days[n]; if (!s) return 0;
    var c = 0; for (var k in s.steps) if (s.steps[k]) c++;
    return c;
  }
  function daySecs(n) {
    var s = S.days[n]; if (!s) return 0;
    return (s.secs || 0) + (s.timerStart ? Math.floor((Date.now() - s.timerStart) / 1000) : 0);
  }
  function countDone() { var c = 0; for (var i = 1; i <= TOTAL; i++) if (status(i) === 'done') c++; return c; }
  function totalStepsDone() { var c = 0; for (var i = 1; i <= TOTAL; i++) c += stepsDone(i); return c; }
  function totalSecs() { var c = 0; for (var i = 1; i <= TOTAL; i++) c += daySecs(i); return c; }
  function nextDay() { for (var i = 1; i <= TOTAL; i++) if (status(i) !== 'done') return i; return null; }

  function setStatus(n, st) {
    var d = dget(n), prev = d.status;
    d.status = st;
    if (st === 'done') { if (!d.doneAt) d.doneAt = today(); }
    else delete d.doneAt;
    save();
    if (st === 'done' && prev !== 'done') celebrate(n);
  }
  function setStep(n, i, val) {
    var d = dget(n);
    if (val) d.steps[i] = true; else delete d.steps[i];
    var done = stepsDone(n), all = DAYS[n - 1].steps.length;
    if (done === all) {
      if (d.status !== 'done') { d.status = 'done'; d.doneAt = today(); save(); celebrate(n); return; }
    } else if (d.status === 'done') { d.status = 'doing'; delete d.doneAt; }
    else if (done > 0 && d.status === 'todo') d.status = 'doing';
    else if (done === 0 && d.status === 'doing' && !d.secs && !d.timerStart) d.status = 'todo';
    save();
  }
  function celebrate(n) {
    var p = MILESTONES[n], done = countDone();
    if (done === TOTAL) toast('🎬 Day 7 done. Your documentary is published. That is a real start.');
    else if (p) toast('✅ Deliverable done: ' + p.title + '.');
    else toast('✅ Day ' + n + ' complete.');
    updateNavProgress();
  }

  /* ---------------- formatting helpers ---------------- */
  function fmtTime(s) {
    var hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return (hh ? hh + ':' + pad(mm) : mm) + ':' + pad(ss);
  }
  function fmtHours(s) {
    if (s < 60) return '0 minutes';
    if (s < 3600) return Math.round(s / 60) + ' minutes';
    return (Math.round(s / 360) / 10) + ' hours';
  }
  function ytId(url) {
    if (!url) return null;
    var m = /[?&]v=([\w-]{6,})/.exec(url); if (m) return m[1];
    m = /youtu\.be\/([\w-]{6,})/.exec(url); if (m) return m[1];
    return null;
  }
  var URL_RE = /(https?:\/\/[^\s)]+)/g;
  function linkify(text) {
    var out = [], last = 0, m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
      var url = m[1].replace(/[.,;]+$/, '');
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push(h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: url.replace(/^https?:\/\/(www\.)?/, '') }));
      last = m.index + url.length;
      URL_RE.lastIndex = last;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  /* ---------------- toast ---------------- */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3600);
  }

  /* ---------------- shared pieces ---------------- */
  function phaseOf(n) { return DAYS[n - 1].m; }
  function phaseMeta(m) { for (var i = 0; i < D.phases.length; i++) if (D.phases[i].n === m) return D.phases[i]; return null; }
  function daysInPhase(m) { return DAYS.filter(function (d) { return d.m === m; }).map(function (d) { return d.n; }); }
  function ftab(n, extra) {
    var d = DAYS[n - 1], st = status(n), cls = 'ftab ' + st, p = MILESTONES[n];
    if (p) cls += ' milestone';
    if (extra) cls += ' ' + extra;
    var label = 'Day ' + n + ': ' + d.topic + '. ' + ({ todo: 'Not started', doing: 'In progress', done: 'Done' })[st] + (p ? '. Deliverable: ' + p.title : '');
    return h('a', { class: cls, href: '#/day/' + n, title: 'Day ' + n + ' · ' + d.topic, 'aria-label': label },
      h('span', { class: 'fn', text: 'DAY ' + n }), h('span', { class: 'ft', text: d.topic }),
      h('span', { class: 'fs', text: ({ todo: 'Unopened', doing: 'Active', done: 'Closed' })[st] }));
  }
  function statusBadge(st) {
    var label = { todo: 'Not started', doing: 'In progress', done: 'Done' }[st];
    return h('span', { class: 'badge ' + st, text: label });
  }
  function quoteOfDay() {
    var d = new Date(), idx = (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % D.quotes.length;
    return D.quotes[idx];
  }

  /* ---------------- views ---------------- */
  var cleanup = null;

  function viewOverview() {
    var done = countDone(), steps = totalStepsDone(), nd = nextDay();
    var root = h('div', { class: 'wrap' });

    var line;
    if (done === 0 && steps === 0) {
      line = h('p', { class: 'progress-line' }, 'Nothing ticked yet. Day 1 is format and case selection: study two channels, then shortlist a closed case.');
    } else if (done === TOTAL) {
      line = h('p', { class: 'progress-line' }, h('strong', { text: 'All 7 days are done.' }), ' You ticked ' + steps + ' practice steps and logged ' + fmtHours(totalSecs()) + '. Your documentary is published — time to plan the next one.');
    } else {
      line = h('p', { class: 'progress-line' }, 'You have finished ', h('strong', { text: done + ' of ' + TOTAL + ' days' }), ' and ticked ', h('strong', { text: steps + ' of ' + TOTAL_STEPS + ' practice steps' }), '.',
        totalSecs() >= 60 ? ' Time logged: ' + fmtHours(totalSecs()) + '.' : '');
    }
    var bar = h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(TOTAL), 'aria-valuenow': String(done), 'aria-label': 'Days completed' }, h('i', { style: 'width:' + (done / TOTAL * 100) + '%' }));

    var cta = h('div', { class: 'cta-row' },
      nd ? h('a', { class: 'btn primary', href: '#/day/' + nd }, (done === 0 && steps === 0 ? 'Start Day 1' : 'Continue with Day ' + nd + ': ' + DAYS[nd - 1].topic)) : h('a', { class: 'btn primary', href: '#/wins' }, 'Read your wins'),
      h('a', { class: 'btn', href: '#/roadmap' }, 'See the roadmap'));

    root.appendChild(h('section', { class: 'hero' },
      h('p', { class: 'kicker', text: 'CASE FILE · 7-DAY COURSE' }),
      h('h1', { id: 'pageTitle', tabindex: '-1', text: D.title + '.' }),
      h('p', { class: 'lede', text: D.tagline }),
      line, bar, cta));

    var strip = h('div', { class: 'filmstrip', 'aria-label': 'All 7 days' });
    for (var n = 1; n <= TOTAL; n++) strip.appendChild(ftab(n, n === nd ? 'next' : ''));
    root.appendChild(strip);

    var cols = h('div', { class: 'phase-cols' });
    D.phases.forEach(function (ph) {
      cols.appendChild(h('div', { class: 'phase-col' },
        h('h3', null, ph.icon + ' ' + ph.name), h('span', { class: 'rng', text: ph.range }), h('p', { text: ph.stack })));
    });
    root.appendChild(cols);

    var dl = h('ol', { class: 'dels' });
    D.deliverables.forEach(function (p) {
      var st = p.day ? status(p.day) : 'todo';
      dl.appendChild(h('li', { class: 'del' },
        h('span', { class: 'di', 'aria-hidden': 'true', text: p.icon }),
        h('div', { class: 'del-b' },
          h('h3', { text: 'Deliverable ' + p.n + ': ' + p.title }),
          h('span', { class: 'when', text: p.day ? 'Due day ' + p.day : '' }),
          h('ul', { class: 'flow', 'aria-label': 'What it is' }, p.flow.map(function (f) { return h('li', { text: f }); }))),
        h('div', { class: 'del-go' }, p.day ? h('a', { class: 'btn small', href: '#/day/' + p.day }, status(p.day) === 'done' ? 'Done · Day ' + p.day : 'Go to day ' + p.day) : null)));
    });
    root.appendChild(h('section', { class: 'section' },
      h('h2', { text: 'Four deliverables, one published video' }),
      h('p', { class: 'sub', text: 'Each one builds on the last. By Day 7 they add up to a documentary you can point people to.' }),
      dl));

    var how = [
      ['Open today’s day and watch the video, or read the guide.', ' Day 2 has no video — it points to two written guides instead.'],
      ['Do every practice step, in order.', ' The steps are the learning. Do not skip them.'],
      ['Tick each step as you finish it.', ' When the last one is ticked, the day is marked done for you.'],
      ['Write blockers and wins in the notes box.', ' Reading them back on a hard day helps.'],
      ['Watch the filmstrip fill in.', ' Seven tabs, seven days — closed is closed.'],
      ['On Day 7: publish, then open the retention graph.', ' Write one change for video 2. Ship it, then make the next one better.']
    ];
    root.appendChild(h('section', { class: 'section' },
      h('h2', { text: 'How to use this every day' }),
      h('p', { class: 'sub', text: 'Seven days. One story. One published video.' }),
      h('ol', { class: 'steps-how' }, how.map(function (x) { return h('li', null, h('div', null, h('b', { text: x[0] }), x[1])); }))));

    var q = quoteOfDay();
    root.appendChild(h('aside', { class: 'qotd' }, h('blockquote', { text: '“' + q.q + '”' }), h('cite', null, q.by + '. ', h('a', { href: '#/wins' }, 'More on the wall'))));
    return root;
  }

  function viewRoadmap() {
    var f = { m: 0, st: 'all', q: '' };
    var root = h('div', { class: 'wrap' });
    root.appendChild(h('div', { class: 'page-head' }, h('h1', { id: 'pageTitle', tabindex: '-1', text: 'Roadmap' }),
      h('p', { text: 'All 7 days in order. Filter by phase or progress, or search a topic.' })));
    var seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Filter by phase' });
    var segOpts = [['All', 0]].concat(D.phases.map(function (ph) { return ['Phase ' + ph.n, ph.n]; }));
    segOpts.forEach(function (x) {
      seg.appendChild(h('button', { type: 'button', 'aria-pressed': x[1] === 0 ? 'true' : 'false', onclick: function () {
        f.m = x[1]; Array.prototype.forEach.call(seg.children, function (b) { b.setAttribute('aria-pressed', b === this ? 'true' : 'false'); }, this); draw();
      } }, x[0]));
    });
    var sel = h('select', { class: 'field', 'aria-label': 'Filter by status', onchange: function () { f.st = sel.value; draw(); } },
      h('option', { value: 'all' }, 'Any status'), h('option', { value: 'todo' }, 'Not started'), h('option', { value: 'doing' }, 'In progress'), h('option', { value: 'done' }, 'Done'));
    var inp = h('input', { class: 'field grow', type: 'search', placeholder: 'Filter by topic', 'aria-label': 'Filter by topic', oninput: function () { f.q = inp.value.trim().toLowerCase(); draw(); } });
    root.appendChild(h('div', { class: 'filters' }, seg, sel, inp));
    var out = h('div');
    root.appendChild(out);

    function draw() {
      out.textContent = '';
      var any = false;
      D.phases.forEach(function (ph) {
        if (f.m && f.m !== ph.n) return;
        var rows = h('div', { class: 'rows' }), c = 0;
        DAYS.forEach(function (d) {
          if (d.m !== ph.n) return;
          var st = status(d.n);
          if (f.st !== 'all' && f.st !== st) return;
          var vtxt = d.videos.map(function (v) { return v.label; }).join(' ');
          if (f.q && (d.topic + ' ' + vtxt).toLowerCase().indexOf(f.q) < 0) return;
          c++;
          var pct = Math.round(stepsDone(d.n) / d.steps.length * 100);
          rows.appendChild(h('a', { class: 'row', href: '#/day/' + d.n },
            h('span', { class: 'dn', text: 'Day ' + d.n }),
            h('span', { class: 'tp' }, d.topic, MILESTONES[d.n] ? h('span', { class: 'ms-badge', text: MILESTONES[d.n].title }) : null, h('small', { text: d.videos.length ? d.videos[0].label : 'No video — see resources' })),
            h('span', { class: 'pr', 'aria-hidden': 'true' }, h('i', { style: 'width:' + pct + '%' })),
            statusBadge(st)));
        });
        if (!c) return;
        any = true;
        out.appendChild(h('section', { class: 'phase-block' },
          h('header', null, h('h2', { text: ph.icon + ' Phase ' + ph.n + ': ' + ph.name }), h('p', { text: ph.range + '. ' + ph.stack })), rows));
      });
      if (!any) out.appendChild(h('p', { class: 'empty', text: 'No days match those filters. Clear the search or pick a different status.' }));
    }
    draw();
    return root;
  }

  function viewDay(n) {
    var d = DAYS[n - 1];
    if (!d) return viewNotFound();
    var ph = phaseMeta(d.m), proj = MILESTONES[n];
    var root = h('div', { class: 'wrap' });

    root.appendChild(h('div', { class: 'crumbs' }, h('a', { href: '#/roadmap' }, 'Roadmap'), ' / Phase ' + d.m + ': ' + ph.name));
    root.appendChild(h('div', { class: 'day-head' },
      h('span', { class: 'dnum', text: 'DAY ' + n + ' OF ' + TOTAL }),
      h('h1', { id: 'pageTitle', tabindex: '-1', text: d.topic }),
      proj ? h('div', { class: 'banner', text: 'Deliverable due: ' + proj.title + '. ' + proj.desc }) : null));

    /* ----- videos ----- */
    var vblock = h('section', { class: 'video-list', 'aria-label': 'Watch and study' });
    if (d.note) vblock.appendChild(h('div', { class: 'note-card panel' }, d.note));
    d.videos.forEach(function (v) {
      var vid = ytId(v.url);
      if (!v.guide && vid) {
        var frame = h('div', { class: 'frame' });
        function playVideo() {
          frame.textContent = '';
          frame.appendChild(h('iframe', {
            src: 'https://www.youtube-nocookie.com/embed/' + vid + '?autoplay=1&rel=0',
            title: v.label, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin'
          }));
        }
        var img = h('img', { src: 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg', alt: '', loading: 'lazy', onerror: function () { img.style.display = 'none'; } });
        frame.appendChild(h('button', { class: 'thumb', type: 'button', 'aria-label': 'Play video: ' + v.label, onclick: playVideo }, img, h('span', { class: 'play' })));
        vblock.appendChild(h('div', { class: 'video panel' }, frame,
          h('div', { class: 'meta' }, h('strong', { text: v.label }), h('a', { href: v.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open on YouTube'))));
      } else {
        vblock.appendChild(h('div', { class: 'guide-card panel' },
          h('span', { class: 'gi', 'aria-hidden': 'true', text: v.guide ? '📄' : '📺' }),
          h('div', null, h('a', { href: v.url, target: '_blank', rel: 'noopener noreferrer', text: v.label }),
            !v.guide ? h('p', { class: 'muted', style: 'margin:4px 0 0', text: 'This is a channel to study, not a single video.' }) : null)));
      }
    });

    /* ----- steps ----- */
    var stepEls = [];
    var list = h('ul', { class: 'checklist' });
    d.steps.forEach(function (s, i) {
      var isDel = /^Deliverable:/i.test(s.t);
      var text = isDel ? s.t.replace(/^Deliverable:\s*/i, '') : s.t;
      var cb = h('input', { type: 'checkbox', 'aria-label': 'Step ' + (i + 1) + ' done', onchange: function () { setStep(n, i, cb.checked); refresh(); } });
      var subs = null;
      if (s.sub.length) subs = h('ul', { class: 'subs' }, s.sub.map(function (t) { return h('li', { class: 'pt' }, linkify(t)); }));
      var li = h('li', { class: 'step' + (isDel ? ' deliverable' : '') },
        h('label', null, cb, h('div', { class: 'txt' }, h('div', { class: 'main' }, isDel ? h('span', { class: 'tag', text: 'Deliverable' }) : null, linkify(text)), subs)));
      stepEls.push({ li: li, cb: cb });
      list.appendChild(li);
    });
    var count = h('span', { class: 'count' });
    var stepsBlock = h('section', { 'aria-label': 'Practice steps' }, h('div', { class: 'block-head' }, h('h2', { text: 'Practice steps' }), count), list);

    /* ----- notes ----- */
    var saved = h('div', { class: 'saved', 'aria-live': 'polite' });
    var ta = h('textarea', { 'aria-label': 'Notes and wins for day ' + n, placeholder: 'What worked, what broke, what you want to remember.' });
    ta.value = (S.days[n] && S.days[n].notes) || '';
    var nt; ta.addEventListener('input', function () {
      saved.textContent = 'Saving…'; clearTimeout(nt);
      nt = setTimeout(function () { dget(n).notes = ta.value; save(); saved.textContent = 'Saved on this device'; }, 450);
    });
    var notes = h('section', { class: 'notes', 'aria-label': 'Notes' }, h('div', { class: 'block-head' }, h('h2', { text: 'Notes and wins' })), ta, saved);

    /* ----- pager ----- */
    var pager = h('nav', { class: 'pager', 'aria-label': 'Previous and next day' });
    if (n > 1) pager.appendChild(h('a', { class: 'prev', href: '#/day/' + (n - 1), rel: 'prev' }, h('small', { text: 'Previous · Day ' + (n - 1) }), DAYS[n - 2].topic));
    if (n < TOTAL) pager.appendChild(h('a', { class: 'next', href: '#/day/' + (n + 1), rel: 'next' }, h('small', { text: 'Next · Day ' + (n + 1) }), DAYS[n].topic));

    /* ----- aside ----- */
    var sel = h('select', { class: 'field', id: 'statusSel', 'aria-label': 'Day status', onchange: function () {
      var v = sel.value;
      if (v === 'done' && stepsDone(n) < d.steps.length) {
        if (!window.confirm('Mark all ' + d.steps.length + ' steps as complete?')) { refresh(); return; }
        for (var i = 0; i < d.steps.length; i++) dget(n).steps[i] = true;
      }
      setStatus(n, v); refresh();
    } }, h('option', { value: 'todo' }, 'Not started'), h('option', { value: 'doing' }, 'In progress'), h('option', { value: 'done' }, 'Done'));
    var barFill = h('i');
    var bar = h('div', { class: 'bar' }, barFill);
    var small = h('p', { class: 'small' });
    var doneBtn = h('button', { class: 'btn primary', type: 'button', onclick: function () {
      if (status(n) === 'done') { setStatus(n, 'doing'); } else {
        if (stepsDone(n) < d.steps.length && !window.confirm('Some steps are not ticked. Mark the whole day done anyway?')) return;
        for (var i = 0; i < d.steps.length; i++) dget(n).steps[i] = true;
        setStatus(n, 'done');
      }
      refresh();
    } });
    var statusPanel = h('div', { class: 'panel' }, h('h3', { text: 'Status' }), sel, bar, small, doneBtn);

    var read = h('div', { class: 'timer-read', 'aria-live': 'off' });
    var tBtn = h('button', { class: 'btn small', type: 'button', onclick: function () {
      var s = dget(n);
      if (s.timerStart) { s.secs = daySecs(n); delete s.timerStart; }
      else { s.timerStart = Date.now(); if (s.status === 'todo') s.status = 'doing'; }
      save(); refresh();
    } });
    var addBtn = h('button', { class: 'btn small', type: 'button', onclick: function () { var s = dget(n); s.secs = (s.secs || 0) + 900; save(); refresh(); } }, '+15 min');
    var clrBtn = h('button', { class: 'btn small', type: 'button', onclick: function () { var s = dget(n); s.secs = 0; delete s.timerStart; save(); refresh(); } }, 'Clear');
    var timerPanel = h('div', { class: 'panel' }, h('h3', { text: 'Time on this day' }), read, h('div', { class: 'timer-row' }, tBtn, addBtn, clrBtn));

    var mini = h('div', { class: 'filmstrip' });
    for (var k = 1; k <= TOTAL; k++) mini.appendChild(ftab(k, k === n ? 'here' : ''));
    var mapPanel = h('div', { class: 'panel' }, h('h3', { text: 'All 7 days' }), mini);
    var aside = h('aside', { class: 'aside', 'aria-label': 'Day progress' }, statusPanel, timerPanel, mapPanel);

    root.appendChild(h('div', { class: 'day-grid' }, h('div', null, vblock, stepsBlock, notes, pager), aside));

    function refresh() {
      var done = stepsDone(n), all = d.steps.length, st = status(n), s = S.days[n] || {};
      stepEls.forEach(function (e, i) { var c = !!(s.steps && s.steps[i]); e.cb.checked = c; e.li.classList.toggle('done', c); });
      count.textContent = done + ' of ' + all + ' done';
      barFill.style.width = (done / all * 100) + '%';
      small.textContent = done + ' of ' + all + ' steps ticked';
      sel.value = st;
      doneBtn.textContent = st === 'done' ? 'Reopen this day' : 'Mark day complete';
      doneBtn.classList.toggle('primary', st !== 'done');
      tBtn.textContent = s.timerStart ? 'Pause' : (daySecs(n) ? 'Resume' : 'Start timer');
      read.textContent = fmtTime(daySecs(n));
      Array.prototype.forEach.call(mini.children, function (a, i) {
        var num = i + 1, st2 = status(num);
        a.className = a.className.replace(/\b(todo|doing|done)\b/g, '').replace(/\s+/g, ' ').trim() + ' ' + st2;
      });
      updateNavProgress();
    }
    refresh();
    var iv = setInterval(function () { if (S.days[n] && S.days[n].timerStart) read.textContent = fmtTime(daySecs(n)); }, 1000);
    function keys(e) {
      var t = e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft' && n > 1) location.hash = '#/day/' + (n - 1);
      if (e.key === 'ArrowRight' && n < TOTAL) location.hash = '#/day/' + (n + 1);
    }
    document.addEventListener('keydown', keys);
    cleanup = function () { clearInterval(iv); document.removeEventListener('keydown', keys); clearTimeout(nt); if (ta.value !== ((S.days[n] && S.days[n].notes) || '')) { dget(n).notes = ta.value; save(); } };
    return root;
  }

  function viewResources() {
    var root = h('div', { class: 'wrap' });
    root.appendChild(h('div', { class: 'page-head' }, h('h1', { id: 'pageTitle', tabindex: '-1', text: 'Resources' }),
      h('p', { text: 'Study channels, sourcing guides, the editor and tools you need to go deeper.' })));
    var groups = [], map = {};
    D.resources.forEach(function (r) { if (!map[r.cat]) { map[r.cat] = []; groups.push(r.cat); } map[r.cat].push(r); });
    groups.forEach(function (c) {
      root.appendChild(h('section', { class: 'res-group' }, h('h2', { text: c }),
        map[c].map(function (r) {
          return h('div', { class: 'res' }, h('b', null, h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, r.name)), h('span', { text: r.what }), h('span', { class: 'u', text: r.label }));
        })));
    });
    return root;
  }

  function viewWins() {
    var root = h('div', { class: 'wrap' });
    root.appendChild(h('div', { class: 'page-head' }, h('h1', { id: 'pageTitle', tabindex: '-1', text: 'When it gets hard' }),
      h('p', { text: 'Read something, then go do the next step. Log every win here, however small.' })));

    var q = quoteOfDay();
    var bq = h('blockquote', { text: '“' + q.q + '”' }), ci = h('cite', { text: q.by });
    root.appendChild(h('section', { class: 'push', 'aria-label': 'A push' }, bq, ci,
      h('button', { class: 'btn', type: 'button', onclick: function () {
        var r; do { r = D.quotes[Math.floor(Math.random() * D.quotes.length)]; } while (r.q === bq.textContent.slice(1, -1) && D.quotes.length > 1);
        bq.textContent = '“' + r.q + '”'; ci.textContent = r.by;
      } }, 'Give me another')));

    var list = h('ul', { class: 'wins' });
    var sel = h('select', { class: 'field', 'aria-label': 'Day for this win' }, h('option', { value: '' }, 'No day'));
    for (var i = 1; i <= TOTAL; i++) sel.appendChild(h('option', { value: String(i) }, 'Day ' + i));
    var nd = nextDay(); if (nd) sel.value = String(nd);
    var inp = h('input', { class: 'field', type: 'text', placeholder: 'Found the case for my first video', 'aria-label': 'Describe your win', maxlength: '300' });
    function addWin() {
      var t = inp.value.trim(); if (!t) { inp.focus(); return; }
      S.wins.unshift({ day: sel.value ? +sel.value : null, text: t, date: today() }); save(); inp.value = ''; draw(); toast('Win logged 🏅');
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addWin(); } });
    function draw() {
      list.textContent = '';
      if (!S.wins.length) { list.appendChild(h('li', null, h('span'), h('span', { class: 'muted', text: 'No wins logged yet. Your first one counts as much as your fifth.' }), h('span'))); return; }
      S.wins.forEach(function (w, idx) {
        list.appendChild(h('li', null, h('span', { class: 'd', text: w.day ? 'Day ' + w.day : w.date }), h('span', { text: w.text }),
          h('button', { type: 'button', 'aria-label': 'Delete this win', title: 'Delete', onclick: function () { S.wins.splice(idx, 1); save(); draw(); } }, '×')));
      });
    }
    draw();
    root.appendChild(h('section', { class: 'section', style: 'padding-top:0;max-width:760px' }, h('h2', { text: 'Your win log' }), h('p', { class: 'sub', text: 'Write every victory here, no matter how small.' }),
      h('div', { class: 'win-form' }, sel, inp, h('button', { class: 'btn primary', type: 'button', onclick: addWin }, 'Add win')), list));

    root.appendChild(h('section', { class: 'section' }, h('h2', { text: 'The wall' }),
      h('ul', { class: 'wall', style: 'margin-top:18px' }, D.quotes.map(function (x) { return h('li', null, h('q', { text: x.icon + ' ' + x.q }), h('cite', { text: x.by })); }))));
    return root;
  }

  function viewNotFound() {
    return h('div', { class: 'wrap' }, h('div', { class: 'page-head' }, h('h1', { id: 'pageTitle', tabindex: '-1', text: 'That page does not exist' }),
      h('p', null, 'Try the ', h('a', { href: '#/roadmap' }, 'roadmap'), ' or go back to the ', h('a', { href: '#/' }, 'overview'), '.')));
  }

  /* ---------------- router ---------------- */
  var app = $('#app');
  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    var name = parts[0] || 'home', view, title = 'CD 7 · ' + D.title, navKey = name;
    if (name === 'home') view = viewOverview();
    else if (name === 'roadmap') { view = viewRoadmap(); title = 'Roadmap · CD 7'; }
    else if (name === 'resources') { view = viewResources(); title = 'Resources · CD 7'; }
    else if (name === 'wins') { view = viewWins(); title = 'Wins · CD 7'; }
    else if (name === 'day') {
      var n = parseInt(parts[1], 10);
      if (n >= 1 && n <= TOTAL) { view = viewDay(n); title = 'Day ' + n + ': ' + DAYS[n - 1].topic + ' · CD 7'; navKey = 'roadmap'; }
      else { view = viewNotFound(); title = 'Not found · CD 7'; navKey = ''; }
    } else { view = viewNotFound(); title = 'Not found · CD 7'; navKey = ''; }
    app.textContent = ''; app.appendChild(view);
    document.title = title;
    Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) {
      if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    var t = $('#pageTitle'); if (t) t.focus({ preventScroll: true });
    updateNavProgress();
  }
  function updateNavProgress() { $('#navProgress').textContent = countDone() + '/' + TOTAL; }
  window.addEventListener('hashchange', route);

  /* ---------------- search ---------------- */
  var sDlg = $('#searchDlg'), sIn = $('#searchInput'), sOut = $('#searchResults'), sSel = -1;
  var INDEX = DAYS.map(function (d) {
    var steps = d.steps.map(function (s) { return s.t + ' ' + s.sub.join(' '); });
    var vtxt = d.videos.map(function (v) { return v.label; }).join(' ');
    return { d: d, topic: d.topic.toLowerCase(), video: vtxt.toLowerCase(), steps: steps, stepsLow: steps.map(function (s) { return s.toLowerCase(); }) };
  });
  function highlight(text, terms) {
    var low = text.toLowerCase(), first = -1;
    terms.forEach(function (t) { var i = low.indexOf(t); if (i >= 0 && (first < 0 || i < first)) first = i; });
    var from = Math.max(0, first - 30), snippet = text.slice(from, from + 120);
    var out = [], pos = 0, sl = snippet.toLowerCase();
    var ranges = [];
    terms.forEach(function (t) { var i = sl.indexOf(t); while (i >= 0) { ranges.push([i, i + t.length]); i = sl.indexOf(t, i + t.length); } });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    ranges.forEach(function (r) { if (r[0] < pos) return; out.push(snippet.slice(pos, r[0])); out.push(h('mark', { text: snippet.slice(r[0], r[1]) })); pos = r[1]; });
    out.push(snippet.slice(pos));
    return [from > 0 ? '…' : '', out, from + 120 < text.length ? '…' : ''];
  }
  function doSearch() {
    var q = sIn.value.trim().toLowerCase(); sOut.textContent = ''; sSel = -1;
    if (!q) { sOut.appendChild(h('li', { class: 'muted', style: 'padding:10px 8px', text: 'Try “source ledger”, “davinci”, “thumbnail”, or “script”.' })); return; }
    var terms = q.split(/\s+/), hits = [];
    INDEX.forEach(function (x) {
      var all = x.topic + ' ' + x.video + ' ' + x.stepsLow.join(' ');
      if (!terms.every(function (t) { return all.indexOf(t) >= 0; })) return;
      var score = terms.every(function (t) { return x.topic.indexOf(t) >= 0; }) ? 0 : terms.every(function (t) { return (x.topic + ' ' + x.video).indexOf(t) >= 0; }) ? 1 : 2;
      var snip = null;
      if (score === 1) snip = x.d.videos.length ? x.d.videos[0].label : '';
      else if (score === 2) { for (var i = 0; i < x.steps.length; i++) if (terms.some(function (t) { return x.stepsLow[i].indexOf(t) >= 0; })) { snip = x.steps[i]; break; } }
      hits.push({ x: x, score: score, snip: snip });
    });
    hits.sort(function (a, b) { return a.score - b.score || a.x.d.n - b.x.d.n; });
    if (!hits.length) { sOut.appendChild(h('li', { class: 'muted', style: 'padding:10px 8px', text: 'Nothing matches “' + sIn.value.trim() + '”. Try fewer or different words.' })); return; }
    hits.slice(0, 15).forEach(function (hit) {
      sOut.appendChild(h('li', { role: 'option' }, h('a', { href: '#/day/' + hit.x.d.n, onclick: function () { sDlg.close(); } },
        h('span', { class: 'rd', text: 'Day ' + hit.x.d.n }),
        h('span', { class: 'rt' }, highlight(hit.x.d.topic, terms), hit.snip ? h('span', { class: 'rs' }, highlight(hit.snip, terms)) : null))));
    });
  }
  function moveSel(dir) {
    var links = sOut.querySelectorAll('a'); if (!links.length) return;
    sSel = (sSel + dir + links.length) % links.length;
    Array.prototype.forEach.call(links, function (a, i) { a.setAttribute('aria-selected', i === sSel ? 'true' : 'false'); if (i === sSel) a.scrollIntoView({ block: 'nearest' }); });
  }
  function openSearch() { if (!sDlg.open) sDlg.showModal(); sIn.value = ''; doSearch(); sIn.focus(); }
  sIn.addEventListener('input', doSearch);
  sIn.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Enter') { var l = sOut.querySelectorAll('a'); var a = l[sSel >= 0 ? sSel : 0]; if (a) { e.preventDefault(); location.hash = a.getAttribute('href'); sDlg.close(); } }
  });
  $('#openSearch').addEventListener('click', openSearch);
  document.addEventListener('keydown', function (e) {
    var t = e.target.tagName, typing = t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openSearch(); }
  });
  [sDlg, $('#backupDlg')].forEach(function (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.hasAttribute('data-close')) dlg.close(); });
  });

  /* ---------------- theme ---------------- */
  function applyTheme() { if (S.theme === 'dark' || S.theme === 'light') document.documentElement.dataset.theme = S.theme; else delete document.documentElement.dataset.theme; }
  $('#toggleTheme').addEventListener('click', function () {
    var dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    S.theme = dark ? 'light' : 'dark'; applyTheme(); save();
  });
  applyTheme();

  /* ---------------- backup ---------------- */
  var bDlg = $('#backupDlg');
  function openBackup() { bDlg.showModal(); }
  $('#openBackup').addEventListener('click', openBackup);
  $('#footBackup').addEventListener('click', openBackup);
  $('#doExport').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ app: 'cd7', exported: new Date().toISOString(), data: S }, null, 2)], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: 'cd7-progress-' + today() + '.json' });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Backup downloaded');
  });
  $('#doImport').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0]; if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var o = JSON.parse(r.result), data = o && o.app === 'cd7' ? o.data : o;
        if (!data || typeof data.days !== 'object') throw new Error('bad');
        if (!window.confirm('Replace the progress in this browser with the contents of this backup?')) return;
        S = norm(data); save(); applyTheme(); bDlg.close(); route(); toast('Backup restored');
      } catch (err) { toast('That file is not a CD 7 backup. Choose the JSON you downloaded from Back up.'); }
    };
    r.readAsText(file); e.target.value = '';
  });
  $('#doReset').addEventListener('click', function () {
    if (!window.confirm('Delete all progress, notes, timers and wins in this browser? This cannot be undone.')) return;
    S = norm({ theme: S.theme }); save(); bDlg.close(); route(); toast('Progress deleted');
  });

  /* ---------------- go ---------------- */
  if (!location.hash) history.replaceState(null, '', location.pathname + location.search);
  route();
})();
