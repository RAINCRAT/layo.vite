<script setup>
/**
 * 页面加载遮罩 + 全站路由顶部进度条
 * - 首次连接：全屏遮罩 + 横跨屏幕的加载进度条 + 大百分比（明日方舟加载风格）。
 *   进度由真实异步加载节点分片驱动：文档就绪 → 应用水合 → 样式资源（逐样式表）→ 脚本
 *   （逐外链）→ 图片（逐图）→ 字体就绪 → 全部资源（时间切片 + window load）。
 *   每个分片完成累加对应权重（不会从 0 直接跳到 100，也避免 78% 附近的单点卡顿）；
 *   节点等待期间环境进度匀速爬升（线性、无指数减速，软上限 90%）防停滞，兜底超时防止卡死；
 * - 加载失败兜底：关键样式（本地主题 CSS）加载失败或断网时，遮罩切换为"加载失败"错误态，
 *   提供刷新重试按钮；主 JS 包未启动的极端情况由 config.js 注入的静态看门狗脚本兜底；
 * - 内容分步入场：遮罩结束前给 <html> 添加 is-loaded，style.css 据此对导航/正文/页脚做错峰浮现；
 * - 路由切换：VitePress 页面组件是异步 chunk，切换期间显示顶部细进度条，加载完成自动收起。
 * 关键样式（定位/层级/底色）内联在根元素上，保证主题 CSS 未加载时遮罩也能遮挡首屏，避免内容闪现。
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vitepress';

const router = useRouter();

// ---- 首次加载遮罩 ----
const visible = ref(true);
const progress = ref(0);
// 加载失败标记：切换为错误态（错误提示 + 刷新重试）
const failed = ref(false);
// 首次加载完成标记：在完成前不显示路由进度条（首次导航也会触发 beforeRouteChange）
const booted = ref(false);

// 起始进度（建立连接）
const BASE = 3;
// 最小展示时长：避免加载过快时一闪而过
const MIN_DURATION = 1400;
// 兜底超时：高延迟或个别节点失败时强制收尾，防止遮罩卡死
const MAX_DURATION = 5000;
// 各节点最长等待：错过的事件（如水合前已触发）靠超时兜底，避免卡进度
const FONT_MAX_WAIT = 4000;
const STYLES_MAX_WAIT = 3000;
const SCRIPTS_MAX_WAIT = 2500;
const IMAGES_MAX_WAIT = 3000;
// 各异步加载节点权重（%）：分片完成一个累加一个，总和 97 + 起始 3 = 100
const WEIGHTS = { dom: 10, hydrate: 20, styles: 12, scripts: 10, images: 10, fonts: 12, load: 23 };
// 环境进度（防停滞）：节点未全部完成时匀速向软上限推进，高延迟下进度条始终有动态
const CREEP_CAP = 90;
const CREEP_STEP = 0.06; // 每帧固定步进（约 3.6%/s），线性匀速，无指数减速的卡顿观感
// window load 时间切片：等待期间先累计一部分，其余由 load 事件补齐
const LOAD_SLICE_STEP = 9;
const LOAD_SLICE_TOTAL = 18; // 时间切片最多占 load 权重的约 78%
const LOAD_SLICE_MS = 700;

let startAt = 0;
let rafId = 0;
let forceTimer = 0;
let fontTimer = 0;
let stylesTimer = 0;
let scriptsTimer = 0;
let imagesTimer = 0;
let loadSliceTimer = 0;
let domOnReady = null;
let resourcesHandler = null;
let offlineHandler = null;
let finished = false;
// 已完成节点累计进度（进度条向它平滑逼近，不越过）
let nodeTotal = BASE;
// 环境进度：从起始值匀速爬向软上限，节点完成时被 nodeTotal 覆盖
let creep = BASE;
// 一次性节点完成标记（dom/hydrate/fonts），防止重复累加
const completed = {};

// 一次性节点完成：累加权重
function complete(name) {
  if (completed[name] || finished) return;
  completed[name] = true;
  nodeTotal = Math.min(100, nodeTotal + WEIGHTS[name]);
}

// 分片节点完成：累加指定权重（由调用方保证每分片只加一次）
function addProgress(pct) {
  if (finished) return;
  nodeTotal = Math.min(100, nodeTotal + pct);
}

// 每帧向目标平滑逼近：目标 = max(真实节点进度, 环境进度)
// 分片完成的瞬间目标被真实进度拉高（可见的加速），其余时间环境进度匀速爬升防停滞
function tick() {
  if (finished) return;
  if (creep < CREEP_CAP) {
    creep = Math.min(CREEP_CAP, creep + CREEP_STEP);
  }
  const target = Math.max(nodeTotal, creep);
  const diff = target - progress.value;
  if (diff > 0) {
    progress.value = Math.min(target, progress.value + diff * 0.12 + 0.05);
  }
  maybeFinish();
  if (!finished) rafId = requestAnimationFrame(tick);
}

// 全部节点完成、最短时长已过且进度到达 100 时收尾
function maybeFinish() {
  if (finished) return;
  const done =
    nodeTotal >= 100 &&
    performance.now() - startAt >= MIN_DURATION &&
    progress.value >= 100;
  if (!done) return;
  finished = true;
  cancelAnimationFrame(rafId);
  clearTimeout(forceTimer);
  clearTimeout(fontTimer);
  clearTimeout(stylesTimer);
  clearTimeout(scriptsTimer);
  clearTimeout(imagesTimer);
  clearInterval(loadSliceTimer);
  booted.value = true;
  // 先触发内容分步入场，再淡出遮罩，两者交叠过渡更顺滑
  setTimeout(() => {
    document.documentElement.classList.add('is-loaded');
    visible.value = false;
  }, 260);
}

// 加载失败兜底：停止进度推进，切换为错误态（等待用户刷新重试）
function fail() {
  if (finished) return;
  finished = true;
  failed.value = true;
  cancelAnimationFrame(rafId);
  clearTimeout(forceTimer);
  clearTimeout(fontTimer);
  clearTimeout(stylesTimer);
  clearTimeout(scriptsTimer);
  clearTimeout(imagesTimer);
  clearInterval(loadSliceTimer);
}

// 刷新重试
function retry() {
  window.location.reload();
}

// ---- 节点监听 ----
// 文档就绪（DOMContentLoaded）
function trackDom() {
  if (document.readyState !== 'loading') complete('dom');
  else {
    domOnReady = () => {
      if (document.readyState !== 'loading') {
        document.removeEventListener('readystatechange', domOnReady);
        complete('dom');
      }
    };
    document.addEventListener('readystatechange', domOnReady);
  }
}

// 样式资源：head 内全部 <link rel="stylesheet">，每个 link 完成一个分片
// 本地关键样式（同源，即构建产出的主题 CSS）加载失败视为致命，进入错误态
function trackStyles() {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  if (!links.length) return complete('styles');
  const unit = WEIGHTS.styles / links.length;
  let remaining = links.length;
  let settled = false;
  const finishOne = (isFatal = false) => {
    if (settled) return;
    if (isFatal) return fail();
    remaining -= 1;
    addProgress(unit);
    if (remaining <= 0) settled = true;
  };
  const isSameOrigin = (href) => {
    try {
      return new URL(href, window.location.href).origin === window.location.origin;
    } catch {
      return false;
    }
  };
  // 兜底：事件可能在水合前已触发而错过监听，超时后按剩余分片直接结算
  stylesTimer = setTimeout(() => {
    if (settled) return;
    addProgress(remaining * unit);
    settled = true;
  }, STYLES_MAX_WAIT);
  links.forEach((l) => {
    if (l.sheet) return finishOne();
    l.addEventListener('load', () => finishOne(), { once: true });
    l.addEventListener(
      'error',
      () => {
        // 外部 CDN（字体/组件库）失败不阻塞；同源关键样式失败才进入错误态
        if (isSameOrigin(l.href)) finishOne(true);
        else finishOne();
      },
      { once: true }
    );
  });
}

// 脚本资源：head 内全部外链 <script src>（含 Clarity 等异步脚本），每个脚本完成一个分片
function trackScripts() {
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  if (!scripts.length) return complete('scripts');
  const unit = WEIGHTS.scripts / scripts.length;
  let remaining = scripts.length;
  let settled = false;
  const finishOne = () => {
    if (settled) return;
    remaining -= 1;
    addProgress(unit);
    if (remaining <= 0) settled = true;
  };
  // 已有资源时间条目（含失败请求）或已执行完毕视为完成
  const alreadyDone = (s) => {
    try {
      if (performance.getEntriesByName(s.src).length) return true;
    } catch {
      /* ignore */
    }
    return s.readyState === 'complete' || s.readyState === 'loaded';
  };
  scriptsTimer = setTimeout(() => {
    if (settled) return;
    addProgress(remaining * unit);
    settled = true;
  }, SCRIPTS_MAX_WAIT);
  scripts.forEach((s) => {
    if (alreadyDone(s)) return finishOne();
    s.addEventListener('load', finishOne, { once: true });
    s.addEventListener('error', finishOne, { once: true });
  });
}

// 图片资源：页面上非懒加载的 <img>，每个图片完成一个分片（懒加载图不阻塞 load，不计入）
function trackImages() {
  const imgs = Array.from(document.querySelectorAll('img:not([loading="lazy"])'));
  if (!imgs.length) return complete('images');
  const unit = WEIGHTS.images / imgs.length;
  let remaining = imgs.length;
  let settled = false;
  const finishOne = () => {
    if (settled) return;
    remaining -= 1;
    addProgress(unit);
    if (remaining <= 0) settled = true;
  };
  imagesTimer = setTimeout(() => {
    if (settled) return;
    addProgress(remaining * unit);
    settled = true;
  }, IMAGES_MAX_WAIT);
  imgs.forEach((img) => {
    if (img.complete) return finishOne();
    img.addEventListener('load', finishOne, { once: true });
    img.addEventListener('error', finishOne, { once: true });
  });
}

// 网络状态：断网时直接进入错误态
function trackNetwork() {
  if (typeof navigator === 'undefined' || navigator.onLine === false) {
    fail();
  } else {
    offlineHandler = () => fail();
    window.addEventListener('offline', offlineHandler, { once: true });
  }
}

// 字体就绪：Web 字体可用时累加，超时兜底
function trackFonts() {
  if (!document.fonts) return complete('fonts');
  fontTimer = setTimeout(() => complete('fonts'), FONT_MAX_WAIT);
  document.fonts.ready.then(() => {
    clearTimeout(fontTimer);
    complete('fonts');
  });
}

// 全部资源：window load 前按时间切片推进（避免最后一大段一次性跳变），load 事件补齐余量
function trackLoad() {
  if (document.readyState === 'complete') return complete('load');
  let credited = 0;
  loadSliceTimer = setInterval(() => {
    if (credited < LOAD_SLICE_TOTAL) {
      addProgress(LOAD_SLICE_STEP);
      credited += LOAD_SLICE_STEP;
    } else {
      clearInterval(loadSliceTimer);
    }
  }, LOAD_SLICE_MS);
  resourcesHandler = () => {
    clearInterval(loadSliceTimer);
    const rest = WEIGHTS.load - credited;
    if (rest > 0) addProgress(rest);
  };
  window.addEventListener('load', resourcesHandler, { once: true });
}

// ---- 路由切换顶部进度条 ----
const routeBusy = ref(false);
const routePct = ref(0);
let routeRaf = 0;
let routeHideTimer = 0;

function startRouteBar() {
  if (!booted.value) return;
  cancelAnimationFrame(routeRaf);
  clearTimeout(routeHideTimer);
  routeBusy.value = true;
  routePct.value = 8;
  (function ramp() {
    const p = routePct.value;
    // 渐进逼近 88%，之后缓慢爬升到 92%：路由 chunk 加载慢时进度条不会停滞
    routePct.value = p < 88 ? p + (88 - p) * 0.06 : Math.min(92, p + 0.1);
    if (routePct.value < 92) routeRaf = requestAnimationFrame(ramp);
  })();
}

function endRouteBar() {
  cancelAnimationFrame(routeRaf);
  routePct.value = 100;
  routeHideTimer = setTimeout(() => {
    routeBusy.value = false;
  }, 280);
}

let cleanup = () => { };

onMounted(() => {
  startAt = performance.now();
  // 应用水合完成（JS 包 + 页面模块已加载）：向静态看门狗汇报，解除其 8s 兜底
  window.__LAYO_BOOTED__?.();
  // 应用水合完成即算一个节点
  complete('hydrate');
  // 挂接各异步加载节点（逐样式表 / 逐脚本 / 逐图 / 字体 / 全部资源）
  trackDom();
  trackStyles();
  trackScripts();
  trackImages();
  trackFonts();
  trackLoad();
  trackNetwork();
  // 兜底超时：强制全部节点完成，保证遮罩必然收尾
  forceTimer = setTimeout(() => {
    nodeTotal = 100;
  }, MAX_DURATION);
  // 启动进度逼近循环
  rafId = requestAnimationFrame(tick);

  // 挂接路由生命周期：加载开始/结束驱动顶部进度条（保留可能存在的原有钩子）
  const prevBefore = router.onBeforeRouteChange;
  router.onBeforeRouteChange = async (href) => {
    startRouteBar();
    return prevBefore ? await prevBefore(href) : undefined;
  };
  const prevAfter = router.onAfterRouteChange;
  router.onAfterRouteChange = async (href) => {
    endRouteBar();
    if (prevAfter) await prevAfter(href);
  };

  cleanup = () => {
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(routeRaf);
    clearTimeout(forceTimer);
    clearTimeout(fontTimer);
    clearTimeout(stylesTimer);
    clearTimeout(scriptsTimer);
    clearTimeout(imagesTimer);
    clearInterval(loadSliceTimer);
    clearTimeout(routeHideTimer);
    if (domOnReady) document.removeEventListener('readystatechange', domOnReady);
    if (resourcesHandler) window.removeEventListener('load', resourcesHandler);
    if (offlineHandler) window.removeEventListener('offline', offlineHandler);
    router.onBeforeRouteChange = prevBefore ?? undefined;
    router.onAfterRouteChange = prevAfter ?? undefined;
  };
});

onBeforeUnmount(cleanup);
</script>

<template>
  <!-- 路由异步加载顶部细进度条（首次加载由下方全屏遮罩接管） -->
  <div v-show="routeBusy" class="route-progress" aria-hidden="true">
    <div class="route-progress__bar" :style="{ width: routePct + '%' }" />
  </div>

  <!-- 首次加载全屏遮罩：关键样式内联，CSS 未加载时也能遮挡首屏 -->
  <Transition name="loader-fade">
    <div v-if="visible" class="page-loader"
      style="position: fixed; inset: 0; z-index: 9999990; background: var(--vp-c-bg, #f7f9fc)" role="status"
      aria-live="polite" aria-label="页面加载中">
      <!-- 加载失败：错误提示 + 刷新重试 -->
      <template v-if="failed">
        <div class="page-loader__fail">
          <p class="page-loader__fail-title">加载失败</p>
          <p class="page-loader__fail-hint">网络或资源异常，请检查连接后重试</p>
          <button type="button" class="page-loader__retry" @click="retry">刷新重试</button>
        </div>
      </template>
      <template v-else>
        <!-- 大百分比（0.1% 精度） -->
        <span class="page-loader__pct">{{ progress >= 100 ? '100' : progress.toFixed(1) }}%</span>
        <!-- 横跨屏幕的加载进度条（抬离底边） -->
        <div class="page-loader__track" aria-hidden="true">
          <div class="page-loader__bar" :style="{ width: progress + '%' }" />
        </div>
      </template>
    </div>
  </Transition>
</template>
