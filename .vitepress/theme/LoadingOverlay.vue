<script setup>
/**
 * 页面加载遮罩 + 全站路由顶部进度条
 * - 首次连接：全屏遮罩 + 横跨屏幕的加载进度条 + 大百分比（明日方舟加载风格）。
 *   进度由真实异步加载节点驱动：文档就绪 → 应用水合 → 样式资源 → 字体就绪 → 全部资源，
 *   每完成一个节点进度累加对应权重（不会从 0 直接跳到 100），兜底超时防止卡死；
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
// 字体节点最长等待
const FONT_MAX_WAIT = 4000;
// 样式节点最长等待（个别 link 的事件可能在水合前已触发，错过监听时靠它兜底）
const STYLES_MAX_WAIT = 3000;
// 各异步加载节点权重（%）：完成一个累加一个，总和 100
const WEIGHTS = { dom: 10, hydrate: 20, styles: 25, fonts: 15, resources: 30 };

let startAt = 0;
let rafId = 0;
let forceTimer = 0;
let fontTimer = 0;
let stylesTimer = 0;
let domOnReady = null;
let resourcesHandler = null;
let offlineHandler = null;
let finished = false;
// 已完成节点累计进度（进度条向它平滑逼近，不越过）
let nodeTotal = BASE;
// 节点完成标记，防止重复累加
const completed = {};

// 节点完成：累加权重
function addNode(name) {
  if (completed[name] || finished) return;
  completed[name] = true;
  nodeTotal = Math.min(100, nodeTotal + WEIGHTS[name]);
}

// 每帧向 nodeTotal 平滑逼近（不越过）：节点完成瞬间进度自然加速，其余时间缓慢跟进
function tick() {
  if (finished) return;
  const diff = nodeTotal - progress.value;
  if (diff > 0) {
    progress.value = Math.min(nodeTotal, progress.value + diff * 0.12 + 0.05);
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
}

// 刷新重试
function retry() {
  window.location.reload();
}

// ---- 节点监听 ----
// 文档就绪（DOMContentLoaded）
function trackDom() {
  if (document.readyState !== 'loading') addNode('dom');
  else {
    domOnReady = () => {
      if (document.readyState !== 'loading') {
        document.removeEventListener('readystatechange', domOnReady);
        addNode('dom');
      }
    };
    document.addEventListener('readystatechange', domOnReady);
  }
}

// 样式资源：head 内全部 <link rel="stylesheet"> 加载完成（load/error 均算完成，失败不卡进度）
// 但本地关键样式（同源，即构建产出的主题 CSS）加载失败视为致命，进入错误态
function trackStyles() {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  if (!links.length) return addNode('styles');
  // 兜底：事件可能在水合前已触发而错过监听，超时后直接算完成
  stylesTimer = setTimeout(() => addNode('styles'), STYLES_MAX_WAIT);
  let remaining = links.length;
  const onDone = () => {
    if (--remaining === 0) addNode('styles');
  };
  const isSameOrigin = (href) => {
    try {
      return new URL(href, window.location.href).origin === window.location.origin;
    } catch {
      return false;
    }
  };
  links.forEach((l) => {
    if (l.sheet) return onDone();
    l.addEventListener('load', onDone, { once: true });
    l.addEventListener(
      'error',
      () => {
        // 外部 CDN（字体/组件库）失败不阻塞；同源关键样式失败才进入错误态
        if (isSameOrigin(l.href)) fail();
        else onDone();
      },
      { once: true }
    );
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
  if (!document.fonts) return addNode('fonts');
  fontTimer = setTimeout(() => addNode('fonts'), FONT_MAX_WAIT);
  document.fonts.ready.then(() => {
    clearTimeout(fontTimer);
    addNode('fonts');
  });
}

// 全部资源：window load（图片等其他子资源）
function trackResources() {
  if (document.readyState === 'complete') return addNode('resources');
  resourcesHandler = () => addNode('resources');
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
    // 渐进逼近 88%，等待 afterRouteChange 后冲 100
    routePct.value = p < 88 ? p + (88 - p) * 0.06 : 88;
    if (routePct.value < 88) routeRaf = requestAnimationFrame(ramp);
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
  addNode('hydrate');
  // 挂接各异步加载节点
  trackDom();
  trackStyles();
  trackFonts();
  trackResources();
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
