<script setup>
/**
 * 路由切换顶部进度条 + 首屏加载水合汇报。
 * 首次加载的全屏遮罩（进度/加载日志/失败态/收尾）已由 config.js head 注入的
 * 独立内联脚本（theme/loader.js）在 HTML 解析阶段接管——不依赖主 JS bundle 与主题 CSS；
 * 本组件仅负责：应用水合后向加载器汇报（__LAYO_BOOTED__），以及路由异步 chunk
 * 加载期间显示顶部细进度条（VitePress 页面组件按路由分 chunk）。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vitepress';

const router = useRouter();

const routeBusy = ref(false);
const routePct = ref(0);
let routeRaf = 0;
let routeHideTimer = 0;

function startRouteBar() {
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
  // 应用水合完成：向 head 内联加载器汇报，标记 hydrate 节点（解除其失败兜底）
  window.__LAYO_BOOTED__?.();

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
    cancelAnimationFrame(routeRaf);
    clearTimeout(routeHideTimer);
    router.onBeforeRouteChange = prevBefore ?? undefined;
    router.onAfterRouteChange = prevAfter ?? undefined;
  };
});

onBeforeUnmount(cleanup);
</script>

<template>
  <!-- 路由异步加载顶部细进度条（首次加载由 head 内联加载器脚本的全屏遮罩接管） -->
  <div v-show="routeBusy" class="route-progress" aria-hidden="true">
    <div class="route-progress__bar" :style="{ width: routePct + '%' }" />
  </div>
</template>
