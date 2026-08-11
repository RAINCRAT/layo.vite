import { defineConfig, loadEnv } from 'vitepress';
import tailwindcss from '@tailwindcss/vite';
import { processData } from '@chunge16/vitepress-blogs-theme/config';
import { zhCN } from 'date-fns/locale';
import { buildPageHeadTags, buildSeoArtifacts, transformSitemapItems, isPageExcluded } from './seo.js';
import { createSeoConfig, expandNewlines } from './seo-config.js';

// 站点配置唯一来源：.env（VITE_SITE_* 站点基础、VITE_SEO_* SEO 独立覆盖），代码不硬编码
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

const siteUrl = (env.VITE_SITE_URL ?? '').replace(/\/+$/, '');
const siteName = env.VITE_SITE_NAME ?? '';
// 描述类变量允许换行（\n 或真实换行），统一归一为真实换行
const siteDescription = expandNewlines(env.VITE_SITE_DESCRIPTION ?? '');
const siteLang = env.VITE_SITE_LANG ?? 'zh-CN';
const themeColor = env.VITE_SITE_THEME_COLOR ?? '#0e86b8';

// SEO 配置独立于 seo-config.js：默认沿用上面的站点基础配置，可被 VITE_SEO_* 覆盖
const seo = createSeoConfig({ siteUrl, siteName, siteDescription, siteLang }, env);

export default defineConfig({
  base: "/",
  title: siteName,
  description: siteDescription,
  lang: siteLang,
  cleanUrls: true,
  head: [
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://cdn.jsdelivr.net/gh/YunYouJun/ak-ui@gh-pages/css/ak-ui.min.css'
      }
    ],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@100..900&family=Noto+Serif+SC:wght@100..900&display=swap'
      }
    ],
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

      // LAYOSERVE 泠域存储
      `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "xw58fwyen0");`
    ],
    [
      'script',
      {},
      // 加载看门狗兜底：若主 JS 包加载失败/水合未发生（遮罩会永远卡住），8s 后注入"刷新重试"入口。
      // 应用水合完成后由 LoadingOverlay 调用 __LAYO_BOOTED__() 解除。
      `(function(){var armed=true;window.__LAYO_BOOTED__=function(){armed=false;};setTimeout(function(){if(!armed)return;var d=document.createElement('div');d.id='loader-watchdog';d.setAttribute('style','position:fixed;inset:0;z-index:9999999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:var(--vp-c-bg,#f7f9fc);color:var(--vp-c-text-1,#1e2430);font-family:var(--ak-font-sans,sans-serif);text-align:center');d.innerHTML='<p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.18em;color:#f6540e">加载失败</p><p style="margin:0;font-size:13px;letter-spacing:0.12em;color:#8b94a6">资源加载超时或无响应，请检查网络后重试</p><button id="loader-watchdog-btn" style="margin-top:6px;padding:8px 28px;border:1px solid #f6540e;color:#f6540e;background:transparent;cursor:pointer;font-family:inherit;font-size:14px;letter-spacing:0.18em">刷新重试</button>';document.body.appendChild(d);document.getElementById('loader-watchdog-btn').addEventListener('click',function(){window.location.reload();});},8000);})();`
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
      postsPath: 'blogs/posts',
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
    await processData(pageData, ctx);
  },
});
