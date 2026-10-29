# V3-22 评测协议双路独立评审记录（V3-21 草案 v1 → v1.1，2026-10-30）

> **任务**：`NEXT/V0.3_PLAN_APPROVED.md` §2.4 V3-22（评审对象 = `NEXT/ARENA_EVAL_PROTOCOL_DRAFT.md`）。
> **方法**：双路独立上下文 Agent 对抗评审（红线 5：G6 评审默认双路；评审员互不可见；只读）。
> **评审输入**：协议草案 v1 + V3-20 评估记录 + 现行代码（arena.js/schema.js/rng.js）与文档。
> **记录人**：实现 Agent（Lead 裁定与修订处置同日完成）。

## 1. 评审员与总判定

| 评审 | 视角 | 总判定 | 关键发现 |
|---|---|---|---|
| **C** | 真值隔离/对抗（攻击者推演） | **CONDITIONAL GO** | F-1 [BLK]：v1 的 `testset_id` 末段含 set_seed 材料——8 hex 即 32 位 mulberry32 全部种子空间，LEAK-1 从前门复活；另有 F-2 红线过度承诺、F-3 deriveChangePoints 实为软事件表、F-4 open_seed 种子空间共用与提交无绑定、F-5 组织方零约束 |
| **D** | 工程可实现性 | **CONDITIONAL GO** | F-01 [BLK]：`scoring_rules:"v2"` 只是指针，六项权重/窗口/舍入语义不在协议文本，第三方复算是空头支票；F-02 [BLK]：score_hash 序列化未定义（canonical JSON/浮点记法/字节口径）；F-03 index 0/1-based 矛盾；F-04 sealedProjection 两母体矛盾（裸 `fault` 键、project('blind') 自产 trigger_s）；F-06 组织方生成器缺位 |

两路评审**互不可见**，对「v1 方向成立、文本层必须修」结论独立一致。

## 2. 评审 C 发现项（全量）

| # | 级别 | 要点 | 处置 |
|---|---|---|---|
| C-F-1 | **[BLK]** | `testset_id=…-<set_seed8>` 把种子写进盲包：8 hex=完整 32 位种子；未加钥哈希截断可 2^32 枚举且观测数据是真值过滤器（分钟级恢复）；「泄漏不在字段名而在标识符值里」 | **已修**：v1.1 §3 重写——末段=独立 CSPRNG 随机串（或 ≥128 bit 加钥 H），明文禁止任何包内标识符为 set_seed 确定性函数；新增 N-B13/N-B14 守卫 |
| C-F-2 | [MAJ] | 红线 4「赛时不以任何形式可推导」与游戏本体矛盾：观测流跳变直接 readable family/magnitude/tStart（这是诊断游戏的输入信号，不是泄漏）；latency 分项会因此恒满 | **已修**：v1.1 §1.3-4 改写为「禁确定性复算 ≠ 允许观测派生估计」二分边界；§6.4 latency 注记；全文清除过度承诺表述 |
| C-F-3 | [MAJ] | §6.3「deriveChangePoints 不是事件信息」数学上不成立（SNR≈28 ⇒ 输出≈{tStart}，候选点存在性≈healthy 位）——LEAK-2 变相复活 | **已修**：v1.1 §5.2 禁项改按「来源可派生性」定义消除字面冲突；§6.3 定性改为「事件信息的观测派生等价物」+ sr1 冻结前必须测量公布健康局假候选率（QP-4 前置） |
| C-F-4 | [MAJ] | open_seed「不计分」只是声明；同一 seed 可共用演示集与计分集（默认 20261027）；提交 JSON 无 testset_id/match_id 绑定 ⇒ 一份 diagnosis 可对任意盲包重放 | **已修**：v1.1 §5.4 计分轨硬拒收 + 种子空间不相交 + 禁默认 seed；§6.1 提交增加绑定字段、V-07/V-08 校验（N-B15） |
| C-F-5 | [MAJ] | 组织方是赛前唯一见真值者但零约束：seed-shopping、关联 Agent 自任 Verifier、测试集偏态 | **已修**：v1.1 §3/§4：发放即冻结、关联 Agent 披露 + Verifier 回避、scenario_rules 多样性下限（家族 ≥2、健康局占比带） |
| C-F-6 | [MIN] | 工程绕过面：递归扫描无深度上限、键归一化/`__proto__`/同形键、值级走私（v1 match_id 值格式内嵌 seed）、哈希拼接歧义 | **部分已修**（文本层）：v1.1 V-00 深度/体积上限、键精确匹配声明、§5.6 UUID 格式校验 + 禁 v1 值格式、§4 canonical_json；实现细节（fixtures）留实现期 |
| C-F-7 | [MIN] | score_report 字段面未冻结（聚合指标可能踩措辞红线）；「低能力」措辞 | **已修**：v1.1 §6.4 展示名游戏化冻结；「低门槛」更正 |
| C-新增 | — | 负例 N-B13…N-B17（种子材料/值内嵌/跨包重放/深度炸弹/open_seed 混轨） | **已增补**：v1.1 附录 A 共 17 条 |

## 3. 评审 D 发现项（全量）

| # | 级别 | 要点 | 处置 |
|---|---|---|---|
| D-F-01 | **[BLK]** | `scoring_rules:"v2"` 是指针不是规格：权重（0.20/0.25/0.10/0.15/0.15/0.15）、latency 窗口 12 s、healthy_policy、舍入语义全在 arena.js——第三方复算不可能 | **已修**：v1.1 §6.4 冻结完整数值规格（含各分项公式、舍入半向上、分项十进制串化）；reveal 内嵌规格全文 |
| D-F-02 | **[BLK]** | score_hash 序列化未定义：拼接歧义、JS/Python 浮点指数记法分歧、盲包 sha256 字节口径、exported_at 残句 | **已修**：v1.1 §4 定义 `SHA256(canonical_json{…})` 沿用 Canonicalization v1；分项固定十进制串；盲包 sha256=分发文件字节（v2 零墙钟字段）；删除 exported_at 残句 |
| D-F-03 | [MAJ] | §5.1 示例 `index:0` 与现行 1-based（arena.js `i+1`）、提交格式、V-08 矛盾 | **已修**：v1.1 §5.1 改 1-based 并明文 |
| D-F-04 | [MAJ] | sealedProjection 两母体矛盾：arena FORBIDDEN_KEY 不匹配裸键 `fault`；`project('blind')` 脱敏事件主动输出 trigger_s——按「合并」会自产自拒 | **已修**：v1.1 §6.1a 列出显式并集（四组），明文「v2 无 events、project('blind') 事件输出不进入合并」 |
| D-F-05 | [MAJ] | 负例可测性缺口：AE-E10 无落位步；N-B10 会被 closed-world 先拦（判定顺序）；N-B9 双义；null 政策缺失（buildSamples 会写 null） | **已修**：v1.1 附录 A 增 N-Bx→V 步→AE 码映射；V-04b/V-06/V-06b 顺序定案；N-B9 消歧；null 允许（可选通道缺失） |
| D-F-06 | [MAJ] | 组织方生成器在 MVP 缺位；场景流封在浏览器 IIFE；文档时刻区间 2–55 s 与代码实际 2–52 s 不符；reveal 缺 engine/model 版本 | **已修**：v1.1 §3 更正 2–52 s；§8 MVP 增 `tools/arena2-gen.mjs` + 场景流抽共享模块硬性要求；§7 reveal 增三版本字段 |
| D-F-07 | [MIN] | V-04 硬编码 601 与「点数派生」契约冲突；`t[i]=i·dt` 需 1e-9 容差（IEEE 乘积） | **已修**：v1.1 V-04a sr1 常量 + 1e-9 容差 |
| D-F-08 | [MIN] | v2 白名单缺 `match` 元信息（systemId 需靠猜）；`"2.x"` 占位符不可判定 | **已修**：v1.1 §5.1 增 `systemId`、`arena_version:"2.0"`；枚举源=系统静态目录 |
| D-F-09 | [MIN] | 三种错误形态并存（contractError/{path,message}/裸 throw）；AE 码需统一构造 | **推迟（实现期）**：§8 已定「AE 统一 contractError 构造」 |
| D-F-10 | [MIN] | samples 行数组：现行导出本就是行数组，无迁移成本；列序/t 表示需注明 | **已修**：v1.1 §5.1 注记 |

**QP-1…QP-5 工程侧倾向**（记录在案，供 G6 关闭时裁定）：QP-1 Node 单实现首发；QP-2 场次独立 + 入库共享基准集；QP-3 取最高 + 全次留痕（哈希绑提交序号）；QP-4 可首发但前置假候选率公布；QP-5 允许 + 永久标 post-reveal·不计分（种子空间隔离联动）。

## 4. Lead 裁定（记录人）

1. **采纳两路全部 BLK/MAJ 的文本层修订**——v1.1 已逐条落位（§2/§3 表格处置栏），修订后协议无未处置的 BLK/MAJ 文本项。
2. **推迟项**（实现期，不阻断 G6）：D-F-09 错误构造统一、C-F-6/D-F-04 的单源模块与 fixtures 实现、QP-1…QP-5 执行细节、假候选率测量。
3. **分歧**：两路无互相矛盾的裁定；C 偏保守（要求 F-5 组织方约束入协议），D 偏工程（要求规格冻结）——两者在 v1.1 中同时满足，无取舍。
4. **残留风险登记**：① 观测派生估计与确定性复算的边界靠措辞与负例守卫，无技术强制——「组织方不泄 seed」是治理承诺（§4 约束 + §7 时点）；② sr1 假候选率未测量前 deriveChangePoints 不得首发（QP-4 前置已锁）。

## 5. 结论

> **V3-22 评审侧结论：CONDITIONAL GO（修订后放行）**——协议草案 v1.1 已吸收全部「G6 关闭前必须改」项，
> 评审侧无保留意见；**G6-WS-D 关闭待用户批准**（批准后 QP-1…QP-5 随 CHG 一并裁定）。
> 本记录不构成对评测轨实现的验收（实现属 G6 后另批，MVP 见协议 §8）。

## 6. 复核入口

- 协议：`NEXT/ARENA_EVAL_PROTOCOL_APPROVED.md`（v1.1，含修订记录段；批准时由 ARENA_EVAL_PROTOCOL_DRAFT.md 更名，CHG-20261030-03）
- 前序：`evidence/g6/v3-20-truth-isolation-assessment.md`（LEAK 与六守卫）
- 现行代码锚点：`src/agents/arena.js`（buildScenario 顺序 131-135、exportMatchMeta 745、assertSealed 702、SCORING_SPEC 34-45）、`src/core/schema.js`（project 399-461）、`src/core/rng.js`
