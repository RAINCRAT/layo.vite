# AGENTS.md

面向 AI 代理的项目工作约定。修改本项目前请先阅读本文。

## 项目概览

- 技术栈：VitePress 2.0（alpha）+ Vue 3，纯静态文档/博客站点。
- 内容：`index.md`（首页）+ `blogs/`（博客站）+ `docs/`（文档页）+ `support/tickets/`（工单追踪）。
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
layo.vite/                       # 仓库根（git 追踪文件全集，构建产物/缓存除外）
├── .env                         # 站点配置唯一来源：VITE_SITE_*（站点基础）+ VITE_SEO_*（SEO 独立覆盖）
├── .gitignore
├── package.json                 # 依赖与脚本
├── package-lock.json
├── readme.md
├── AGENTS.md                    # 本文件（项目工作约定）
├── index.md                     # 首页（hero + features）
├── api-examples.md              # VitePress 默认示例页
├── markdown-examples.md         # VitePress 默认示例页
├── .trae/rules/
│   └── git-commit-message.md    # 提交信息规范（Conventional Commits，见约定 7）
├── .vitepress/                  # 站点配置与主题（唯一生效入口）
│   ├── config.js                # 站点配置（唯一生效的配置入口；head 注入：加载遮罩内联脚本、字体、Clarity、SEO meta；transformHtml：全局 CSS 改非阻塞预取，见约定 11）
│   ├── seo.js                   # SEO/GEO 工具模块：URL 派生、页面 head 注入、robots/llms 生成
│   ├── seo-config.js            # SEO 独立配置：所有 SEO 变量集中于此，默认沿用 config.js 的值
│   └── theme/
│       ├── index.js             # 主题入口（唯一生效入口，extends DefaultTheme，注册 VPB 组件，引入 ak-ui npm 包样式 + 本地覆盖，enhanceApp 初始化 Cookie 同意）
│       ├── Layout.vue           # 组合布局：博客文章/作者页插槽（VPB）+ Cookie 按钮插槽（nav-bar-content-after）+ 回到顶部（layout-bottom）+ 工单页 is-tickets-page 标记（加宽内容区）+ 404 页 is-404-page 标记 + 全站加载遮罩（LoadingOverlay）
│       ├── VPBHome.vue          # VPBHome 本地副本（原版把博客大标题渲染为 h2 致页面缺 h1；副本改 h1，其余与原版一致，见约定 15）
│       ├── style.css            # 全局样式 + ak-ui 品牌化覆盖（对齐 npm 包 0.2.1，各区块见约定 11）
│       ├── cookie-consent.js    # 第三方 Cookie 同意管理器（vanilla-cookieconsent）+ Clarity 同意同步
│       ├── CookieConsentButton.vue # 导航栏右上角手动弹出 Cookie 偏好设置按钮（nav-bar-content-after 插槽引入）
│       ├── BackToTop.vue        # 全站右下角回到顶部按钮（VPBackToTop 类，基础样式见 style.css）
│       ├── loader.js            # 首屏加载遮罩独立内联脚本生成器（config.js head 注入，随 HTML 解析执行，不依赖主 JS 与主题 CSS）
│       ├── post-date.js         # 文章发布日期自动派生工具：firstCommitDate（git 首次提交时间）+ ensurePostDates（构建启动时自动补写缺失的 frontmatter date，见约定 15）
│       └── LoadingOverlay.vue   # 路由切换顶部细进度条 + 水合汇报（__LAYO_BOOTED__）
├── blogs/                       # 博客站
│   ├── index.md                 # VPBHome 文章列表
│   ├── archives.md              # VPBArchives 归档
│   ├── tags.md                  # VPBTags 标签
│   ├── authors/                 # 作者页
│   │   └── aibeto.md
│   └── posts/                   # 文章
│       ├── site_anno.md
│       └── 2026_Changsha_VOCALOIDCHINA_only_join.md
├── docs/                        # 文档页
│   ├── index.md
│   └── tpn.md                   # 开放源代码许可唯一登记处（首页 feature 链接，见约定 18）
├── support/tickets/             # 工单追踪（基于 Element Plus 构建，见约定 16）
│   ├── index.md                 # 工单列表页
│   ├── Ticket.vue               # 工单列表项组件
│   ├── TicketHeader.vue         # 工单详情页头部组件（Layout.vue 按路由异步加载）
│   ├── element-plus-styles.js   # Element Plus 按需样式入口（theme-chalk 组件 CSS 清单，见约定 16）
│   └── tickets.data.js          # 工单数据遍历加载器
└── assets/tickets/              # 工单数据源：每个工单一个 .md（frontmatter 含 id/title/status/priority/reporter/channel/createdAt + updates 更新记录，正文即工单详情页；状态进展以 updates 时间线展示，不手填 updatedAt）
    ├── example.md               # 参数注释模板，加载器已排除，不计入工单列表
    └── AD-260805-01.md          # 工单数据示例
└── you+/                        # 洛羽存储占位页（导航「洛羽存储」目标，返回 200 但复用 404 外观；见约定 14）
    └── index.md                 # 复用 VitePress 内置 NotFound 组件（import 内部路径），SEO 排除（noindex）
```

## 关键约定（务必遵守）

1. **主题入口只允许 `theme/index.js`**。不要新增 `index.ts`：Vite 按 `.js` → `.ts` 顺序解析，`.ts` 会被 `.js` 遮蔽而永远不生效。
2. **配置入口只允许 `config.js`**。不要新增 `config.mts`，同样会被遮蔽。
3. **ak-ui 集成方式：npm 包 + 品牌化覆盖，不再"保留双份"镜像**：组件基础样式由 `@yunyoujun/ak-ui`（当前 0.2.1，与 GitHub master 同步）在 `theme/index.js` 以 `import '@yunyoujun/ak-ui/style.css'` 引入（**不要**回退到旧版 `dist/ak-ui.css` 子路径或 CDN，也不要改用 `tokens.css` 单独引入）。站内自有的标记直接使用真实 `.ak-*` 模块类（如 `.ak-icon`）；VitePress/VPB/Element Plus 等第三方组件无法加 `.ak-*` 类，统一在 `theme/style.css` 的"ak-ui 组件品牌化覆盖"区块（A 区块，见约定 11）按官方模块规范覆盖其样式。严禁再复制 `.ak-*` 规则改名别名（旧"保留双份"镜像区块已删除）。
4. **覆盖 VitePress 内置 scoped 样式必须加 `!important`**（如 `.VPButton`、`.VPFeature`、`.VPHero .name`）。
5. **不要修改 `node_modules`**。对 ak-ui 的定制一律通过 `style.css` 覆盖实现（CI 重装依赖后 node_modules 会还原）。
6. 首页 Hero 标题宽度覆盖位于 `style.css` 中 `.VPHero .name` 的 `max-width` 规则。
7. 提交信息遵循 Conventional Commits（见 `.trae/rules/git-commit-message.md`）：`<type>(<scope>): <subject>`，type 小写英文、subject 中文，一次提交一个核心改动。
8. 构建产物与缓存已被 `.gitignore` 忽略，不要提交。忽略范围覆盖多目录构建场景：根目录（`.vitepress/dist`、`.vitepress/cache`、`.vitepress/.temp`）与子目录（`./blogs/.vitepress/`、`./docs/.vitepress/` 的 `dist`/`cache`）。
9. **字体与外部资源**：字体已**本地化**——Noto Sans/Serif SC（可变 100–900）与 Rajdhani（300–700）经 `@fontsource-variable/*`、`@fontsource/rajdhani` 由 `theme/index.js` 打包引入（woff2 分片按 unicode-range 按需下载，替代原 config.js head 注入的 Google Fonts，消除 `display=swap` 跳字；许可证 SIL OFL-1.1 登记于 `docs/tpn.md`，新增字体包时同步登记）。其余第三方网络资源（Clarity 分析等）通过 `config.js` 的 `head` 配置注入；ak-ui 样式由 npm 包在 `theme/index.js` 打包引入，**不走 CDN**（旧 jsDelivr 链接已失效）。
10. 每次完成任务后检查是否需要更新 `AGENTS.md`。
11. **`theme/style.css` 区块约定**（新增样式按对应区块归类追加，不另起炉灶）：
    - 变量映射（顶部）：`--ak-*` 调色板/字体变量 → `--vp-c-*`（明/暗双主题）、`--vp-button-*`、`--vp-home-hero-*`、`--vp-custom-block-*`。新增全站风格化时优先改变量映射，避免硬编码颜色。
    - 文档风格化（导航/侧边栏/代码块/表格/引用/滚动条）："组件细节"区块；分隔线 `vp-doc hr` 对齐 `.ak-divider` 模块（两段式粗杠）；页脚 "Last updated" 显示统一隐藏（`.VPDocFooter .last-updated { display: none }`，`lastUpdated: true` 仅作 sitemap lastmod / JSON-LD dateModified 的 SEO 数据源，见约定 14）。
    - ak-ui 组件品牌化覆盖："A. 表面分层与按钮/卡片契约"区块（对齐官方 `.ak-button`/`.ak-card` 编译产物：方块几何、50px 高、hover 提亮+浮起、active 压暗遮罩；`.VPButton`/`.VPFeature`/`.vpb-card` 覆盖），其后跟随 B（背景装饰，已移除项说明）/C（交互动效）/D（焦点）/F（导航更多菜单）/E（404 红主题）/G（工单 EP 方舟化）/H（加载遮罩）等区块。真实 `.ak-*` 类的品牌字面量覆盖（如 `.ak-button--action` 官方 #2bf → 品牌主蓝）也集中在本区块。A 区块内还有"VPB 博客组件残留默认样式 ak 化"子区块：vpb 主题样式表加载顺序靠后，其默认圆角（`rounded-*` 工具类）、代码块/行内代码圆角、`:root` 的 `--vp-c-brand` 绿色系变量与 Neue Haas/Iowan 字体都会压过顶部品牌映射——用 `html` 前缀 + `!important`（及 `html:root` 变量重声明）统一拉回 ak 直角几何与品牌蓝（`.vpb-page`/`.vpb-soft-panel`/`.vpb-results-panel`/`.vpb-card--static`/`.vpb-pill`/`.vpb-chip`/头像圆角归零、元信息等宽、文章标题命令字面 900 等）。同区块还含**布局微调**约定：标题行高中文舒适区间（`.vpb-display-title`/`.vpb-page-title` 1.14、`.vp-doc h1` 1.18、`.vpb-card h2` 1.32，均覆盖 vpb 默认 0.98-1.06）；文章卡片大标题宽度放宽（`.vpb-card h2` 的 `max-width` 18ch → 28ch，vpb 默认限制太窄致中文标题频繁断行；`margin-bottom` 1rem → 1.15rem 缓解多行标题与摘录拥挤）；首页特性卡整体优化（`.VPFeature .box` padding 28px、`.VPFeature .title` 命令字面 900/行高 1.4/字距归零、`.VPFeature .details` 行高 1.7）；竖屏（`@media (max-width: 1279.98px)`）文章页作者块弱化（作者块不在 `.vp-doc` 内，位于 `.content-container`/`.VPDocAside` 下，选择器须用 `html dl.pb-10` 兜底：padding/头像/字号收窄）；卡片高光与面板阴影收敛（`--vpb-panel-shadow`/`--vpb-panel-shadow-hover` 收敛为 0 8px 24px / 0 16px 36px）；`.vpb-results-panel` 背景品牌化为 `--vpb-bg-soft`。
    - 工单系统（Element Plus）方舟化："G. 工单系统（Element Plus）方舟化"区块，以 `.is-tickets-page` 前缀限定（EP 仅存在于工单页），新增 el 组件样式追加到该区块；el-tag 几何对齐官方 `.ak-tag`（左上信号条 `::before` + 右上 45° 斜切角 `clip-path`）。
    - 加载遮罩与顶部进度条："H. 页面加载遮罩与顶部进度条"区块；其中遮罩 DOM 与进度条 track/bar 的定位/尺寸/底色/渐变关键样式由 head 内联脚本（theme/loader.js）内联，保证主题 CSS 未加载时即时可见。**全局 CSS 非阻塞加载**：VitePress 会把全部 CSS 合并进唯一全局 style.css（数百 KB），默认以 render-blocking 的 `<link rel="preload stylesheet">` 注入 head，阻塞一切首帧绘制（含遮罩），造成"白屏等几秒才开始走进度条"；`config.js` 的 `transformHtml` 钩子把该链接改为 `<link rel="preload" as="style" onload="this.rel='stylesheet'">`（`<noscript>` 兜底），首帧立即绘制遮罩，CSS 就绪后应用；`loader.js` 的 `trackStyles` 同步跟踪 `link[rel="preload"][as="style"]`（含缓存命中判定），遮罩在 CSS 应用前不淡出（无 FOUC）。
    - 层叠约定：Cookie 同意窗口（`#cc-main` 的 `--cc-z-index`）固定为 9999880，置于加载遮罩（z-index: 9999990）之下，防止首次加载时挡住遮罩内日志终端。
    - 导航栏 40px 方形图标按钮（Cookie 偏好/社交链接）统一描边："导航图标按钮规范"区块，新增同类按钮把类名加入其公共选择器即可继承。
12. **ak-color 约束：不创建 ak-ui 未定义的 `--ak-*` 颜色变量**。ak-ui 官方调色板（0.2.1 `--ak-color-*` 命名空间）仅有 white/black/low/basic/primary/secondary/advanced/accent/blue/yellow/dark-blue/light-blue/gray/dark；全站 danger/红色系统一复用既有 `--ak-accent`（#f6540e）与 `--vp-c-shadow-danger`（明暗映射）。新色一律改从上述变量派生，严禁自造；组件内字面量（如 `.ak-button--action` 编译产物 #2bf）在"ak-ui 组件品牌化覆盖"区块用覆盖规则对齐品牌，不动 npm 包源码。
13. **404 页面主题约定**：
    - 根标识：`theme/Layout.vue` 依据 `page.isNotFound` 或 `/you+/` 路由前缀（404 占位页，返回 200）给根 Layout 注入 `is-404-page` 类；所有 404 专属样式以 `.is-404-page` / `.NotFound` 为前缀限定，避免污染全站。
    - 位置：404 红色主题（内容元素 + 顶栏红 + 顶栏底部唯一主警戒线）集中在 `style.css` 末尾"404 页面危险警戒主题"区块。
    - 动态斜纹警戒线：`repeating-linear-gradient(-45deg)` 必须配 `background-size: <水平周期> 100%`（22.63px），否则背景平铺会在元素左右端产生竖向接缝；且 `background` 简写会重置 `background-size`，覆盖时必须显式重设。
14. **SEO/GEO 无硬链接**：
    - 变量来源：站点与 SEO 变量全部来自 `.env`——`VITE_SITE_*`（URL/站名/描述/语言/主题色）在 `config.js` 读取，`VITE_SEO_*`（SEO 站名/描述/备选名/作者/OG/Twitter/robots）在 `seo-config.js` 读取，未设置时回退到站点基础变量或代码默认值，代码内不硬编码域名与站名；描述类变量允许换行（双引号 + `\n`，或双引号内真实换行），代码侧统一经 `expandNewlines` 归为真实换行。
    - 页面标题：内容页 `<title>` 统一为「页面标题 | 标题后缀」——站点级 `titleTemplate: ':title | ${seo.titleSuffix}'`（后缀来自 `VITE_SEO_TITLE_SUFFIX`，未设置回退 SEO 站名）；`seo.js` 的 `og:title`/`twitter:title`/JSON-LD `headline` 与 `<title>` 使用同一 `titleSuffix`，保证一致；首页（`index.md`）frontmatter 置 `titleTemplate: false` 不追加后缀，并在 frontmatter 自定义描述性 `title`（纯站名过短会触发搜索引擎「标题太短」提示，Bing 建议 50-60 字符）。
    - 产物生成：`sitemap.xml`、`robots.txt`、`llms.txt` 由 VitePress 内置 `sitemap` 配置与 `config.js` 的 `buildEnd` 钩子在构建时自动生成；页面级 canonical/OG/JSON-LD 由 `transformHead` 钩子注入（实现集中在 `.vitepress/seo.js`）。新增 SEO 逻辑一律在 `seo.js` 中实现，不要在页面里写死绝对地址。sitemap 的 `<lastmod>` 新鲜度信号来自 `themeConfig.lastUpdated: true` 触发的 git 时间戳（git 不可用时自动降级为空，不会报错；该配置在页面底部产生的 "Last updated" 显示已由 `theme/style.css` 隐藏，仅保留 SEO 数据用途，见约定 11）。
    - IndexNow 即时收录：密钥存于 `.env` 的 `VITE_INDEXNOW_KEY`（与域名绑定，更换域名需在 IndexNow 官网重新生成），构建时 `seo.js` 的 `buildSeoArtifacts` 在站点根生成 `{key}.txt` 密钥文件，并向 `api.indexnow.org` 推送**全站全部 URL**（含 noindex 薄页/排除页——这类页面的 robots 发生变化时同样推送，促使 Bing 重抓后从索引移除）。未配置密钥则整段跳过。
    - 排除规则：`seo.js` 的 `SEO_EXCLUDE_PAGES` 支持 `pages`（精确页）、`thinPages`（薄内容聚合页，输出 `noindex, follow`）、`dirs`（目录前缀，整目录排除）、`patterns`（正则）。**工单全部页面已在 `dirs` 整目录排除**（详情页数据源 `assets/tickets/` 与列表页 `support/tickets/`）：不进入 `sitemap.xml`/`llms.txt`、不注入 canonical/OG/JSON-LD、输出 `noindex, nofollow`、自动在 `robots.txt` 生成 `Disallow` 行；**标签/归档列表页（`blogs/tags.md`、`blogs/archives.md`）已在 `thinPages` 排除**（保留 follow 允许爬虫沿链接进正文；防止此类薄页在品牌词搜索中与首页竞争，如 Bing 曾直接显示 `/blogs/tags` 而非首页）；站内搜索（`search.provider: 'local'`）通过 `_render` 钩子调用 `isPageExcluded` 共用同一套规则。新增需要禁止索引/搜索/追踪的目录（如内部数据页），加进 `dirs` 即可同时生效以上全部能力。`patterns` 勿再添加 example 通配正则（会误伤首页 hero 链接的 `markdown-examples.md`/`api-examples.md`）；`you+/index.md`（洛羽存储占位页，返回 200 但复用 404 外观）已在 `pages` 精确排除（noindex、不进 sitemap/llms.txt），正式内容上线后需移除该排除项。
15. **VPB 博客主题约定**：
    - 配置：博客配置集中在 `config.js` 的 `themeConfig.blog`——`postsPath`/`authorsPath` 为相对 srcDir 的路径（如 `blogs/posts`），`path`/`tagsPath` 为路由路径（如 `/blogs`）；`transformPageData` 必须调用 `processData` 为文章/作者页打标；`vite` 需接 `@tailwindcss/vite` 插件，并对 `@chunge16/vitepress-blogs-theme` 配置 `optimizeDeps.exclude` 与 `ssr.noExternal`。
    - 组件：`<VPBHome />`、`<VPBArchives />`、`<VPBTags />` 在 `theme/index.js` 的 `enhanceApp` 注册，博客插槽由 `theme/Layout.vue` 组合。
    - 样式覆盖：VPB 自带 Tailwind preflight、品牌色、背景与字体，且样式表加载顺序靠后——覆盖必须在 `style.css` 中用 `!important` 或 `html` 前缀提高特异性；`--vpb-*` 变量映射集中在 `style.css` 顶部（带 `!important`），body 网格背景与标题字体覆盖集中在 "html body" 及其后 VPB 统一区块。注意 vpb 的 `:root` 还会用旧名 `--vp-c-brand*`（绿色系）覆盖 tip/按钮品牌变量，需在"VPB 博客组件残留默认样式 ak 化"子区块用 `html:root` 重声明（特异性高于 `:root`）拉回。
    - 内容：新增博客文章放 `blogs/posts/`，作者页放 `blogs/authors/`。
    - 文章发布日期自动派生：**不要在 md frontmatter 手写 `date`**——`config.js` 模块加载时调用 `ensurePostDates`（`theme/post-date.js`）递归扫描 `blogs/posts/`（含子目录，文章可按分类组织子目录），为缺失 `date` 的文章按 **git 首次提交时间**（`git log --diff-filter=A`）自动写回 frontmatter（幂等，git 不可用跳过）；首次构建后文件会多出自动生成的 `date` 行，可提交固化。VPB 的 `posts.data.js`（content loader）直接读 md 原始 frontmatter、不经过 `transformPageData`，故必须构建前写入文件，列表/文章页日期才正确；`transformPageData` 里的 `firstCommitDate` 兜底仅保障 SEO（JSON-LD `datePublished`）。新增文章后勿删该自动生成的 `date` 行。
    - VPBHome 本地覆盖：`theme/VPBHome.vue`（在 `theme/index.js` 替换原包注册），原版把博客大标题渲染为 `<h2>` 致 `/blogs/` 页面缺 `<h1>`，副本改为 `<h1>`、样式类不变；升级 vpb 时注意保持该副本同步（VPBArchives/VPBTags 同有此 h2 问题，暂未覆盖）。
16. **Element Plus 仅限工单系统且按需加载**：
    - 位置：工单相关页面放 `support/tickets/`（列表 `Ticket.vue`、详情页头部 `TicketHeader.vue`、按需样式入口 `element-plus-styles.js`）。
    - 样式：**不得全量引入 `element-plus/dist/index.css`**（约 580KB，会被 VitePress 合并进唯一全局 style.css 拖慢全站首屏）；统一由 `element-plus-styles.js` 按组件引入 `theme-chalk` 的 `el-*.css`（直接引入 .css 而非 es 组件 style 的 css.mjs——后者内部的 .css 导入在 VitePress SSR 渲染阶段会因 node_modules 外部化抛 "Unknown file extension .css"）。新增 EP 组件时须同步把其 `el-*.css` 加入该文件。**注意**：VitePress 强制 `build.cssCodeSplit: false` 且构建时只引用第一个 CSS asset——全部 CSS（含动态 import 的样式）最终仍合并进唯一全局 style.css，**不要**试图用动态 import 拆走 EP 样式（无法生效且可能破坏样式引用）；EP 样式的体积影响已由"全局 CSS 非阻塞加载"（约定 11）消除 render-blocking。
    - 作用域与主题：`.el-*` 类名命名空间隔离，不影响现有 VitePress/ak-ui 样式；深色模式自动跟随 VitePress 的 `html.dark`。
    - SSR 水合：组件 setup 内 `provide(ID_INJECTION_KEY, { prefix, current })` 与 `provide(ZINDEX_INJECTION_KEY, { current })` 以消除水合警告。
    - 异步加载：`TicketHeader` 由 `theme/Layout.vue` 以 `defineAsyncComponent` 按路由异步加载（`v-if="isTicketsDetail"` 守卫仅 `/assets/tickets/` 路由挂载），完整 Element Plus JS 拆为独立 chunk、仅工单详情页访问时下载，不进主 bundle。
    - 数据：时间线数据来自工单 md 的 frontmatter `updates`（按时间倒序，详情页以时间线展示，首条即最新状态；不单独展示"更新时间"，不读 frontmatter `updatedAt`）；`channel`（渠道）为自定义字段，列表标签配色见 `Ticket.vue` 的 `channelTag`（未匹配值回退默认色）；模板文件 `assets/tickets/example.md` 由 `tickets.data.js` 排除。
    - **不要**在 `theme/index.js` 全局注册 Element Plus，避免全站包体与样式污染。
17. **验证方式：非必要不调用浏览器验证**：代码改动默认通过静态分析（`GetDiagnostics`/`Grep`）与 `npm run build` 确认；浏览器验证（`browser_use` 等）成本高，仅限确实需要确认渲染结果/视觉效果的改动（如布局、动画、样式视觉验收）且无法从代码静态判定的情况下才使用，避免每次改动都跑浏览器验证。
18. **开源许可登记**：`docs/tpn.md` 是全站开源许可证的唯一登记处（首页"开放源代码许可"feature 已链接）。每次对话结束（任务收尾）时，检查本次是否新增或改动了开源依赖/资源——包括 npm 包、CDN 样式与脚本、字体、图标库、借鉴或直接使用的开源代码片段等；如有，必须同步在 `docs/tpn.md` 登记其名称、许可证与用途，保持许可信息最新、避免遗漏。
