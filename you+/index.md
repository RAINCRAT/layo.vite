---
layout: page
sidebar: false
title: 洛羽存储
---
<!-- 洛羽存储占位页：返回 200、复用全站 404 外观（导航「洛羽存储」的着陆页，正式内容上线前占位）。
     复用 VitePress 内置 NotFound 组件（import 路径与默认主题内部一致），文案取自 themeConfig.notFound；
     根元素 is-404-page 类由 theme/Layout.vue 按 /you+/ 路由注入，危险警戒主题见 style.css。
     本页已在 .vitepress/seo.js 的 SEO_EXCLUDE_PAGES.pages 中排除（noindex、不进 sitemap/llms.txt），
     正式内容上线后请移除该排除项。 -->
<script setup>
import NotFound from 'vitepress/dist/client/theme-default/NotFound.vue'
</script>

<NotFound />
