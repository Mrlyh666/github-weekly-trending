# GitHub 周榜

每周自动抓取 GitHub 这一周涨星最快的项目，按「语言 × 领域」分类展示。

## 是什么

- 数据来源：`github.com/trending?since=weekly`（总榜 + 10 个语言分榜）与 GitHub REST API。
- 「本周涨星」= 本周 star 快照 − 上周同仓库快照，数据每周一个 JSON 提交回仓库，历史可回溯。
- 领域由关键词规则确定性分类（12 类），无大模型、零成本。
- 前端是免构建静态页，读仓库里的 `data/weeks/*.json`。

## 本地运行

```bash
npm install --ignore-scripts   # 本次适配沙箱；普通环境直接 npm install
npm test                          # 运行单元测试
npm run fetch                     # 抓取一次（需要环境变量 GITHUB_TOKEN）
npm run build                     # 组装 _site/ 静态目录
```

本地预览 `_site/`：`npx serve _site` 或用任意静态服务器打开。

## 部署到 GitHub Pages

1. 把本仓库推到一个**公开**的 GitHub 仓库。
2. 仓库 Settings → Pages → Source 选「GitHub Actions」。
3. Actions 页手动触发一次 `weekly` workflow（`workflow_dispatch`）。
4. 之后每周一 UTC 00:00 自动采集并部署。

采集需要 `GITHUB_TOKEN`：workflow 里用 `secrets.GITHUB_TOKEN`（Actions 自动注入，无需额外配置）。