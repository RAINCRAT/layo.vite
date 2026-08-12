/**
 * 全站内容标记插件（markdown-it inline）
 * ------------------------------------------------------------------
 * 注册后同时生效于两端，保持语法一致：
 * 1. VitePress 全站 Markdown（config.js 的 markdown.config 钩子，博客文章/docs/工单正文）
 * 2. 工单时间线 text（TicketHeader.vue 的独立 MarkdownIt 实例）
 *
 * 语法：
 * - [[色:文字]]  彩色强调，色名须完全遵循 ak-ui 官方调色板（--ak-color-*，0.2.1 共 14 色）：
 *   white/black/low/basic/primary/secondary/advanced/accent/blue/yellow/dark-blue/light-blue/gray/dark
 *   → <span class="ak-hl ak-hl-<色名>">，行内代码同款强调块（等宽字 + 1px 描边 + 淡色底 + 辉光），
 *   描边/底色/文字均随色变；内容按行内 Markdown 再解析：可内嵌 **加粗**、*斜体*（各按默认色）、
 *   `代码`（随强调色），也可再嵌 [[色:文字]] 嵌套强调（平衡扫描配对；嵌套强调去除块外观、
 *   仅文字随色变，见 style.css 的 .ak-hl .ak-hl）
 * - || 文字 || 色块悬停显示（默认纯色块遮字，鼠标悬停显示文字）→ <span class="ak-spoiler">，与行内代码同款外观
  */
// 色名 = ak-ui 官方调色板（--ak-color-*）的 14 色，逐一对应；样式 .ak-hl-<色名> 直接消费同名
// --ak-color-<色名>（style.css），故类名与语法色名完全一致，无需映射。
// 注意：dark-blue/light-blue 需排在 dark/blue 之前，避免正则短路匹配到前缀色名。
const AK_HL_COLORS = [
  'white', 'black', 'low', 'basic', 'primary', 'secondary', 'advanced', 'accent',
  'dark-blue', 'light-blue', 'blue', 'yellow', 'gray', 'dark',
];

// `|`（0x7C）不是 markdown-it 默认的 text 终结字符：若不加入，`a||x||b` 中 text 规则
// 会把整段当作普通文本一次性吞掉，spoiler 规则在文本中间永远没有机会执行。
// 因此替换默认 text 规则（逻辑与 markdown-it 一致），把 `|` 加入终结字符集。
const TEXT_TERMINATORS = new Set([
  0x0a, 0x21, 0x23, 0x24, 0x25, 0x26, 0x2a, 0x2b, 0x2d, 0x3a,
  0x3c, 0x3d, 0x3e, 0x40, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f, 0x60,
  0x7b, 0x7c, 0x7d, 0x7e,
]);

// 平衡扫描：从 pos 起寻找与起始 '[[色:' 配对的 ']]' 位置；内容内允许嵌套 [[色:...]]（depth 计数），
// 找不到配对返回 -1。单 '[' / ']'（如链接 [text](url) 的括号）不参与配对。
function findClosingBrackets(src, pos) {
  let depth = 0;
  for (let i = pos; i < src.length; i++) {
    const c = src.charCodeAt(i);
    if (c === 0x5b && src.charCodeAt(i + 1) === 0x5b) { depth++; i++; continue; }
    if (c === 0x5d && src.charCodeAt(i + 1) === 0x5d) {
      if (depth === 0) return i;
      depth--; i++;
    }
  }
  return -1;
}

export function akInlinePlugin(md) {
  md.inline.ruler.at('text', (state, silent) => {
    const src = state.src;
    let pos = state.pos;
    while (pos < state.posMax && !TEXT_TERMINATORS.has(src.charCodeAt(pos))) pos++;
    if (pos === state.pos) return false;
    if (!silent) state.pending += src.slice(state.pos, pos);
    state.pos = pos;
    return true;
  });

  // 两个标记规则注册在 text 规则之前：`[`/`|` 已是终结字符，text 会在标记起始处停下。
  // 不同颜色强调：[[色:文字]]（色名取 ak-ui 官方调色板 14 色）
  md.inline.ruler.before('text', 'ak_hl', (state, silent) => {
    const src = state.src;
    const start = state.pos;
    if (src[start] !== '[' || src[start + 1] !== '[') return false;
    const colorRe = AK_HL_COLORS.join('|');
    const m = src.slice(start).match(new RegExp(`^\\[\\[(${colorRe}):`));
    if (!m) return false;
    // 内容允许嵌套 [[色:文字]]（如 [[primary:**粗体** 与 [[accent:强调]] 混排]]），
    // 用平衡扫描找配对的 ]]——不可用 [^\]]+ 正则，遇内层 ]] 会提前截断
    const contentStart = start + m[0].length;
    const closePos = findClosingBrackets(src, contentStart);
    if (closePos === -1 || closePos === contentStart) return false;
    const content = src.slice(contentStart, closePos);
    if (!silent) {
      const open = state.push('span_open', 'span', 1);
      open.attrs = [['class', `ak-hl ak-hl-${m[1]}`]];
      // 内容按行内 Markdown 再解析：内部 **粗体**/`代码` 等语法可正常渲染且保持各自默认颜色。
      // 必须解析到独立子 token 数组再并入——若直接传 state.tokens，postProcess 的强调配对会
      // 跨父 token 数组边界匹配而崩溃（TypeError: Cannot set properties of undefined）。
      const childTokens = [];
      state.md.inline.parse(content, state.md, state.env, childTokens);
      state.tokens.push(...childTokens);
      state.push('span_close', 'span', -1);
    }
    state.pos = closePos + 2;
    return true;
  });

  // 色块悬停显示（spoiler）：||文字||
  md.inline.ruler.before('text', 'ak_spoiler', (state, silent) => {
    const src = state.src;
    const start = state.pos;
    if (src[start] !== '|' || src[start + 1] !== '|') return false;
    const m = src.slice(start).match(/^\|\|([\s\S]+?)\|\|/);
    if (!m) return false;
    if (!silent) {
      const open = state.push('span_open', 'span', 1);
      open.attrs = [['class', 'ak-spoiler']];
      const text = state.push('text', '', 0);
      text.content = m[1];
      state.push('span_close', 'span', -1);
    }
    state.pos += m[0].length;
    return true;
  });
}
