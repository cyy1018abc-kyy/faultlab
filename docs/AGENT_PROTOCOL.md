# FaultLab Agent Arena — 外部 Agent 接入协议

> 协议版本：`arena_version = "0.1"`  
> 适用页面：`#/arena`（Agent 诊断竞技场，V0.1 扩展预览）  
> 当前运行时：页面内置 5 个**确定性诊断算法**（固定阈值、残差检验、累积和、贝叶斯、多信号融合），
> **不是 LLM**。本协议为未来真实 AI / LLM Agent 预留统一接入面；外部 Agent 只拿到盲观测流，
> 不接触真值。  
> 契约来源：`docs/CONTRACT.md` §11；实现：`src/agents/builtin-agents.js`、`src/agents/arena.js`、
> `src/ui/pages/arena.js`。

> **G0 裁决注记（2026-10-27T20:35）**：Agent Arena 为 **P2 扩展预览**，不属于 V0.1 P0 验收路径
> （`FaultLab-evaluation/DECISIONS/DECISIONS.md` G0-DEC-14/15、`NEXT/SCOPE_SPLIT_MEMO.md`）。
> 本协议为草案（`arena_version="0.1"`），**未经 G0 评审**。文中"真值隔离"在当前实现中是
> `blindVisible` 过滤 + 导出包断言（**UI 级**），**不是安全边界**；契约级隔离以
> `FaultLab-evaluation/NEXT/DATA_CONTRACT_SPEC.md` 的 `exposure` 字段与 `project('blind')` 纯函数为准。
> 评分/排行榜只能表述为"合成场景的 Agent 评测游戏"，**不得表述为真实诊断能力/检出率/误报率证据**。

---

## 1. 盲测流程（外部视角）

1. 用户在竞技场选择系统（`FL-001` / `FC-001` / `GT-001`）、轮数、seed、是否叠加观测噪声、参赛 Agent，
   点击「开始盲测」。
2. 页面逐轮生成**隐藏场景**（故障家族、幅值、注入时刻、反馈模式），调用 `FL.core.simulate(config)`，
   只抽取 `blindVisible === true` 的观测通道，按 0.1 s 顺序回放。
3. 内置 Agent 在线 `observe(sample)`，t=60 s 统一收卷并评分；页面揭晓真值。
4. 用户导出「盲测数据包」（单轮或整场）交给外部 Agent。
5. 外部 Agent 产出「诊断结果 JSON」，用户在「导入外部诊断」中上传/粘贴；系统按**同一评分函数**
   逐轮打分，并以「外部导入」身份加入排行榜。

比赛进行中 `truthSealed = true`：shell 临时禁用「实时曲线 / 因果解释 / 结果对比」入口；比赛结束
（包括异常中断）自动解封。外部 Agent 不得通过页面、URL、导出包获取真值。

---

## 2. 真值隔离声明（强制）

盲测数据包与回放给 Agent 的样本**只包含盲观测通道**，严禁出现以下内容：

- `truth` / `run.truth` / 真值对象；
- `*_true_*` 通道（如 `P_gen_true_kW`、`I_bat_true_A`、`f_true_Hz`）；
- `bias_A` 等故障注入通道；
- `*_cap_*` 等执行器限制通道（如 `P_gen_cap_kW`）；
- 故障配置（`config.fault`、故障家族、注入时刻、幅值）与 `FAULT_EVENT` 类通道。

导出包中的 `truth_sealed: true` 是**封存声明字段**，本身不携带真值。导出前会递归扫描对象键名与
观测通道 id；发现 `truth` / `_true_` / `bias` / `cap` / 故障配置字段会直接抛错，不生成文件。

> 安全提醒：数据包的 `match.seed` 用于**复现公开研究结果**。三系统模型与场景生成器在源码中公开，
> 因此拥有源码的人理论上可由 seed 重放场景。接入方应把该字段仅用于可复现性，不应据此反推当前
> 轮真值；正式盲评场景应由评测方在服务端封存数据生成逻辑。本协议面向离线演示与未来接入验证。

---

## 3. 盲测数据包（导出格式）

页面「导出第 N 轮盲测包」调用 `FL.arena.exportRoundBundle(match, round)`；
「导出整场数据包」调用 `FL.arena.exportMatchBundle(match)`。两者都满足：

- `arena_version: "0.1"`；
- `truth_sealed: true`；
- 只含 `observables + samples + scoring_spec + match/round 元信息`；
- 不含 `run`、`results`、`truth` 或任何诊断/评分结果。

### 3.1 单轮数据包 JSON Schema（概念）

```jsonc
{
  "arena_version": "0.1",
  "schema": "faultlab.arena.round.v1",
  "truth_sealed": true,
  "exported_at": "2026-10-27T11:28:48.762Z",

  "match": {
    "id": "Arena-FL-001-S20261027-R6",
    "systemId": "FL-001",
    "modelVersion": "1.0.0",
    "seed": 20261027,
    "rounds": 6,
    "noise": false
  },

  "round": {
    "index": 1,                 // 1-based，与诊断结果的 round 对齐
    "dt_s": 0.1,
    "duration_s": 60,
    "observables": [            // 盲观测通道元数据（顺序 = samples 的列顺序）
      { "id": "I_bat_meas_A",     "label": "电池测量电流",     "unit": "A"  },
      { "id": "I_ref_A",          "label": "控制器电流目标",   "unit": "A"  },
      { "id": "P_bat_meas_kW",    "label": "电池测量功率",     "unit": "kW" },
      { "id": "P_gen_meas_kW",    "label": "发电机测量功率",   "unit": "kW" },
      { "id": "P_load_demand_kW", "label": "负载需求功率",     "unit": "kW" },
      { "id": "V_bus_V",          "label": "直流母线电压",     "unit": "V"  },
      { "id": "SOC_est_pct",      "label": "估计 SOC",         "unit": "%"  },
      { "id": "r_meas_kW",        "label": "测量一致性残差",   "unit": "kW" }
    ],
    "samples": [                // [t, v1, v2, …, vN]，共 601 行，t = 0.0…60.0 s
      [0.0, 25.0, 25.0, 10.0, 20.0, 30.0, 400.0, 60.0, 0.0],
      [0.1, 25.0, 25.0, 10.0, 20.0, 30.0, 400.0, 59.999722, 0.0]
    ]
  },

  "scoring_spec": {
    "arena_version": "0.1",
    "scale": 100,
    "weights": {
      "detection": 0.20, "family": 0.25, "component": 0.10,
      "magnitude": 0.15, "latency": 0.15, "calibration": 0.15
    },
    "falseAlarmPenalty": 10,
    "latencyWindow_s": 12,
    "healthyRatio": 0.2
  }
}
```

### 3.2 整场数据包

与单轮包结构一致，只是把 `round` 换成 `rounds` 数组：

```jsonc
{
  "arena_version": "0.1",
  "schema": "faultlab.arena.match.v1",
  "truth_sealed": true,
  "exported_at": "…",
  "match": { "id": "…", "systemId": "GT-001", "modelVersion": "1.0.0", "seed": 7, "rounds": 3, "noise": true },
  "rounds": [
    { "index": 1, "dt_s": 0.1, "duration_s": 60, "observables": [ … ], "samples": [ … ] },
    { "index": 2, "dt_s": 0.1, "duration_s": 60, "observables": [ … ], "samples": [ … ] }
  ],
  "scoring_spec": { … }
}
```

`observables` 在不同系统/场景下可能不同（例如 `GT-001` 的盲观测包含
`f_meas_Hz`、`n_meas_rpm`、`valve_cmd_pct`、`valve_meas_pct`；`FC-001` 包含
`I_fc_meas_A`、`I_fc_ref_A`、`valve_cmd_pct`、`valve_meas_pct`）。外部 Agent 必须以包内
`observables` 为准，不能写死列顺序或系统信号。

### 3.3 时间与单位

- 时间单位秒，`dt_s = 0.1`，每轮固定 601 点（含 t=60.0）。
- 功率 kW、电流 A、电压 V、频率 Hz、转速 rpm、SOC 百分数、开度/限幅百分比 `%`。
- 各系统 `P = 0.4 × I`（等效 400 V 恒压）仅是三系统行为级模型的固有换算，外部 Agent 不应假设真实设备如此。

### 3.4 故障家族与部件枚举

`faultType` 只能取：

| faultType | 中文 | 语义 |
|---|---|---|
| `sensor_drift` | 传感器漂移 | 测量通道阶跃偏置；闭环下控制器按错误测量反馈，真实状态被改变 |
| `load_step` | 负载冲击 | 负载需求阶跃（物理输入，与控制模式无关） |
| `actuator_fault` | 执行器异常 | 变换器/阀门等执行器受限，指令无法被跟随 |
| `none` | 健康 | 本轮无故障注入 |

受影响部件 `component` 的合法 id（系统静态结构，公开信息）：

| 系统 | sensor_drift | load_step | actuator_fault |
|---|---|---|---|
| `FL-001` 电池储能 | `sensor` | `load` | `converter` |
| `FC-001` 燃料电池 | `sensor` | `load` | `valve` |
| `GT-001` 燃气涡轮 | `speed_sensor` | `load` | `valve` |

健康局应返回 `faultDetected:false, faultType:"none", component:"none"`。

### 3.5 盲观测通道参考

具体以导出包 `observables` 为准；典型盲观测：

- `FL-001`：`I_bat_meas_A`、`I_ref_A`、`P_bat_meas_kW`、`P_gen_meas_kW`、`P_load_demand_kW`、
  `V_bus_V`、`SOC_est_pct`、`r_meas_kW`。
- `FC-001`：`I_fc_meas_A`、`I_fc_ref_A`、`P_fc_meas_kW`、`I_bat_meas_A`、`P_bat_meas_kW`、
  `P_bat_est_kW`、`P_load_demand_kW`、`V_bus_V`、`SOC_est_pct`、`r_meas_kW`、`valve_cmd_pct`、`valve_meas_pct`。
- `GT-001`：`f_meas_Hz`、`n_meas_rpm`、`P_gen_meas_kW`、`P_gen_cmd_kW`、`P_bat_meas_kW`、
  `P_load_demand_kW`、`V_bus_V`、`SOC_est_pct`、`r_meas_kW`、`valve_cmd_pct`、`valve_meas_pct`。

**不允许**把 `r_meas_kW` 的观测残差解释为真实能量损失；它是测量一致性残差。

---

## 4. 诊断结果 JSON（外部 Agent 提交格式）

外部 Agent 对每一轮输出一个诊断对象。可提交单轮对象，也可提交轮次数组（推荐）。

### 4.1 单轮

```json
{
  "arena_version": "0.1",
  "agent": { "name": "my-diagnoser-v1" },
  "round": 1,
  "diagnosis": {
    "faultDetected": true,
    "faultType": "sensor_drift",
    "component": "sensor",
    "magnitude": { "value": 10.0, "unit": "A" },
    "detectTime_s": 20.3,
    "confidence": 0.92,
    "explanation": "t=20.0 s 后测量一致性残差持续约 4.0 kW，负荷需求未变化；按 P=0.4I 换算估计通道偏置约 +10 A。"
  }
}
```

### 4.2 多轮数组

```json
[
  {
    "arena_version": "0.1",
    "agent": { "name": "my-diagnoser-v1" },
    "round": 1,
    "diagnosis": { "faultDetected": true, "faultType": "sensor_drift", "component": "sensor", "magnitude": { "value": 10, "unit": "A" }, "detectTime_s": 20.3, "confidence": 0.92, "explanation": "…" }
  },
  {
    "arena_version": "0.1",
    "agent": { "name": "my-diagnoser-v1" },
    "round": 2,
    "diagnosis": { "faultDetected": false, "faultType": "none", "component": "none", "magnitude": null, "detectTime_s": null, "confidence": 0.05, "explanation": "所有观测特征在阈值内。" }
  }
]
```

也接受容器对象：`{ "arena_version":"0.1", "agent":{"name":"…"}, "results":[ … ] }`，
其中每项为 `{ "round": n, "diagnosis": { … } }`（页面导入按钮同款）。

### 4.3 字段定义

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `faultDetected` | boolean | 是 | 是否检出故障。健康局应返回 `false` |
| `faultType` | string | 是 | `sensor_drift` / `load_step` / `actuator_fault` / `none` |
| `component` | string | 建议 | 受影响部件 id（见 §3.4）或 `"none"` |
| `magnitude` | object \| null | 否 | `{ "value": number, "unit": "A" }`；单位必须与真值口径一致，否则该项 0 分 |
| `detectTime_s` | number \| null | 否 | **首次报警的采样时刻**（0.1 s 网格）；用于延迟评分。未报警为 `null` |
| `confidence` | number 0–1 | 是 | 对「本轮是否存在故障」的置信度；用于 Brier 校准项 |
| `explanation` | string | 否 | 一句中文解释；应引用盲观测依据，不得引用真值 |

`magnitude` 真值口径：

- `sensor_drift`：`FL-001` / `FC-001` 单位为 `A`（测量通道偏置幅值）；`GT-001` 单位为 `Hz`（转速通道频率偏置）。
- `load_step`：单位 `kW`（负荷需求阶跃量）。
- `actuator_fault`：单位 `%`（执行器受限比例 / 阀位卡涩开度）。

### 4.4 校验规则

`parseExternalBundle` 会严格校验并返回 `{ ok, errors, data }`：

- JSON 解析失败、非对象/数组；
- `arena_version` 出现且不等于 `"0.1"`；
- `round` 非从 1 开始的整数或重复；
- `faultDetected` 非布尔、`faultType` 非法、`component` 非字符串；
- `magnitude` 非 `{ value:number, unit:string }` 或 `null`；
- `detectTime_s` 负数或非数值；
- `confidence` 不在 `[0,1]`；
- 同一文件内 Agent 名称不一致。

页面导入时，轮次不在本场比赛中、或缺少某些轮次会给出提示；**已提交轮次计入平均分**，
未提交轮次不计入平均分（排行榜「覆盖 n/N」列可见）。

---

## 5. 评分公式（单轮，100 分制）

```
weights = { detection: 0.20, family: 0.25, component: 0.10,
            magnitude: 0.15, latency: 0.15, calibration: 0.15 }

故障局（真值 = 某故障家族）：
  detection   = 正确报警 ? 1 : 0
  family      = faultType === 真值家族 ? 1 : 0
  component   = component === 真值部件 ? 1 : 0
  magnitude   = max(0, 1 − |估计值 − 真值| / |真值|)（单位必须一致；缺失 = 0）
  latency     = max(0, 1 − (detectTime_s − 真值故障时刻) / 12)
  calibration = 1 − (confidence − 1)²

健康局（真值 = 无故障）：
  未报警 → detection / family / component / magnitude / latency 均 = 1
  误报   → 上述项 = 0，且 falseAlarm = 1

单轮总分 = clamp(100 × Σ(权重 × 得分) − 10 × falseAlarm, 0, 100)
```

排行榜聚合：平均分、检出率（故障局中正确报警比例）、平均延迟（已检出轮次的
`detectTime_s − 故障时刻` 均值）、误报率（健康局中误报比例）、家族准确率（故障局中家族正确比例，
未检出计错）。比赛内所有轮次同权重；健康局约 20% 概率（轮数 ≥3 且随机结果无健康局时，
会把中间一轮替换为健康局，以保证误报率有数据）。

示例：某故障局家族/部件/幅值/检测全对，`detectTime_s` 比故障时刻晚 1.0 s，confidence = 0.9：
`100 × (0.20 + 0.25 + 0.10 + 0.15 + 0.15×(1−1/12) + 0.15×(1−0.01)) ≈ 99.6` 分。

---

## 6. 如何用脚本消费（离线、零依赖）

### 6.1 数据流

```text
页面导出 round/match 盲测包 (JSON)
        ↓ 文件系统 / 手工复制
外部 Agent 读取 observables + samples → 在线/离线推理
        ↓
写出诊断结果 JSON（round + diagnosis）
        ↓
页面「导入外部诊断」→ parseExternalBundle → 逐轮评分 → 排行榜「外部导入」
```

### 6.2 Python 伪代码

```python
import json, sys

bundle = json.load(open("FaultLab_arena_FL-001_seed20261027_round1.json", encoding="utf-8"))
assert bundle["truth_sealed"] is True
assert bundle["arena_version"] == "0.1"

obs = [o["id"] for o in bundle["round"]["observables"]]
dt = bundle["round"]["dt_s"]
rows = bundle["round"]["samples"]

def run_agent(obs, rows):
    # 这里替换为你的诊断算法 / 未来 LLM Agent
    # 只允许读取 rows 中的盲观测；禁止猜测/查询本场真值
    fault, family, component, mag, t_detect, confidence = False, "none", "none", None, None, 0.05
    for t, *values in rows:
        sample = dict(zip(obs, values))
        # TODO: 特征提取 / 报警逻辑
        pass
    return {
        "faultDetected": fault, "faultType": family, "component": component,
        "magnitude": mag, "detectTime_s": t_detect,
        "confidence": confidence,
        "explanation": "外部 Agent：……"
    }

diagnosis = run_agent(obs, rows)
submission = {
    "arena_version": "0.1",
    "agent": {"name": "my-python-diagnoser"},
    "round": bundle["round"]["index"],
    "diagnosis": diagnosis,
}
json.dump(submission, open("my_external_diagnosis.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
```

### 6.3 Node.js 伪代码

```js
const fs = require('fs');
const bundle = JSON.parse(fs.readFileSync('FaultLab_arena_FL-001_seed20261027_round1.json', 'utf8'));
const { observables, samples, index } = bundle.round;
const diagnosis = {
  faultDetected: false, faultType: 'none', component: 'none',
  magnitude: null, detectTime_s: null, confidence: 0.05,
  explanation: '外部 Agent：本轮所有观测特征在阈值内。'
};
// 回放：samples 行格式 [t, v1, …, vN]，列顺序 = observables
for (const row of samples) {
  const t = row[0];
  const s = {};
  observables.forEach((o, j) => { s[o.id] = row[j + 1]; });
  // TODO: 你的 observe(t, s) 逻辑
}
fs.writeFileSync('my_external_diagnosis.json', JSON.stringify({
  arena_version: '0.1', agent: { name: 'my-node-diagnoser' }, round: index, diagnosis
}, null, 2));
```

### 6.4 命令行（零依赖）

```powershell
# 将页面导出的 JSON 保存到当前目录后：
python my_agent.py FaultLab_arena_FL-001_seed20261027_round1.json my_external_diagnosis.json
# 回到竞技场页面 →「导入外部诊断」→ 选择/粘贴 my_external_diagnosis.json → 导入并评分
```

### 6.5 浏览器控制台直接调用（调试用）

```js
// 查看 Agent 名单
FL.arena.listAgents();

// 导出数据包对象（不下载）
const m = FL.store.getState().pageState.arena.match;
const bundle = FL.arena.exportRoundBundle(m, 1);

// 解析外部诊断（字符串或对象）
const parsed = FL.arena.parseExternalBundle(jsonText);
// => { ok, errors, data }

// 给某一轮外部诊断评分（round 使用 1-based，与导出包 round.index 一致）
const score = FL.arena.scoreExternalDiagnosis(m, 1, parsed.data.rounds[0].diagnosis);
// => { total, detection, family, component, magnitude, latency, calibration, falseAlarm, raw }
```

---

## 7. 内置 Agent（当前运行时）

| id | 名称 | 类型 | 已知弱项 |
|---|---|---|---|
| `sensor-limit` | 固定阈值报警 | 阈值规则 | 不分析指令-反馈偏差（漏执行器），幅值单位口径不做换算，无持续性检验 |
| `residual` | 残差检验 | 模型残差 | 无转速/电气频率交叉校验；首报家族可能被暂态残差锁定 |
| `cusum` | 累积和变点 | 统计变点 | 需要累积证据、延迟略高；多故障特征并存时家族判别不稳定 |
| `bayes` | 特征贝叶斯 | 概率模型 | 类条件分布与先验人工设定；暂态会拉低后验 |
| `fusion` | 多信号融合 | 多信号融合 | 规则/阈值人工设定，对未建模新型故障无泛化能力 |

内置 Agent 与外部 Agent 使用**同一** `observe/diagnose` 接口与评分函数：

```js
const agent = FL.agents.create('fusion', meta);   // meta 不含真值
agent.observe({ t: 20.1, s: { I_bat_meas_A: 34.9, … } });
const diagnosis = agent.diagnose();
```

---

## 8. 版本、兼容与限制

- `arena_version = "0.1"`；诊断结果中出现其他版本会被拒绝。
- 本协议为离线演示与未来接入预留：**当前页面运行时没有真实 LLM 调用**，也不做网络请求。
- 数据来自 L0 行为级解析模型，不是 Simulink、现场数据或实测结论。
- 盲测包不包含真值；请不要尝试通过 seed、源码重放或页面内部状态反推当前轮真值。
- 若未来引入服务端盲评，导出包应由服务端生成并在评分后才返回真值；本协议字段保持兼容。
