<script setup>
import { computed, provide, ref, onMounted, nextTick } from 'vue';
import { useData, useRoute, useRouter } from 'vitepress';
import MarkdownIt from 'markdown-it';
import { akInlinePlugin } from '../../.vitepress/theme/ak-inline.js';
import './element-plus-styles.js';
import {
  ID_INJECTION_KEY,
  ZINDEX_INJECTION_KEY,
  ElButton,
  ElTag,
  ElDescriptions,
  ElDescriptionsItem,
  ElTimeline,
  ElTimelineItem,
} from 'element-plus';

// 供 el-tooltip 等组件在 SSR 渲染与水合时使用稳定的 id / z-index 计数器
provide(ID_INJECTION_KEY, { prefix: 1024, current: 0 });
provide(ZINDEX_INJECTION_KEY, { current: 0 });

// 时间轴 text 支持行内 Markdown（**粗体**、*斜体*、`行内代码`、[[色:文字]] 强调、||文字|| 色块悬停）
// 与全站 VitePress Markdown 共用同一内容标记插件（.vitepress/theme/ak-inline.js），两端语法一致；
// 仅渲染行内语法；禁用 HTML 规则防注入（原样标签会被转义输出）
const md = new MarkdownIt({ html: false, breaks: true, linkify: false });
md.disable(['html_inline', 'html_block']);
md.use(akInlinePlugin);

function renderUpdate(text) {
  return md.renderInline(text ?? '');
}

const route = useRoute();
const router = useRouter();
const { frontmatter } = useData();

// 仅工单详情页（assets/tickets/ 下的 md 页面）显示头部信息
const isTicketPage = computed(() => route.path.startsWith('/assets/tickets/'));

const statusTag = { 待处理: 'warning', 处理中: 'primary', 已完成: 'success', 已关闭: 'info' };
const priorityTag = { 高优先级: 'danger', 中优先级: 'warning', 低优先级: 'info' };

function onBack() {
  router.go('/support/tickets/');
}

// 时间轴仅展开最近 7 条（updates 首条即最新）；超过 7 条时以内部滚动访问其余条目。
// 滚动上限按前 7 条实测高度设置（含各条目自身间距），避免固定值导致条目被半裁。
const timelineEl = ref(null);
const timelineMaxHeight = ref('');

onMounted(async () => {
  await nextTick();
  // el-timeline 是组件，ref 拿到的是组件实例；$el 才是渲染出的 ul 根元素
  const el = timelineEl.value?.$el;
  if (!el) return;
  const items = el.querySelectorAll('.el-timeline-item');
  if (items.length <= 7) return;
  let h = 0;
  for (let i = 0; i < 7; i++) h += items[i].getBoundingClientRect().height;
  // 加上 ul 自身上下 padding，保证前 7 条完整可见、第 8 条正好裁出滚动区
  const cs = getComputedStyle(el);
  h += (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  timelineMaxHeight.value = `${Math.ceil(h)}px`;
});
</script>

<template>
  <div v-if="isTicketPage" class="ticket-header">
    <el-button link class="ticket-header__back" @click="onBack">← 返回工单列表</el-button>

    <h1 class="ticket-header__title">{{ frontmatter.title }}</h1>

    <div class="ticket-header__tags">
      <el-tag :type="statusTag[frontmatter.status]" size="small">{{ frontmatter.status }}</el-tag>
      <el-tag :type="priorityTag[frontmatter.priority]" size="small" effect="plain">
        优先级：{{ frontmatter.priority }}
      </el-tag>
    </div>

    <el-descriptions :column="1" border class="ticket-header__meta">
      <el-descriptions-item label="工单号">{{ frontmatter.id }}</el-descriptions-item>
      <el-descriptions-item label="来源">{{ frontmatter.reporter }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ frontmatter.createdAt }}</el-descriptions-item>
    </el-descriptions>

    <el-timeline
      ref="timelineEl"
      v-if="frontmatter.updates?.length"
      class="ticket-header__timeline"
      :class="{ 'is-done': ['已完成', '已关闭'].includes(frontmatter.status) }"
      :style="timelineMaxHeight ? { maxHeight: timelineMaxHeight, overflowY: 'auto' } : undefined"
    >
      <el-timeline-item v-for="u in frontmatter.updates" :key="u.time" :timestamp="u.time">
        <span v-html="renderUpdate(u.text)" />
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<style scoped>
.ticket-header {
  margin-bottom: 24px;
}

.ticket-header__back {
  padding: 0;
  margin-bottom: 8px;
  font-family: var(--ak-font-sans);
  letter-spacing: 0.04em;
}

.ticket-header__title {
  margin: 8px 0 12px;
  padding-left: 14px;
  border-left: 4px solid var(--ak-primary);
  font-size: 32px;
  font-weight: 600;
  line-height: 40px;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

.ticket-header__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.ticket-header__meta {
  margin-bottom: 24px;
}

/* —— 时间轴：明日方舟风格化 ——
 * 面板：软底 + 描边 + 左侧 3px ak 蓝缘（同代码块/引用块语言）；直角方舟风 */
.ticket-header__timeline {
  position: relative;
  margin-bottom: 8px;
  padding: 16px 20px 4px;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-left: 3px solid var(--ak-primary);
  border-radius: 0;
  box-shadow: 0 2px 6px var(--vp-c-shadow);
  /* 超过 7 条时内部滚动（上限由脚本按前 7 条实测高度设置），滚动到边界不带动整页 */
  overscroll-behavior: contain;
  /* 节点/尾线基础色统一为 ak 蓝（Element Plus 通过该变量取色） */
  --el-timeline-node-color: var(--ak-primary);
}

/* 收敛 el-timeline 默认 40px 左内边距，让时间轴贴合面板左侧 */
.ticket-header__timeline.is-start {
  padding-left: 12px;
}

/* 终端式小标题（CSS 伪元素，无需改模板） */
.ticket-header__timeline::before {
  content: "// 事相碎片";
  display: block;
  margin-bottom: 14px;
  font-family: var(--ak-font-serif);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--ak-primary);
}

/* 尾线：蓝色渐隐线（元素即线，替换默认 border 为背景渐变） */
.ticket-header__timeline :deep(.el-timeline-item__tail) {
  border-left: none;
  width: 2px;
  background: linear-gradient(180deg, transparent, var(--ak-primary) 14%, var(--ak-primary) 86%, transparent);
  opacity: 0.55;
}

/* 节点：空心瞄准环 + 内点（呼应全站战术背景的瞄准环图形） */
.ticket-header__timeline :deep(.el-timeline-item__node) {
  background-color: transparent !important;
  border: 2px solid var(--ak-primary);
  border-radius: 50%;
  box-shadow: 0 0 6px var(--vp-c-shadow-brand), inset 0 0 4px var(--vp-c-shadow-brand);
  transition: box-shadow 0.2s;
}

.ticket-header__timeline :deep(.el-timeline-item__node::after) {
  content: "";
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: var(--ak-primary);
  box-shadow: 0 0 4px var(--ak-primary);
}

/* 最新一条（updates 首条即最新）：ak 黄高亮 + 呼吸脉冲（仅活跃工单） */
.ticket-header__timeline :deep(.el-timeline-item:first-child .el-timeline-item__node) {
  border-color: var(--ak-yellow);
  box-shadow: 0 0 10px var(--vp-c-shadow-warning), inset 0 0 6px var(--vp-c-shadow-warning);
}

.ticket-header__timeline :deep(.el-timeline-item:first-child .el-timeline-item__node::after) {
  background-color: var(--ak-yellow);
  box-shadow: 0 0 6px var(--ak-yellow);
  animation: ak-timeline-node-pulse 2s ease-in-out infinite alternate;
}

/* 终态工单（已完成/已关闭）：不再有进行中的活跃信号，最新一项与先前项统一为 ak 蓝、取消脉冲 */
.ticket-header__timeline.is-done :deep(.el-timeline-item:first-child .el-timeline-item__node) {
  border-color: var(--ak-primary);
  box-shadow: 0 0 6px var(--vp-c-shadow-brand), inset 0 0 4px var(--vp-c-shadow-brand);
}

.ticket-header__timeline.is-done :deep(.el-timeline-item:first-child .el-timeline-item__node::after) {
  background-color: var(--ak-primary);
  box-shadow: 0 0 4px var(--ak-primary);
  animation: none;
}

@keyframes ak-timeline-node-pulse {
  from {
    box-shadow: 0 0 2px var(--vp-c-shadow-warning);
  }

  to {
    box-shadow: 0 0 9px var(--vp-c-shadow-warning);
  }
}

/* 时间戳：置于内容左侧（wrapper 改左右两列），终端式时间码（▸ 前缀 + 加大字号） */
.ticket-header__timeline :deep(.el-timeline-item__wrapper) {
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.ticket-header__timeline :deep(.el-timeline-item__timestamp) {
  flex: 0 0 auto;
  order: -1; /* placement=bottom 时时间戳在 DOM 中位于内容之后，强制排到最左 */
  min-width: 8.4em; /* 固定列宽（13 字符等宽时间码，约 8.4em），内容列稳定对齐 */
  margin-top: 0; /* 消除 is-bottom 的时间戳下移间距 */
  font-family: var(--ak-font-pixel); /* 终端等宽字体栈（设备自带，无需网络加载，许可证无忧） */
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.ticket-header__timeline :deep(.el-timeline-item__timestamp.is-bottom::before) {
  content: "▸ ";
  color: var(--ak-primary);
  font-size: 12px;
}

.ticket-header__timeline :deep(.el-timeline-item__content) {
  flex: 1;
  min-width: 0;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

/* 行内代码（配合 Markdown 渲染的 `code`）：字号继承普通文本；实蓝描边 + 蓝底 + 加粗 + 辉光，强调清晰 */
.ticket-header__timeline :deep(.el-timeline-item__content code) {
  padding: 0.1em 0.45em;
  border: 1px solid var(--ak-primary);
  border-radius: 3px;
  font-family: var(--ak-font-mono, monospace);
  font-size: inherit;
  line-height: inherit;
  font-weight: 600;
  background-color: color-mix(in srgb, var(--ak-primary) 22%, transparent);
  color: var(--vp-c-brand-1);
  box-shadow: 0 0 4px var(--vp-c-shadow-brand);
}

/* hover：节点辉光增强 */
.ticket-header__timeline :deep(.el-timeline-item:hover .el-timeline-item__node) {
  box-shadow: 0 0 12px var(--vp-c-shadow-brand-strong), inset 0 0 6px var(--vp-c-shadow-brand);
}
</style>
