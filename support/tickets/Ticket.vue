<script setup>
import { ref, computed, provide } from 'vue';
import { useRouter } from 'vitepress';
import { data as tickets } from './tickets.data.js';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
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
const priorityTag = { 高: 'danger', 中: 'warning', 低: 'info' };

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

function onCreate() {
  ElMessage.info('示例页：新建工单功能待接入后端 API');
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
      <el-input
        v-model="keyword"
        class="ticket-demo__search"
        placeholder="搜索工单号 / 标题 / 提交人"
        clearable
      />
      <el-select v-model="statusFilter" class="ticket-demo__status" placeholder="全部状态" clearable>
        <el-option v-for="s in Object.keys(statusTag)" :key="s" :label="s" :value="s" />
      </el-select>
      <el-button class="ticket-demo__reset" @click="onReset">重置</el-button>
      <el-button type="primary" class="ticket-demo__create" @click="onCreate">新建工单</el-button>
    </div>

    <el-table :data="pagedTickets" stripe empty-text="暂无匹配的工单">
      <el-table-column prop="id" label="工单号" width="150" />
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag[row.status]" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="优先级" width="90">
        <template #default="{ row }">
          <el-tag :type="priorityTag[row.priority]" size="small" effect="plain">{{ row.priority }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reporter" label="提交人" width="90" />
      <el-table-column prop="createdAt" label="提交时间" width="150" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="onViewDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :page-size="pageSize"
      :total="filteredTickets.length"
      layout="total, prev, pager, next"
      background
      class="ticket-demo__pager"
    />
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
</style>
