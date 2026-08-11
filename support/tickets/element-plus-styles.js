/**
 * Element Plus 按需样式入口（工单系统专用）
 *
 * 仅引入工单列表/详情页实际使用的组件样式及其依赖，替换全量 element-plus/dist/index.css（约 580KB）。
 * 由于 VitePress 会把所有 CSS 合并进唯一的全局 style.css，此项改动直接缩减全站（含非工单页）
 * 首屏渲染阻塞的样式体积。
 *
 * 说明：直接引入 theme-chalk 的 .css 文件（而非 element-plus 的 es 组件 style 目录下
 * 的 css 入口 .mjs），后者内部的 .css 导入在 VitePress SSR（页面渲染阶段）会因
 * node_modules 被外部化而抛 "Unknown file extension .css"；theme-chalk 的 .css
 * 直接 import 则正常。
 *
 * 使用方式：Ticket.vue / TicketHeader.vue 在组件内 import './element-plus-styles.js'。
 * 深色模式变量单独引入（element-plus/theme-chalk/dark/css-vars.css）。
 */
import 'element-plus/theme-chalk/base.css';
import 'element-plus/theme-chalk/el-button.css';
import 'element-plus/theme-chalk/el-input.css';
import 'element-plus/theme-chalk/el-select.css';
import 'element-plus/theme-chalk/el-option.css';
import 'element-plus/theme-chalk/el-option-group.css';
import 'element-plus/theme-chalk/el-popper.css';
import 'element-plus/theme-chalk/el-scrollbar.css';
import 'element-plus/theme-chalk/el-tag.css';
import 'element-plus/theme-chalk/el-table.css';
import 'element-plus/theme-chalk/el-tooltip.css';
import 'element-plus/theme-chalk/el-checkbox.css';
import 'element-plus/theme-chalk/el-pagination.css';
import 'element-plus/theme-chalk/el-message.css';
import 'element-plus/theme-chalk/el-badge.css';
import 'element-plus/theme-chalk/el-descriptions.css';
import 'element-plus/theme-chalk/el-descriptions-item.css';
import 'element-plus/theme-chalk/el-timeline.css';
import 'element-plus/theme-chalk/el-timeline-item.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
