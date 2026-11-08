# SCENARIO_SHARING — 场景共享指南（信封导出 / 导入 / 校验 / 故障排除 / 威胁模型声明）

> **定位**：场景编排（C-2 页）产出物「场景信封 JSON」的流转指南（C-5，DEC-3 /
> CHG-20261108-01；体例参照 `FaultLab-evaluation/NEXT/EVAL_TRACK_GUIDE.md` §6）。
> 读者：想把一份场景发给同事/学员、或收到场景文件想要导入运行的人。
> **流转面**：手动文件流转——导出 → 复制 → 导入，**无云存储、无账户体系**（I-1）；
> 全程零网络、零注册（工具链离线，`node` 仅用于可选的离线复核）。
> 事实源：`src/core/scenario.js`（信封契约与双格式导入）、`src/ui/pages/scenario.js`
> （导出/导入入口）、`tests/scenario.test.js` §9（契约测试）。

## 1. 信封格式

场景页「导出场景信封」产出的 JSON（`src/core/scenario.js` `exportScenarioEnvelope`）：

```json
{
  "kind": "faultlab.scenario",
  "version": 1,
  "content_checksum": "<64 位十六进制（SHA-256）>",
  "scenario": { "version": 1, "system": "FL-001", "events": [ ... ] }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `kind` | string，恒为 `faultlab.scenario` | 信封命名空间；错值直接拒收（不回退裸场景解析） |
| `version` | number，恒为 `1` | **信封**版本（与场景 schema 版本相互独立）；其它值拒收 |
| `content_checksum` | 64 位十六进制 | 场景本体的内容哈希（`scenarioHash`，canonical v1 严格模式），导入时与重算值比对 |
| `scenario` | object | 归一化场景（schema v1：system / events / 可选 scenario_id、label） |

要点：

1. **确定性**：信封无时间戳、无随机——同一场景两次导出逐字节同 JSON（与教学路径
   `exportTeachingPath` 信封同先例）。
2. **校验和覆盖面**：只覆盖执行相关内容（system / 事件序 / key / family / params /
   t_start_s / t_clear_s / inertia_model / thermal_model / feedback_mode）。
   `scenario_id` 与 `label` 是元数据，**不入校验和**——两份仅 label 不同的信封校验和相同，属预期。
3. **裸场景 JSON 仍被接受（back-compat）**：信封引入前的导出文件、教学页生成的场景草稿
   （无 `kind` 键）走既有裸场景解析路径，行为零变化；裸格式没有校验和，导入只做 schema 校验。

## 2. 导出（发送方）

1. 打开 **场景页** → 导入或载入样例 → 「解析校验」通过；
2. 点击 **「导出场景信封」** → 浏览器下载 `FaultLab_scenario_<id>_<时间戳>.json`
   （文件名含下载时刻，信封内容本身零墙钟字段）；
3. 把该 `.json` 文件按任意线下渠道交付接收方（邮件/聊天/拷贝均可——工具链不经手传输）。

导出的是**归一化形态**场景（参数按目录默认值补齐、模型深度轨已解析盖章），接收方再导入
复现同一内容哈希（roundtrip 等价，`tests/scenario.test.js` §9.2 断言）。

## 3. 导入（接收方）

两种等价入口（`src/ui/pages/scenario.js` `parseCurrent` → `importScenarioEnvelope`）：

1. **选择 JSON 文件**：导入面板 → 「选择 JSON 文件」；
2. **粘贴文本**：把文件内容整段粘进文本框。

两种入口、两种格式（信封 / 裸 JSON）行为一致。信封导入通过后，校验区显示
「信封校验一致（content_checksum 与重算一致）」；随后「运行场景」照常。

## 4. 离线校验（可选，导入前人工复核）

不打开页面也能离线复核任意场景文件（信封或裸 JSON 均可）的校验和与合法性——在仓库根目录：

```bash
node -e "
const {bootstrap} = require('./tests/core-load');
const FL = bootstrap();
const fs = require('fs');
const r = FL.core.scenario.importScenarioEnvelope(fs.readFileSync(process.argv[1], 'utf8'));
if (!r.ok) { console.error('FAIL:', JSON.stringify(r.errors)); process.exit(1); }
console.log('OK via=' + r.via, 'content_checksum=' + (r.content_checksum || '-'));
console.log('scenarioHash =', FL.core.scenario.scenarioHash(r.scenario));
" <场景文件.json>
```

- `OK via=envelope`：信封三门（kind / version / 校验和）全过；`content_checksum` 即信封声明值；
- `OK via=bare`：裸场景合法（无校验和面，只做 schema 校验）；
- `FAIL: [...]`：结构化错误列表（field + message），见 §5 排查表。

发送方与接收方对同一文件跑出同一 `scenarioHash`，即内容一致（这是「校验和可复核」的完整含义：
复核人自己重算，不依赖发送方声明）。

## 5. 故障排除

导入失败一律给出**结构化错误列表**（字段名 + 原因），不静默修正、不静默重算放行。
常见条目对照：

| 错误（field） | 原因 | 处理 |
|---|---|---|
| `scenario JSON 解析失败` | 文本不是合法 JSON（复制时截断/混入其它文本） | 重新完整复制文件内容；优先用「选择 JSON 文件」入口 |
| `kind 未知信封 kind …` | `kind` 值不是 `faultlab.scenario`（手改或异构信封） | 向发送方索要场景页原样导出的文件 |
| `version 只支持信封 version = 1` | 信封版本高于本引擎（更新版本导出） | 确认双方版本；不接受降级改写 |
| `content_checksum 缺少…` | 信封缺完整性字段（手工删改） | 重新导出；或确认是裸场景后直接用裸 JSON（勿手工拼信封） |
| `content_checksum 必须是 64 位十六进制…` | 校验和字段损坏 | 重新导出 |
| `content_checksum 内容校验和不符：信封声明 …，实际重算 …` | **场景内容与校验和不一致**——文件在流转中被改动，或校验和与场景不配套 | 不要手工改校验和去迁就内容；让发送方重新导出 |
| `content_checksum` + 原因 `不符`（改了 events/params 后） | 收到的是「手改过事件的信封」 | 手改后信封必须重新由场景页导出（或退回裸 JSON 流转） |
| `extra 未知信封字段…` | 信封带封闭字段之外的字段 | 信封字段封闭（kind/version/content_checksum/scenario）；重新导出 |
| `scenario.events[0].… 场景解析失败`（带 `scenario.` 前缀） | 信封内场景本体未过 schema v1 校验（越界参数/未知族/网格不合等） | 按 field 指示修场景本体；或由发送方在场景页改后重新导出 |
| 裸场景路径各 field（`version` / `system` / `events[…]`） | 裸 JSON 未过既有 schema v1 校验 | 同既有导入行为；逐条按 message 修正 |

注意：只改 `label` / `scenario_id` 不影响校验和（§1 要点 2）；改任何 `events` 内容都会破坏
信封校验和——这是**设计行为**（完整性面），不是缺陷。

## 6. 威胁模型声明（导入方的安全边界）

| 面 | 声明 |
|---|---|
| **closed-world 白名单即安全边界** | 导入面只做**解析与封闭白名单校验**（信封字段、场景 schema v1 的 system/family/params/t 时刻域/枚举键全部封闭），不执行文件中的任何代码、不 eval、不触网；非法输入一律拒绝并出结构化错误。能进入运行的只有白名单内的数据面。 |
| **checksum 即完整性面** | `content_checksum` 只证明「场景内容与校验和在字节层面配套」——检测流转中的**意外损坏或无配套的改动**。它由发送方与接收方各自可重算（§4），是可复核的一致性凭据。 |
| **无签名，非来源认证** | 校验和**不是数字签名**：任何持有文件的人都能为改动后的内容重算一份配套校验和。它**不代表签名、来源证明或第三方认证**——不能回答「这份场景是谁写的」，只能回答「这份文件与我复核的内容一致」。来源鉴别请走线下渠道（当面/可信信道确认发送方身份）。 |
| **导入 ≠ 认可** | 校验通过只说明场景合乎 schema v1 白名单；不说明场景的教学设计合理、参数取值适当，更不做任何真实诊断/检测声明。场景语义由发送方负责说明。 |
| **I-1 手动流转** | 无云同步、无账户体系、无在线注册；文件经线下渠道手动复制，工具链零网络。泄漏面 = 你把文件交给谁，不经过任何服务端。 |
| **合成演示定位** | 场景运行产物为解析行为级演示（L0）的合成示例数据（synthetic），只在本演示假设内成立；本指南与导入面不做检测/定位/诊断声明。 |

## 7. 契约面与测试

- 信封契约：`src/core/scenario.js`（`ENVELOPE_KIND` / `ENVELOPE_VERSION` /
  `exportScenarioEnvelope` / `importScenarioEnvelope`；信封字段白名单 `ENVELOPE_KEYS`）；
- UI 入口：`src/ui/pages/scenario.js`（导出 `exportScenario` → 信封；导入 `parseCurrent` →
  `importScenarioEnvelope` 双格式分派；I-1 手动流转提示）；
- 契约测试：`tests/scenario.test.js` §9（导出确定性 / roundtrip 同哈希 / 校验和篡改拒绝 /
  裸 JSON back-compat / 信封 version·kind·未知字段·内嵌非法场景拒绝）；
- 运行：`node tests/scenario.test.js`（失败非零退出）。

**文件结束**。SCENARIO_SHARING v1（2026-11-08，CHG-20261108-01 / V090_WAVE_DESIGN DEC-3）。
