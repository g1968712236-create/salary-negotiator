# 薪资速算器 — 待办事项与后续推进清单

> 记录时间：2026-07-23
> 当前状态：PostHog 埋点开发已完成并通过本地验证（ANALYTICS.md v1.2），剩余为生产注入 Secret、上线验收与运营推广。

---

## ✅ 已归档完成的工作

### 9. PostHog 埋点（已完成，待上线验收）
- 方案文档：`ANALYTICS.md`（v1.2），15 个事件（E-001 ~ E-015），含脱敏原则、上报时机规范（T1~T4）、分桶规则。
- 基建：`src/lib/analytics.ts`（匿名 ID、公共属性、`track` / `trackDebounced` / `flushDebounced`）、`src/main.tsx` 初始化；未配置 `VITE_POSTHOG_KEY` 时全部静默 no-op。
- 滑块 T3 改造：`BaseInputSlider` / `RateSlider` 增加 `onCommit`（挂 Radix `onValueCommit`）；`BaseInputSlider` 另加 `onKeyboardCommit`（blur 提交且值变化才触发）。
- 事件落地：E-002~E-015 分别位于 `App.tsx`、`use-salary-store.ts`、`SocialInsuranceEditor.tsx`、`SalaryTable.tsx`、`TaxBracketsEditor.tsx`、`ExportReport.tsx`、`use-background.ts`。
- 脱敏合规：只报字段标识 / 布尔 / 枚举 / 序号（`offer_index`）/ 分桶，绝不上报薪资数值与方案名称；`.env` 已加入 `.gitignore`；页脚已补匿名统计声明。
- 生产注入：`.github/workflows/deploy.yml` 的 Build 步骤已引用 `secrets.VITE_POSTHOG_KEY` 与 `vars.VITE_POSTHOG_HOST`。
- 验证：`npm run build` / `lint` / `test`（82 用例）全绿；PostHog Live Events 已收到本地事件。
- **待办**：
  - [ ] GitHub 仓库添加 Secret `VITE_POSTHOG_KEY`（Variable `VITE_POSTHOG_HOST` 可选，默认 US 区）。
  - [ ] 推送上线后按 `ANALYTICS.md` §9 验收清单核对（滑块单条、防抖单条、无数值泄露）。
  - [ ] 数据积累后按 `ANALYTICS.md` §10 搭建 PostHog Dashboard。

### 1. 架构重构（已完成）
- 将 `src/App.tsx` 从约 2453 行拆分为模块化结构。
- 新增目录与核心文件：
  - `src/components/`：业务展示组件拆分（`SalaryChart`、`SalaryTable`、`SalarySummary`、`MultiOfferDiffView`、`ExportReport`、`Background`、`SocialInsuranceEditor`、`TaxBracketsEditor`）。
  - `src/components/forms/`：可复用的表单输入组件。
  - `src/domain/`：领域逻辑与格式化工具集中管理。
  - `src/hooks/`：`use-salary-store.ts` 负责状态管理，`use-background.ts` 负责背景逻辑。
  - `src/data/`：数据持久化相关逻辑。
- 修改文件：`src/App.tsx`（已大幅精简，仅保留应用入口与布局）。

### 2. 柱状图涨幅标注（已完成）
- 文件：`src/components/SalaryChart.tsx`
- Tooltip 中增加各 Offer 相对当前岗位的：
  - 绝对涨幅
  - 相对涨幅
- 柱形顶部增加涨幅标注。
- 调整图表顶部边距，避免标注被截断。

### 3. 期望 Tab 涨幅输入框修复（已完成）
- 文件：`src/App.tsx`
- 引入本地状态 `increaseInput`，输入过程中不再自动格式化为两位小数。
- 失焦（`onBlur`）时才将输入值提交到 `increasePercent`。
- 输入框支持 `allowDecimal`，允许输入小数。

### 4. 中文句号 `。` 作为小数点支持（已完成）
- 文件：
  - `src/domain/formatters.ts`：`filterNumber` 将中文句号 `。` 替换为半角小数点 `.`。
  - `src/components/forms/NumericInput.tsx`：`onKeyDown` 事件放行中文句号 `。`。
- 已验证：用户可在涨幅输入框中使用中文句号输入小数。

### 5. 测试补充（已完成）
- 文件：`TEST_CASES.md`、Vitest 单元/组件测试、Playwright E2E 测试
- 已覆盖核心计算逻辑、组件渲染、关键用户流程。
- 提交记录：`58f094c test: 补充 Vitest 单元/组件测试与 Playwright E2E 测试`

### 6. 官网与介绍页更新（已完成）
- 文件：`public/website/index.html`、`public/landing.html`
- 风格对齐应用主界面，功能文案已更新。
- 提交记录：`f1ba408 feat(landing): 官网风格对齐应用并更新功能文案`

### 7. Git 提交与推送（已完成）
- 所有技术修改与新增文件均已提交并推送到 `origin/main`。
- 当前本地分支与远程同步：
  ```text
  * main 58f094c [origin/main] test: 补充 Vitest 单元/组件测试与 Playwright E2E 测试
  ```

### 8. 构建与类型检查验证（已完成）
- 运行：
  ```bash
  npm run build && npm run lint
  ```
- 结果：构建成功，`oxlint` 0 warnings / 0 errors。

---

## 📦 当前工作区未跟踪文件

以下文件在本次会话中新增，尚未加入 Git：

```text
?? PROJECT_BRIEF.md
?? public/xiaohongshu-poster-dark.html
?? public/xiaohongshu-poster-dark.png
?? scripts/generate-poster.js
```

建议操作：

```bash
git add PROJECT_BRIEF.md public/xiaohongshu-poster-dark.html public/xiaohongshu-poster-dark.png scripts/generate-poster.js
git commit -m "docs: 新增项目概要；运营：新增深色版小红书海报与生成脚本"
git push origin main
```

---

## ⏳ 当前待办事项

### 运营推广（当前重点）
- [ ] **小红书宣传推广**
  - 目标平台：小红书（图文笔记为主）。
  - 已有素材：
    - 浅色版海报 `public/xiaohongshu-poster.png`
    - 深色版海报 `public/xiaohongshu-poster-dark.png`
    - 推广文案草稿（见最近一次对话记录）。
  - 待办子项：
    - [ ] 确定最终发布文案版本（痛点型 / 干货型 / 数据型中选 1~2 个）。
    - [ ] 在小红书注册/登录账号后发布首条笔记，首图建议使用深色版海报。
    - [ ] 在评论区置顶工具链接与使用说明，引导转化。
    - [ ] 跟踪笔记数据（曝光、点赞、收藏、评论），迭代文案与图片。
  - **Skill 需求 ⚠️**：
    - 当前 Agent 尚未加载小红书内容运营相关 Skill。
    - 后续推进时，建议先 **加载或制作「小红书运营」Skill**，以获取平台规则、爆款标题公式、最佳发布时间、标签策略、合规禁忌等知识，提升内容运营效果。
    - 可参考方向：小红书笔记结构、封面图设计规范、薯条投放基础、评论区运营话术、账号冷启动策略。

### 可选优化（低优先级）
- [ ] 检查 `src/App.tsx` 重构后是否还有未拆分干净的重复逻辑。
- [ ] 考虑为新增的领域函数和组件补充更多边界测试。
- [ ] 调研是否需要接入第三方分享 SDK 或短链接服务，便于小红书引流统计。
- [ ] 评估深色版小红书海报的转化效果，必要时制作第三版 A/B 测试素材。

---

## 📌 本地开发服务器信息

- 启动命令：`npm run dev`
- 访问地址：`http://localhost:5173/`
- 若端口被占用，Vite 会自动提示新的可用端口。

---

## 📝 备注

- 技术开发阶段已结束，当前进入运营推广阶段。
- 所有计算结果仅供参考，具体薪资、公积金及税务以劳动合同和当地政策为准。
- 宣传推广时需注意合规，避免使用「保证」「准确」等绝对化表述。

---

*本文件应随项目进展持续更新。*