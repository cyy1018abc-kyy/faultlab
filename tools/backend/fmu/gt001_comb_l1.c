/* gt001_comb_l1.c — GT-001 L1-FMU 镜像轨 comb 深化内核（FMI 2.0 Co-Simulation 最小合规面）。
   权威文本：FaultLab-evaluation/NEXT/GT001_FMU_G2B_SPEC_APPROVED v1.0 §1.1/§1.3/§1.4
   （GTFMU-G2b-02 批准轮收口，CHG-20261119-01）；实现 = GTFMU-G2b-04（CHG-20261119-01 ④）。

   认知分离硬边界（I-3，APPROVED §1.1——Q1(B) 定案）：
     - 本内核 ONLY 承载物理真值：3 微分态 [f, T3, x_comb]（RK4 面——EQ-GTL2-3/4 修订式：τ_comb=0.5、x_comb(0)=k_f*u(0)、mdot_g 延迟同源 Q13(i)、E_fuel 指令面 Q13(ii)）+ 代数链输出（真值面）；
     - 调速器积分 EQ-GTL1-9/10（控制反馈层）、传感污染 b、测量列、能量记账、事件
       pre-post 分裂全部归 host（fmu_runner.py run_gt001_shell——Q1(B) 定案：u 归 host，
       ZOH 降级变体排除）；
     - 只暴露 input 变量（demand_kW / u_eff_kW）与 true 输出——b/monitor 永不入内核。

   数值纪律（§1.3 / parity 前提）：
     - 内联固定步长经典 RK4：子步 δt = 0.01 s（Q1(B)：host 每次调用传 step=0.01，
       n = round(step/DT_INT) = 1——内核每次 doStep 恰一个 RK4 子步，输入于调用前设置
       = 子步起点右值冻结语义，与 gt001_fmu_oracle._kernel_step_thermo 逐字镜像）；
     - 表达式树与 gt001_fmu_oracle.chain_algebra_thermo / _kernel_step_thermo 逐字对齐
       （同一操作数顺序；pow() 为跨 libm 散差主源——R-1 登记，实测 ×≥10 冻结制）；
       构建命令钉死：gcc -std=c99 -O2 -ffp-contract=off -fno-fast-math；
     - 初值 = 标称稳态点（APPROVED §3.1：f=50/T3=1173）；reset() 回标称。

   构建（Q7 = (a) win64 先行，CHG-20261119-01 ③）：
     gcc -std=c99 -O2 -Wall -Wextra -ffp-contract=off -fno-fast-math -shared \
         -o binaries/win64/gt001_comb_l1.dll gt001_comb_l1.c
   linux64/.dylib 后补（平台矩阵扩张须重新钉 sha256 + CHG——A-7）。 */

#include <stdlib.h>
#include <string.h>
#include <math.h>

#ifdef _WIN32
#define FMI_EXPORT __declspec(dllexport)
#else
#define FMI_EXPORT __attribute__((visibility("default")))
#endif

/* ---- 冻结常量（GTL1 §2.1 批准规格逐字——值零改动；15 位有效数字面） ---- */
static const double T1_K = 288.15;
static const double P1_KPA = 101.325;
static const double CP_A = 1.005;
static const double GAMMA_A = 1.4;
static const double A_C = (GAMMA_A - 1.0) / GAMMA_A;      /* = 2/7 */
static const double CP_G = 1.148;
static const double GAMMA_G = 4.0 / 3.0;
static const double A_T = (GAMMA_G - 1.0) / GAMMA_G;      /* = 1/4 登记字面 */
static const double PIC0 = 8.0;
static const double EPS_C = 0.82;
static const double EPS_T = 0.86;
static const double BETA_B = 0.04;
static const double LHV = 50000.0;
static const double ETA_B = 0.99;
static const double ETA_M = 0.95;
static const double T3D_K = 1173.0;
static const double KJ = 5.0;
static const double F0 = 50.0;
static const double K_BAT = 24.0;
static const double P_BAT_REF = 5.0;
static const double K_F = 4.070531454334211;
static const double MDOT_A = 0.144299140389011;
static const double C_3 = 0.335983796442745;
static const double TAU_COMB = 0.5;       /* comb 深化：燃烧/能量转换一阶滞后（GTCMB §1.3 定案） */
static const double DT_INT = 0.01;        /* 内核子步（Q1(B)：doStep 粒度 = 0.01，n=1） */

static const char *FMI_GUID = "{gt001cmb3-a1b2-c3d4-e5f6-0123456789ab}";
static const char *FMI_MODEL_ID = "gt001_comb_l1";

/* ---- VR 契约（gt001_l1_modelDescription.xml 逐字对齐） ----
   inputs : 0 demand_kW / 1 u_eff_kW（host 冻结输入——子步起点右值）
   outputs: 2 f_Hz / 3 T3_K / 4 x_comb_kW（微分态——x_comb 不出 golden 序列，GTCMB Q10）
            5 p2_kPa / 6 T2_K / 7 T4_K / 8 Q_f_kW / 9 P_comp_kW / 10 P_turb_kW /
            11 P_gen_kW / 12 P_bat_kW / 13 P_rotor_kW / 14 dfdt / 15 dt3 / 16 dxc */
#define NVAR 17

typedef struct {
  double f, t3, x_comb;                    /* 微分态 y = [f, T3, x_comb]（comb 深化轨） */
  double demand, u_eff;                    /* 冻结输入（host 子步起点右值） */
  int logging_on;
} Inst;

typedef struct {
  double p2, t2, t4, p_comp, p_turb, p_gen, p_bat, p_rotor, q_f, mdot_g, dfdt, dt3, dxc;
} Alg;

static void alg_chain(Inst *s, Alg *a) {
  double pi_c = PIC0 * pow(s->f / F0, 2.0);                 /* EQ-GTL2-1 */
  double _p2 = pi_c * P1_KPA;
  double _t2 = T1_K * (1.0 + (pow(pi_c, A_C) - 1.0) / EPS_C);  /* EQ-GTL2-2 */
  double q_f = K_F * s->u_eff;                              /* EQ-GTL2-3 指令面（Q13(ii)） */
  double mdot_f_d = s->x_comb / LHV;                        /* EQ-GTL2-3 延迟同源（Q13(i)） */
  double mdot_g = MDOT_A + mdot_f_d;
  double p3 = (1.0 - BETA_B) * _p2;                         /* EQ-GTL2-5 */
  double pi_t = p3 / P1_KPA;
  double _t4 = s->t3 * (1.0 - EPS_T * (1.0 - pow(pi_t, -A_T)));
  double p_comp = MDOT_A * CP_A * (_t2 - T1_K);             /* EQ-GTL2-6 */
  double p_turb = mdot_g * CP_G * (s->t3 - _t4);
  double p_gen = ETA_M * (p_turb - p_comp);
  double p_bat = P_BAT_REF - K_BAT * (s->f - 50.0);         /* EQ-GTL2-8 */
  double p_rotor = p_gen + p_bat - s->demand;               /* EQ-GTL2-7（恒等式） */
  double dfdt = (p_rotor / KJ) * (F0 / s->f);               /* EQ-GTL2-7 */
  double dt3 = (ETA_B * s->x_comb - mdot_g * CP_G * (s->t3 - _t2)) / C_3;  /* EQ-GTL2-4 */
  double dxc = (q_f - s->x_comb) / TAU_COMB;                /* EQ-GTL2-3 滞后 RHS */
  a->p2 = _p2; a->t2 = _t2; a->t4 = _t4; a->p_comp = p_comp; a->p_turb = p_turb;
  a->p_gen = p_gen; a->p_bat = p_bat; a->p_rotor = p_rotor; a->q_f = q_f;
  a->mdot_g = mdot_g; a->dfdt = dfdt; a->dt3 = dt3; a->dxc = dxc;
}

static void set_nominal(Inst *s) {
  s->f = 50.0;                    /* APPROVED §3.1 标称稳态点 */
  s->t3 = T3D_K;                  /* 1173.0 */
  s->x_comb = K_F * 25.0;         /* GTCMB Q11 定案：x_comb(0) = k_f*u(0) = 101.7633 kW */
  s->demand = 30.0;               /* LOAD0_KW（L0b 冻结记账面） */
  s->u_eff = 25.0;                /* 设计点指令 */
  s->logging_on = 0;
}

/* ---------------- FMI 2.0 CS 最小合规面 ---------------- */

FMI_EXPORT const char *fmi2GetTypesPlatform(void) { return "default"; }
FMI_EXPORT const char *fmi2GetVersion(void) { return "2.0"; }

FMI_EXPORT void *fmi2Instantiate(void *context, int fmu_type, const char *guid,
                                 const char *model_identifier, const char *resources,
                                 const void *callbacks, int logging_visible) {
  (void)context; (void)resources; (void)callbacks; (void)logging_visible;
  if (fmu_type != 1) return NULL;
  if (strcmp(guid, FMI_GUID) != 0) return NULL;
  if (strcmp(model_identifier, FMI_MODEL_ID) != 0) return NULL;
  Inst *s = (Inst *)malloc(sizeof(Inst));
  if (!s) return NULL;
  memset(s, 0, sizeof(Inst));
  set_nominal(s);
  return s;
}

FMI_EXPORT void fmi2FreeInstance(void *c) { free(c); }

FMI_EXPORT int fmi2SetupExperiment(void *c, double tolerance, double start_time,
                                   double stop_time_defined, double stop_time) {
  (void)tolerance; (void)start_time; (void)stop_time_defined; (void)stop_time; (void)c;
  return 0;
}

FMI_EXPORT int fmi2EnterInitializationMode(void *c) { (void)c; return 0; }
FMI_EXPORT int fmi2ExitInitializationMode(void *c) { (void)c; return 0; }
FMI_EXPORT int fmi2Terminate(void *c) { (void)c; return 0; }
FMI_EXPORT int fmi2Reset(void *c) { set_nominal((Inst *)c); return 0; }

FMI_EXPORT int fmi2SetDebugLogging(void *c, int logging_on, size_t n_categories, const char *const *categories) {
  (void)n_categories; (void)categories;
  if (!c) return 3;
  ((Inst *)c)->logging_on = logging_on;
  return 0;
}

FMI_EXPORT int fmi2SetReal(void *c, const unsigned int *vrs, size_t n, const double *values) {
  Inst *s = (Inst *)c;
  if (!s) return 3;
  for (size_t i = 0; i < n; i++) {
    switch (vrs[i]) {
      case 0: s->demand = values[i]; break;
      case 1: s->u_eff = values[i]; break;
      default: break;                          /* output VR 不可写（真值面） */
    }
  }
  return 0;
}

FMI_EXPORT int fmi2GetReal(void *c, const unsigned int *vrs, size_t n, double *values) {
  Inst *s = (Inst *)c;
  if (!s) return 3;
  Alg a;
  alg_chain(s, &a);
  for (size_t i = 0; i < n; i++) {
    switch (vrs[i]) {
      case 0: values[i] = s->demand; break;
      case 1: values[i] = s->u_eff; break;
      case 2: values[i] = s->f; break;
      case 3: values[i] = s->t3; break;
      case 4: values[i] = s->x_comb; break;
      case 5: values[i] = a.p2; break;
      case 6: values[i] = a.t2; break;
      case 7: values[i] = a.t4; break;
      case 8: values[i] = a.q_f; break;
      case 9: values[i] = a.p_comp; break;
      case 10: values[i] = a.p_turb; break;
      case 11: values[i] = a.p_gen; break;
      case 12: values[i] = a.p_bat; break;
      case 13: values[i] = a.p_rotor; break;
      case 14: values[i] = a.dfdt; break;
      case 15: values[i] = a.dt3; break;
      case 16: values[i] = a.dxc; break;
      default: return 3;
    }
  }
  return 0;
}

FMI_EXPORT int fmi2DoStep(void *c, double current_communication_point,
                          double communication_step_size, int no_set_fmu_state_prior) {
  (void)current_communication_point; (void)no_set_fmu_state_prior;
  Inst *s = (Inst *)c;
  if (!s) return 3;
  if (communication_step_size <= 0.0) return 3;
  long n = (long)(communication_step_size / DT_INT + 0.5);   /* Q1(B)：host 传 0.01 → n=1 */
  if (n < 1) return 3;
  for (long i = 0; i < n; i++) {
    Alg k1, k2, k3, k4;
    alg_chain(s, &k1);
    double f_2 = s->f + 0.5 * DT_INT * k1.dfdt;
    double t3_2 = s->t3 + 0.5 * DT_INT * k1.dt3;
    double x_2 = s->x_comb + 0.5 * DT_INT * k1.dxc;
    {
      Inst tmp = *s; tmp.f = f_2; tmp.t3 = t3_2; tmp.x_comb = x_2;
      alg_chain(&tmp, &k2);
    }
    double f_3 = s->f + 0.5 * DT_INT * k2.dfdt;
    double t3_3 = s->t3 + 0.5 * DT_INT * k2.dt3;
    double x_3 = s->x_comb + 0.5 * DT_INT * k2.dxc;
    {
      Inst tmp = *s; tmp.f = f_3; tmp.t3 = t3_3; tmp.x_comb = x_3;
      alg_chain(&tmp, &k3);
    }
    double f_4 = s->f + DT_INT * k3.dfdt;
    double t3_4 = s->t3 + DT_INT * k3.dt3;
    double x_4 = s->x_comb + DT_INT * k3.dxc;
    {
      Inst tmp = *s; tmp.f = f_4; tmp.t3 = t3_4; tmp.x_comb = x_4;
      alg_chain(&tmp, &k4);
    }
    s->f = s->f + DT_INT / 6.0 * (k1.dfdt + 2.0 * k2.dfdt + 2.0 * k3.dfdt + k4.dfdt);
    s->t3 = s->t3 + DT_INT / 6.0 * (k1.dt3 + 2.0 * k2.dt3 + 2.0 * k3.dt3 + k4.dt3);
    s->x_comb = s->x_comb + DT_INT / 6.0 * (k1.dxc + 2.0 * k2.dxc + 2.0 * k3.dxc + k4.dxc);
  }
  return 0;
}

/* ---- 最小 stub 面 ---- */
FMI_EXPORT int fmi2GetInteger(void *c, const unsigned int *vrs, size_t n, int *values) {
  (void)c; (void)vrs; (void)values; (void)n;
  return 0;
}
FMI_EXPORT int fmi2GetBoolean(void *c, const unsigned int *vrs, size_t n, int *values) {
  (void)c; (void)vrs; (void)values; (void)n;
  return 0;
}
FMI_EXPORT int fmi2GetString(void *c, const unsigned int *vrs, size_t n, const char *const *values) {
  (void)c; (void)vrs; (void)values; (void)n;
  return 0;
}
FMI_EXPORT int fmi2SetInteger(void *c, const unsigned int *vrs, size_t n, const int *values) {
  (void)c; (void)vrs; (void)n; (void)values;
  return 0;
}
FMI_EXPORT int fmi2SetBoolean(void *c, const unsigned int *vrs, size_t n, const int *values) {
  (void)c; (void)vrs; (void)n; (void)values;
  return 0;
}
FMI_EXPORT int fmi2SetString(void *c, const unsigned int *vrs, size_t n, const char *const *values) {
  (void)c; (void)vrs; (void)n; (void)values;
  return 0;
}
FMI_EXPORT int fmi2CancelStep(void *c) { (void)c; return 0; }
FMI_EXPORT int fmi2GetContinuousStates(void *c, double *x, size_t nx) {
  Inst *s = (Inst *)c;
  if (!s || nx != 3) return 3;
  x[0] = s->f; x[1] = s->t3; x[2] = s->x_comb;
  return 0;
}
FMI_EXPORT int fmi2GetDerivatives(void *c, double *dx, size_t nx) {
  Inst *s = (Inst *)c;
  if (!s || nx != 3) return 3;
  Alg a;
  alg_chain(s, &a);
  dx[0] = a.dfdt; dx[1] = a.dt3; dx[2] = a.dxc;
  return 0;
}
FMI_EXPORT int fmi2GetEventIndicators(void *c, double *indicators, size_t ni) {
  (void)c; (void)indicators;
  if (ni != 0) return 3;
  return 0;
}
FMI_EXPORT int fmi2EnterEventMode(void *c) { (void)c; return 0; }
FMI_EXPORT int fmi2NewDiscreteStates(void *c, void *event_info) { (void)c; (void)event_info; return 0; }
FMI_EXPORT int fmi2EnterContinuousTimeMode(void *c) { (void)c; return 0; }
FMI_EXPORT int fmi2CompletedIntegratorStep(void *c, int no_set, int *enter_event, int *terminate) {
  (void)c; (void)no_set;
  if (enter_event) *enter_event = 0;
  if (terminate) *terminate = 0;
  return 0;
}
FMI_EXPORT int fmi2SetTime(void *c, double time) { (void)c; (void)time; return 0; }
FMI_EXPORT int fmi2SetContinuousStates(void *c, const double *x, size_t nx) {
  (void)c; (void)x; (void)nx;
  return 3;
}
FMI_EXPORT int fmi2GetFMUState(void *c, void **state) { (void)c; (void)state; return 3; }
FMI_EXPORT int fmi2SetFMUState(void *c, void *state) { (void)c; (void)state; return 3; }
FMI_EXPORT int fmi2FreeFMUState(void *c, void *state) { (void)c; (void)state; return 3; }
FMI_EXPORT int fmi2SerializedFMUStateSize(void *c, size_t *size) { (void)c; if (size) *size = 0; return 3; }
FMI_EXPORT int fmi2SerializeFMUState(void *c, void *state, size_t size, unsigned char *bytes) {
  (void)c; (void)state; (void)size; (void)bytes;
  return 3;
}
FMI_EXPORT int fmi2DeSerializeFMUState(void *c, const unsigned char *bytes, size_t size, void **state) {
  (void)c; (void)bytes; (void)size; (void)state;
  return 3;
}
FMI_EXPORT int fmi2GetDirectionalDerivative(void *c, const unsigned int *v_unknown_ref,
                                            size_t n_unknown, const unsigned int *v_known_ref,
                                            size_t n_known, const double *dv_known,
                                            double *dv_unknown) {
  (void)c; (void)v_unknown_ref; (void)n_unknown; (void)v_known_ref; (void)n_known;
  (void)dv_known; (void)dv_unknown;
  return 3;
}
FMI_EXPORT int fmi2GetRealOutputDerivatives(void *c, const unsigned int *vrs, size_t n, const int *order, double *values) {
  (void)c; (void)vrs; (void)n; (void)order; (void)values;
  return 3;
}
