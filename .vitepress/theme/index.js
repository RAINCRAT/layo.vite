import DefaultTheme from 'vitepress/theme';
import { VPBArchives, VPBTags } from '@chunge16/vitepress-blogs-theme';
// VPBHome 使用本地副本（原版将博客大标题渲染为 h2，页面缺失 h1；副本改为 h1）
import VPBHome from './VPBHome.vue';
import '@yunyoujun/ak-ui/dist/ak-ui.css';
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
