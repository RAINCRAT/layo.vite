---
title: 开放源代码许可
# description: 
---

# 开放源代码许可

## [VitePress](https://vitepress.dev)

- 许可证：MIT License
- 用途：本站基于 VitePress 构建。

## [Vue](https://vuejs.org)

- 许可证：MIT License
- 用途：VitePress 的底层运行时框架。

## [ak-ui](https://github.com/YunYouJun/ak-ui)

- 许可证：MIT License
- 用途：明日方舟风格 UI 组件库，经 npm 包 `@yunyoujun/ak-ui` 由主题入口（`theme/index.js`）打包引入（原 jsDelivr CDN 链接已失效 404，已移除）。

## [Element Plus](https://element-plus.org)

- 许可证：MIT License
- 用途：工单追踪系统（列表页/详情页头部）的 UI 组件库，按需引入组件与 `theme-chalk` 组件样式（见 `support/tickets/element-plus-styles.js`），仅存在于工单页面。

## [Noto Sans SC / Noto Serif SC / Rajdhani 字体](https://fonts.google.com/)

- 许可证：SIL Open Font License 1.1
- 用途：全站字体。字体本体为 Google 开源字体（Noto 家族 / Rajdhani），经 npm 包分发**本地托管**（替代原 Google Fonts 远端加载，消除 `display=swap` 跳字），由主题入口（`theme/index.js`）打包引入：
  - `@fontsource-variable/noto-sans-sc`（无衬线，可变字重 100–900）
  - `@fontsource-variable/noto-serif-sc`（衬线，可变字重 100–900）
  - `@fontsource/rajdhani`（拉丁品牌字面，300–700）
- 注：字体栈中的 Noto Sans / Noto Serif / Roboto / 系统中文字体为本地回退，不随站点分发。
