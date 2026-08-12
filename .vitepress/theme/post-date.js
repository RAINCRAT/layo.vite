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
 * 构建启动时自动写回：为 posts 目录（含子目录，递归遍历）下缺失 date 的文章，
 * 按 git 首次提交时间补写 frontmatter date。
 * VPB 的内容加载器（createContentLoader）直接读 md 原始 frontmatter，不经过 transformPageData，
 * 故须在构建前写入文件，列表/文章页的日期才会正确。幂等：已有 date 或 git 不可用时跳过。
 */
export function ensurePostDates(srcDir, postsPath) {
  const walk = (currentDir) => {
    let entries;
    try {
      entries = readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const file = path.join(currentDir, entry.name);
      // 递归处理子目录（postsPath 匹配模式为 blogs/posts/**，文章可按分类组织到子目录）
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      if (!entry.name.endsWith('.md')) continue;
      const raw = readFileSync(file, 'utf8');
      // 兼容 UTF-8 BOM（部分 Windows 编辑器产物）：解析时剥离，写回时保留
      const bom = raw.charCodeAt(0) === 0xfeff ? '\uFEFF' : '';
      const content = bom ? raw.slice(1) : raw;
      if (!content.startsWith('---')) continue;
      const fmEnd = content.indexOf('\n---', 3);
      if (fmEnd < 0) continue;
      const fm = content.slice(0, fmEnd);
      if (/^date\s*:/m.test(fm)) continue;
      const relativePath = path.relative(srcDir, file).split(path.sep).join('/');
      const date = firstCommitDate(srcDir, relativePath);
      if (!date) continue;
      writeFileSync(file, `${bom}${fm}\ndate: ${date}\n${content.slice(fmEnd)}`);
    }
  };
  walk(path.join(srcDir, postsPath));
}
