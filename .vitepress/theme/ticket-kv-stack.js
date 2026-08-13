/**
 * 工单详情页键值表（.ticket-kv）与头部元信息表（el-descriptions）窄容器堆叠
 * ------------------------------------------------------------------
 * 正文键值表为两对列（字段名|值|字段名|值）四列布局，窄窗口下值列会被挤压。
 * 头部元信息表（.ticket-header__meta，column=2）同为两对列，与正文保持一致。
 * 当容器宽度不足以并排容纳整表所需宽度时：
 *   - 正文键值表加 is-kv-stacked 类，整张表由两对列改为一对列（每行「字段名|值」
 *     上下两对）——所有行统一切换，不做行级拆分；
 *   - 头部元信息表加 is-meta-stacked 类，每行 4 单元格由 grid 重排为两行两列。
 * （CSS 见 style.css 的 .is-tickets-page .vp-doc table.ticket-kv.is-kv-stacked
 *  与 .is-tickets-page .ticket-header__meta.is-meta-stacked）
 * 判定带冗余提前量（网络字体异步加载后字宽变化，临界宽度下避免值列补挤换行），
 * 并在字体就绪 / 窗口尺寸变化 / 路由切换后重测。由 Layout.vue 的 useKvTableStack() 挂载。
 */

import { nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vitepress';

// 判定提前量（px）：接近临界即整体堆叠，避免字体加载后最后几个字被挤压换行
const KV_STACK_REDUNDANCY = 24;

// 正文键值表扫描目标
const KV_TABLE_SELECTOR = '.is-tickets-page .vp-doc table.ticket-kv';
// 头部元信息表（el-descriptions）扫描目标：与正文同一套判定逻辑
const META_SELECTOR = '.is-tickets-page .ticket-header__meta';
// 任一目标存在即认为页面就绪（重试用）
const ANY_SELECTOR = `${KV_TABLE_SELECTOR}, ${META_SELECTOR}`;

export function useKvTableStack() {
  const route = useRoute();

  function scanKvTables() {
    document.querySelectorAll(KV_TABLE_SELECTOR).forEach((t) => {
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

  // 头部元信息表（el-descriptions，column=2 两对列）：同一套测量与堆叠判定
  function scanMeta() {
    document.querySelectorAll(META_SELECTOR).forEach((el) => {
      const table = el.querySelector('.el-descriptions__table');
      if (!table) return;
      el.classList.add('is-meta-measuring');
      void table.offsetWidth; // 强制同步重排（表格按内容固有宽度渲染）
      const need = table.offsetWidth;
      el.classList.remove('is-meta-measuring');
      const avail = el.clientWidth; // 根元素宽度即容器宽度
      el.classList.toggle('is-meta-stacked', avail > 0 && avail < need + KV_STACK_REDUNDANCY);
    });
  }

  function scan() {
    scanKvTables();
    scanMeta();
  }

  // 路由切换后页面内容异步渲染，表格可能尚未出现：短间隔重试几次
  function scanWithRetry(depth = 0) {
    scan();
    if (depth < 5 && !document.querySelector(ANY_SELECTOR)) {
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
