# 谈薪助手 · 薪资计算器

一个纯前端工具型网页，帮助求职者在谈薪过程中快速计算、对比和决策不同薪资方案。

## 功能

- **期望方案**：基于当前待遇和期望涨幅自动反推期望月Base
- **Offer 汇总**：录入实际 Offer 待遇并计算年包
- **对比分析**：期望 vs Offer 逐项对比（9项指标）
- **年包速查**：月Base 25K~40K × 12~18薪 完整对照表
- **动态背景**：支持丝绸流场、雨落寒窗、纯色背景切换

## 技术栈

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 3.4
- Radix UI (Slider / Slot)

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物位于 `dist/` 目录，为纯静态文件，可直接部署到 GitHub Pages、Vercel、Netlify 等。

## 部署到 GitHub Pages

1. 在 GitHub 创建仓库 `salary-negotiator`
2. 推送代码：`git push -u origin main`
3. 进入仓库 Settings → Pages → Source 选择 "GitHub Actions"
4. 使用 Vite 的 GitHub Actions 工作流自动构建部署

或手动将 `dist/` 目录内容推送到 `gh-pages` 分支。

## 免责声明

本工具计算结果仅供参考，具体薪资、公积金及税务以劳动合同和当地政策为准。
