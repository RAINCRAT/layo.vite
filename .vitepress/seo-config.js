/**
 * SEO / GEO 配置（独立文件）
 * ------------------------------------------------------------------
 * 所有 SEO 变量集中于此，与 config.js 分离；
 * 站点基础变量（VITE_SITE_*）由 config.js 传入作为默认值（seo_siteUrl = siteUrl），
 * SEO 独立变量（VITE_SEO_*）直接读取 .env，未设置时回退到站点基础变量或代码默认值。
 */
/** 兼容 .env 中未加双引号导致 `\n` 被原样保留的情况，统一转为真实换行 */
export function expandNewlines(value) {
  return String(value).replace(/\\n/g, '\n');
}

export function createSeoConfig({ siteUrl, siteName, siteDescription, siteLang }, env = {}) {
  const {
    VITE_SEO_SITE_NAME,
    VITE_SEO_SITE_DESCRIPTION,
    VITE_SEO_ALT_NAMES,
    VITE_SEO_AUTHOR,
    VITE_SEO_OG_LOCALE,
    VITE_SEO_TWITTER_CARD,
    VITE_SEO_ROBOTS_CONTENT,
    VITE_SEO_TITLE_SUFFIX,
  } = env;

  return {
    // ---- 站点基础变量（默认沿用 config.js，即 .env 的 VITE_SITE_*）----
    siteUrl,
    // SEO 站名可独立覆盖：VITE_SEO_SITE_NAME 未设置或为空时回退到 VITE_SITE_NAME
    siteName:
      VITE_SEO_SITE_NAME !== undefined && VITE_SEO_SITE_NAME !== ''
        ? VITE_SEO_SITE_NAME
        : siteName,
    // SEO 描述可独立覆盖：VITE_SEO_SITE_DESCRIPTION 未设置或为空时回退到 VITE_SITE_DESCRIPTION
    // （回退值已在 config.js 经 expandNewlines 归一为真实换行，故此处仅对 SEO 覆盖值展开）
    siteDescription:
      VITE_SEO_SITE_DESCRIPTION !== undefined && VITE_SEO_SITE_DESCRIPTION !== ''
        ? expandNewlines(VITE_SEO_SITE_DESCRIPTION)
        : siteDescription,
    siteLang,

    // ---- SEO 独立变量（.env VITE_SEO_*，缺省回退）----
    robotsContent: VITE_SEO_ROBOTS_CONTENT || 'index, follow',
    author: VITE_SEO_AUTHOR || 'LAYOSERVE',
    alternateNames: VITE_SEO_ALT_NAMES
      ? VITE_SEO_ALT_NAMES.split(',').map((name) => name.trim())
      : [siteName],
    ogLocale: VITE_SEO_OG_LOCALE || 'zh_CN',
    twitterCard: VITE_SEO_TWITTER_CARD || 'summary',
    // 页面标题后缀（<title> / og:title 的 `| 后缀`）：与 SEO 站名独立，未设置时回退到 SEO 站名
    titleSuffix: VITE_SEO_TITLE_SUFFIX || siteName,
  };
}
