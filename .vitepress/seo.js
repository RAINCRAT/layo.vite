/**
 * SEO / GEO（生成式引擎优化）工具模块
 * ------------------------------------------------------------------
 * 原则：
 * 1. 所有产物（sitemap.xml / robots.txt / llms.txt）在构建时自动生成；
 * 2. URL 唯一来源为 .env 中的 VITE_SITE_URL，代码内不硬编码任何域名；
 * 3. JSON-LD 结构化数据同时服务传统搜索引擎与 AI/生成式引擎。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * 构建时跳过 SEO 处理的页面（相对 srcDir 的路径），命中任一规则即跳过：
 * - `pages`   ：精确匹配的页面路径（Set，查找 O(1)，适合大量精确排除）
 * - `dirs`    ：目录前缀（以 `/` 结尾），整目录及其子目录全部排除
 * - `patterns`：正则匹配（适合模糊/批量规则，如 `/^private\//`）
 * 命中项不会进入 sitemap.xml / llms.txt，也不注入 canonical / OG / JSON-LD。
 */
export const SEO_EXCLUDE_PAGES = {
  pages: new Set([
    'AGENTS.md',
    'readme.md',
    // 洛羽存储占位页（you+/index.md，返回 200 但复用 404 外观）：正式内容上线前禁止索引，
    // 避免搜索引擎收录一个内容为「404」的占位页（Bing 指南反对无实质内容的空壳页）
    'you+/index.md',
  ]),
  // 工单全部页面：详情页数据源目录 assets/tickets/ 与列表页目录 support/tickets/ 整目录排除，
  // 不进入 sitemap.xml / llms.txt，不注入 canonical / OG / JSON-LD，并在 robots.txt 生成 Disallow、页面输出 noindex
  dirs: ['assets/tickets/', 'support/tickets/'],
  // 不再使用 example 通配正则：它会误伤首页 hero 链接的 markdown-examples.md / api-examples.md
  //（合法内容页，须可索引）；模板文件 assets/tickets/example.md 已由上方 dirs 规则整目录覆盖。
  patterns: [],
};

/** 判断某个页面相对路径是否命中排除规则 */
export function isPageExcluded(relativePath) {
  const { pages, dirs, patterns } = SEO_EXCLUDE_PAGES;
  return pages.has(relativePath)
    || dirs.some((dir) => relativePath.startsWith(dir))
    || patterns.some((re) => re.test(relativePath));
}

/* ---------- 工具 ---------- */

/** JSON-LD 注入 <script> 前转义，防止标题等含 "</script>" 破坏页面 */
function safeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function normalizeBase(base) {
  const b = String(base || '/').replace(/^\/+|\/+$/g, '');
  return b ? `/${b}` : '/';
}

/**
 * 由页面相对路径计算最终可访问 URL（单一派生入口）。
 * 兼容 cleanUrls（无 .html 后缀）与 index 目录（docs/index.md -> /docs/）。
 */
export function resolvePageUrl(siteUrl, base, relativePath, cleanUrls) {
  let path = relativePath.replace(/\.md$/, '');
  path = path === 'index' ? '' : path;
  if (path.endsWith('/index')) path = `${path.slice(0, -6)}/`; // 目录页保留尾斜杠
  if (!path.startsWith('/')) path = `/${path}`;
  if (path !== '/' && !path.endsWith('/') && !cleanUrls) path += '.html';
  const basePath = normalizeBase(base);
  const full = basePath === '/' ? path : `${basePath.replace(/\/$/, '')}${path}`;
  return siteUrl ? `${siteUrl.replace(/\/+$/, '')}${full}` : full;
}

/* ---------- 页面动态 head（transformHead 使用） ---------- */

/**
 * 为每个页面生成 canonical / Open Graph / Twitter / JSON-LD 条目。
 * 返回 VitePress HeadConfig[]（属性值由 VitePress 自动转义）。
 */
export function buildPageHeadTags({ seo, base, cleanUrls, pageData }) {
  const { siteUrl, siteName, siteDescription, siteLang, alternateNames, author, titleSuffix } = seo;
  const { relativePath, title, description, frontmatter, lastUpdated, isNotFound } = pageData;
  if (isNotFound || isPageExcluded(relativePath)) {
    // 排除页：不注入 canonical / OG / JSON-LD，并显式禁止机器人索引与跟踪
    return [['meta', { name: 'robots', content: 'noindex, nofollow' }]];
  }

  const url = resolvePageUrl(siteUrl, base, relativePath, cleanUrls);
  const desc = description || siteDescription;
  const isRootHome = relativePath === 'index.md';
  const isIndexPage = isRootHome || /\/index\.md$/.test(relativePath);
  // home 布局页 pageData.title 为空，回退为站点名
  const pageTitle = (isRootHome && !title) ? siteName : title;
  // og:title 后缀独立于 SEO 站名（VITE_SEO_TITLE_SUFFIX，默认回退站名），与 <title> 模板保持一致
  const ogTitle = pageTitle.includes(siteName) ? pageTitle : `${pageTitle} | ${titleSuffix}`;

  const tags = [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:title', content: ogTitle }],
    ['meta', { property: 'og:description', content: desc }],
    ['meta', { property: 'og:type', content: isIndexPage ? 'website' : 'article' }],
    ['meta', { name: 'twitter:title', content: ogTitle }],
    ['meta', { name: 'twitter:description', content: desc }],
  ];

  // 来源标注：全站统一出处（Organization / WebSite），由 seo 变量派生，代码不硬编码。
  // 保证所有页面类型（WebSite / CollectionPage / Article）的 JSON-LD 都向搜索引擎标明来源为站点本身。
  const sourceUrl = siteUrl ? `${siteUrl.replace(/\/+$/, '')}/` : undefined;
  const source = { '@type': 'Organization', name: siteName, ...(sourceUrl ? { url: sourceUrl } : {}) };
  const website = { '@type': 'WebSite', name: siteName, ...(sourceUrl ? { url: sourceUrl } : {}) };

  // 结构化数据：根首页 WebSite，目录页 CollectionPage，内容页 Article
  const ld = isRootHome
    ? {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      alternateName: alternateNames,
      url: `${siteUrl.replace(/\/+$/, '')}/`,
      inLanguage: siteLang,
      description: siteDescription,
      publisher: source,
    }
    : isIndexPage
      ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: ogTitle,
        description: desc,
        url,
        inLanguage: siteLang,
        isPartOf: website,
        publisher: source,
      }
      : {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: ogTitle,
        description: desc,
        url,
        inLanguage: siteLang,
        ...(frontmatter?.date ? { datePublished: new Date(frontmatter.date).toISOString() } : {}),
        ...(lastUpdated ? { dateModified: new Date(lastUpdated).toISOString() } : {}),
        author: { '@type': 'Organization', name: author },
        publisher: { '@type': 'Organization', name: siteName },
        sourceOrganization: source,
      };
  tags.push(['script', { type: 'application/ld+json' }, safeJsonLd(ld)]);

  return tags;
}

/* ---------- 构建产物（buildEnd 使用） ---------- */

/** 将 sitemap item.url 还原为相对页面路径，用于命中排除规则 */
function sitemapUrlToRelativePath(url) {
  const clean = String(url).replace(/^\//, '');
  if (clean === '' || clean === '/') return 'index.md';
  if (clean.endsWith('/')) return `${clean}index.md`;
  return `${clean}.md`;
}

/**
 * 供 VitePress `sitemap.transformItems` 使用：
 * 过滤 SEO 排除页，并补充优先级 / 更新频率。
 */
export function transformSitemapItems(items) {
  return items
    .filter((item) => !isPageExcluded(sitemapUrlToRelativePath(item.url)))
    .map((item) => {
      const isRoot = item.url === '' || item.url === '/' || item.url === 'index.html';
      const isDir = item.url.endsWith('/') || item.url.endsWith('/index.html');
      return {
        ...item,
        priority: isRoot ? 1 : isDir ? 0.8 : 0.6,
        changefreq: isRoot ? 'daily' : isDir ? 'weekly' : 'monthly',
      };
    });
}

/** 读取 md 文件 frontmatter 中的 title，失败返回 null */
async function readPageTitle(srcDir, page) {
  try {
    const file = await readFile(join(srcDir, page), 'utf-8');
    // 统一行尾为 LF（兼容 CRLF 文件），避免正则对 \r 的处理差异
    const fm = (file.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '').replace(/\r\n/g, '\n');
    // 优先匹配 YAML 块标量（| / > 及其 - / + 变体）多行标题；
    // 再匹配单行 title，首字符排除块标量指示符（| / >），防止 `title: |-` 被当成单行标题
    const m =
      fm.match(/^title:\s*(?:[|>][-+]?)\s*\n((?:[ \t]+.*\n?)+)/m) ??
      fm.match(/^title:\s*["']?([^>|"'\n][^"'\n]*?)["']?\s*$/m);
    return m?.[1]?.replace(/\s*\n\s*/g, ' ').trim() ?? null;
  } catch {
    return null;
  }
}

function readableTitle(page) {
  return (
    page.replace(/\.md$/, '').replace(/(^|\/)index$/, '').split('/').pop() ||
    page.replace(/\.md$/, '')
  );
}

/**
 * 构建完成后自动写入 robots.txt 与 llms.txt（GEO：面向 LLM/AI 搜索引擎）。
 * 未配置 VITE_SITE_URL 时跳过，避免生成失效的绝对地址。
 */
export async function buildSeoArtifacts(siteConfig, { seo }) {
  const { siteUrl, siteName, siteDescription, indexNowKey } = seo;
  if (!siteUrl) {
    console.warn('[seo] 未配置 VITE_SITE_URL，跳过 robots.txt / llms.txt 生成');
    return;
  }
  const { outDir, srcDir, pages, site, cleanUrls } = siteConfig;

  // robots.txt：工单等排除目录整目录禁止抓取（路径前缀匹配）
  const robotsLines = ['User-agent: *', 'Allow: /'];
  for (const dir of SEO_EXCLUDE_PAGES.dirs) {
    robotsLines.push(`Disallow: /${dir.replace(/^\/+|\/+$/g, '')}/`);
  }
  robotsLines.push('', `Sitemap: ${siteUrl}/sitemap.xml`, '');
  const robots = robotsLines.join('\n');
  await writeFile(join(outDir, 'robots.txt'), robots, 'utf-8');

  const blocks = [`# ${siteName}`, '', `> ${siteDescription}`, '', '## 站点页面', ''];
  const urlList = [];
  for (const page of pages) {
    if (page === '404.md' || isPageExcluded(page)) continue;
    const url = resolvePageUrl(siteUrl, site.base, page, cleanUrls);
    urlList.push(url);
    const title =
      (await readPageTitle(srcDir, page)) ??
      (page.replace(/\.md$/, '') === 'index' ? siteName : readableTitle(page));
    blocks.push(`- [${title}](${url})`);
  }
  await writeFile(join(outDir, 'llms.txt'), blocks.join('\n'), 'utf-8');

  // IndexNow：生成 {key}.txt 密钥文件到站点根，并把全站 URL 推送给搜索引擎（Bing/搜狗等）。
  // 密钥来自 .env 的 VITE_INDEXNOW_KEY（与域名绑定，更换域名需重新生成），未配置则跳过。
  if (indexNowKey) {
    const keyFile = `${indexNowKey}.txt`;
    await writeFile(join(outDir, keyFile), indexNowKey, 'utf-8');
    const host = new URL(siteUrl).host;
    try {
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host,
          key: indexNowKey,
          keyLocation: `${siteUrl}/${keyFile}`,
          urlList,
        }),
      });
      console.log(`[seo] IndexNow 已提交 ${urlList.length} 个 URL（HTTP ${res.status}）`);
    } catch (err) {
      console.warn(`[seo] IndexNow 推送失败：${err.message}`);
    }
  }
}
