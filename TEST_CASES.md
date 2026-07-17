# 薪资速算器 — 自动化测试用例清单

> 本文件按模块梳理当前项目需要覆盖的测试场景，重点标注最大值、最小值、空值、越界等边界情况。已实现的用例会标注对应测试文件，未实现的作为后续补充方向。

---

## 一、领域层（`src/domain/`）

### 1.1 formatters.ts — 输入过滤与格式化

| 编号 | 场景 | 输入 | 期望 | 状态 |
|------|------|------|------|------|
| F-01 | 格式化人民币 | `1234567` | `¥1,234,567` | ✅ `formatters.test.ts` |
| F-02 | `clamp` 正常值 | `5, 0, 10` | `5` | ✅ |
| F-03 | `clamp` 低于最小值 | `-5, 0, 10` | `0` | ✅ |
| F-04 | `clamp` 高于最大值 | `15, 0, 10` | `10` | ✅ |
| F-05 | `filterNumeric` 去非数字 | `abc123.45` | `12345` | ✅ |
| F-06 | `filterNumber` 中文句号转小数点 | `30。5` | `30.5` | ✅ |
| F-07 | `filterNumber` 多小数点只保留一个 | `12.3.4.5` | `12.345` | ✅ |
| F-08 | `filterNumber` 空字符串 | `""` | `""` | ✅ |
| F-09 | `replacer/reviver` Infinity 序列化 | `{ value: Infinity }` | 可还原为 `Infinity` | ✅ |
| F-10 | `formatWan` 大于等于 1 万 | `15000` | `1.5w` | ✅ |
| F-11 | `formatWan` 小于 1 万 | `9999` | `9,999` | ✅ |

### 1.2 tax.ts — 个税计算

| 编号 | 场景 | 输入 | 期望 | 状态 |
|------|------|------|------|------|
| T-01 | 年个税为 0 | `0` / 负数 | `0` | ✅ `tax.test.ts` |
| T-02 | 年个税第一档边界 | `36000` | `1080` | ✅ |
| T-03 | 年个税第二档边界 | `144000` | `11880` | ✅ |
| T-04 | 年个税中间值 | `264000` | `35880` | ✅ |
| T-05 | 年终奖为 0 | `0` / 负数 | `0` | ✅ |
| T-06 | 年终奖第一档边界（月均 3000） | `36000` | `1080` | ✅ |
| T-07 | 年终奖跨档（月均 5000 → 10% 档） | `60000` | `5790` | ✅ |
| T-08 | 年终奖顶档超大值 | `1200000` | 按最高税率 45% 计算 | ✅ `tax.test.ts` |

### 1.3 salary.ts — 薪资汇总计算

| 编号 | 场景 | 关键输入 | 期望 | 状态 |
|------|------|----------|------|------|
| S-01 | 创建默认当前岗位 | `monthlyBase=30000, months=14` | `providentBase=25000` | ✅ `salary.test.ts` |
| S-02 | 公积金基数回退到月 Base | `providentBase=0` | `providentBase=30000` | ✅ |
| S-03 | 无社保基础计算 | 默认当前岗位 | 年包/税后/净收入正确 | ✅ |
| S-04 | 含股权和签字费 | `equity="50000", signingBonus="30000"` | 年包和税后正确累加 | ✅ |
| S-05 | 含月固定支出 | `monthlyExpense=5000` | 净收入 = 税后 - 年支出 | ✅ |
| S-06 | 含专项附加扣除 | `deduction=2000` | 应纳税所得额扣减 | ✅ |
| S-07 | 启用社保 | 北京预设，月 Base 30K | 基数自动 clamp 到北京上下限 | ✅ `salary.test.ts` |
| S-08 | 最小 Base 边界 | `monthlyBase=100` | 计算不报错，各项数值合理 | ✅ |
| S-09 | 最大 Base 边界 | `monthlyBase=1_000_000` | 计算不报错，个税到顶档 | ✅ |
| S-10 | 薪数边界 | `months=12` / `months=18` | 年现金 = base * months | ✅ |

---

## 二、表单组件（`src/components/forms/`）

### 2.1 NumericInput — 通用数字输入框

| 编号 | 场景 | 输入 | 期望 | 状态 |
|------|------|------|------|------|
| N-01 | 整数输入过滤非数字 | `abc123.45` | `12345` | ✅ `NumericInput.test.tsx` |
| N-02 | 允许小数 | `30.5` | `30.5` | ✅ |
| N-03 | 多个小数点合并 | `12.3.4` | `12.34` | ✅ |
| N-04 | 中文句号转小数点 | `30。5` | `30.5` | ✅ |
| N-05 | 粘贴过滤 | `abc2.5kg` | 过滤后拼接 | ✅ |
| N-06 | 空值处理 | `""` | `""` | ✅ `NumericInput.test.tsx` |

### 2.2 BaseInputSlider — 月 Base 输入+滑块

| 编号 | 场景 | 输入 | 期望 | 状态 |
|------|------|------|------|------|
| B-01 | 正常输入提交 | `30000` | `onChange(30000)` | ✅ `BaseInputSlider.test.tsx` |
| B-02 | 低于最小值 `MIN_BASE=100` | `50` | blur 后 clamp 为 `100` | ✅ |
| B-03 | 高于最大值 `MAX_BASE=1_000_000` | `2_000_000` | blur 后 clamp 为 `1_000_000` | ✅ |
| B-04 | 清空输入后失焦 | `""` | 恢复原值 | ✅ |

### 2.3 MonthsSelector — 薪数选择

| 编号 | 场景 | 操作 | 期望 | 状态 |
|------|------|------|------|------|
| M-01 | 选择 12 薪 | 点击 | `onChange(12)` | ✅ `MonthsSelector.test.tsx` |
| M-02 | 选择 18 薪 | 点击 | `onChange(18)` | ✅ |
| M-03 | 当前值高亮 | `value=14` | 14 薪按钮为激活样式 | ✅ |

### 2.4 ProvidentBaseInput / DeductionInput / ExpenseInput

| 编号 | 场景 | 输入 | 期望 | 状态 |
|------|------|------|------|------|
| P-01 | 值为 0 时显示空 | `value=0` | 输入框 placeholder 显示 | ✅ `ProvidentBaseInput.test.tsx` |
| P-02 | 输入数字后提交 | `25000` | `onChange(25000)` | ✅ |

---

## 三、业务组件（`src/components/`）

### 3.1 SocialInsuranceEditor — 社保编辑器

| 编号 | 场景 | 操作 | 期望 | 状态 |
|------|------|------|------|------|
| SI-01 | 默认未启用 | 初始渲染 | 详细编辑区不显示 | ✅ `SocialInsuranceEditor.test.tsx` |
| SI-02 | 勾选启用 | 点击 checkbox | `enabled=true`，显示编辑区 | ✅ |
| SI-03 | 选择北京预设 | 选择城市 | 基数自动 clamp 到北京上下限 | ✅ |
| SI-04 | 手动输入越界基数 | 输入高于 maxBase | blur 后 clamp 到 maxBase | ✅ |
| SI-05 | 险种比例修改 | 修改养老个人比例 | 触发 `onChange` | ✅ |

### 3.2 TaxBracketsEditor — 税率表编辑器

| 编号 | 场景 | 操作 | 期望 | 状态 |
|------|------|------|------|------|
| TB-01 | 修改收入上限 | `36000 -> 40000` | 税率表更新 | ⬜ 待补充 |
| TB-02 | 修改税率 | `3% -> 5%` | 税率更新 | ⬜ 待补充 |
| TB-03 | 点击恢复默认 | - | 回到默认税率表 | ⬜ 待补充 |

### 3.3 SalaryTable — 年包速查表

| 编号 | 场景 | 输入 | 期望 | 状态 |
|------|------|------|------|------|
| ST-01 | 默认范围渲染 | - | 100 ~ 40000 | ✅ `SalaryTable.test.tsx` |
| ST-02 | 最小 Base 边界 | `0` | 提交为 `0` | ✅ |
| ST-03 | 最大 Base 越界 | `20000000` | 提交为 `10000000` | ✅ |
| ST-04 | 最小 > 最大时交换 | min=50000, max=40000 | 实际 min=40000, max=40000 | ✅ |

### 3.4 SalarySummary / SalaryChart / MultiOfferDiffView / ExportReport

| 编号 | 场景 | 操作 | 期望 | 状态 |
|------|------|------|------|------|
| R-01 | SalarySummary 渲染关键字段 | 传入默认数据 | 年包、税后、净收入均渲染 | ✅ `SalarySummary.test.tsx` |
| R-02 | SalaryChart 涨幅标注 | 默认 scenarios | hover 后 Tooltip 显示涨幅 | ✅ `e2e/chart.spec.ts` |
| R-03 | MultiOfferDiffView 对比 | 默认 scenarios | 出现当前岗位与 Offer 对比 | ✅ `e2e/diff.spec.ts` |
| R-04 | ExportReport 导出按钮 | 点击导出 | 触发 PNG 下载 | ✅ `e2e/export.spec.ts` |

---

## 四、Hooks（`src/hooks/`）

### 4.1 useSalaryStore

| 编号 | 场景 | 操作 | 期望 | 状态 |
|------|------|------|------|------|
| HS-01 | 初始 scenarios | - | 包含当前、期望、Offer 1 | ✅ `use-salary-store.test.tsx` |
| HS-02 | 新增 Offer | `addScenario()` | scenarios 增加一个 offer | ✅ |
| HS-03 | 删除 Offer | `removeScenario(offerId)` | 该 offer 被移除 | ✅ |
| HS-04 | 禁止删除当前/期望 | `removeScenario(currentId)` | scenarios 不变 | ✅ |
| HS-05 | 重命名 | `renameScenario(id, "新公司")` | name 更新 | ✅ |
| HS-06 | 期望年包涨幅计算 | `increasePercent=20` | `expectedAnnualPackage = current * 1.2` | ✅ |
| HS-07 | 更新 scenario 数据 | `updateScenario(id, ...)` | 对应 data 更新 | ✅ |

### 4.2 useBackground

| 编号 | 场景 | 操作 | 期望 | 状态 |
|------|------|------|------|------|
| HB-01 | 默认背景模式 | - | `flow` | ✅ `use-background.test.tsx` |
| HB-02 | 切换背景模式 | `cycleBgMode()` | 按 flow -> rain -> solid 循环 | ✅ |

---

## 五、数据持久化（`src/data/`）

### 5.1 storage.ts

| 编号 | 场景 | 操作 | 期望 | 状态 |
|------|------|------|------|------|
| DS-01 | 无缓存时加载 | localStorage 为空 | 返回 `null` | ✅ `storage.test.ts` |
| DS-02 | 正常加载 | 存入合法 v3 数据 | 完整还原 | ✅ |
| DS-03 | Infinity 序列化 | 数据含 `Infinity` | JSON 中变为 `null`，加载后还原 | ✅ |
| DS-04 | 损坏数据不抛错 | 存入非法 JSON | 返回 `null` | ✅ |

### 5.2 migration.ts

| 编号 | 场景 | 操作 | 期望 | 状态 |
|------|------|------|------|------|
| DM-01 | 空 legacy 数据 | `{}` | 使用默认当前+期望填充 | ✅ `migration.test.ts` |
| DM-02 | 含 offers | `{ offers: [...] }` | 保留当前、期望，追加 offers | ✅ |
| DM-03 | 含 increasePercent | `{ increasePercent: 30 }` | 迁移后保留 | ✅ |

---

## 六、集成/端到端（待后续补充）

| 编号 | 场景 | 说明 | 状态 |
|------|------|------|------|
| E2E-01 | 期望 Tab 涨幅输入 | 输入 25.5%，失焦后反推月 Base | ✅ `e2e/scenario.spec.ts` |
| E2E-02 | 方案对比图交互 | Hover 显示涨幅 Tooltip | ✅ `e2e/chart.spec.ts` |
| E2E-03 | 导出 PNG | 点击导出按钮生成图片 | ✅ `e2e/export.spec.ts` |

---

## 七、执行测试

```bash
npm test        # 运行单元/组件测试（Vitest）
npm test:watch  # Vitest 监听模式
npm run e2e     # 运行端到端测试（Playwright + Chromium）
npm run e2e:ui  # Playwright UI 模式
```

> 标注为 ✅ 的用例已实现。未标注的用例是后续扩展方向，可按业务优先级逐步补齐。
