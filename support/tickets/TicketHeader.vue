<script setup>
import { computed, provide } from 'vue';
import { useData, useRoute, useRouter } from 'vitepress';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
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

const route = useRoute();
const router = useRouter();
const { frontmatter } = useData();

// 仅工单详情页（assets/tickets/ 下的 md 页面）显示头部信息
const isTicketPage = computed(() => route.path.startsWith('/assets/tickets/'));

const statusTag = { 待处理: 'warning', 处理中: 'primary', 已完成: 'success', 已关闭: 'info' };
const priorityTag = { 高: 'danger', 中: 'warning', 低: 'info' };

function onBack() {
  router.go('/support/tickets/');
}
</script>

<template>
  <div v-if="isTicketPage" class="ticket-header">
    <el-button link class="ticket-header__back" @click="onBack">← 返回工单列表</el-button>

    <h1 class="ticket-header__title">{{ frontmatter.title }}</h1>

    <div class="ticket-header__tags">
      <el-tag :type="statusTag[frontmatter.status]" size="small">{{ frontmatter.status }}</el-tag>
      <el-tag :type="priorityTag[frontmatter.priority]" size="small" effect="plain">
        {{ frontmatter.priority }}优先级
      </el-tag>
    </div>

    <el-descriptions :column="2" border class="ticket-header__meta">
      <el-descriptions-item label="工单号">{{ frontmatter.id }}</el-descriptions-item>
      <el-descriptions-item label="提交人">{{ frontmatter.reporter }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ frontmatter.createdAt }}</el-descriptions-item>
      <el-descriptions-item label="更新时间">{{ frontmatter.updatedAt }}</el-descriptions-item>
    </el-descriptions>

    <el-timeline v-if="frontmatter.updates?.length" class="ticket-header__timeline">
      <el-timeline-item v-for="u in frontmatter.updates" :key="u.time" :timestamp="u.time">
        {{ u.text }}
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
}
.ticket-header__title {
  margin: 8px 0 12px;
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
.ticket-header__timeline {
  margin-bottom: 8px;
}
</style>
