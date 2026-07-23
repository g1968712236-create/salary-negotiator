# 薪资速算器 — PostHog 埋点方案文档

> 版本：v1.2
> 日期：2026-07-23
> 分析平台：PostHog Cloud（主力）
> 适用代码：`src/App.tsx`、`src/components/`、`src/hooks/use-salary-store.ts`
>
> v1.1 变更：新增「§5 上报时机规范」，明确滑块等连续输入的触发机制（`onValueCommit` / 防抖），并为每个事件标注触发类型。
> v1.2 变更：带 `scenario_role` 的事件（E-005/E-006/E-007/E-009/E-010）在角色为 `offer` 时新增 `offer_index` 属性，用于区分第几个 Offer（只报序号，不含名称）。

---

## 1. 目标

| 目标 | 对应指标 |
|---|---|
| 网站访问量 | PV / UV、来源（utm_source）、地域 |
| 各 Tab 访问 | Tab 浏览量、Tab 访问路径 |
| 各模块输入情况 | 字段编辑次数、模块使用率（哪些模块用户真的在用） |
| 次日留存 | PostHog Retention 报表（D1 / D7 留存） |
| 转化行为 | 导出 PNG（核心转化动作） |

---

## 2. 脱敏原则（最高优先级，任何事件不得违反）

本工具的核心卖点是「数据本地计算、不上传」。埋点必须守住这条线：

**禁止上报的内容：**

- ❌ 任何薪资数值：月 Base、年包、公积金基数、社保基数、股权、签字费、专项附加扣除、月支出
- ❌ 任何计算结果：税后收入、净收入、涨幅百分比具体值
- ❌ 方案名称（用户可能填了公司名，如"字节 Offer"）
- ❌ 社保城市名称（可推断用户所在地，属于个人信息）
- ❌ 税率表自定义数值

**允许上报的内容：**

- ✅ 字段标识（`field_key`，如 `monthly_base`）——"用户碰了哪个字段"，而非"填了多少"
- ✅ 布尔状态（开关开/关、是否填写、是否默认值）
- ✅ 枚举/角色标识（`scenario_role`: current / expected / offer）
- ✅ Offer 序号（`offer_index`: 1~N，仅序号，不含名称；删除中间 Offer 后序号会前移，跨会话对比需注意）
- ✅ 分桶后的区间值（`value_bucket`，如涨幅 "20-30%"，见 §7 分桶规则）
- ✅ 交互方式（`input_method`: slider / keyboard / click）

**命名约定：**

- 事件名：snake_case、过去式（PostHog 官方约定），如 `tab_switched`
- 属性名：snake_case，如 `scenario_role`
- 事件 ID：本文档内部编号 `E-xxx`，仅用于沟通与验收，不上报

---

## 3. 用户标识与留存实现

### 3.1 匿名 ID

- 首次访问生成 UUID，写入 `localStorage`（key: `sn_anonymous_id`），同时作为 PostHog `distinct_id`。
- 不登录、不绑定任何身份信息。同一浏览器同一设备即同一"用户"。
- PostHog 的 Retention 报表基于 `distinct_id` + 事件的日期分布自动计算次日/7 日留存，无需额外埋点，只要保证同一用户的 `distinct_id` 稳定即可。

### 3.2 公共属性（Super Properties）

以下属性在 SDK 初始化后 `register()` 一次，自动附加到每个事件：

| 属性名 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `app_version` | string | 应用版本（取自 package.json） | `"0.0.0"` |
| `device_type` | string | 设备类型（依据视口宽度判断） | `"mobile"` / `"desktop"` |
| `is_returning` | boolean | 是否回访用户（`sn_anonymous_id` 是否本次新建） | `true` |
| `first_visit_date` | string | 首次访问日期（YYYY-MM-DD，本地生成） | `"2026-07-22"` |

> PostHog 自动附带的 `$geoip_*`、`$browser`、`$os`、`$referrer`、`utm_*` 等属性直接使用，无需自埋。地域数据仅到城市级聚合报表使用，不与个体行为交叉分析。

---

## 4. 事件总览

| 事件 ID | 事件名 | 分类 | 说明 | 触发类型（§5） | 优先级 |
|---|---|---|---|---|---|
| E-001 | `$pageview` | 访问 | 页面浏览（PostHog 自动捕获） | 自动 | P0 |
| E-002 | `tab_switched` | Tab | 切换主 Tab | T1 | P0 |
| E-003 | `scenario_added` | 方案 | 新增 Offer | T1 | P0 |
| E-004 | `scenario_removed` | 方案 | 删除 Offer | T1 | P1 |
| E-005 | `scenario_switched` | 方案 | 切换当前编辑的方案 | T1 | P0 |
| E-006 | `scenario_renamed` | 方案 | 重命名方案 | T4 | P2 |
| E-007 | `field_edited` | 输入 | 任意薪资字段被编辑（核心事件） | T1 / T2 / T3 / T4（按字段定，见详表） | P0 |
| E-008 | `increase_committed` | 输入 | 期望涨幅确认 | T2 / T3 | P1 |
| E-009 | `social_insurance_toggled` | 社保 | 社保开关切换 | T1 | P0 |
| E-010 | `social_insurance_city_selected` | 社保 | 选择城市预设 | T1 | P1 |
| E-011 | `lookup_range_committed` | 速查 | 年包速查范围确认 | T2 | P1 |
| E-012 | `tax_bracket_edited` | 税率 | 修改税率表单元格 | T4 | P2 |
| E-013 | `tax_brackets_reset` | 税率 | 恢复默认税率 | T1 | P2 |
| E-014 | `report_exported` | 转化 | 导出对比图 PNG | T1 | P0 |
| E-015 | `background_switched` | 个性化 | 切换背景模式/颜色 | T1 | P2 |

---

## 5. 上报时机规范（所有事件统一遵循）

本项目输入控件只有 4 种交互形态，对应 4 类触发机制。**禁止直接在 `onChange` / `onValueChange` 里逐帧上报**——滑块拖动一次会产生几十上百次回调，键盘输入每个字符都会触发，直接上报会瞬间耗尽事件额度且数据无意义。

### T1 点击即时上报

- **适用控件**：按钮、复选框、下拉选择、薪数按钮组（`MonthsSelector`）。
- **触发点**：`onClick` / 选择变更生效后，立即上报一次。
- **涉及事件**：E-002、E-003、E-004、E-005、E-009、E-010、E-013、E-014、E-015，以及 E-007 中的 `months` 字段。
- **代码现状**：全部为现成的点击回调，直接加埋点调用即可，无改造量。

### T2 失焦提交（键盘输入，已有 blur 提交点）

- **适用控件**：已接 `onBlur` 的输入框——月 Base 输入框（`BaseInputSlider` 的 `commit`）、社保基数（`SocialInsuranceEditor` 的 `commitBase`）、期望涨幅输入框（`App.tsx`）、速查范围（`SalaryTable` 的 `commitMin` / `commitMax`）。
- **触发点**：`onBlur` 提交逻辑中，**仅当值相对 focus 时发生了变化**才上报一次。
- **注意**：值未变化的 blur 不上报，避免"点进去看看"产生噪音。各 commit 函数本身已有"恢复原值即不改 state"的逻辑，埋点挂在 state 实际变更的分支里即可。
- **代码现状**：提交点已存在，埋点直接挂入，无改造量。

### T3 滑块提交（`onValueCommit`，需要小改造）

- **适用控件**：全部 3 处 Radix Slider——期望涨幅滑块（`App.tsx`）、月 Base 滑块（`BaseInputSlider`）、公积金比例滑块（`RateSlider` ×2）。
- **机制**：Radix Slider 原生提供 `onValueCommit` 回调——**一次拖动结束（pointer up）或键盘方向键步进结束时只触发一次**；而 `onValueChange` 在拖动过程中逐帧触发，严禁用于上报。
- **需要的改造**（当前三处都只用了 `onValueChange`）：
  - `src/components/ui/slider.tsx`：无需改动，props 本就透传给 Radix Root；
  - `BaseInputSlider.tsx` / `RateSlider.tsx`：组件 props 增加可选 `onCommit?: (value: number) => void`，挂到 `<Slider onValueCommit={(v) => onCommit?.(v[0])}>`；
  - `App.tsx`：期望涨幅 Slider 直接加 `onValueCommit`；使用 `BaseInputSlider` / `RateSlider` 处传入 `onCommit`。
- **触发点**：`onValueCommit` 触发时上报一次，`input_method: "slider"`。
- **同一字段双通道**：月 Base、期望涨幅同时有输入框（T2）和滑块（T3）两个入口，两个通道各报各的，用 `input_method` 区分，PostHog 里可拆分对比。

### T4 防抖聚合（onChange 直改状态、无 blur 提交点的输入，统一封装）

- **适用控件**：公积金基数（`ProvidentBaseInput`）、专项附加扣除（`DeductionInput`）、月支出（`ExpenseInput`）、股权/签字费（`ExtraModules`）、社保各险种比例（`SocialInsuranceEditor` 的比例输入框）、税率表单元格（`TaxBracketsEditor`）、方案重命名输入框。这些组件的 `onChange` 每次击键都直接改 state，没有失焦提交点。
- **机制**：以 `${scenario_role}:${field_key}` 为 key 做 **1.5 秒防抖**——连续输入期间不上报，停止输入 1.5 秒后上报一次。
- **兜底 flush**：切换 Tab、切换方案、页面 `visibilitychange` 进入后台时，立即发送队列中未上报的事件，防止防抖窗口内丢失。
- **实现要求**：防抖与 flush 逻辑统一封装在 `src/lib/analytics.ts` 的 `trackFieldEdit()` 内部，业务组件只在 `onChange` 里调一行，不侵入组件逻辑。

### 为什么不在 `updateScenario` 统一拦截

`use-salary-store.ts` 的 `updateScenario` 是所有薪资字段变更的必经之处，看似可以一处拦截全部字段。但它无法区分交互方式（键盘还是滑块）、无法感知拖动起止，且期望值反推月 Base 的联动逻辑（`use-salary-store.ts` 的 `useEffect`）也会经过它，会产生非用户操作的机器事件。因此拦截点放在各控件的提交回调（T1–T4），而不是 state 层。

---

## 6. 事件详表

### E-001 `$pageview` — 页面浏览（自动）

PostHog SDK 自动捕获，无需手写代码。

| 属性 | 来源 | 说明 |
|---|---|---|
| `$current_url` | 自动 | 页面 URL |
| `$referrer` / `utm_source` 等 | 自动 | 来源渠道（小红书引流链接务必带 `utm_source=xiaohongshu`） |
| 公共属性 | 自动附加 | 见 §3.2 |

**上报时机**：页面加载完成时（单页应用，每次会话一次）。

---

### E-002 `tab_switched` — Tab 切换　`T1`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `tab_key` | string | `scenario` / `diff` / `lookup` / `tax` | 目标 Tab（对应：方案管理 / 待遇综合对比 / 年包速查 / 税率表） |
| `from_tab` | string | 同上 | 来源 Tab；首次进入为 `null` |

**上报时机**：T1——点击顶部 Tab 按钮、切换生效时。
**代码位置**：`src/App.tsx` 的 tab 按钮 `onClick`（`setActiveTab` 处）。

---

### E-003 `scenario_added` — 新增 Offer　`T1`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `offer_count` | number | 1~N | 新增后的 Offer 总数（不含当前/期望方案）。数量非敏感信息 |

**上报时机**：T1——点击「+ 新增 Offer」成功创建后。
**代码位置**：`use-salary-store.ts` 的 `addScenario`。

---

### E-004 `scenario_removed` — 删除 Offer　`T1`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `offer_count` | number | 0~N | 删除后剩余的 Offer 总数 |

**上报时机**：T1——点击方案 chip 上的「×」删除成功后。
**代码位置**：`use-salary-store.ts` 的 `removeScenario`。

---

### E-005 `scenario_switched` — 切换编辑方案　`T1`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `scenario_role` | string | `current` / `expected` / `offer` | 目标方案角色。**不上报方案名称** |
| `offer_index` | number | 1~N | 仅 `scenario_role = offer` 时携带：目标 Offer 在列表中的序号 |

**上报时机**：T1——点击方案 chip、激活方案变化时。
**代码位置**：`src/App.tsx` 方案 chip 的 `onClick`（`setActiveScenarioId` 处）。

---

### E-006 `scenario_renamed` — 重命名方案　`T4`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `scenario_role` | string | `current` / `expected` / `offer` | 被改名方案的角色 |
| `offer_index` | number | 1~N | 仅 `scenario_role = offer` 时携带：被改名 Offer 的序号 |
| `name_length` | number | 0~N | 新名称的字符数（仅长度，不含内容） |

**上报时机**：T4——名称输入是逐字符 `onChange`（`App.tsx` chip 内 `<input>`），走防抖聚合；每次会话每个方案至多上报一次最终状态。
**代码位置**：`src/App.tsx` 方案 chip 内的 `<input onChange={renameScenario}>`。

---

### E-007 `field_edited` — 字段编辑（核心事件）　`T1/T2/T3/T4 按字段定`

统一描述所有薪资输入模块的"被使用"情况。**只标识字段，绝不上报输入值。**

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `scenario_role` | string | `current` / `expected` / `offer` | 所属方案角色 |
| `offer_index` | number | 1~N | 仅 `scenario_role = offer` 时携带：所属 Offer 的序号 |
| `field_key` | string | 见下表 | 字段标识 |
| `input_method` | string | `keyboard` / `slider` / `click` | 交互方式 |
| `is_default` | boolean | true / false | 编辑后的值是否等于默认值（可用于判断"只是点开看看"还是"真的改了"） |

`field_key` 取值全集（与 `SalaryData` 字段一一对应）：

| field_key | 对应 UI 模块 | 组件 | 触发类型 | 具体触发点 |
|---|---|---|---|---|
| `monthly_base` | 月 Base | `BaseInputSlider` | T2 + T3 | 输入框 blur 提交（`commit`）；滑块 `onValueCommit`（需按 §5-T3 改造） |
| `months` | 薪数 | `MonthsSelector` | T1 | 点击薪数按钮 |
| `provident_base` | 公积金基数 | `ProvidentBaseInput` | T4 | `onChange` 防抖 |
| `provident_personal_rate` | 公积金个人比例 | `RateSlider` | T3 | 滑块 `onValueCommit`（需按 §5-T3 改造） |
| `provident_company_rate` | 公积金公司比例 | `RateSlider` | T3 | 同上 |
| `si_base` | 社保缴纳基数 | `SocialInsuranceEditor` | T2 | blur 提交（`commitBase`） |
| `si_rate` | 社保各险种比例 | `SocialInsuranceEditor` | T4 | `onChange` 防抖（配合下方 `si_type` / `si_side` 属性） |
| `deduction` | 专项附加扣除 | `DeductionInput` | T4 | `onChange` 防抖 |
| `monthly_expense` | 月支出 | `ExpenseInput` | T4 | `onChange` 防抖 |
| `equity` | 股权/期权 | `ExtraModules` | T4 | `onChange` 防抖 |
| `signing_bonus` | 签字费 | `ExtraModules` | T4 | `onChange` 防抖 |

附加属性（仅 `field_key = si_rate` 时使用）：

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `si_type` | string | `pension` / `medical` / `unemployment` / `injury` | 险种类别 |
| `si_side` | string | `company` / `personal` | 单位/个人 |

**上报时机**：见上表"触发类型"列，四类机制的定义见 §5。
**代码位置**：各表单组件对应回调，见上表。

---

### E-008 `increase_committed` — 期望涨幅确认　`T2 + T3`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `input_method` | string | `keyboard` / `slider` | 通过输入框还是滑块 |
| `value_bucket` | string | 见 §7 分桶 | 涨幅区间，**不上报具体百分比** |

**上报时机**：
- 键盘：T2——涨幅输入框 `onBlur` 提交时（`App.tsx` 现有 blur 逻辑，值实际变化才报）；
- 滑块：T3——期望涨幅 Slider 的 `onValueCommit`（需按 §5-T3 改造，`App.tsx` 中该 Slider 目前只有 `onValueChange`）。

**代码位置**：`src/App.tsx` 期望涨幅面板的 `NumericInput onBlur` 与 `Slider`。

---

### E-009 `social_insurance_toggled` — 社保开关　`T1`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `scenario_role` | string | `current` / `expected` / `offer` | 所属方案角色 |
| `offer_index` | number | 1~N | 仅 `scenario_role = offer` 时携带：所属 Offer 的序号 |
| `enabled` | boolean | true / false | 切换后的开关状态 |

**上报时机**：T1——点击「扣除社保」复选框、状态变化时。
**代码位置**：`src/components/SocialInsuranceEditor.tsx` 的 checkbox `onChange`。

---

### E-010 `social_insurance_city_selected` — 选择社保城市预设　`T1`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `scenario_role` | string | `current` / `expected` / `offer` | 所属方案角色 |
| `offer_index` | number | 1~N | 仅 `scenario_role = offer` 时携带：所属 Offer 的序号 |
| `preset_kind` | string | `preset` / `custom` | 只区分"选了预设"还是"自定义"，**不上报具体城市名** |

**上报时机**：T1——城市预设下拉框 `onChange`。
**代码位置**：`SocialInsuranceEditor.tsx` 的 `applyPreset`。

---

### E-011 `lookup_range_committed` — 年包速查范围确认　`T2`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `which` | string | `min` / `max` | 改的是最低还是最高 Base 输入框 |
| `is_default` | boolean | true / false | 是否仍为默认范围 |

**上报时机**：T2——速查 Tab 中最低/最高月 Base 输入框 blur 提交时（值实际变化才报）。**不上报具体 Base 数值。**
**代码位置**：`src/components/SalaryTable.tsx` 的 `commitMin` / `commitMax`。

---

### E-012 `tax_bracket_edited` — 修改税率表　`T4`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `table` | string | `annual` / `bonus` | 年度综合所得税率表 / 年终奖税率表 |
| `field` | string | `limit` / `rate` / `deduction` | 被修改的列 |
| `bracket_index` | number | 1~7 | 第几级（级数不是敏感信息） |

**上报时机**：T4——单元格是逐字符 `onChange`（`TaxBracketsEditor` 的 `update`），走防抖聚合；**不上报修改后的数值**。
**代码位置**：`src/components/TaxBracketsEditor.tsx` 的 `update`。

---

### E-013 `tax_brackets_reset` — 恢复默认税率　`T1`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `table` | string | `annual` / `bonus` | 被重置的表 |

**上报时机**：T1——点击「恢复默认」按钮时。
**代码位置**：`TaxBracketsEditor.tsx` 的 `onReset`。

---

### E-014 `report_exported` — 导出对比图（核心转化）　`T1`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `success` | boolean | true / false | 导出是否成功 |
| `offer_count` | number | 0~N | 导出时对比的 Offer 数量 |
| `error_kind` | string | `render` / `resource` / `unknown` | 仅失败时上报，错误类别（不含报错原文，避免夹带 DOM 内容） |

**上报时机**：T1 变体——点击「导出对比图为 PNG」后，在 `html-to-image` 流程结束时上报（成功在 `toPng` resolve 后，失败在 `catch` 中），一次点击只报一次。
**代码位置**：`src/components/ExportReport.tsx` 的 `handleExport`。

---

### E-015 `background_switched` — 切换背景（低优先级）　`T1`

| 属性名 | 类型 | 取值 | 说明 |
|---|---|---|---|
| `change_kind` | string | `mode` / `color` | 切换模式还是纯色 |
| `bg_mode` | string | `flow` / `rain` / `solid` | 切换后的模式 |

**上报时机**：T1——点击头部「◑」或页脚色块时。
**代码位置**：`src/hooks/use-background.ts`。

---

## 7. 分桶规则（脱敏用）

需要上报"量级感"但又不能泄露原值时，统一使用区间分桶：

**涨幅 `value_bucket`（E-008）：**

```
"0"      → 0%
"0-10"   → (0%, 10%]
"10-20"  → (10%, 20%]
"20-30"  → (20%, 30%]
"30-50"  → (30%, 50%]
"50+"    → > 50%
```

后续如需对其他指标增加量级分析，一律新增 `*_bucket` 属性，不新增原值属性。

---

## 8. 隐私与合规

1. 页脚已有「数据仅供参考」声明，建议补充一句「本站使用匿名统计以改进产品，薪资数据均在本地计算，不会上传」。
2. PostHog 项目设置中关闭：Session Recording（会话录制）、Autocapture（自动捕获 DOM 内容）——二者可能夹带页面上的薪资数值，**必须禁用**，只保留手写事件 + `$pageview`。
3. 小红书宣传文案中避免出现「不收集任何数据」这类绝对化表述，改为「薪资数据不上传」。

---

## 9. 实施清单（按优先级）

**前置改造（随 P0 一起进行）：**

- `BaseInputSlider` / `RateSlider` 组件 props 增加 `onCommit`（§5-T3）；
- `App.tsx` 期望涨幅 Slider 增加 `onValueCommit`（§5-T3）；
- 新建 `src/lib/analytics.ts`：匿名 ID、公共属性注册、`track()`、`trackFieldEdit()`（内置 T4 防抖与 flush）。

| 批次 | 内容 | 事件 |
|---|---|---|
| P0 第一批 | SDK 接入 + 匿名 ID + 公共属性 + 前置改造 + 核心事件 | E-001, E-002, E-003, E-005, E-007, E-009, E-014 |
| P1 第二批 | 使用深度 | E-004, E-008, E-010, E-011 |
| P2 第三批 | 长尾行为 | E-006, E-012, E-013, E-015 |

**验收方式：**

1. PostHog 后台 Live Events 中逐条核对事件名与属性；
2. 滑块专项验收：拖动月 Base 滑块 3 秒，确认只产生 **1 条** `field_edited`（`input_method=slider`），而非几十条；
3. 防抖专项验收：在股权输入框连续输入 5 个字符，确认 1.5 秒后只产生 1 条 `field_edited`；
4. 构造一次完整操作（切 Tab → 改 Base → 开社保 → 导出），确认事件链完整且无任何数值型薪资属性；
5. 隔天再次访问，确认 Retention 报表中出现回访记录（`distinct_id` 稳定）。

---

## 10. 可视化看板搭建（PostHog 后台操作，无需写代码）

埋点上线积累数据后，在 PostHog 后台新建一个 Dashboard（建议命名「薪资速算器总览」），按下列清单逐个添加 Insight，每个做完点「Add to dashboard」：

### 10.1 访问量趋势（PV/UV）

- New Insight → **Trends** → 事件选 `$pageview`，按天展示 → 这是 PV 曲线；
- 同一 Insight 添加第二个 series，仍选 `$pageview`，Aggregated by 改为 **Unique users** → UV 曲线；
- 渠道效果：Add breakdown → 按 `utm_source` 分组（小红书引流链接须带 `utm_source=xiaohongshu`）。

### 10.2 Tab 使用情况

- **Trends** → 事件 `tab_switched` → **Breakdown by `tab_key`** → 图表类型选 Bar chart（总次数）→ 各 Tab 热度一目了然。

### 10.3 模块输入热度

- **Trends** → 事件 `field_edited` → **Breakdown by `field_key`** → Bar chart → 用户最常改哪些字段；
- 可加 Filter `input_method = slider` / `keyboard`，对比滑块与键盘的占比。

### 10.4 核心漏斗（访问 → 输入 → 导出）

- New Insight → **Funnels** → 步骤依次：`$pageview` → `field_edited` → `report_exported`；
- 直接读出转化率：多少访问者真的算了薪资、多少人导出了对比图。

### 10.5 留存

- New Insight → **Retention** → 事件选 `$pageview`（或 `field_edited`）；
- 直接输出 D1 / D7 留存矩阵，无需额外配置（前提是 §3 的匿名 ID 稳定）。

### 10.6 导出成功率

- **Trends** → 事件 `report_exported` → **Breakdown by `success`**。

---

## 11. 接入配置

- SDK：`posthog-js`（npm 依赖）。
- 配置项通过环境变量注入，代码中未配置时所有埋点静默跳过（不影响本地开发）：
  - `VITE_POSTHOG_KEY`：Project API Key（PostHog 后台 Project Settings 中获取；该 Key 本就是客户端公开用途，可安全提交）；
  - `VITE_POSTHOG_HOST`：`https://us.i.posthog.com`（US 区）或 `https://eu.i.posthog.com`（EU 区）。
- 本地开发：复制 `.env.example` 为 `.env` 填入 Key；生产构建（GitHub Pages）：构建前在环境中设置同名变量。
- SDK 初始化参数中已禁用 `autocapture` 与 Session Recording（§8 的双保险，PostHog 后台同样需确认关闭）。

---

*本文档随埋点实施持续更新；新增事件必须先过 §2 脱敏审查，并归入 §5 的触发类型之一。*
