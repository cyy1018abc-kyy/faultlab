# G8 发布证据 — v1.0.0（API 承诺生效：八契约面冻结 + v0.9.x 清算）

> **发布**：**v1.0.0**（CHG-20261108-04——里程碑：1.0 API 承诺生效）｜ **授权链**：
> 用户「依次进行，还是派发子代理」指令（引用 v0.9.x 清算 + v1.0.0 发布 CHG 两项）→
> 前置清算工作流 dwfrun-8690ce18（33/33 PASS）→ 冻结发布。
> **推送状态：用户裁定暂缓延续（v0.7.1+v0.7.2+v0.8.0+v0.9.0+v1.0.0 五批将来同批）。**

## 1. 前置清算（CHG-20261108-03）

| 项 | 交付 | 验证 |
|---|---|---|
| V1_FACES §4 #11 残留① | scenario.js:150/:157 系统枚举错误文案改**动态派生**（knownSystemIds() 助手，teaching.js 先例同构；运行探针实证文案含 WT-001、MG-001 等未注册系统不出现、WT-001 解析行为不变） | scenario **389/389**（负例 62 类）、core **11354/11354** |
| V1_FACES §4 #11 残留② | run-g2 步账补挂：第 32 步 teaching.test.js（core）+ 第 33 步 leaderboard.test.js（extended）；I-7 登记 31→33、预算 ≤33 申报；**FIRST-31-STEPS-NORMALIZED-IDENTICAL 机检**（既有 31 步零改动） | run-g2 **33/33**（core 26+extended 7） |
| V090 T5 登记 | systems.js thermo_track 卡两处过时自述更新为现行挂载语义（与 engine.js:2113-2126 一致） | causal-rules **149/149** |
| 重打包 | FaultLab.html 1527.5→**1540.4 KiB**（含 thermoTrackCard 挂载/枚举清算/C-5 信封——grep 佐证）+ file-smoke **61/61** 新产物复验 | copy-guard 0 命中 |

## 2. v1.0.0 冻结生效（CHG-20261108-04——V1_FACES §6 五步逐项闭合）

1. **八面转正**：docs/V1_FACES.md §2——面② golden schema v2（先前已冻结）+ 面① SystemDef/
   ③ scenario v1/④ oracle_base/⑤ eval protocol v2/⑥ scope 三档/⑦ run-g2 步账/⑧ copy-guard
   词表，全部转正为**冻结（v1.0.0，additive-only）**；各面「不在承诺内」诚实边界随面转正；
2. **§3 breaking 政策生效**：breaking=major+迁移指南五件套；§3.4 golden 字节冻结特别条款
   （强于 semver）+ additive 边界（不改既有哈希输出/不翻门禁判据）+ 政策自指条款；
3. **§4 复核闭合**：#9 run-g2 33/33 两次独立；#10 文档转正；#11 裁定=修复（已落地）——
   **11/11 全部闭合**；
4. **§5 六项裁定**（全按推荐）：MG-001=v1.0.x 首项｜A-5 三提案=v1.0 后 G2b｜D-3=样本到即插｜
   插件化=维持不做｜backend 信息块=留位｜#11=修复；
5. **归档**：V1_FACES 本文为发布证据输入件。

## 3. v1.0.0 时点系统画像

**五系统**（FL-001 L0+L1-thermal 轨 / FC-001 L0 / GT-001 L0b 双存档轨+L1 thermo 默认轨 /
PV-001 L0 / WT-001 L0b）、**8 golden**（gt001_v1/v2/v3、fl001_v1/v2、fc001_v1、pv001_v1、
wt001_v1——字节冻结，supersedes 链清晰）、**10 oracle**（六 oracle_base 接入+四豁免留档）、
**11 页面**（home/五系统页/signals/causal/compare/arena/scenario/teaching/leaderboard）、
评测协议 v2 + 对外场次流程就绪、file-smoke 门禁化、V1_FACES 八面冻结。

## 4. 验证

- `node tools/run-g2.mjs` **33/33 PASS** 两次独立（工作流内 + 主流程复验 57896 ms）；
- verify_golden 五模型全 exit 0；oracle_base 自检 exit 0；copy-guard 0 命中；
- file-smoke 61/61（重打包产物）；scenario 389、causal-rules 149、core 11354 全绿。

## 5. v1.0.x 待办（冻结后 additive/minor 面）

MG-001 批准与实现（v1.0.x 首项，批准轮修订清单 v090-release §3）｜scenario.js:7 头注释
契约行与 engine.js:261 枚举文案派生化（PATCH）｜systems.js thermo_track 卡定位声明复核｜
FaultLab.html 差异随重打包收敛｜TESPy 角点扩展（旁证）。

**发布门**：G7（run-g2 33/33）✅ → G8（本证据）✅。**批准人：用户（v1.0.0 发布指令链，
「依次进行，还是派发子代理」）**；记录人：实现 Agent。**推送按用户裁定暂缓（五批同批）。**
