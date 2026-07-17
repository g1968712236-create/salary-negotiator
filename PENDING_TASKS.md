# 薪资速算器 — 待办事项与后续推进清单

> 记录时间：2026-07-16
> 当前状态：本地功能开发与验证已完成，Git 推送到 GitHub 因网络环境受限暂未完成。

---

## ✅ 本次已完成的工作

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

---

## 🔄 当前 Git 工作区状态

```text
 M src/App.tsx
?? src/components/Background.tsx
?? src/components/ExportReport.tsx
?? src/components/MultiOfferDiffView.tsx
?? src/components/SalaryChart.tsx
?? src/components/SalarySummary.tsx
?? src/components/SalaryTable.tsx
?? src/components/SocialInsuranceEditor.tsx
?? src/components/TaxBracketsEditor.tsx
?? src/components/forms/
?? src/data/
?? src/domain/
?? src/hooks/use-background.ts
?? src/hooks/use-salary-store.ts
```

- `src/App.tsx` 为已跟踪文件的修改。
- 其余新增文件/目录均为未跟踪（`??`），需要 `git add` 后提交。

---

## ⏳ 待办事项（待网络环境恢复后推进）

### 高优先级
- [ ] **提交本地更改到 Git 仓库**
  - 将所有修改和新增文件加入暂存区：
    ```bash
    git add .
    ```
  - 提交并附带清晰提交信息：
    ```bash
    git commit -m "refactor: 拆分 App.tsx 为模块化架构，修复涨幅输入与图表标注"
    ```

- [ ] **推送到 GitHub**
  - 检查当前远程仓库配置：
    ```bash
    git remote -v
    ```
  - 执行推送：
    ```bash
    git push origin <当前分支名>
    ```
  - 若因网络问题失败，可尝试切换网络环境、使用代理，或等待网络恢复后重试。

### 中优先级（建议推送前完成）
- [ ] **再次验证构建与类型检查**
  - 运行：
    ```bash
    npm run build && npm run lint
    ```
  - 期望结果：构建成功，`lint` 无 warnings/errors。

- [ ] **运行本地服务验证网页功能**
  - 当前 Vite 开发服务器已在后台运行：`http://localhost:5173/`
  - 若服务已停止，可重新启动：
    ```bash
    npm run dev
    ```
  - 重点验证：
    - 待遇综合对比柱状图 Hover 时显示涨幅 Tooltip。
    - 柱形顶部涨幅标注正常显示。
    - 期望 Tab 下涨幅输入框支持：
      - 整数输入
      - 小数点 `.` 输入
      - 中文句号 `。` 自动转为小数点
      - 输入过程中不自动格式化为两位小数
      - 失焦后才提交并格式化
    - 月 Base 等其他数字输入框行为保持一致。

### 低优先级（可选）
- [ ] 检查 `src/App.tsx` 重构后是否还有未拆分干净的重复逻辑。
- [ ] 考虑为新增的领域函数和组件补充单元测试（如项目已有测试框架）。
- [ ] 清理本地不再使用的临时日志或调试代码（本次修复过程中未遗留）。

---

## 📌 本地开发服务器信息

- 启动命令：`npm run dev`
- 访问地址：`http://localhost:5173/`
- 任务 ID（如仍运行）：`bash-r3dsx76w`
- 若端口被占用，Vite 会自动提示新的可用端口。

---

## 📝 备注

- 本次修改未新增第三方依赖，无需重新运行 `npm install`。
- 所有新增目录和文件均位于 `src/` 下，未改动项目根配置（如 `vite.config.ts`、`package.json`）。
- 建议在网络环境恢复后，先执行一次完整的构建与 lint 检查，确认无问题后再推送。
