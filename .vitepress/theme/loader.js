/**
 * 首屏加载遮罩的独立内联脚本生成器。
 *
 * 由 config.js 的 head 注入，随 HTML 同步解析执行（早于任何外部 CSS/JS 资源），
 * 把首次加载的全屏遮罩（大百分比 + 贴底进度条 + 背景加载日志 + 失败态）从 Vue 组件中
 * 完全剥离：不依赖主 JS bundle、不依赖主题 CSS（关键样式内联），HTML 一解析即显示，
 * 主 JS 包体相应减小。
 *
 * - 进度模型：真实节点（文档就绪/水合/样式/脚本/图片/字体/全部资源）权重累加 +
 *   时间切片覆盖满 load 权重（不依赖 window load 补权，消除进度停滞）+ 环境进度
 *   匀速爬升防停滞 + 兜底超时；
 * - 日志：fetch/XHR 拦截 + PerformanceObserver 资源采样，覆盖全部资源加载，
 *   10ms 限流逐行打印（模拟终端）；
 * - 失败兜底：断网 / 同源关键样式加载失败 / 总超时（含主 JS 未水合的极端情况）
 *   → "刷新重试"错误态，替代原 config.js 中的 8s 静态看门狗；
 * - 水合汇报：Vue 组件（LoadingOverlay.vue）挂载后调用 __LAYO_BOOTED__()，
 *   标记 hydrate 节点完成；
 * - 收尾：给 <html> 加 is-loaded 触发内容分步入场，遮罩淡出移除。
 */

export const loaderHeadScript = `(function () {
  'use strict';
  if (document.getElementById('layo-loader')) return;

  // ---- 常量 ----
  var BASE = 5;              // 起始进度（首帧即有可见爬升）
  var MIN_MS = 1400;         // 最短展示时长
  var FORCE_MS = 5000;       // 兜底：到时强制完成收尾
  var WATCHDOG_MS = 8000;    // 总超时：仍未完成（如主 JS 未水合）→ 失败态
  var W = { dom: 8, hydrate: 14, styles: 14, scripts: 10, images: 12, fonts: 8, load: 29 };
  var CREEP_CAP = 88;
  var CREEP_STEP = 0.08;     // 每帧固定步进，环境进度匀速爬升防停滞
  var SLICE_STEP = 5;        // load 段时间切片步进
  var SLICE_TOTAL = 29;      // 覆盖满 load 权重（最后一次轻微溢出由 nodeTotal 上限兜底）
  var SLICE_MS = 300;
  var MAX_LOGS = 256;
  var LOG_MS = 10;           // 日志打印限流：每 10ms 最多输出一条

  var t0 = performance.now();
  var nodeTotal = BASE, creep = BASE, progress = BASE;
  var finished = false;
  var raf = 0, forceTimer = 0, watchdogTimer = 0, sliceTimer = 0;
  var fontTimer = 0, stylesTimer = 0, scriptsTimer = 0, imagesTimer = 0;
  var logQueue = [], logTimer = 0, logSeq = 0;
  var completed = {};
  var root, pctEl, barEl, logEl;

  // ---- 遮罩 DOM：关键样式内联（CSS/JS 未加载时即时可见） ----
  root = document.createElement('div');
  root.id = 'layo-loader';
  root.className = 'page-loader';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-label', '页面加载中');
  root.style.cssText = 'position:fixed;inset:0;z-index:9999990;background:var(--vp-c-bg,#f7f9fc);display:flex;align-items:center;justify-content:center;font-family:var(--ak-font-sans,sans-serif)';
  root.innerHTML =
    '<span class="page-loader__pct" style="font-family:var(--ak-font-sans,sans-serif);font-size:76px;font-weight:700;line-height:1;color:var(--ak-primary,#4aabea);text-shadow:0 0 28px rgba(74,171,234,.4);font-variant-numeric:tabular-nums">' + BASE.toFixed(1) + '%</span>' +
    '<div class="page-loader__track" aria-hidden="true" style="position:fixed;left:0;right:0;bottom:24px;height:8px;border-top:1px solid var(--vp-c-border,#d9dfe9);background-color:var(--vp-c-bg-mute,#e6eaf1);overflow:hidden">' +
    '<div class="page-loader__bar" style="position:absolute;top:0;bottom:0;left:0;width:' + BASE + '%;background:linear-gradient(90deg,var(--ak-dark-blue,#0075a8),var(--ak-primary,#4aabea));transition:width .05s linear;will-change:width"></div></div>' +
    '<ul class="page-loader__debug" aria-hidden="true"></ul>';
  pctEl = root.querySelector('.page-loader__pct');
  barEl = root.querySelector('.page-loader__bar');
  logEl = root.querySelector('.page-loader__debug');
  // head 内联脚本执行时 body 尚未解析，等 body 出现即挂载
  if (document.body) {
    document.body.appendChild(root);
  } else {
    var mo = new MutationObserver(function () {
      if (document.body) {
        mo.disconnect();
        document.body.appendChild(root);
      }
    });
    mo.observe(document.documentElement, { childList: true });
  }

  // ---- 进度 ----
  function complete(name) {
    if (completed[name] || finished) return;
    completed[name] = true;
    nodeTotal = Math.min(100, nodeTotal + W[name]);
  }
  function addProgress(p) {
    if (finished) return;
    nodeTotal = Math.min(100, nodeTotal + p);
  }
  function setProgress(v) {
    progress = v;
    pctEl.textContent = (v >= 100 ? '100' : v.toFixed(1)) + '%';
    barEl.style.width = v + '%';
  }
  function tick() {
    if (finished) return;
    if (creep < CREEP_CAP) creep = Math.min(CREEP_CAP, creep + CREEP_STEP);
    var target = Math.max(nodeTotal, creep);
    if (target > progress) setProgress(Math.min(target, progress + (target - progress) * 0.12 + 0.05));
    if (nodeTotal >= 100 && (performance.now() - t0) >= MIN_MS && progress >= 100) finish();
    else raf = requestAnimationFrame(tick);
  }
  function stopTimers() {
    cancelAnimationFrame(raf);
    clearTimeout(forceTimer);
    clearTimeout(watchdogTimer);
    clearTimeout(fontTimer);
    clearTimeout(stylesTimer);
    clearTimeout(scriptsTimer);
    clearTimeout(imagesTimer);
    clearInterval(sliceTimer);
    clearTimeout(logTimer);
  }
  function finish() {
    if (finished) return;
    finished = true;
    stopTimers();
    document.documentElement.classList.add('is-loaded');
    // 先触发内容分步入场，再淡出遮罩，交叠过渡更顺滑
    setTimeout(function () {
      root.style.transition = 'opacity .5s ease';
      root.style.opacity = '0';
      setTimeout(function () {
        if (root.parentNode) root.parentNode.removeChild(root);
      }, 520);
    }, 260);
  }
  function fail() {
    if (finished) return;
    finished = true;
    stopTimers();
    // 失败态核心样式内联（关键样式加载失败/断网时主题 CSS 可能不可用）
    root.innerHTML =
      '<div class="page-loader__fail" style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 36px;text-align:center">' +
      '<p class="page-loader__fail-title" style="margin:0;font-size:24px;font-weight:700;letter-spacing:.18em;color:var(--ak-accent,#f6540e)">加载失败</p>' +
      '<p class="page-loader__fail-hint" style="margin:0;font-size:13px;letter-spacing:.12em;color:var(--vp-c-text-3,#8b94a6)">网络或资源异常，请检查连接后重试</p>' +
      '<button type="button" class="page-loader__retry" style="margin-top:6px;padding:8px 28px;border:1px solid var(--ak-accent,#f6540e);background-color:transparent;color:var(--ak-accent,#f6540e);font-size:14px;letter-spacing:.18em;cursor:pointer" onclick="window.location.reload()">刷新重试</button></div>';
  }

  // ---- 背景加载日志：fetch/XHR（方法/状态码）+ 资源采样（CSS/JS/IMG/FONT） ----
  function netLogUrl(input) {
    try {
      var u = new URL(typeof input === 'string' ? input : input.url, window.location.href);
      return (u.origin === window.location.origin ? '' : u.origin) + u.pathname + u.search;
    } catch (e) {
      return typeof input === 'string' ? input : String(input);
    }
  }
  function pushNetLog(method, url, status, ms, err) {
    logQueue.push({ id: ++logSeq, method: method, url: url, status: status, ms: ms, err: !!err });
    if (!logTimer) logTimer = setTimeout(drainLog, LOG_MS);
  }
  function drainLog() {
    logTimer = 0;
    var item = logQueue.shift();
    if (item) {
      var li = document.createElement('li');
      li.innerHTML =
        '<span class="page-loader__debug-method"></span>' +
        '<span class="page-loader__debug-url"></span>' +
        '<span class="page-loader__debug-status"></span>' +
        '<span class="page-loader__debug-ms"></span>';
      li.children[0].textContent = item.method;
      li.children[1].textContent = item.url;
      li.children[2].textContent = item.status;
      li.children[3].textContent = item.ms + 'ms';
      logEl.appendChild(li);
      while (logEl.children.length > MAX_LOGS) logEl.removeChild(logEl.firstChild);
    }
    if (logQueue.length) logTimer = setTimeout(drainLog, LOG_MS);
  }
  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  if (nativeFetch) {
    window.fetch = function () {
      var args = arguments, input = args[0], init = args[1];
      var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      var t0 = performance.now();
      return nativeFetch.apply(window, args).then(
        function (res) {
          pushNetLog(method, netLogUrl(input), res.status, Math.round(performance.now() - t0), false);
          return res;
        },
        function (e) {
          pushNetLog(method, netLogUrl(input), 'ERR', Math.round(performance.now() - t0), true);
          throw e;
        }
      );
    };
  }
  var xhrOpen = XMLHttpRequest.prototype.open, xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__layoNet = { method: String(method).toUpperCase(), url: url };
    return xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    var meta = this.__layoNet;
    if (meta) {
      var t0 = performance.now();
      this.addEventListener('loadend', function () {
        var st = this.status;
        var err = st === 0;
        pushNetLog(meta.method, netLogUrl(meta.url), err ? 'ERR' : st, Math.round(performance.now() - t0), err);
      });
    }
    return xhrSend.apply(this, arguments);
  };
  var RESOURCE_SKIP = ['fetch', 'xmlhttprequest'];
  function resourceMethod(t) {
    switch (t) {
      case 'img': return 'IMG';
      case 'link':
      case 'css': return 'CSS';
      case 'script': return 'JS';
      case 'font': return 'FONT';
      case 'beacon': return 'BEACON';
      default: return 'REQ';
    }
  }
  function trackResources() {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      var done = (performance.getEntriesByType('resource') || []).filter(function (e) {
        return RESOURCE_SKIP.indexOf(e.initiatorType) === -1;
      }).slice(-MAX_LOGS);
      for (var i = 0; i < done.length; i++) {
        pushNetLog(resourceMethod(done[i].initiatorType), netLogUrl(done[i].name), 'OK', Math.round(done[i].duration), false);
      }
      new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        for (var j = 0; j < entries.length; j++) {
          if (RESOURCE_SKIP.indexOf(entries[j].initiatorType) !== -1) continue;
          pushNetLog(resourceMethod(entries[j].initiatorType), netLogUrl(entries[j].name), 'OK', Math.round(entries[j].duration), false);
        }
      }).observe({ type: 'resource', buffered: false });
    } catch (e) { /* 环境不支持则忽略 */ }
  }

  // ---- 节点跟踪 ----
  function trackDom() {
    if (document.readyState !== 'loading') complete('dom');
    else document.addEventListener('DOMContentLoaded', function () { complete('dom'); }, { once: true });
  }
  function isSameOrigin(href) {
    try { return new URL(href, window.location.href).origin === window.location.origin; }
    catch (e) { return false; }
  }
  function trackStyles() {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    if (!links.length) return complete('styles');
    var total = links.length, unit = W.styles / total, remaining = total, settled = false;
    function finishOne(fatal) {
      if (settled) return;
      if (fatal) return fail();
      remaining -= 1;
      addProgress(unit);
      if (remaining <= 0) settled = true;
    }
    stylesTimer = setTimeout(function () {
      if (settled) return;
      addProgress(remaining * unit);
      settled = true;
    }, 3000);
    for (var i = 0; i < links.length; i++) (function (l) {
      if (l.sheet) return finishOne(false);
      l.addEventListener('load', function () { finishOne(false); }, { once: true });
      l.addEventListener('error', function () { finishOne(isSameOrigin(l.href)); }, { once: true });
    })(links[i]);
  }
  function trackScripts() {
    var scripts = document.querySelectorAll('script[src]');
    if (!scripts.length) return complete('scripts');
    var total = scripts.length, unit = W.scripts / total, remaining = total, settled = false;
    function alreadyDone(s) {
      try { if (performance.getEntriesByName(s.src).length) return true; } catch (e) { /* ignore */ }
      return s.readyState === 'complete' || s.readyState === 'loaded';
    }
    function finishOne() {
      if (settled) return;
      remaining -= 1;
      addProgress(unit);
      if (remaining <= 0) settled = true;
    }
    scriptsTimer = setTimeout(function () {
      if (settled) return;
      addProgress(remaining * unit);
      settled = true;
    }, 2500);
    for (var i = 0; i < scripts.length; i++) (function (s) {
      if (alreadyDone(s)) return finishOne();
      s.addEventListener('load', finishOne, { once: true });
      s.addEventListener('error', finishOne, { once: true });
    })(scripts[i]);
  }
  function scanImages() {
    var imgs = document.querySelectorAll('img:not([loading="lazy"])');
    if (!imgs.length) return complete('images');
    var total = imgs.length, unit = W.images / total, remaining = total, settled = false;
    function finishOne() {
      if (settled) return;
      remaining -= 1;
      addProgress(unit);
      if (remaining <= 0) settled = true;
    }
    imagesTimer = setTimeout(function () {
      if (settled) return;
      addProgress(remaining * unit);
      settled = true;
    }, 3000);
    for (var i = 0; i < imgs.length; i++) (function (img) {
      if (img.complete) return finishOne();
      img.addEventListener('load', finishOne, { once: true });
      img.addEventListener('error', finishOne, { once: true });
    })(imgs[i]);
  }
  function trackImages() {
    // 图片都在 body，head 脚本执行时尚未解析，延迟到 DOM 解析完成后扫描
    if (document.readyState !== 'loading') scanImages();
    else document.addEventListener('DOMContentLoaded', scanImages, { once: true });
  }
  function trackFonts() {
    if (!document.fonts) return complete('fonts');
    fontTimer = setTimeout(function () { complete('fonts'); }, 4000);
    document.fonts.ready.then(function () {
      clearTimeout(fontTimer);
      complete('fonts');
    });
  }
  function trackLoad() {
    if (document.readyState === 'complete') return complete('load');
    var credited = 0;
    sliceTimer = setInterval(function () {
      if (credited < SLICE_TOTAL) {
        addProgress(SLICE_STEP);
        credited += SLICE_STEP;
      } else {
        clearInterval(sliceTimer);
      }
    }, SLICE_MS);
    window.addEventListener('load', function () {
      clearInterval(sliceTimer);
      if (W.load - credited > 0) addProgress(W.load - credited);
    }, { once: true });
  }

  // ---- 启动 ----
  trackDom();
  trackStyles();
  trackScripts();
  trackImages();
  trackFonts();
  trackLoad();
  trackResources();
  // 断网直接失败
  if (typeof navigator !== 'undefined' && navigator.onLine === false) fail();
  else window.addEventListener('offline', function () { fail(); }, { once: true });
  // 兜底：到时强制完成收尾；总超时仍未完成（如主 JS 未水合）→ 失败态
  forceTimer = setTimeout(function () { if (!finished) nodeTotal = 100; }, FORCE_MS);
  watchdogTimer = setTimeout(function () { if (!finished) fail(); }, WATCHDOG_MS);
  raf = requestAnimationFrame(tick);
  // 水合汇报：Vue 组件（LoadingOverlay.vue）挂载后调用，标记 hydrate 节点完成
  window.__LAYO_BOOTED__ = function () { complete('hydrate'); };
})();
`;
