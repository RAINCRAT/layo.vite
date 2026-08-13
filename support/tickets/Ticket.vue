<script setup>
import { ref, computed, reactive, provide, watch, onMounted } from 'vue';
import { useRouter } from 'vitepress';
import { data as tickets } from './tickets.data.js';
import './element-plus-styles.js';
import {
  ID_INJECTION_KEY,
  ZINDEX_INJECTION_KEY,
  ElButton,
  ElInput,
  ElSelect,
  ElOption,
  ElTable,
  ElTableColumn,
  ElTag,
  ElPagination,
  ElMessage,
} from 'element-plus';

// 供 el-select / el-tooltip 等组件在 SSR 渲染与水合时使用稳定的 id / z-index 计数器
provide(ID_INJECTION_KEY, { prefix: 1024, current: 0 });
provide(ZINDEX_INJECTION_KEY, { current: 0 });

const statusTag = { 待处理: 'warning', 处理中: 'primary', 已完成: 'success', 已关闭: 'info' };
const priorityTag = { 高优先级: 'danger', 中优先级: 'warning', 低优先级: 'info' };
// 渠道为自定义字段：为常见值提供配色，未匹配的自定义值回退为默认标签
const channelTag = { 直营: 'danger', 经销商: 'warning', 电商: 'primary', 官网: 'primary', 电话: 'warning', 邮件: 'success', 微信: 'info', 其他: 'info' };
function channelType(ch) {
  return channelTag[ch] || 'info';
}

const keyword = ref('');
const statusFilter = ref('');
const page = ref(1);
const pageSize = 10;

const filteredTickets = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return tickets.filter((t) => {
    const matchStatus = !statusFilter.value || t.status === statusFilter.value;
    const matchKw =
      !kw ||
      t.id.toLowerCase().includes(kw) ||
      t.title.toLowerCase().includes(kw) ||
      t.reporter.includes(kw);
    return matchStatus && matchKw;
  });
});

const pagedTickets = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredTickets.value.slice(start, start + pageSize);
});

// —— 列宽自适应：水合后按单元格内容实测各列宽度，标题为唯一弹性列 ——
// 原理：el-table-column 的 width/minWidth 为响应式 prop（内部 watch 后自动重新布局）。
// 测量时让 .cell 以内容固有宽度（width:max-content）渲染，再读 offsetWidth 得到真实内容宽，
// 避免 scrollWidth 在内容未溢出时返回当前列宽导致高估。
const tableRef = ref(null);
// 标题列最大宽度（窄屏不足时封顶，避免横向滚动距离过长）；宽屏时标题吸收全部剩余宽度
const TITLE_MAX_WIDTH = 320;
// 列宽后尾留白：网络字体异步加载完成后字宽会变化，仅靠实测宽 + 2px 会在字体就绪后
// 重新触发省略号；增加固定安全余量，保证字体加载前后各列都不被省略（标题列同样经此余量）
const MEASURE_PAD = 12;
// 依次对应表头列：id/title/status/priority/channel/reporter/assignee/createdAt/action
const MEASURE_KEYS = ['id', 'title', 'status', 'priority', 'channel', 'reporter', 'assignee', 'createdAt', 'action'];
const colWidth = reactive({ id: undefined, status: undefined, priority: undefined, channel: undefined, reporter: undefined, assignee: undefined, createdAt: undefined, action: undefined });
const titleMinWidth = ref(160);

function measureColumns() {
  const el = tableRef.value?.$el;
  if (!el) return;
  const headerThs = el.querySelectorAll('.el-table__header th');
  if (!headerThs.length) return;
  // 测量类挂在本组件根元素（.ticket-demo）上：根元素必带本组件 scoped 标识，保证选择器命中
  const root = el.closest('.ticket-demo') || el;
  // 让 .cell 按内容固有宽度渲染，从而量出真实内容宽（不受当前列宽影响）
  root.classList.add('is-measuring');
  void el.offsetWidth; // 强制同步重排，使 max-content 生效
  const widths = Array.from(headerThs).map((th, i) => {
    let max = th.querySelector('.cell')?.offsetWidth || 0;
    el.querySelectorAll(`.el-table__body td:nth-child(${i + 1}) .cell`).forEach((cell) => {
      max = Math.max(max, cell.offsetWidth);
    });
    return max + MEASURE_PAD; // 后尾留白：字体加载后字宽变化的安全余量，防止字体就绪后列宽不足又被省略
  });
  root.classList.remove('is-measuring');
  widths.forEach((w, i) => {
    const key = MEASURE_KEYS[i];
    if (!key || w <= 2) return;
    if (key === 'title') titleMinWidth.value = Math.min(w, TITLE_MAX_WIDTH);
    else colWidth[key] = w;
  });
}

// 表头渲染就绪后再测量（首帧可能未就绪，重试几次）
function scheduleMeasure(tryCount = 0) {
  const el = tableRef.value?.$el;
  if (!el || !el.querySelector('.el-table__header th')) {
    if (tryCount < 30) setTimeout(() => scheduleMeasure(tryCount + 1), 60);
    return;
  }
  measureColumns();
}

onMounted(() => {
  scheduleMeasure(0);
  // 网络字体（Google Fonts）异步加载：首次测量可能基于回退字体偏窄，
  // 字体就绪后再测一次，避免各列宽不足出现省略号
  // （必须放在 onMounted 内：setup 顶层执行会在 SSR 时因 document 未定义而抛错）
  document.fonts?.ready.then(() => scheduleMeasure(0));
});
// 翻页 / 筛选变化后，按新一页内容重新测量
watch(pagedTickets, () => scheduleMeasure(0));

function onCreate() {
  ElMessage.info('本页面仅供查看部分直营工单，自营及新建工单请联系客服');
}

function onReset() {
  keyword.value = '';
  statusFilter.value = '';
  page.value = 1;
}

// SPA 跳转到对应工单的 md 页面（VitePress 2.x 路由仅有 go，无 push）
const router = useRouter();
function onViewDetail(row) {
  router.go(row.url);
}
</script>

<template>
  <div class="ticket-demo">
    <div class="ticket-demo__toolbar">
      <el-input v-model="keyword" class="ticket-demo__search" placeholder="搜索工单号 / 标题 / 来源" clearable />
      <el-select v-model="statusFilter" class="ticket-demo__status" placeholder="全部状态" clearable>
        <el-option v-for="s in Object.keys(statusTag)" :key="s" :label="s" :value="s" />
      </el-select>
      <el-button class="ticket-demo__reset" @click="onReset">重置</el-button>
      <!-- <el-button type="primary" class="ticket-demo__create" @click="onCreate">新建工单</el-button> -->
    </div>

    <el-table ref="tableRef" :data="pagedTickets" stripe empty-text="暂无匹配的工单">
      <el-table-column prop="id" label="工单号" :width="colWidth.id" show-overflow-tooltip />
      <!-- 标题为唯一弹性列（仅 min-width）：窄屏时贴合内容宽并封顶，宽屏时吸收全部剩余宽度 -->
      <el-table-column prop="title" label="标题" :min-width="titleMinWidth" show-overflow-tooltip />
      <el-table-column label="状态" :width="colWidth.status">
        <template #default="{ row }">
          <el-tag :type="statusTag[row.status]" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="优先级" :width="colWidth.priority">
        <template #default="{ row }">
          <el-tag :type="priorityTag[row.priority]" size="small" effect="plain">{{ row.priority }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="渠道" :width="colWidth.channel">
        <template #default="{ row }">
          <el-tag :type="channelType(row.channel)" size="small" effect="plain">{{ row.channel || '—' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reporter" label="来源" :width="colWidth.reporter" show-overflow-tooltip />
      <el-table-column prop="assignee" label="负责人" :width="colWidth.assignee" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="提交时间" :width="colWidth.createdAt" show-overflow-tooltip />
      <el-table-column label="操作" :width="colWidth.action">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="onViewDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="filteredTickets.length"
      layout="total, prev, pager, next" background class="ticket-demo__pager" />
  </div>
</template>

<style scoped>
.ticket-demo__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.ticket-demo__search {
  width: 260px;
}

.ticket-demo__status {
  width: 140px;
}

.ticket-demo__create {
  margin-left: auto;
}

.ticket-demo__pager {
  margin-top: 12px;
  justify-content: flex-end;
}

/* 清除 VitePress .vp-doc table（margin: 20px 0）误加到 Element Plus 表格内部 table 的上下间距，
 * 消除表头与内容行之间的多余空隙 */
.ticket-demo :deep(.el-table__header),
.ticket-demo :deep(.el-table__body) {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

/* 测量态：.cell 按内容固有宽度(max-content)渲染，配合 JS 量出真实列宽。
 * 类挂在组件根 .ticket-demo 上（scoped 选择器编译为 .ticket-demo.is-measuring[data-v] .cell） */
.ticket-demo.is-measuring :deep(.cell) {
  width: max-content !important;
  min-width: max-content !important;
  max-width: none !important;
  white-space: nowrap !important;
  overflow: visible !important;
}
</style>
