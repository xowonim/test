(function () {
  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  if (!id) { location.replace('index.html'); return; }

  var PART_ITEMS = [
    ['face', '얼굴'], ['voice', '보이스'], ['skin', '피부'], ['bangs', '앞머리'],
    ['backhair', '뒷머리'], ['haircolor', '헤어 컬러'], ['eyecolor', '아이 컬러'],
    ['meshtype', '메시 타입'], ['meshcolor', '메시 컬러'], ['hairdeco', '헤어 데코'],
    ['makeup', '메이크업'], ['onepoint', '원 포인트'], ['jewel', '부탁해 주얼'],
    ['qr', 'QR', 'upload']
  ];
  var REPO = window.REPO || {};
  var OPTIONS = window.OPTIONS || { songs: [], buzz: [], record: [] };

  var $panel = document.getElementById('panel');
  var $picker = document.getElementById('picker');
  var $pickGrid = document.getElementById('pickGrid');
  var $pickTitle = document.getElementById('pickTitle');
  var $status = document.getElementById('status');
  var $file = document.getElementById('fileInput');
  var $name = document.getElementById('nameInput');

  var ch = null;
  var tab = 1;
  var pickKey = null;
  var uploadPath = null;

  /* ---------- 기본 데이터 ---------- */
  function blank() {
    return {
      id: id, name: '', createdAt: Date.now(), updatedAt: Date.now(),
      ch1: defaults1(), ch2: defaults2(), ch3: {}
    };
  }
  function defaults1() {
    return {
      parts: {}, qr: '', coordi: '', song: '', buzz: '', record: '', etc: '',
      codes: [{ img: '', text: '' }],
      friendCards: [{ img: '', text: '' }]
    };
  }
  function defaults2() {
    return { cards: [{ img: '', img2: '' }, { img: '', img2: '' }, { img: '', img2: '' }] };
  }
  function fill(target, def) {
    Object.keys(def).forEach(function (k) {
      if (target[k] === undefined) target[k] = def[k];
    });
  }

  /* ---------- 유틸 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function setPath(obj, path, val) {
    var keys = path.split('.');
    var last = keys.pop();
    var o = keys.reduce(function (a, k) { return a[k]; }, obj);
    o[last] = val;
  }
  /* ---------- 파츠 이미지 (깃허브 폴더에서 자동 읽기) ---------- */
  var CACHE_MS = 5 * 60 * 1000;
  var DEFAULT_SHARE = { meshcolor: 'haircolor' };
  var DEFAULT_THEME = {
    '스키': '#f9d8eb', '유메': '#d6f2fa', '유우죠': '#ddf5d9',
    '유우키': '#fff2c2', '죠네츠': '#f9d7dc', '키보': '#e9ddfb'
  };
  var BASE_THEME = '#e9e9e9';
  function folderOf(key) { var m = window.PARTS_SHARE || {}; return m[key] || DEFAULT_SHARE[key] || key; }
  function partsDir() { return String(window.PARTS_DIR || 'images/parts').replace(/^\/+|\/+$/g, ''); }
  function partImg(key, file) { return partsDir() + '/' + folderOf(key) + '/' + encodeURIComponent(file); }
  /* 파일 이름 규칙: [정렬번호 + 구분기호] 이름 [__설명].확장자
     예) 01_ひたむき__설명.webp -> 번호 1(정렬용, 표시 안 됨), 이름 ひたむき, 설명 설명 */
  function partMeta(file) {
    var base = file.replace(/\.[^.]+$/, '');
    var order = Infinity;
    var m = base.match(/^(\d+)[ _.\-]+(.+)$/);
    if (m) { order = parseInt(m[1], 10); base = m[2]; }
    var i = base.indexOf('__');
    return {
      id: file, order: order,
      name: (i >= 0 ? base.slice(0, i) : base).trim(),
      info: i >= 0 ? base.slice(i + 2).trim() : ''
    };
  }
  function sortParts(list) {
    return list.sort(function (x, y) {
      var dx = x.d == null ? Infinity : x.d, dy = y.d == null ? Infinity : y.d;
      if (dx !== dy) return dx < dy ? -1 : 1;
      var mx = partMeta(x.n), my = partMeta(y.n);
      if (mx.order !== my.order) return mx.order < my.order ? -1 : 1;
      return x.n.localeCompare(y.n, 'ko', { numeric: true });
    });
  }
  function repoInfo() {
    var m = location.hostname.match(/^(.+)\.github\.io$/);
    var owner = REPO.owner || (m ? m[1] : '');
    var repo = REPO.repo || '';
    if (!repo && m) {
      var seg = location.pathname.split('/')[1] || '';
      repo = (seg && seg.indexOf('.') === -1) ? seg : location.hostname;
    }
    return { owner: owner, repo: repo, branch: REPO.branch || '' };
  }
  /* ---------- 업로드 시간 순 정렬 ----------
     폴더에 영향을 준 커밋을 오래된 순으로 따라가며 파일별 업로드 시각을 구합니다. (커밋 내용은 한 번 받으면 저장해 둡니다) */
  function ghGet(path) {
    return fetch('https://api.github.com' + path).then(function (res) {
      if (!res.ok) throw new Error('api ' + res.status);
      return res.json();
    });
  }
  function commitFiles(r, sha) {
    var ck = 'cm2:' + sha, c = null;
    try { c = JSON.parse(localStorage.getItem(ck) || 'null'); } catch (e) {}
    if (c) return Promise.resolve(c);
    return ghGet('/repos/' + r.owner + '/' + r.repo + '/commits/' + sha).then(function (d) {
      var dir = partsDir() + '/';
      var files = (d.files || []).filter(function (f) {
        return f.filename.indexOf(dir) === 0 || (f.previous_filename && f.previous_filename.indexOf(dir) === 0);
      }).map(function (f) { return { f: f.filename, st: f.status, p: f.previous_filename || '' }; });
      var out = { files: files };
      try { localStorage.setItem(ck, JSON.stringify(out)); } catch (e) {}
      return out;
    });
  }
  function loadDates(r, folder) {
    var q = '/repos/' + r.owner + '/' + r.repo + '/commits?per_page=100&path=' +
      encodeURIComponent(partsDir() + '/' + folder) + (r.branch ? '&sha=' + encodeURIComponent(r.branch) : '');
    return ghGet(q).then(function (commits) {
      commits = commits.slice().reverse();
      return Promise.all(commits.map(function (c) { return commitFiles(r, c.sha); })).then(function (details) {
        var dates = {};
        commits.forEach(function (c, i) {
          var who = c.commit.committer || c.commit.author;
          var t = Date.parse(who.date);
          details[i].files.forEach(function (f) {
            if (f.st === 'removed') { delete dates[f.f]; return; }
            if (f.st === 'renamed') {
              dates[f.f] = dates[f.p] != null ? dates[f.p] : t;
              delete dates[f.p];
              return;
            }
            if (f.st === 'modified' || f.st === 'changed') { if (dates[f.f] == null) dates[f.f] = t; return; }
            dates[f.f] = t;
          });
        });
        return dates;
      });
    });
  }

  function apiLoadParts(key, force) {
    var folder = folderOf(key);
    var ck = 'parts3:' + folder, cached = null;
    try { cached = JSON.parse(localStorage.getItem(ck) || 'null'); } catch (e) {}
    if (!force && cached && Date.now() - cached.t < CACHE_MS) return Promise.resolve(cached.list);
    /* 비어 있는 폴더는 조회할 때마다 한도를 쓰므로 잠시 기억해 둡니다. */
    if (cached && cached.empty && Date.now() - cached.t < 30000) return Promise.resolve(cached.list);

    var r = repoInfo();
    if (!r.owner || !r.repo) {
      if (cached) return Promise.resolve(cached.list);
      return Promise.reject(new Error('저장소 정보를 알 수 없습니다. parts-data.js의 REPO를 채워 주세요.'));
    }
    function finish(list, etag) {
      if (!list.length) {
        try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), list: [], empty: true })); } catch (e) {}
        return Promise.resolve(list);
      }
      return loadDates(r, folder).then(function (dates) {
        list.forEach(function (it) {
          var d = dates[partsDir() + '/' + folder + '/' + it.n];
          if (d != null) it.d = d;
        });
        return true;
      }).catch(function () { return false; }).then(function (dated) {
        sortParts(list);
        if (list.length) {
          try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), list: list, etag: etag, dated: dated })); } catch (e) {}
        }
        return list;
      });
    }
    var url = 'https://api.github.com/repos/' + r.owner + '/' + r.repo + '/contents/' + partsDir() + '/' + folder +
      (r.branch ? '?ref=' + encodeURIComponent(r.branch) : '');
    var headers = {};
    if (cached && cached.etag) headers['If-None-Match'] = cached.etag;
    var etag = '';
    return fetch(url, { headers: headers }).then(function (res) {
      if (res.status === 304 && cached) return { notModified: true };
      if (res.status === 404) return [];
      if (res.status === 403 || res.status === 429) throw new Error('잠시 후 다시 열어 주세요.');
      if (!res.ok) throw new Error('불러오지 못했습니다.');
      etag = res.headers.get('ETag') || '';
      return res.json();
    }).then(function (data) {
      if (data && data.notModified) {
        if (cached.dated === false) return finish(cached.list, cached.etag);
        try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), list: cached.list, etag: cached.etag, dated: cached.dated })); } catch (e) {}
        return cached.list;
      }
      var list = (Array.isArray(data) ? data : []).filter(function (f) {
        return f.type === 'file' && /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name);
      }).map(function (f) { return { n: f.name, s: f.sha }; });
      return finish(list, etag);
    }).catch(function (err) {
      if (cached) return cached.list;
      throw err;
    });
  }

  /* 1순위: 저장소 루트의 parts.json (깃허브 Actions가 자동으로 만들어 주는 목록, 조회 한도 없음)
     2순위: 깃허브 API (parts.json이 없을 때) */
  var manifestState = { t: 0, data: null, p: null };
  function getManifest(force) {
    if (manifestState.p) return manifestState.p;
    if (!force && manifestState.t && Date.now() - manifestState.t < 60000) return Promise.resolve(manifestState.data);
    var p = fetch('parts.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; });
    manifestState.p = p;
    p.then(function (d) { manifestState.data = d; manifestState.t = Date.now(); manifestState.p = null; });
    return p;
  }
  function loadPartsRaw(key, force) {
    return getManifest(force).then(function (m) {
      if (m && m.folders) {
        var folder = folderOf(key);
        var list = (m.folders[folder] || []).map(function (x) { return { n: x.n, s: x.s, d: x.d }; });
        sortParts(list);
        try { localStorage.setItem('parts3:' + folder, JSON.stringify({ t: Date.now(), list: list, dated: true, empty: !list.length })); } catch (e) {}
        return list;
      }
      return apiLoadParts(key, force);
    });
  }

  /* 같은 폴더를 동시에 여러 번 요청하지 않도록 합칩니다. */
  var inflight = {};
  function loadParts(key, force) {
    var f = folderOf(key) + (force ? '!' : '');
    if (inflight[f]) return inflight[f];
    var p = loadPartsRaw(key, force);
    inflight[f] = p;
    var done = function () { delete inflight[f]; };
    p.then(done, done);
    return p;
  }
  /* 저장해 둔 목록(오래된 것 포함)을 즉시 보여 주기 위한 용도 */
  function cachedList(key) {
    try {
      var c = JSON.parse(localStorage.getItem('parts3:' + folderOf(key)) || 'null');
      return c ? c.list : null;
    } catch (e) { return null; }
  }
  function lazyImg(src) { return '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async">'; }

  /* 페이지를 열면 모든 항목의 목록과 이미지를 미리 받아 둡니다. */
  function warmImages(urls) {
    var i = 0;
    function next() {
      if (i >= urls.length) return;
      var img = new Image();
      img.onload = img.onerror = next;
      img.src = urls[i++];
    }
    setTimeout(function () { next(); next(); }, 800);
  }
  function prefetchParts() {
    var seen = {}, keys = [], urls = [];
    PART_ITEMS.forEach(function (it) {
      if (it[2]) return;
      var f = folderOf(it[0]);
      if (!seen[f]) { seen[f] = true; keys.push(it[0]); }
    });
    Promise.all(keys.map(function (key) {
      return loadParts(key, false).then(function (list) {
        PART_ITEMS.forEach(function (it) {
          if (!it[2] && folderOf(it[0]) === folderOf(key) && !partLists[it[0]]) partLists[it[0]] = list;
        });
        list.forEach(function (x) { urls.push(partImg(key, x.n)); });
      }).catch(function () {});
    })).then(function () { warmImages(urls); });
  }

  /* 선택한 파츠 = { f: 파일 이름, s: 이미지 고유값(sha) }
     파일 이름이 바뀌어도 이미지 고유값이 같으면 같은 파츠로 이어 줍니다. */
  var partLists = {};
  function getSel(key) {
    var v = ch.ch1.parts[key];
    if (!v) return null;
    return typeof v === 'string' ? { f: v, s: '' } : v;
  }
  function resolveSel(key) {
    var sel = getSel(key);
    if (!sel) return null;
    var list = partLists[key];
    if (!list) return { n: sel.f, s: sel.s, pending: true };
    for (var i = 0; i < list.length; i++) if (list[i].n === sel.f) return list[i];
    if (sel.s) for (var j = 0; j < list.length; j++) if (list[j].s === sel.s) return list[j];
    return null;
  }
  function syncSelections() {
    PART_ITEMS.forEach(function (it) {
      var key = it[0];
      if (it[2] || !getSel(key)) return;
      loadParts(key).then(function (list) {
        partLists[key] = list;
        var sel = getSel(key), r = resolveSel(key);
        if (r && !r.pending && (r.n !== sel.f || r.s !== sel.s)) {
          ch.ch1.parts[key] = { f: r.n, s: r.s };
          touch();
        }
        refreshCell(key);
      }).catch(function () {});
    });
  }
  /* 부탁해 주얼에서 고른 파츠 이름에 맞춰 테마색(--label)을 바꿉니다. 선택이 없으면 기본 회색입니다. */
  function applyTheme() {
    var map = window.THEME_COLORS || DEFAULT_THEME;
    var color = window.THEME_BASE || BASE_THEME;
    var r = ch && getSel('jewel') ? resolveSel('jewel') : null;
    if (r) {
      var name = partMeta(r.n).name;
      if (map[name]) color = map[name];
    }
    document.documentElement.style.setProperty('--label', color);
  }
  function refreshCell(key) {
    if (key === 'jewel') applyTheme();
    var btn = document.querySelector('[data-part="' + key + '"]');
    if (!btn) return;
    var r = resolveSel(key);
    btn.innerHTML = imgTag(r ? partImg(key, r.n) : '');
  }
  function toneOf(kind, val) {
    var list = OPTIONS[kind] || [];
    for (var i = 0; i < list.length; i++) if (list[i].v === val) return list[i].tone || '';
    return '';
  }
  function imgTag(src) { return src ? '<img src="' + esc(src) + '" alt="">' : ''; }

  /* ---------- 저장 ---------- */
  var timer = null;
  function setStatus(t) { $status.textContent = t; }
  function touch() {
    setStatus('저장 중');
    clearTimeout(timer);
    timer = setTimeout(function () {
      ch.updatedAt = Date.now();
      Store.put(ch).then(function () { setStatus('저장됨'); })
        .catch(function () { setStatus('저장 실패'); });
    }, 350);
  }

  /* ---------- 챕터 1 ---------- */
  function partCell(item) {
    var key = item[0], label = item[1], type = item[2] || 'pick';
    var inner;
    if (type === 'upload') {
      inner = '<div class="circle slot" data-up="ch1.qr">' + imgTag(ch.ch1.qr) +
        (ch.ch1.qr ? '<i class="x" data-clear="ch1.qr">×</i>' : '') + '</div>';
    } else {
      var r = resolveSel(key);
      inner = '<button type="button" class="circle" data-part="' + key + '">' + imgTag(r ? partImg(key, r.n) : '') + '</button>';
    }
    return '<div class="cell">' + inner + '<div class="lab">' + label + '</div></div>';
  }

  function slot(path, cls) {
    var src = getPath(ch, path);
    return '<div class="slot ' + (cls || '') + '" data-up="' + path + '">' + imgTag(src) +
      (src ? '<i class="x" data-clear="' + path + '">×</i>' : '<span class="plus">+</span>') + '</div>';
  }

  function selectHtml(kind, path) {
    var val = getPath(ch, path) || '';
    var opts = '<option value=""></option>' + (OPTIONS[kind] || []).map(function (o) {
      return '<option value="' + esc(o.v) + '"' + (o.v === val ? ' selected' : '') + '>' + esc(o.v) + '</option>';
    }).join('');
    return '<select class="field tone" data-bind="' + path + '" data-kind="' + kind + '" data-tone="' + toneOf(kind, val) + '">' + opts + '</select>';
  }

  function renderCh1() {
    var c = ch.ch1;
    var row1 = PART_ITEMS.slice(0, 7).map(partCell).join('');
    var row2 = PART_ITEMS.slice(7).map(partCell).join('');

    var fn = c.friendCards.length;
    var friendCols = c.friendCards.map(function (card, i) {
      var t = card.text || '';
      return '<div class="fcol"><div class="fone">' +
        (fn > 1 ? '<button type="button" class="icon-btn fc-x" data-act="fc-del" data-i="' + i + '" aria-label="삭제">×</button>' : '') +
        slot('ch1.friendCards.' + i + '.img', 'card') +
        '<textarea class="field" data-bind="ch1.friendCards.' + i + '.text" rows="2">' + esc(t) + '</textarea></div></div>';
    }).join('') + (fn < 3 ? '<div class="fcol fadd"><button type="button" class="icon-btn fc-plus" data-act="fc-add" aria-label="추가">+</button></div>' : '');
    var fcols = fn + (fn < 3 ? 1 : 0);

    var codes = c.codes.map(function (r, i) {
      return '<div class="code-row">' + slot('ch1.codes.' + i + '.img', 'small') +
        '<input class="field" data-bind="ch1.codes.' + i + '.text" value="' + esc(r.text) + '" placeholder="코드">' +
        '<button type="button" class="icon-btn" data-act="del-code" data-i="' + i + '" aria-label="삭제">×</button></div>';
    }).join('');


    return '<div class="ch1">' +
      '<div class="sheet">' +
        '<div class="grid7">' + row1 + row2 + '</div>' +
        '<div class="bottom">' +
          '<div class="coordi">' + slot('ch1.coordi', 'big') + '<div class="lab">라이브용 코디</div></div>' +
          '<div class="meta">' +
            '<div class="lab">악곡</div>' +
            '<input class="field tone" data-bind="ch1.song" list="songs" value="' + esc(c.song) + '" data-tone="' + (c.song ? 'blue' : '') + '" data-kind="song">' +
            '<div class="lab">버즈리움</div>' + selectHtml('buzz', 'ch1.buzz') +
            '<div class="lab">녹화</div>' + selectHtml('record', 'ch1.record') +
          '</div>' +
          '<div class="codes"><div class="lab">등록 코드</div><div class="code-list">' + codes + '</div>' +
            '<button type="button" class="mini add" data-act="add-code">+ 추가</button></div>' +
          '<div class="etc"><div class="vlab">기타</div>' +
            '<textarea class="field" data-bind="ch1.etc" rows="4">' + esc(c.etc) + '</textarea></div>' +
        '</div>' +
      '</div>' +
      '<section class="friends"><div class="lab flab">프렌드카드</div>' +
        '<div class="fthree" style="grid-template-columns:repeat(' + fcols + ',minmax(0,1fr))">' + friendCols + '</div></section>' +
    '</div>';
  }

  function renderCh2() {
    var cards = ch.ch2.cards.map(function (r, i) {
      return '<div class="fcard"><div class="fhead"><span class="no">' + (i + 1) + '</span>' +
        '<button type="button" class="icon-btn" data-act="del-card" data-i="' + i + '" aria-label="삭제">×</button></div>' +
        '<div class="fslots">' + slot('ch2.cards.' + i + '.img', 'card') +
        slot('ch2.cards.' + i + '.img2', 'card') + '</div></div>';
    }).join('');
    return '<div class="ch2"><div class="friends"><div class="friend-grid">' + cards + '</div>' +
      '<button type="button" class="mini add" data-act="add-card">+ 추가</button></div></div>';
  }

  function renderPlaceholder(n) {
    return '<div class="ph"><p>챕터 ' + n + ' 내용은 준비 중입니다.</p></div>';
  }

  function render() {
    closePicker();
    applyTheme();
    $panel.innerHTML = tab === 1 ? renderCh1() : tab === 2 ? renderCh2() : renderPlaceholder(tab);
    document.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('on', Number(b.dataset.tab) === tab);
    });
  }

  /* ---------- 파츠 선택 패널 ---------- */
  function labelOf(key) {
    for (var i = 0; i < PART_ITEMS.length; i++) if (PART_ITEMS[i][0] === key) return PART_ITEMS[i][1];
    return key;
  }
  function renderPickList(key, list) {
    var r = resolveSel(key);
    var cur = r ? r.n : '';
    if (!list.length) {
      $pickGrid.innerHTML = '<p class="empty">이미지가 없습니다.</p>';
      return;
    }
    $pickGrid.innerHTML = list.map(function (item) {
      var file = item.n;
      return '<button type="button" class="pick-item' + (file === cur ? ' on' : '') + '" data-pid="' + esc(file) + '">' +
        '<span class="circle sm">' + lazyImg(partImg(key, file)) + '</span></button>';
    }).join('');
  }
  function openPicker(key, force) {
    pickKey = key;
    $pickTitle.textContent = labelOf(key) + ' 선택';
    var first = partLists[key] || cachedList(key);
    if (first) { partLists[key] = first; renderPickList(key, first); }
    else $pickGrid.innerHTML = '<p class="empty">불러오는 중</p>';
    $picker.hidden = false;
    document.body.style.overflow = 'hidden';
    loadParts(key, true).then(function (list) {
      var changed = JSON.stringify(partLists[key]) !== JSON.stringify(list);
      partLists[key] = list;
      if (pickKey === key && changed) renderPickList(key, list);
    }).catch(function (err) {
      if (pickKey === key) $pickGrid.innerHTML = '<p class="empty">' + esc(err.message) + '</p>';
    });
  }
  function closePicker() { pickKey = null; $picker.hidden = true; document.body.style.overflow = ''; }
  $picker.addEventListener('click', function (e) { if (e.target === $picker) closePicker(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pickKey) closePicker(); });

  $pickGrid.addEventListener('click', function (e) {
    var b = e.target.closest('.pick-item');
    if (!b || !pickKey) return;
    var cur = resolveSel(pickKey);
    if (cur && !cur.pending && cur.n === b.dataset.pid) {
      delete ch.ch1.parts[pickKey];
    } else {
      var list = partLists[pickKey] || [];
      var sha = '';
      for (var i = 0; i < list.length; i++) if (list[i].n === b.dataset.pid) sha = list[i].s;
      ch.ch1.parts[pickKey] = { f: b.dataset.pid, s: sha };
    }
    touch(); render();
  });
  document.getElementById('pickClose').addEventListener('click', closePicker);

  /* ---------- 이미지 업로드 ---------- */
  function resize(file, max) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var r = Math.min(1, max / Math.max(img.width, img.height));
        var cv = document.createElement('canvas');
        cv.width = Math.round(img.width * r);
        cv.height = Math.round(img.height * r);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        var out = cv.toDataURL('image/webp', 0.9);
        if (out.indexOf('data:image/webp') !== 0) out = cv.toDataURL('image/png');
        resolve(out);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  $file.addEventListener('change', function () {
    var f = $file.files[0];
    $file.value = '';
    if (!f || !uploadPath) return;
    var path = uploadPath;
    resize(f, 900).then(function (data) {
      setPath(ch, path, data);
      touch(); render();
    });
  });

  /* ---------- 이벤트 ---------- */
  $panel.addEventListener('click', function (e) {
    var t = e.target;
    var clr = t.closest('[data-clear]');
    if (clr) { setPath(ch, clr.dataset.clear, ''); touch(); render(); return; }
    var up = t.closest('[data-up]');
    if (up) { uploadPath = up.dataset.up; $file.click(); return; }
    var part = t.closest('[data-part]');
    if (part) { openPicker(part.dataset.part); return; }
    var act = t.closest('[data-act]');
    if (!act) return;
    var i = Number(act.dataset.i);
    switch (act.dataset.act) {
      case 'add-code': ch.ch1.codes.push({ img: '', text: '' }); break;
      case 'del-code': ch.ch1.codes.splice(i, 1); if (!ch.ch1.codes.length) ch.ch1.codes.push({ img: '', text: '' }); break;
      case 'fc-add': if (ch.ch1.friendCards.length < 3) ch.ch1.friendCards.push({ img: '', text: '' }); break;
      case 'fc-del': if (ch.ch1.friendCards.length > 1) ch.ch1.friendCards.splice(i, 1); break;
      case 'add-card': ch.ch2.cards.push({ img: '', img2: '' }); break;
      case 'del-card': ch.ch2.cards.splice(i, 1); break;
    }
    touch(); render();
  });

  $panel.addEventListener('input', function (e) {
    var el = e.target.closest('[data-bind]');
    if (!el) return;
    setPath(ch, el.dataset.bind, el.value);
    if (el.classList.contains('tone')) {
      var kind = el.dataset.kind;
      el.dataset.tone = kind === 'song' ? (el.value ? 'blue' : '') : toneOf(kind, el.value);
    }
    touch();
  });

  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.tab');
    if (!b) return;
    tab = Number(b.dataset.tab);
    history.replaceState(null, '', '#' + tab);
    render();
  });

  document.getElementById('btnDelete').addEventListener('click', function () {
    if (!confirm('이 캐릭터를 삭제할까요?')) return;
    Store.del(id).then(function () { location.href = 'index.html'; });
  });

  $name.addEventListener('input', function () {
    if (!ch) return;
    ch.name = $name.value;
    touch();
  });

  /* ---------- 시작 ---------- */
  var songs = document.getElementById('songs');
  songs.innerHTML = (OPTIONS.songs || []).map(function (s) { return '<option value="' + esc(s) + '">'; }).join('');

  Store.get(id).catch(function () { return null; }).then(function (saved) {
    ch = saved || blank();
    $name.value = ch.name || '';
    ch.ch1 = ch.ch1 || {};
    if (ch.ch1.friendCard && !ch.ch1.friendCards) {
      ch.ch1.friendCards = defaults1().friendCards;
      ch.ch1.friendCards[0] = ch.ch1.friendCard;
    }
    fill(ch.ch1, defaults1());
    var fcs = ch.ch1.friendCards = ch.ch1.friendCards.slice(0, 3);
    while (fcs.length > 1 && !fcs[fcs.length - 1].img && !fcs[fcs.length - 1].text) fcs.pop();
    if (!fcs.length) fcs.push({ img: '', text: '' });
    ch.ch2 = ch.ch2 || {};
    fill(ch.ch2, defaults2());
    var h = Number(location.hash.replace('#', ''));
    if (h >= 1 && h <= 3) tab = h;
    setStatus(saved ? '저장됨' : '');
    render();
    syncSelections();
    prefetchParts();
  });
})();
