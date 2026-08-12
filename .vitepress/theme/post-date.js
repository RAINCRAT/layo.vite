import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * 取文件在 git 中的首次提交时间（即发布日期，ISO 字符串）：
 * `git log --diff-filter=A` 仅列出「添加该文件」的提交，取最老一条的 author 时间。
 * 供 VPB 文章列表/文章页「Published on」与 JSON-LD datePublished 使用，
 * 避免在 md frontmatter 手写 date（按提交记录自动派生）。
 * git 不可用（非仓库 / CI 浅克隆）或文件无提交记录时返回 null，调用方保持原样。
 */
export function firstCommitDate(srcDir, relativePath) {
  try {
    const output = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--format=%aI', '--', path.join(srcDir, relativePath)],
      { encoding: 'utf8' },
    ).trim().split(/\r?\n/).pop();
    return output ? new Date(output).toISOString() : null;
  } catch {
    return null;
  }
}

/**
 * 构建启动时自动写回：为 posts 目录下缺失 date 的文章，按 git 首次提交时间补写 frontmatter date。
 * VPB 的内容加载器（createContentLoader）直接读 md 原始 frontmatter，不经过 transformPageData，
 * 故须在构建前写入文件，列表/文章页的日期才会正确。幂等：已有 date 或 git 不可用时跳过。
 */
export function ensurePostDates(srcDir, postsPath) {
  const dir = path.join(srcDir, postsPath);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const file = path.join(dir, entry);
    const content = readFileSync(file, 'utf8');
    if (!content.startsWith('---')) continue;
    const fmEnd = content.indexOf('\n---', 3);
    if (fmEnd < 0) continue;
    const fm = content.slice(0, fmEnd);
    if (/^date\s*:/m.test(fm)) continue;
    const date = firstCommitDate(srcDir, `${postsPath}/${entry}`);
    if (!date) continue;
    writeFileSync(file, `${fm}\ndate: ${date}\n${content.slice(fmEnd)}`);
  }
}
