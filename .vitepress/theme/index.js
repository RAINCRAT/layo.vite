import DefaultTheme from 'vitepress/theme';
import { VPBArchives, VPBTags } from '@chunge16/vitepress-blogs-theme';
// VPBHome 使用本地副本（原版将博客大标题渲染为 h2，页面缺失 h1；副本改为 h1）
import VPBHome from './VPBHome.vue';
// 本地字体（@fontsource 按 unicode-range 分片，浏览器按需下载，替代远端 Google Fonts，
// 消除 display=swap 跳字；许可证 SIL OFL-1.1，见 docs/tpn.md）
import '@fontsource-variable/noto-sans-sc';
import '@fontsource-variable/noto-serif-sc';
import '@fontsource/rajdhani/300.css';
import '@fontsource/rajdhani/400.css';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@yunyoujun/ak-ui/style.css';
import './style.css';
import { setupCookieConsent } from './cookie-consent.js';
import Layout from './Layout.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    setupCookieConsent();
    // VPB 布局组件：供 blogs 页面（<VPBHome />、<VPBArchives />、<VPBTags />）使用
    app.component('VPBHome', VPBHome);
    app.component('VPBArchives', VPBArchives);
    app.component('VPBTags', VPBTags);
  },
  // 组合布局：博客文章/作者页插槽 + 导航栏 Cookie 按钮（见 Layout.vue）
  Layout,
};
