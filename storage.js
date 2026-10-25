/* 캐릭터 데이터 저장소 (브라우저 IndexedDB) */
(function () {
  var DB_NAME = 'oc-char-archive';
  var STORE = 'characters';

  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function run(mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var rq = fn(t.objectStore(STORE));
        t.oncomplete = function () { resolve(rq ? rq.result : undefined); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  window.Store = {
    get: function (id) { return run('readonly', function (s) { return s.get(id); }); },
    put: function (c) { return run('readwrite', function (s) { return s.put(c); }); },
    del: function (id) { return run('readwrite', function (s) { return s.delete(id); }); },
    all: function () { return run('readonly', function (s) { return s.getAll(); }); }
  };
})();
