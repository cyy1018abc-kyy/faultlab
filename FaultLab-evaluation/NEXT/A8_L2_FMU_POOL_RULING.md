# A8_L2_FMU_POOL_RULING — GT-001 FMU 镜像轨入 Arena L2 盲测池裁定（A-8 / V1130 / CHG-20261119-04）

> **性质**：裁定文档（Lead 起草，2026-11-19；V1130_WAVE_DESIGN A-8 / CHG-20261119-03 DEC-1）。
> **裁定**：GT-001 FMU 镜像轨（gt001_fmu_v1 / gt001_fmu_comb_v1）**准予入 Arena L2 盲测池**
> ——协议面声明，零代码变更（GTFMU-5 已证数据面等价）。

---

## 1. 裁定事实面

| 项 | 引擎轨（gt001_v3/v4） | FMU 镜像轨（gt001_fmu_v1/comb_v1） | 等价性 |
|---|---|---|---|
| series 27 列 | ✅ | ✅ 同集 | **GTFMU-5：194724 值散差 0.0** |
| 601 点网格 | ✅ | ✅ | t[i]=i*0.1 逐位 |
| 事件快照 | ✅ EV-001/002 | ✅ 同构（pre=199/post=200 + EV-002 349/350） | 逐位 |
| Run 白名单 | 6 Run | 6 Run 镜像 | 同 key 同参数 |

**结论**：FMU golden series ≡ 引擎 golden series 逐位（±1e-9 内恒定——实测 0.0）⇒ 盲包
数据面无论源引擎或源 FMU golden 均产出**逐位相同的 blind_pack.json**。

## 2. 协议面裁定

| # | 裁定项 | 内容 |
|---|---|---|
| R-1 | **FMU 镜像轨入池** | gt001_fmu_v1 / gt001_fmu_comb_v1 列入 Arena L2 盲测池合法数据源（与引擎轨并列） |
| R-2 | **盲包格式零变更** | arena2-gen --system GT-001 --l2 已可生成 GT 盲包（27 列在位、601 点、双层遥测）——零代码 |
| R-3 | **盲测零真值沿袭** | 盲包不携带 model_provenance（盲测零真值——FMU 轨标注仅在 golden/reveal 面承载） |
| R-4 | **评分公式零变更** | L2 S_diag/S_anchor/S_eff 沿 G10 §3.4 冻结面（FMU 镜像轨数据逐位 = 引擎轨 ⇒ 评分等价） |
| R-5 | **模型诚实性** | reveal 面可标注 model_provenance=fmu_l1_lumped_unvalidated（赛后公布面——「行为与数值集总参数演示模型」定位句沿袭） |

## 3. 代码面确认

- arena2-gen.mjs `--system GT-001 --l2` 路径已可生成 GT L2 盲包（27 列 + 双层遥测——**零代码变更**）；
- GT-001 FMU golden 与引擎 golden 逐位等价 ⇒ L2 盲包换源不改变数据内容；
- future FC-001 FMU 轨入池 = 同构裁定（FC golden 已在位——另行 CHG 或随 V07 A-8 通用化登记）。

## 4. 裁定签署

- 裁定人：Lead Agent（V1130 A-8 / CHG-20261119-03 DEC-1 授权链——用户「进入下一轮」）
- 生效：即日（2026-11-19）
- 后续：FC-001 FMU 入池可随 V07 A-8 通用化登记（零代码面——golden 在位即入池可行）
