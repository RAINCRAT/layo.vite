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
  pages: new Set(['AGENTS.md', 'readme.md']),
  // 工单文件存放在 assets/tickets/，其页面属于内部工单数据，不进入 sitemap / llms，也不注入 canonical / OG / JSON-LD
  dirs: ['assets/tickets/'],
  // 文件名（basename）含 example 的页面，任意层级；不匹配目录（目录条目转为 xxx/index.md，basename 为 index.md）
  patterns: [/(^|\/)[^/]*example[^/]*\.md$/],
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
  const { siteUrl, siteName, siteDescription, siteLang, alternateNames, author } = seo;
  const { relativePath, title, description, frontmatter, lastUpdated, isNotFound } = pageData;
  if (isNotFound || isPageExcluded(relativePath)) return [];

  const url = resolvePageUrl(siteUrl, base, relativePath, cleanUrls);
  const desc = description || siteDescription;
  const isRootHome = relativePath === 'index.md';
  const isIndexPage = isRootHome || /\/index\.md$/.test(relativePath);
  // home 布局页 pageData.title 为空，回退为站点名
  const pageTitle = (isRootHome && !title) ? siteName : title;
  const ogTitle = pageTitle.includes(siteName) ? pageTitle : `${pageTitle} | ${siteName}`;

  const tags = [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:title', content: ogTitle }],
    ['meta', { property: 'og:description', content: desc }],
    ['meta', { property: 'og:type', content: isIndexPage ? 'website' : 'article' }],
    ['meta', { name: 'twitter:title', content: ogTitle }],
    ['meta', { name: 'twitter:description', content: desc }],
  ];

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
    }
    : isIndexPage
      ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: ogTitle,
        description: desc,
        url,
        inLanguage: siteLang,
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
    const fm = file.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    // 兼容单行 title 与 YAML 块标量（| / |- / |+）多行标题；块标量内部换行归为空格
    const m =
      fm.match(/^title:\s*["']?([^"'\n]+?)["']?\s*$/m) ??
      fm.match(/^title:\s*\|[-+]?\s*\n((?:[ \t]+.*\n?)+)/m);
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
  const { siteUrl, siteName, siteDescription } = seo;
  if (!siteUrl) {
    console.warn('[seo] 未配置 VITE_SITE_URL，跳过 robots.txt / llms.txt 生成');
    return;
  }
  const { outDir, srcDir, pages, site, cleanUrls } = siteConfig;

  const robots = ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n');
  await writeFile(join(outDir, 'robots.txt'), robots, 'utf-8');

  const blocks = [`# ${siteName}`, '', `> ${siteDescription}`, '', '## 站点页面', ''];
  for (const page of pages) {
    if (page === '404.md' || isPageExcluded(page)) continue;
    const url = resolvePageUrl(siteUrl, site.base, page, cleanUrls);
    const title =
      (await readPageTitle(srcDir, page)) ??
      (page.replace(/\.md$/, '') === 'index' ? siteName : readableTitle(page));
    blocks.push(`- [${title}](${url})`);
  }
  await writeFile(join(outDir, 'llms.txt'), blocks.join('\n'), 'utf-8');
}
