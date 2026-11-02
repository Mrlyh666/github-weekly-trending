# GitHub 周榜 · 设计文档

- 日期：2026-11-02
- 状态：已批准（2026-11-02）
- 一句话：每周自动抓取 GitHub 上这一周在涨的项目，按「语言 × 领域」分类展示的静态网站。

## 1. 意图

每周花几分钟知道开源社区这周在涨什么，按语言和领域分类看。解决的问题是：GitHub 自己的 Trending 页只有总榜、只保留当下、没法按领域看；而按总 star 排序的榜单永远被几个老项目占满，看不出「这周」。

已与你确认：这站只给你自己用；部署走 GitHub Pages（公开仓库、0 成本）；界面中文，项目描述保留英文原文。因为只有你自己看，不做 SEO、不做双语、不买域名。实现时需要注册一个 GitHub 账号（搭建阶段注册即可，不需要付费）。

## 2. 目标

1. 每周一自动更新，无需人工干预；连续运行不会烂掉。
2. 榜单排序依据是**本周 star 增量**，不是总 star。
3. 支持「语言 × 领域」两个维度的筛选，可组合。
4. 能切换查看过去的历史周，历史数据逐周累积、可回溯。
5. 每条项目展示：仓库名、描述、语言、本周 +N ⭐、总 ⭐、领域、topics、GitHub 链接。
6. 全站零服务器、零数据库、零月费。

## 3. 非目标（这一版不做）

- 用户账号、收藏、订阅、邮件/IM 推送。
- 分钟级实时数据。
- 全文搜索（只在当周已加载数据内做前端过滤，不做跨周检索）。
- 多语言界面、移动 App。
- 项目详情页（第一版点击直接跳 GitHub）。
- 用大模型生成摘要或自动分领域（分类必须确定性、可测试、零成本）。

## 4. 反目标（做出来算失败）

- 页面退化成「总 star 排行榜」——那说明增量算不出来，核心价值没了。
- 需要人每周手动修数据或手动触发。
- 浏览器端直接调 GitHub API（限流必挂，且 token 不能暴露）。
- 采集依赖单一 HTML 选择器且没有回退路径。
- 为了「更实时」引入服务器或数据库。

## 5. 约束与已核实的事实

| 约束 | 影响 |
| --- | --- |
| GitHub 没有官方 Trending API，只有 `https://github.com/trending?since=weekly` 页面 | 必须解析 HTML，且要接受结构可能变 |
| REST API 未认证 60 次/小时 | 采集必须带 token（Actions 自带 `GITHUB_TOKEN`，5000 次/小时） |
| Search API 认证后 30 次/分钟 | 仅作回退用，不能当主路径 |
| 前端纯静态 | 所有计算在采集/构建期完成 |
| 成本必须为 0 | 部署用 GitHub Pages（仓库需公开），Actions 免费额度足够 |
| 环境 Node 20 | 用内置 `fetch`，不引第三方 HTTP 库 |
| ISO 周编号 | 用 `YYYY-Www` 做周标识，跨年边界要正确（2026-12-31 属 2026-W53） |

补充说明：抓取 `github.com/trending` 属于读取公开页面，每周一次、串行、带正常 UA，频率极低。但这不是官方接口，GitHub 改动页面结构即失效——所以采集层必须有回退和告警，这一点写进设计而不是留到线上踩坑。

## 6. 方案（三选一，已选 A）

**A. 静态站 + 每周 GitHub Actions 快照（选定）**
Actions 每周定时抓取 → 写入 JSON 并提交回仓库 → 构建期把 JSON 编译进静态页 → Pages 部署。
- 换来的：零运维、零成本、git 自带历史与备份。
- 代价的：数据粒度到周；不能任意时间段查询。

**B. 常驻后端 + 数据库**
能任意时间查询、能加订阅，但要机器、要备份、要处理休眠与故障。当前需求用不上。

**C. 纯前端直连 GitHub API**
最快，但算不出周增量、历史只在自己浏览器里、限流致命。只适合本地玩具。

选 A 的理由：这个项目的形状就是「每周一次批处理 + 一份历史数据 + 一个展示层」，静态站正好；历史放 git 里，每周一个文件，可 diff、可回溯、免费。将来要转 B，采集脚本和数据格式原样可用。

## 7. 产品行为

### 页面结构（单页）

1. **顶部**：站名、周选择器（默认最新周，可回看历史周）、数据更新时间。
2. **筛选条**：语言 chips（多选）、领域 chips（多选）、排序切换（本周涨星 / 总星）、当周内搜索框。
3. **列表**：未选领域时按领域分组展示，组内按本周涨星降序；选了领域则平铺。空结果有明确空状态。
4. **卡片**：排名、`owner/name`、描述（原文英文，不翻译）、语言色点、`+N ⭐`（首周收录显示「首周收录」）、总 ⭐、领域标签、GitHub 外链。
5. **页脚**：数据来源说明、「非官方榜单，数据来自公开页面」的声明。

### 交互细节

- 筛选状态写进 URL query（`?week=2026-W45&lang=rust,go&domain=ai`），可分享、可刷新保持。
- 筛选在浏览器端对已内嵌的当周 JSON 做纯数组过滤，不请求网络。
- 每页数据量上限 80 条，内嵌 JSON 预计 < 300 KB，可接受。

## 8. 数据模型

### 每周数据文件 `data/weeks/2026-W45.json`

```json
{
  "week": "2026-W45",
  "generatedAt": "2026-11-02T00:15:00Z",
  "sources": { "trending": "ok", "api": "ok" },
  "projects": [
    {
      "repo": "owner/name",
      "url": "https://github.com/owner/name",
      "description": "English description as-is",
      "language": "Rust",
      "stars": 48213,
      "starsGained": 3120,
      "forks": 1201,
      "topics": ["cli", "tui"],
      "domain": "devtools",
      "boards": ["overall", "rust"],
      "rank": 1
    }
  ]
}
```

字段语义：
- `starsGained`：本周快照减上次快照；拿不到上次快照时为 `null`（首周收录 / 新上榜）。
- `boards`：该项目出现在哪些榜上（总榜 / 语言分榜），用于解释「它为什么在这」。
- `domain`：见第 9 节分类法，必填，兜底 `other`。

### 周索引 `data/weeks/index.json`

```json
{ "weeks": ["2026-W45", "2026-W44"], "latest": "2026-W45" }
```

前端构建期读取，用于周选择器；不扫描目录，避免构建依赖文件系统顺序。

## 9. 领域分类法（确定性）

12 个固定类目：`ai`、`frontend`、`backend`、`infra`、`db`、`devtools`、`mobile`、`security`、`devops`、`data`、`lang`、`other`。

规则：
- 输入 = `topics` + `description` + 仓库名，统一小写、按词边界匹配。
- 每个类目一张关键词表，**按优先级顺序**匹配（越具体越靠前，如 `db` 在 `backend` 之前），命中即停。
- 无命中 → `other`，在界面上始终排最后但可见。
- 关键词表放在 `src/classify/taxonomy.js`，表驱动，方便迭代；改表必须同时加/改测试用例。
- 纯函数：`classify({ name, description, topics }) -> domain`，无网络、无随机。

首版关键词表给足覆盖即可，不追求完美——分类错误的项目仍会被看到，只是分组不同，不影响核心价值。

## 10. 技术选型（我的决定，可推翻）

| 项 | 选择 | 理由 |
| --- | --- | --- |
| 站点框架 | Astro | 构建期读 JSON、默认零 JS、静态导出简单 |
| 样式 | 手写 CSS + CSS 变量（深色为主） | 不引 UI 框架，页面就一屏，省依赖 |
| 采集 | Node 20 ESM + `cheerio` 解析 HTML | 正则解析 trending 页面太脆弱 |
| 测试 | vitest + 离线 fixture | 采集与分类都能离线测，不依赖网络 |
| 部署 | GitHub Pages（官方 `deploy-pages`） | 零账号成本，仓库公开即可 |
| 定时 | Actions cron `0 0 * * 1`（周一 08:00 北京） | 周更，避开整点高峰可再调 |
| 界面语言 | 中文 UI，项目描述保留英文原文 | 目标用户是自己；翻译会引入错误与成本 |

## 11. 采集流程

1. 抓 `https://github.com/trending?since=weekly`（总榜）。
2. 抓语言分榜：python、typescript、javascript、rust、go、java、cpp、csharp、php、swift（可配置），共 10 个页面。
3. 合并去重，按 `boards` 记录来源；总数超过 80 时按「总榜优先、再按出现的分榜数」截断。
4. 对每个仓库调 `GET /repos/{owner}/{name}`，取 stars、forks、topics、description、language。
5. 读上一周 JSON，同仓库做差得到 `starsGained`。
6. 跑分类器填 `domain`。
7. 排序、写 `data/weeks/<ISO周>.json`，更新 `index.json`。
8. 若有任何一步失败：保留已得数据、在 `sources` 里记录状态、退出码非 0 但不阻断提交（下一周会覆盖），同时 Actions 失败邮件即告警。

失败与回退：
- trending 页面解析失败 → 改走 Search API（`created:>7天前 + sort=stars`）作为兜底榜单，`sources.trending = "fallback"`。
- 单个仓库 API 失败 → 该条保留名字与链接，数值字段置 `null`，不阻塞整批。
- 整周无数据 → 仍写文件并在前端显示「本周暂无数据」，不留空目录。

## 12. 目录结构

```
/
├─ .github/workflows/weekly.yml   # 定时采集 + 构建 + 部署
├─ data/weeks/*.json              # 采集产物（提交入库）
├─ scripts/fetch.mjs              # 采集入口
├─ src/
│  ├─ classify/taxonomy.js        # 关键词表
│  ├─ classify/index.js           # 纯函数分类器
│  ├─ pages/index.astro           # 唯一页面
│  ├─ components/                 # 卡片、筛选条等
│  └─ styles/global.css
├─ tests/                         # 分类器、解析器、差分的单测 + fixtures
└─ astro.config.mjs
```

## 13. 验收标准

1. `npm run fetch` 在有网络与 token 时产出合法 JSON，且 `projects.length > 0`。
2. 用离线 fixture（保存的 trending HTML）跑解析，能稳定解析出 ≥ 10 个项目，字段完整。
3. 差分正确：给定上周与本周两份 fixture，`starsGained` 等于两者之差；上周不存在的仓库为 `null`。
4. 分类器表驱动用例 ≥ 20 条，覆盖 12 个类目与 `other` 兜底。
5. `npm run build` 产出静态页，构建产物 HTML 含本周前 3 名项目名。
6. 语言与领域筛选可组合，结果为空时显示空状态；筛选状态可从 URL 还原。
7. 周选择器能切换历史周，数据缺失的周有明确提示。
8. Actions 手动 dispatch 一次成功，数据提交与 Pages 部署均成功。

## 14. 留给构建者

- 具体视觉风格（配色、卡片密度、字体）：一屏能扫完 20 条即可，不做花活。
- 首版关键词表的覆盖度：给一个能跑的草案，上线后按实际误分类迭代。
- 语言分榜清单是否再增减（当前 10 个）。
- 是否需要「本周 vs 上周」对比视图。
- 历史周回补：如需，可手动 dispatch 带参数补抓（趋势页只有当下，补不了；只能补 star 快照，不建议做）。

## 15. 风险

| 风险 | 处理 |
| --- | --- |
| trending 页面结构变化 | 解析失败即回退 Search API，Actions 报错可见 |
| GitHub 限制抓取 | 每周一次、串行、低频，且主路径可切官方 API |
| 首周无增量数据 | 显示「首周收录」，第二周起正常 |
| 分类误判 | 表驱动可迭代，误判只影响分组 |
| Pages 只在公开仓库免费 | 仓库保持公开（数据本身就是公开信息） |