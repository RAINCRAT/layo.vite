// 工单数据加载器：遍历 assets/tickets/*.md 的文件头（frontmatter）生成工单列表
import { createContentLoader } from 'vitepress';

export default createContentLoader('assets/tickets/*.md', {
  render: false,
  // 从 frontmatter 提取列表所需字段，并按提交时间倒序
  transform: (data) =>
    data
      .map(({ url, frontmatter }) => ({
        url,
        id: frontmatter.id,
        title: frontmatter.title,
        status: frontmatter.status,
        priority: frontmatter.priority,
        reporter: frontmatter.reporter,
        createdAt: frontmatter.createdAt,
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
});
