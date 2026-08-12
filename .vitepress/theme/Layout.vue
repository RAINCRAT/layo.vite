<script setup>
import { computed, defineAsyncComponent } from 'vue';
import { useData, useRoute } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import {
  VPBLayoutAuthorAsideBottom,
  VPBLayoutAuthorTop,
  VPBLayoutPostAsideBottom,
  VPBLayoutPostAsideTop,
  VPBLayoutPostBottom,
  VPBLayoutPostTop,
} from '@chunge16/vitepress-blogs-theme';
import CookieConsentButton from './CookieConsentButton.vue';
import BackToTop from './BackToTop.vue';
import LoadingOverlay from './LoadingOverlay.vue';
import { useKvTableStack } from './ticket-kv-stack.js';

const { Layout } = DefaultTheme;
const { frontmatter, page } = useData();
const route = useRoute();
// 工单相关页面（/support/ 与 /assets/tickets/ 路由前缀）加 is-tickets-page 类，供 style.css 加宽内容区
const isTicketsPage = computed(() => route.path.startsWith('/support/') || route.path.startsWith('/assets/tickets/'));
// 404 占位页（/you+/ 路由，返回 200 但复用 404 外观）与真实 404 页共用 is-404-page 类（危险警戒主题）
const is404StylePage = computed(() => page.isNotFound || route.path.startsWith('/you+/'));
// 工单详情页头部：路由级按需加载。v-if 守卫保证非工单页不挂载组件，
// 从而完整 Element Plus（JS/CSS）拆分为独立 chunk，仅工单详情页访问时加载，不再进主 bundle
const isTicketsDetail = computed(() => route.path.startsWith('/assets/tickets/'));
const TicketHeader = defineAsyncComponent(() => import('../../support/tickets/TicketHeader.vue'));
// 工单详情页键值表窄容器堆叠（两对列 → 一对列，整表统一切换），内部自管理挂载/监听
useKvTableStack();
</script>

<template>
  <!-- 404 / 404 占位页根元素加 is-404-page 标识；工单页面加 is-tickets-page 标识，供 style.css 限定 -->
  <Layout :class="{ 'is-404-page': is404StylePage, 'is-tickets-page': isTicketsPage }">
    <!-- 博客文章/作者页插槽（原 VPBTheme 的 VPBLayout 逻辑） -->
    <template #doc-before>
      <!-- 工单详情页头部（返回/标题/标签/元信息/时间线）：仅工单详情页挂载（路由守卫 + 按需加载），非工单页不渲染 -->
      <TicketHeader v-if="isTicketsDetail" />
      <VPBLayoutPostTop v-if="frontmatter.blog === 'post'" />
      <VPBLayoutAuthorTop v-if="frontmatter.blog === 'author'" />
    </template>
    <template #doc-footer-before>
      <VPBLayoutPostBottom v-if="frontmatter.blog === 'post'" />
    </template>
    <template #aside-top>
      <VPBLayoutPostAsideTop v-if="frontmatter.blog === 'post'" />
    </template>
    <template #aside-bottom>
      <VPBLayoutPostAsideBottom v-if="frontmatter.blog === 'post'" />
      <VPBLayoutAuthorAsideBottom v-if="frontmatter.blog === 'author'" />
    </template>
    <!-- 现有导航栏 Cookie 偏好设置按钮 -->
    <template #nav-bar-content-after>
      <CookieConsentButton />
    </template>
    <!-- 全站右下角回到顶部按钮 -->
    <template #layout-bottom>
      <BackToTop />
    </template>
  </Layout>
  <!-- 全站加载遮罩 + 路由顶部进度条（首次连接全屏，路由切换细进度条） -->
  <LoadingOverlay />
</template>
