# AGENTS.md

面向 AI 代理的项目工作约定。修改本项目前请先阅读本文。

## 项目概览

- 技术栈：VitePress 2.0（alpha）+ Vue 3，纯静态文档/博客站点。
- 内容：`index.md`（首页）+ `blogs/`（博客站）+ `docs/`（文档页）。
- UI：VitePress 默认主题（`DefaultTheme`）+ `@yunyoujun/ak-ui`（明日方舟风格 UI 组件库）+ `@chunge16/vitepress-blogs-theme`（VPB 博客主题，提供 `<VPBHome />`、`<VPBArchives />`、`<VPBTags />` 组件与文章/作者页插槽）。
- 语言：站内内容与交流统一使用中文（zh-CN）。

## 常用命令

| 命令              | 用途                            |
| ----------------- | ------------------------------- |
| `npm run dev`     | 启动开发服务器（默认端口 5173） |
| `npm run build`   | 构建到 `.vitepress/dist`        |
| `npm run preview` | 预览构建产物                    |

## 项目结构

```
.vitepress/
  config.js        # 站点配置（唯一生效的配置入口）
  seo.js           # SEO/GEO 工具模块：URL 派生、页面 head 注入、robots/llms 生成
  seo-config.js    # SEO 独立配置：所有 SEO 变量集中于此，默认沿用 config.js 的值
  theme/
    index.js       # 主题入口（唯一生效的入口，extends DefaultTheme，注册 VPB 组件，enhanceApp 初始化 Cookie 同意）
    Layout.vue     # 组合布局：博客文章/作者页插槽（VPB）+ 导航栏 Cookie 按钮（nav-bar-content-after）+ 全站回到顶部（layout-bottom）+ 工单页 is-tickets-page 标记（加宽内容区）
    style.css      # 全局样式与 ak-ui 组件替换（保留双份规则）
    cookie-consent.js # 第三方 Cookie 同意管理器（vanilla-cookieconsent）+ Clarity 同意同步
    CookieConsentButton.vue # 导航栏右上角手动弹出 Cookie 偏好设置的按钮（Layout.vue 的 nav-bar-content-after 插槽引入）
    BackToTop.vue  # 全站右下角回到顶部按钮（VPBackToTop 类，基础样式见 style.css）
index.md           # 首页（hero + features）
blogs/             # 博客站：index.md（VPBHome 文章列表）+ posts/（文章）+ authors/（作者）+ archives.md（VPBArchives）+ tags.md（VPBTags）
docs/              # 文档页
support/tickets/   # 工单追踪（列表页：index.md + Ticket.vue + tickets.data.js 遍历加载器；详情页头部：TicketHeader.vue，均基于 Element Plus 构建）
assets/tickets/    # 工单数据源：每个工单一个 .md（frontmatter 含 id/title/status/priority/reporter/createdAt，正文即工单详情页）
.env               # 站点配置唯一来源：VITE_SITE_*（站点基础）+ VITE_SEO_*（SEO 独立覆盖）
package.json
```

## 关键约定（务必遵守）

1. **主题入口只允许 `theme/index.js`**。不要新增 `index.ts`：Vite 按 `.js` → `.ts` 顺序解析，`.ts` 会被 `.js` 遮蔽而永远不生效。
2. **配置入口只允许 `config.js`**。不要新增 `config.mts`，同样会被遮蔽。
3. **ak-ui 样式"保留双份"规则**：当需要用 ak-ui 类名替换原有样式名时，复制一份 `ak-*` 规则改名为目标名（如 `.ak-button` → `.button`），**不要直接修改原 `.ak-*` 规则**，保证两套类名同时可用。所有替换集中在 `theme/style.css` 的"ak-ui 组件替换"区块。
4. **覆盖 VitePress 内置 scoped 样式必须加 `!important`**（如 `.VPButton`、`.VPFeature`、`.VPHero .name`）。
5. **不要修改 `node_modules`**。对 ak-ui 的定制一律通过 `style.css` 覆盖实现（CI 重装依赖后 node_modules 会还原）。
6. 首页 Hero 标题宽度覆盖位于 `style.css` 中 `.VPHero .name` 的 `max-width` 规则。
7. 提交信息遵循 Conventional Commits（见 `.trae/rules/git-commit-message.md`）：`<type>(<scope>): <subject>`，type 小写英文、subject 中文，一次提交一个核心改动。
8. 构建产物与缓存已被 `.gitignore` 忽略，不要提交。忽略范围覆盖多目录构建场景：根目录（`.vitepress/dist`、`.vitepress/cache`、`.vitepress/.temp`）与子目录（`./blogs/.vitepress/`、`./docs/.vitepress/` 的 `dist`/`cache`）。
9. 网络资源（如 ak-ui CDN CSS、Google 字体 Noto Sans/Serif SC）通过 `config.js` 的 `head` 配置注入。
10. 每次完成任务后检查是否需要更新 `AGENTS.md`。
11. **全站主题变量映射集中在 `style.css` 顶部**：`--ak-*` 调色板/字体变量 → `--vp-c-*`（明/暗双主题）、`--vp-button-*`、`--vp-home-hero-*`、`--vp-custom-block-*`。新增全站风格化时优先改变量映射，避免硬编码颜色；文档风格化（导航/侧边栏/代码块/表格/引用/滚动条）位于 style.css 的"组件细节"区块；明日方舟强化装饰（卡片斜切角/角标、背景扫描线与六边形徽标、导航警示条纹、按钮光带动效）集中在 style.css 末尾的"明日方舟风格化增强"区块，新增强化逻辑追加到该区块；导航栏 40px 方形图标按钮（Cookie 偏好/社交链接）统一描边样式的"导航图标按钮规范"区块，新增同类按钮把类名加入其公共选择器即可继承。
12. **SEO/GEO 无硬链接**：站点与 SEO 变量全部来自 `.env`——`VITE_SITE_*`（URL/站名/描述/语言/主题色）在 `config.js` 读取，`VITE_SEO_*`（SEO 站名/描述/备选名/作者/OG/Twitter/robots）在 `seo-config.js` 读取，未设置时回退到站点基础变量或代码默认值，代码内不硬编码域名与站名；描述类变量允许换行（双引号 + `\n`，或双引号内真实换行），代码侧统一经 `expandNewlines` 归为真实换行；`sitemap.xml`、`robots.txt`、`llms.txt` 由 VitePress 内置 `sitemap` 配置与 `config.js` 的 `buildEnd` 钩子在构建时自动生成，页面级 canonical/OG/JSON-LD 由 `transformHead` 钩子注入（实现集中在 `.vitepress/seo.js`）。新增 SEO 逻辑一律在 `seo.js` 中实现，不要在页面里写死绝对地址。需要跳过 SEO 的页面在 `seo.js` 的 `SEO_EXCLUDE_PAGES` 中配置：`pages`（精确页）、`dirs`（目录前缀，整目录排除）、`patterns`（正则）。
13. **VPB 博客主题约定**：博客配置集中在 `config.js` 的 `themeConfig.blog`——`postsPath`/`authorsPath` 为相对 srcDir 的路径（如 `blogs/posts`），`path`/`tagsPath` 为路由路径（如 `/blogs`）；`transformPageData` 必须调用 `processData` 为文章/作者页打标；`vite` 需接 `@tailwindcss/vite` 插件，并对 `@chunge16/vitepress-blogs-theme` 配置 `optimizeDeps.exclude` 与 `ssr.noExternal`。`<VPBHome />`、`<VPBArchives />`、`<VPBTags />` 在 `theme/index.js` 的 `enhanceApp` 注册，博客插槽由 `theme/Layout.vue` 组合。VPB 自带 Tailwind preflight、品牌色、背景与字体，且其样式表加载顺序靠后——覆盖 vpb 样式必须在 `style.css` 中用 `!important` 或 `html` 前缀提高特异性：`--vpb-*` 变量映射集中在 `style.css` 顶部（带 `!important`），body 网格背景与标题字体覆盖集中在 "html body" 及其后 VPB 统一区块。新增博客文章放 `blogs/posts/`，作者页放 `blogs/authors/`。
14. **Element Plus 仅限工单系统且局部引入**：工单相关页面放 `support/tickets/`（列表 `Ticket.vue`、详情页头部 `TicketHeader.vue`）。Element Plus 只在这些组件内按需 import 组件并引入 CSS（`.el-*` 类名命名空间隔离，不影响现有 VitePress/ak-ui 样式；深色模式自动跟随 VitePress 的 `html.dark`）。必须在组件 setup 内 `provide(ID_INJECTION_KEY, { prefix, current })` 与 `provide(ZINDEX_INJECTION_KEY, { current })` 以消除 SSR 水合警告。工单详情页头部（返回按钮/标题/标签/元信息/时间线）由 `theme/Layout.vue` 的 `doc-before` 插槽注入 `TicketHeader.vue`（仅 `/assets/tickets/` 路由渲染），时间线数据来自工单 md 的 frontmatter `updates`。**不要**在 `theme/index.js` 全局注册 Element Plus，避免全站包体与样式污染。
