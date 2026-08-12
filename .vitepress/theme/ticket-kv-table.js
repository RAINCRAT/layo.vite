/**
 * 工单详情页键值表 markdown-it 插件（列高亮开关）
 * ------------------------------------------------------------------
 * 仅作用于工单详情页（assets/tickets/ 下，env.relativePath 判定）：
 * 自动识别「字段名 | 值 | 字段名 | 值」布局的 Markdown 表格，给 <table> 追加
 * `ticket-kv` 类（CSS 开关类，样式见 style.css "组件细节"区块）：
 * 命中 → 开启字段名列标签化高亮；未命中 → 保持 VitePress 默认表格样式（开关关闭）。
 * 识别规则（保守，避免误伤普通数据表）：列数为偶数（2/4/6…），且表头行所有
 * 奇数列单元格为 ≤8 字符的短字段名。
 * 与全站 VitePress Markdown（config.js markdown.config）共用，但页面判断
 * 限定工单详情页，其余页面即使出现同构表格也不加类。
 */
export function ticketKvTablePlugin(md) {
  const defaultTableOpen = md.renderer.rules.table_open;
  md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
    if (isTicketPage(env) && isKvTable(tokens, idx)) tokens[idx].attrJoin('class', 'ticket-kv');
    return defaultTableOpen
      ? defaultTableOpen(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };
}

/** 仅工单详情页（数据源 assets/tickets/ 下的页面）启用 */
function isTicketPage(env) {
  const rel = env?.relativePath ?? '';
  return rel.startsWith('assets/tickets/');
}

/** 判断 table_open(idx) 对应的表格是否为「字段名 | 值」键值表 */
function isKvTable(tokens, tableIdx) {
  // 定位表头行第一个 tr（markdown-it 表格结构：table > thead > tr > th）
  let trIdx = -1;
  for (let i = tableIdx + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'table_close') return false;
    if (t.type === 'tr_open') { trIdx = i; break; }
  }
  if (trIdx < 0) return false;
  // 收集表头行各 th 文本
  const thTexts = [];
  for (let i = trIdx + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'tr_close') break;
    if (t.type === 'th_open') {
      const inline = tokens[i + 1];
      if (inline?.type === 'inline') thTexts.push(inline.content.trim());
    }
  }
  const cols = thTexts.length;
  if (cols < 2 || cols % 2 !== 0) return false;
  // 奇数列（索引 0、2、4…）须为短字段名（≤8 字符），否则按普通数据表处理
  for (let i = 0; i < cols; i += 2) {
    const name = thTexts[i];
    if (!name || name.length > 8) return false;
  }
  return true;
}
