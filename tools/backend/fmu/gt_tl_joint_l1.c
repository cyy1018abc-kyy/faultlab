/* gt_tl_joint_l1.c — GT-001 + TL-001 联合轨（单转子形功角摇摆）FMU 内核（FMI 2.0 Co-Simulation 最小合规面）。
   权威文本：FaultLab-evaluation/NEXT/TL001_FMU_G2B_SPEC_APPROVED v1.0 §1.1/§1.3/§1.5（GTLJ-G2b-02 批准轮，
   CHG-20261125-01）；实现 = GTLJ-G2b-04 C99/FMU 链（V1180_WAVE_DESIGN v1 R2-1…R2-4，CHG-20261127-03/05）。

   认知分离硬边界（I-3，规格 §1.5——Q4=(a)，gt001_l1.c:5-10 同款）：
     - 本内核 ONLY 承载物理真值：3 微分态 y = [f, T3, δ]（RK4 面）+ 代数链输出（真值面）；
     - 调速器积分 EQ-GTL1-9/10（控制反馈层）、传感污染 b、测量列、能量记账、事件 pre-post 分裂、
       线路故障窗（p_elec_scale 的取值时刻）全部归 host（fmu_runner.py run_gt_tl_joint_shell）；
     - 只暴露 input 变量（demand_kW / u_eff_kW / p_elec_scale / line_open）+ 初值参数 delta0_rad
       与 true 输出——b/monitor 永不入内核。

   规格偏离登记（V1180 R2-2）：输入面增 line_open（0/1）——规格 §1.5 列三项。joint_gt_standalone
   （线路断路器开断）在 oracle 中走 `line_open → P_elec = 0.0` 分支；以 scale=0 表达时 δ<0 得 -0.0，
   P_elec 列不再与 golden 逐位相同。line_open≠0 ⇒ P_elec ≡ +0.0（δ 照常积分——Q8=(a)）。

   数值纪律（规格 §1.3 / §4 项 3——parity 前提）：
     - 内联固定步长经典 RK4：子步 δt = 0.01 s；host 每次调用传 step=0.01 ⇒ n = 1；
       u_eff / demand / p_elec_scale / line_open 为子步起点右值冻结输入；
       P_elec(δ) 与 V_gen 在每个 RK4 stage 由 (f_stage, δ_stage) 现算（非冻结）；
     - 表达式树与 tools/oracle/gt_tl_joint_oracle.py chain_algebra / _kernel_step 逐字对齐
       （同一操作数顺序；pow()/sin() 为跨 libm 散差源——R-1 登记，parity 实测冻结）；
       构建命令钉死：gcc -std=c99 -O2 -Wall -Wextra -ffp-contract=off -fno-fast-math（+ -fPIC/-lm @linux64）；
     - 初值 = 标称点 f=50 / T3=1173 / δ=delta0_rad（host 按 §3.1 δ₀ = asin((P_gen0+P_bat_ref−demand0)/P_max0)
       计算后于首个 doStep 前写入；reset() 回标称且 δ=δ₀=0）。

   构建：python -I tools/backend/fmu/build_fmu.py --gcc gcc --platform linux64 --tl
   （win64 dll 由用户 Windows 工具链构建——V1170 DEC-4 / V1180 R1-3）。 */

#include <stdlib.h>
#include <string.h>
#include <math.h>

#ifdef _WIN32
#define FMI_EXPORT __declspec(dllexport)
#else
#define FMI_EXPORT __attribute__((visibility("default")))
#endif

/* ---- GT 侧冻结常量（GTL1 §2.1 批准规格逐字——gt001_l1.c / gt_tl_joint_oracle.py 同值） ---- */
static const double T1_K = 288.15;
static const double P1_KPA = 101.325;
static const double CP_A = 1.005;
static const double GAMMA_A = 1.4;
static const double CP_G = 1.148;
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
/* ---- TL 侧参数（规格 §1.4 Q2 定案——教学整定值，未经实验/硬件验证） ---- */
static const double V_RATED = 400.0;
static const double V_INF = 400.0;
static const double X_LINE = 3.2;
static const double PI_D = 3.141592653589793;   /* = Python math.pi（-std=c99 无 M_PI） */
static const double DT_INT = 0.01;              /* 内核子步（Q4：doStep 粒度 = 0.01，n=1） */

static const char *FMI_GUID = "{gttljoint-a1b2-c3d4-e5f6-0123456789ab}";
static const char *FMI_MODEL_ID = "gt_tl_joint_l1";

/* ---- VR 契约（gt_tl_joint_l1_modelDescription.xml 逐字对齐） ----
   inputs   : 0 demand_kW / 1 u_eff_kW / 2 p_elec_scale / 3 line_open（host 子步起点冻结）
   parameter: 4 delta0_rad（初值——首个 doStep 前可写）
   outputs  : 5 f_Hz / 6 T3_K / 7 delta_rad（微分态）
              8 p2_kPa / 9 T2_K / 10 T4_K / 11 Q_f_kW / 12 P_comp_kW / 13 P_turb_kW /
              14 P_gen_kW / 15 P_bat_kW / 16 P_rotor_kW / 17 P_elec_kW / 18 V_gen_V /
              19 omega_rad_s / 20 mdot_g_kg_s / 21 dfdt / 22 dt3 / 23 ddelta（代数链 + RHS 面） */

typedef struct {
  double f, t3, d;                         /* 微分态 y = [f, T3, δ] */
  double demand, u_eff, scale, line_open;  /* 冻结输入（host 子步起点右值） */
  double delta0;                           /* 初值参数 */
  long steps;                              /* 已执行 doStep 数（delta0 仅在 0 时可写） */
  int logging_on;
} Inst;

typedef struct {
  double p2, t2, t4, p_comp, p_turb, p_gen, p_bat, p_rotor, q_f, mdot_g, v_gen, p_elec;
  double dfdt, dt3, ddelta;
} Alg;

static void alg_chain(const Inst *s, double fv, double t3v, double dv, Alg *a) {
  double a_c = (GAMMA_A - 1.0) / GAMMA_A;                   /* = 2/7（oracle A_C 同式） */
  double gamma_g = 4.0 / 3.0;
  double a_t = (gamma_g - 1.0) / gamma_g;                   /* = 1/4（oracle A_T 同式） */
  double two_pi = 2.0 * PI_D;
  double pi_c = PIC0 * pow(fv / F0, 2.0);                   /* EQ-GTL1-1 */
  double p2 = pi_c * P1_KPA;
  double t2 = T1_K * (1.0 + (pow(pi_c, a_c) - 1.0) / EPS_C);   /* EQ-GTL1-2 */
  double q_f = K_F * s->u_eff;                              /* EQ-GTL1-3 */
  double mdot_f = q_f / LHV;
  double mdot_g = MDOT_A + mdot_f;
  double p3 = (1.0 - BETA_B) * p2;                          /* EQ-GTL1-5 */
  double pi_t = p3 / P1_KPA;
  double t4 = t3v * (1.0 - EPS_T * (1.0 - pow(pi_t, -a_t)));
  double p_comp = MDOT_A * CP_A * (t2 - T1_K);              /* EQ-GTL1-6 */
  double p_turb = mdot_g * CP_G * (t3v - t4);
  double p_gen = ETA_M * (p_turb - p_comp);
  double p_bat = P_BAT_REF - K_BAT * (fv - 50.0);           /* EQ-GTL1-8 */
  double v_gen = (fv / F0) * V_RATED;                       /* TL-EQ-5 */
  double p_elec;
  if (s->line_open != 0.0) {
    p_elec = 0.0;                                           /* §2.2 断路器开断：P_elec ≡ 0 */
  } else {
    p_elec = s->scale * (v_gen * V_INF / X_LINE) * sin(dv) / 1000.0;   /* TL-EQ-3 */
  }
  double p_rotor = p_gen + p_bat - s->demand - p_elec;      /* EQ-GTL1-7 联合修订行 */
  a->p2 = p2; a->t2 = t2; a->t4 = t4; a->p_comp = p_comp; a->p_turb = p_turb;
  a->p_gen = p_gen; a->p_bat = p_bat; a->p_rotor = p_rotor; a->q_f = q_f;
  a->mdot_g = mdot_g; a->v_gen = v_gen; a->p_elec = p_elec;
  a->dfdt = (p_rotor / KJ) * (F0 / fv);                     /* EQ-GTL1-7 摇摆方程 */
  a->dt3 = (ETA_B * q_f - mdot_g * CP_G * (t3v - t2)) / C_3;   /* EQ-GTL1-4 */
  a->ddelta = two_pi * (fv - F0);                           /* TL-EQ-1 */
}

static void set_nominal(Inst *s) {
  s->f = 50.0;
  s->t3 = T3D_K;
  s->delta0 = 0.0;
  s->d = 0.0;
  s->demand = 30.0;               /* LOAD0_KW */
  s->u_eff = 25.0;                /* 设计点指令 */
  s->scale = 1.0;
  s->line_open = 0.0;
  s->steps = 0;
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
FMI_EXPORT int fmi2Reset(void *c) { if (!c) return 3; set_nominal((Inst *)c); return 0; }

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
      case 2: s->scale = values[i]; break;
      case 3: s->line_open = values[i]; break;
      case 4:
        if (s->steps != 0) return 3;           /* 初值参数仅在首个 doStep 前可写 */
        s->delta0 = values[i];
        s->d = values[i];
        break;
      default: return 3;                       /* output VR 不可写（真值面） */
    }
  }
  return 0;
}

FMI_EXPORT int fmi2GetReal(void *c, const unsigned int *vrs, size_t n, double *values) {
  Inst *s = (Inst *)c;
  if (!s) return 3;
  Alg a;
  alg_chain(s, s->f, s->t3, s->d, &a);
  for (size_t i = 0; i < n; i++) {
    switch (vrs[i]) {
      case 0: values[i] = s->demand; break;
      case 1: values[i] = s->u_eff; break;
      case 2: values[i] = s->scale; break;
      case 3: values[i] = s->line_open; break;
      case 4: values[i] = s->delta0; break;
      case 5: values[i] = s->f; break;
      case 6: values[i] = s->t3; break;
      case 7: values[i] = s->d; break;
      case 8: values[i] = a.p2; break;
      case 9: values[i] = a.t2; break;
      case 10: values[i] = a.t4; break;
      case 11: values[i] = a.q_f; break;
      case 12: values[i] = a.p_comp; break;
      case 13: values[i] = a.p_turb; break;
      case 14: values[i] = a.p_gen; break;
      case 15: values[i] = a.p_bat; break;
      case 16: values[i] = a.p_rotor; break;
      case 17: values[i] = a.p_elec; break;
      case 18: values[i] = a.v_gen; break;
      case 19: values[i] = 2.0 * PI_D * s->f; break;      /* Q7 派生列 ω = 2π·f（oracle 同式） */
      case 20: values[i] = a.mdot_g; break;
      case 21: values[i] = a.dfdt; break;
      case 22: values[i] = a.dt3; break;
      case 23: values[i] = a.ddelta; break;
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
  long n = (long)(communication_step_size / DT_INT + 0.5);   /* Q4：host 传 0.01 → n=1 */
  if (n < 1) return 3;
  const double h = DT_INT;
  for (long i = 0; i < n; i++) {
    Alg k1, k2, k3, k4;
    alg_chain(s, s->f, s->t3, s->d, &k1);
    alg_chain(s, s->f + 0.5 * h * k1.dfdt, s->t3 + 0.5 * h * k1.dt3, s->d + 0.5 * h * k1.ddelta, &k2);
    alg_chain(s, s->f + 0.5 * h * k2.dfdt, s->t3 + 0.5 * h * k2.dt3, s->d + 0.5 * h * k2.ddelta, &k3);
    alg_chain(s, s->f + h * k3.dfdt, s->t3 + h * k3.dt3, s->d + h * k3.ddelta, &k4);
    double f_new = s->f + h / 6.0 * (k1.dfdt + 2.0 * k2.dfdt + 2.0 * k3.dfdt + k4.dfdt);
    double t3_new = s->t3 + h / 6.0 * (k1.dt3 + 2.0 * k2.dt3 + 2.0 * k3.dt3 + k4.dt3);
    double d_new = s->d + h / 6.0 * (k1.ddelta + 2.0 * k2.ddelta + 2.0 * k3.ddelta + k4.ddelta);
    s->f = f_new;
    s->t3 = t3_new;
    s->d = d_new;
    s->steps++;
  }
  return 0;
}

/* ---- 最小 stub 面（gt001_l1.c 同款） ---- */
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
  x[0] = s->f; x[1] = s->t3; x[2] = s->d;
  return 0;
}
FMI_EXPORT int fmi2GetDerivatives(void *c, double *dx, size_t nx) {
  Inst *s = (Inst *)c;
  if (!s || nx != 3) return 3;
  Alg a;
  alg_chain(s, s->f, s->t3, s->d, &a);
  dx[0] = a.dfdt; dx[1] = a.dt3; dx[2] = a.ddelta;
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
