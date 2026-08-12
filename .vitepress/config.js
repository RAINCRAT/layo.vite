import { defineConfig, loadEnv } from 'vitepress';
import tailwindcss from '@tailwindcss/vite';
import { processData } from '@chunge16/vitepress-blogs-theme/config';
import { zhCN } from 'date-fns/locale';
import path from 'node:path';
import { ensurePostDates, firstCommitDate } from './theme/post-date.js';
import { buildPageHeadTags, buildSeoArtifacts, transformSitemapItems, isPageExcluded } from './seo.js';
import { createSeoConfig, expandNewlines } from './seo-config.js';
import { loaderHeadScript } from './theme/loader.js';

// 站点配置唯一来源：.env（VITE_SITE_* 站点基础、VITE_SEO_* SEO 独立覆盖），代码不硬编码
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

const siteUrl = (env.VITE_SITE_URL ?? '').replace(/\/+$/, '');
const siteName = env.VITE_SITE_NAME ?? '';
// 描述类变量允许换行（\n 或真实换行），统一归一为真实换行
const siteDescription = expandNewlines(env.VITE_SITE_DESCRIPTION ?? '');
const siteLang = env.VITE_SITE_LANG ?? 'zh-CN';
const themeColor = env.VITE_SITE_THEME_COLOR ?? '#0e86b8';
// 博客文章目录（相对 srcDir，单源：themeConfig.blog.postsPath 与 ensurePostDates 共用）
const blogPostsPath = 'blogs/posts';

// 构建启动时自动补写文章 frontmatter date（缺失时按 git 首次提交时间，见 theme/post-date.js），
// 须在 VPB 内容加载器读取文件之前执行，列表/文章页日期才能正确
ensurePostDates(process.cwd(), blogPostsPath);

// SEO 配置独立于 seo-config.js：默认沿用上面的站点基础配置，可被 VITE_SEO_* 覆盖
const seo = createSeoConfig({ siteUrl, siteName, siteDescription, siteLang }, env);

export default defineConfig({
  base: "/",
  title: siteName,
  // 页面 <title> 模板：内容页统一为「页面标题 | 标题后缀」（后缀来自 .env 的 VITE_SEO_TITLE_SUFFIX）；
  // 首页（index.md）frontmatter 置 titleTemplate: false 保持纯站名，避免出现「站名 | 站名」
  titleTemplate: `:title | ${seo.titleSuffix}`,
  description: siteDescription,
  lang: siteLang,
  cleanUrls: true,
  head: [
    // 全站静态 SEO meta（值统一取自 seo-config.js）
    ['meta', { name: 'robots', content: seo.robotsContent }],
    ['meta', { name: 'author', content: seo.author }],
    ['meta', { name: 'msvalidate.01', content: '7B9A933C4A86E3C340BDB8B569FD3975' }],
    ['meta', { name: 'baidu-site-verification', content: 'codeva-6hHqKmy9Ib' }],
    ['meta', { property: 'og:site_name', content: seo.siteName }],
    ['meta', { property: 'og:locale', content: seo.ogLocale }],
    ['meta', { name: 'twitter:card', content: seo.twitterCard }],
    ['meta', { name: 'theme-color', content: themeColor }],
    [
      'script',
      {},
      // Clarity 同意默认值：未表态前一律拒绝（consentv2 队列在加载器之前生效）
      `window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};window.clarity('consentv2',{ad_Storage:'denied',analytics_Storage:'denied'});`
    ],
    [
      'script',
      {},
      // RAINCRAT 雨绘巷
      // `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "xw4lptvvar");`

      // LAYOSERVE 泠域存储：仅在非 localhost/127.0.0.1 时注入加载器，
      // 本地开发/预览完全不加载 Clarity，避免测试数据污染统计；cookies 同意逻辑不受影响。
      `if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') { (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "xw58fwyen0"); }`
    ],
    [
      'script',
      {},
      // 首屏加载遮罩独立内联脚本（进度/加载日志/失败态），随 HTML 同步解析执行，
      // 不依赖主 JS 与主题 CSS；替代原 8s 静态看门狗（详见 theme/loader.js）
      loaderHeadScript
    ]
  ],

  // 构建时自动生成 sitemap.xml（VitePress 2.0 内置）
  ...(siteUrl
    ? {
      sitemap: {
        hostname: `${siteUrl}/`,
        transformItems: transformSitemapItems,
      },
    }
    : {}),

  // 首屏性能：VitePress 会把全部 CSS 合并进唯一全局 style.css（数百 KB），并以
  // render-blocking 的 `<link rel="preload stylesheet" as="style">` 注入 head——
  // 浏览器在 CSS 下载完成前阻塞一切绘制，head 内联加载遮罩（loader.js，关键样式内联）
  // 也显示不出来，造成"白屏等几秒才开始走进度条"。此处把该链接改为非阻塞预取：
  // preload 尽早并行下载 CSS，首帧立即绘制遮罩/进度条，CSS 就绪后经 onload 转 stylesheet
  // 应用（noscript 兜底）。loader.js 的 trackStyles 同步跟踪 `link[rel="preload"][as="style"]`，
  // 保证遮罩在 CSS 应用前不淡出（无 FOUC）。
  transformHtml(html) {
    return html.replace(
      /<link\b([^>]*?)\brel="preload stylesheet"([^>]*?)\/?>/g,
      (match, pre, post) =>
        `<link${pre}rel="preload"${post} onload="this.onload=null;this.rel='stylesheet'">` +
        `<noscript><link${pre}rel="stylesheet"${post}></noscript>`
    );
  },

  // 每页动态注入 canonical / OG / Twitter / JSON-LD（URL 均由 siteUrl 派生）
  transformHead(ctx) {
    const { pageData, siteData } = ctx;
    return buildPageHeadTags({
      seo,
      base: siteData.base,
      cleanUrls: siteData.cleanUrls,
      pageData,
    });
  },

  // 构建完成后自动生成 robots.txt 与 llms.txt（GEO）
  async buildEnd(siteConfig) {
    await buildSeoArtifacts(siteConfig, { seo });
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // 启用 git 时间戳：sitemap.xml 的 <lastmod> 与 JSON-LD dateModified 由此填充
    //（Bing Webmaster Guidelines 要求 sitemap 提供新鲜度信号；git 不可用时自动降级为空）
    lastUpdated: true,
    // 深色模式开关标签（覆盖默认的 "Appearance"）
    darkModeSwitchLabel: '深色模式',
    // 404 页面文案（大数字 404 下方的标题/引语/返回链接）
    notFound: {
      title: '神经连接异常：未找到目标资源',
      quote: '但如果你不改变方向，继续寻找，你可能会最终走到你想要的方向。',
      link: '/',
      linkText: '回到起点',
      linkLabel: '回到起点',
    },
    nav: [
      // {
      //   text: '博客',
      //   activeMatch: '/blogs/',
      //   items: [
      //     { text: '博客首页', link: '/blogs/' },
      //     { text: '标签', link: '/blogs/tags' },
      //     { text: '归档', link: '/blogs/archives' },
      //   ],
      // },
      {
        text: '洛羽存储',
        link: '/you+/',
      },
      {
        text: '查看工单',
        link: '/support/tickets/',
      }
    ],

    sidebar: [
      {
        // text: "示例",
        // items: [
        // { text: "Markdown 示例", link: '/markdown-examples' },
        // { text: "运行时 API 示例", link: '/api-examples' }
        // ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/RAINCRAT/layo.vite' }
    ],

    search: {
      provider: 'local',
      options: {
        // 完全屏蔽工单搜索：命中 SEO 排除规则的页面（工单详情/列表目录等）跳过站内搜索索引。
        // 其余页面保持 VitePress 默认行为（frontmatter.search === false 亦跳过）。
        _render: async (raw, env, md) => {
          if (isPageExcluded(env.relativePath ?? '')) return '';
          const html = await md.renderAsync(raw, env);
          return env.frontmatter?.search === false ? '' : html;
        },
      },
    },

    // VPB（VitePress Blog）主题配置：路径均为相对 srcDir（postsPath/authorsPath）或路由路径（path/tagsPath）
    blog: {
      title: siteName,
      description: siteDescription,
      path: '/blogs',
      postsPath: blogPostsPath,
      authorsPath: 'blogs/authors',
      tagsPath: '/blogs/tags',
      defaultAuthor: seo.author,
      categoryIcons: {
        article: 'i-[carbon--notebook]',
        tutorial: 'i-[carbon--book]',
        document: 'i-[carbon--document]',
      },
      tagIcons: {
        github: 'i-[carbon--logo-github]',
        vue: 'i-[logos--vue]',
        javascript: 'i-[logos--javascript]',
        'web development': 'i-[carbon--development]',
        html: 'i-[logos--html-5]',
        git: 'i-[logos--git-icon]',
        vite: 'i-[logos--vitejs]',
        locked: 'i-[carbon--locked]',
        react: 'i-[logos--react]',
        blog: 'i-[carbon--blog]',
        comment: 'i-[carbon--add-comment]',
      },
      dateConfig: {
        format: 'yyyy/MM/dd',
        locale: zhCN,
      },
    },
  },

  // VPB 主题基于 Tailwind CSS v4 构建，需要接入其 vite 插件并避免预构建/SSR 外部化
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@chunge16/vitepress-blogs-theme'],
    },
    ssr: {
      noExternal: ['@chunge16/vitepress-blogs-theme'],
    },
  },

  // 为 posts/authors 页面标记博客布局（文章页/作者页的插槽注入依据）
  async transformPageData(pageData, ctx) {
    // 发布日期自动派生：文章页未显式写 frontmatter date 时，取 git 首次提交时间，
    // 供 VPB「Published on」与 JSON-LD datePublished 使用（不硬编码；git 不可用时回退原样）
    const postsPath = ctx?.siteConfig?.site?.themeConfig?.blog?.postsPath ?? 'blogs/posts';
    if (!pageData.frontmatter.date && pageData.relativePath.startsWith(`${postsPath}/`)) {
      const date = firstCommitDate(ctx.siteConfig.srcDir, pageData.relativePath);
      if (date) pageData.frontmatter.date = date;
    }
    await processData(pageData, ctx);
  },
});
