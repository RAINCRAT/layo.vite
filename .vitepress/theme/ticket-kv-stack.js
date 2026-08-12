/**
 * 工单详情页键值表（.ticket-kv）窄容器堆叠
 * ------------------------------------------------------------------
 * 键值表为两对列（字段名|值|字段名|值）四列布局，窄窗口下值列会被挤压。
 * 当容器宽度不足以并排容纳整表所需宽度时，给 <table> 加 is-kv-stacked 类，
 * 整张表由两对列改为一对列（每行「字段名|值」上下两对）——所有行统一切换，
 * 不做行级拆分（CSS 见 style.css 的 .is-tickets-page .vp-doc table.ticket-kv.is-kv-stacked）。
 * 判定带冗余提前量（网络字体异步加载后字宽变化，临界宽度下避免值列补挤换行），
 * 并在字体就绪 / 窗口尺寸变化 / 路由切换后重测。由 Layout.vue 的 useKvTableStack() 挂载。
 */

import { nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vitepress';

// 判定提前量（px）：接近临界即整体堆叠，避免字体加载后最后几个字被挤压换行
const KV_STACK_REDUNDANCY = 24;

export function useKvTableStack() {
  const route = useRoute();

  function scan() {
    const tables = document.querySelectorAll('.is-tickets-page .vp-doc table.ticket-kv');
    tables.forEach((t) => {
      // 临时按内容固有宽度（inline-table + max-content）渲染，量出两对列并排所需完整宽度；
      // 同一帧内加/移类（同步 reflow），不会触发中间态绘制
      t.classList.add('is-measuring');
      void t.offsetWidth; // 强制同步重排
      const need = t.offsetWidth;
      t.classList.remove('is-measuring');
      // 容器放得下（含冗余提前量）→ 保持两对列；否则整表堆叠为一对列
      const container = t.closest('.vp-doc');
      const avail = container ? container.clientWidth : 0;
      t.classList.toggle('is-kv-stacked', avail > 0 && avail < need + KV_STACK_REDUNDANCY);
    });
  }

  // 路由切换后页面内容异步渲染，表格可能尚未出现：短间隔重试几次
  function scanWithRetry(depth = 0) {
    scan();
    if (depth < 5 && !document.querySelector('.is-tickets-page .vp-doc table.ticket-kv')) {
      setTimeout(() => scanWithRetry(depth + 1), 100);
    }
  }

  onMounted(() => {
    scan();
    // 网络字体异步加载后字宽变化：就绪后重测一次
    document.fonts?.ready.then(scan);
    window.addEventListener('resize', scan, { passive: true });
  });
  onUnmounted(() => window.removeEventListener('resize', scan));
  // 工单详情页之间切换（同 /assets/tickets/ 前缀路由）：内容重建后按新表格重测
  watch(
    () => route.path,
    () => nextTick().then(() => scanWithRetry(0))
  );
}
