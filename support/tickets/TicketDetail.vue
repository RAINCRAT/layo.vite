<script setup>
import { ref, provide } from 'vue';
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
  ElInput,
  ElMessage,
} from 'element-plus';

// 供 el-timeline 等组件在 SSR 渲染与水合时使用稳定的 id 计数器
provide(ID_INJECTION_KEY, { prefix: 1024, current: 0 });
provide(ZINDEX_INJECTION_KEY, { current: 0 });

// 演示数据：后续可替换为真实工单 API 返回
const ticket = {
  id: 'TK-20260811-007',
  title: '首页 Hero 在移动端溢出',
  status: '处理中',
  priority: '高',
  reporter: '沐雨',
  assignee: '白夜',
  createdAt: '2026-08-11 09:12',
  updatedAt: '2026-08-11 11:40',
  description:
    '在宽度小于 375px 的移动设备上，首页 Hero 区域的内容溢出视口，导致横向滚动。疑似 `.VPHero .name` 的 max-width 规则在窄屏下失效，需要复现并给出修复方案。',
};

const statusTag = { 待处理: 'warning', 处理中: 'primary', 已完成: 'success', 已关闭: 'info' };
const priorityTag = { 高: 'danger', 中: 'warning', 低: 'info' };

const reply = ref('');

function onReply() {
  ElMessage.info(reply.value.trim() ? '示例页：回复已提交（待接入后端）' : '请输入回复内容');
}

// function onClose() {
//   ElMessage.info('示例页：关闭工单功能待接入后端 API');
// }
</script>

<template>
  <div class="ticket-detail">
    <a href="/support/tickets/" class="ticket-detail__back">← 返回工单列表</a>

    <header class="ticket-detail__header">
      <span class="ticket-detail__id">{{ ticket.id }}</span>
      <h2 class="ticket-detail__title">{{ ticket.title }}</h2>
      <div class="ticket-detail__tags">
        <el-tag :type="statusTag[ticket.status]" size="small">{{ ticket.status }}</el-tag>
        <el-tag :type="priorityTag[ticket.priority]" size="small" effect="plain">优先级：{{ ticket.priority }}</el-tag>
      </div>
    </header>

    <el-descriptions :column="2" border class="ticket-detail__meta">
      <el-descriptions-item label="工单号">{{ ticket.id }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="statusTag[ticket.status]" size="small">{{ ticket.status }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="优先级">
        <el-tag :type="priorityTag[ticket.priority]" size="small" effect="plain">{{ ticket.priority }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="负责人">{{ ticket.assignee }}</el-descriptions-item>
      <el-descriptions-item label="提交人">{{ ticket.reporter }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ ticket.createdAt }}</el-descriptions-item>
      <el-descriptions-item label="更新时间">{{ ticket.updatedAt }}</el-descriptions-item>
    </el-descriptions>

    <section class="ticket-detail__section">
      <h3>问题描述</h3>
      <p class="ticket-detail__desc">{{ ticket.description }}</p>
    </section>

    <section class="ticket-detail__section">
      <h3>更新记录</h3>
      <el-timeline class="ticket-detail__timeline">
        <el-timeline-item timestamp="2026-08-11 11:40" placement="top" type="primary">
          白夜 更新了状态：待处理 → 处理中
        </el-timeline-item>
        <el-timeline-item timestamp="2026-08-11 10:02" placement="top">
          沐雨 补充了复现步骤截图与浏览器版本信息
        </el-timeline-item>
        <el-timeline-item timestamp="2026-08-11 09:12" placement="top" type="warning">
          沐雨 创建了工单
        </el-timeline-item>
      </el-timeline>
    </section>

    <!-- <section class="ticket-detail__section">
      <h3>回复</h3>
      <el-input v-model="reply" type="textarea" :rows="3" placeholder="输入回复内容…" />
      <div class="ticket-detail__actions">
        <el-button type="primary" @click="onReply">回复</el-button>
        <el-button @click="onClose">关闭工单</el-button>
      </div>
    </section> -->
  </div>
</template>

<style scoped>
.ticket-detail__back {
  display: inline-block;
  margin-bottom: 8px;
  color: var(--vp-c-brand-1, #409eff);
  text-decoration: none;
}
.ticket-detail__back:hover {
  text-decoration: underline;
}
.ticket-detail__header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.ticket-detail__id {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #f2f3f5);
  font-family: monospace;
  font-size: 14px;
}
.ticket-detail__title {
  margin: 0;
  font-size: 22px;
}
.ticket-detail__section {
  margin-top: 24px;
}
.ticket-detail__section h3 {
  margin-bottom: 12px;
  font-size: 16px;
}
.ticket-detail__desc {
  line-height: 1.8;
}
.ticket-detail__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>
