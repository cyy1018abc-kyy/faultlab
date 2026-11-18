/* fc001_l1.c — FC-001 5 态 L1-FMU C99 内核（FMI 2.0 Co-Simulation 最小合规面）。
   权威文本：FaultLab-evaluation/NEXT/FC001_FMU_G2B_SPEC_APPROVED v1.0 §1.1/§1.3/§1.4
   （FCFMU-G2b-02 批准轮收口，CHG-20261115-10）；实现 = FCFMU-G2b-04（CHG-20261118-01）。

   认知分离硬边界（I-3，§1.1）：
     - 本内核 ONLY 承载物理真值：5 微分态 + 代数真值输出（sealed 面）；
     - 传感污染 / 控制反馈 / 代数残差 / 事件 pre-post 左极限分裂全部归 host
       （fmu_runner.py I-11 壳）——内核内嵌任何壳职责 = 违反架构；
     - 只暴露 input 变量（负载电流 / 阀指令 / 执行器健康因子）与 true 输出。

   数值纪律（§1.3 / parity 前提）：
     - 内联固定步长经典 RK4：内部子步 dt_int = 0.01 s，通信步 dt = 0.1 s
       （doStep 一次 = round(step/dt_int) 个子步，输入 ZOH——host 每通信步重设）；
     - 表达式树与 tools/oracle/fc001_fmu_oracle.py 逐字对齐（同一操作数顺序）；
       构建命令钉死：gcc -std=c99 -O2 -ffp-contract=off -fno-fast-math
       （禁 FMA 收缩与快算重结合——IEEE 语义保持）；
     - 初值 = 标称稳态平衡点（APPROVED §3.1 解析精确值）；reset() 回标称。

   构建（Q10 = (c) 单平台 win64 先行，CHG-20261118-01）：
     gcc -std=c99 -O2 -Wall -Wextra -ffp-contract=off -fno-fast-math -shared \
         -o binaries/win64/fc001_l1.dll fc001_l1.c
   linux64/.dylib 后补（平台矩阵扩张须重新钉 sha256 + CHG）。 */

#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#define FMI_EXPORT __declspec(dllexport)
#else
#define FMI_EXPORT __attribute__((visibility("default")))
#endif

/* ---- 冻结常量（APPROVED §1.4 十九参数 + §11 Q16 nom 四常量——值零改动） ---- */
static const double N_CELL = 80.0;        /* cells */
static const double I_LOAD_NOM = 100.0;   /* A */
static const double G_O2_IN = 20.0;       /* kPa/s */
static const double K_O2_REACT = 0.10;    /* kPa/(A*s) */
static const double TAU_CA = 5.0;         /* s */
static const double K_N2_ACCUM = 12.0;    /* kPa/s */
static const double TAU_N2 = 10.0;        /* s */
static const double G_H2_IN = 40.0;       /* kPa/s */
static const double K_H2_REACT = 0.20;    /* kPa/(A*s) */
static const double TAU_AN = 2.5;         /* s */
static const double Q_COND = 0.08;        /* mL/(A*s) */
static const double Q_DRAIN_MAX = 16.0;   /* mL/s */
static const double V_CAP_MAX = 500.0;    /* mL */
static const double E_LHV = 1.254;        /* V */
static const double P_H2_LHV_KW = 10.032; /* kW */
static const double P_AUX_KW = 0.20;      /* kW */
static const double T_COOL_IN = 323.15;   /* K */
static const double H_COOL = 0.2416;      /* kW/K */
static const double C_TH = 2.416;         /* kJ/K */
static const double P_O2_NOM = 120.0;     /* kPa（Q16 标称点解析派生） */
static const double P_N2_NOM = 50.0;      /* kPa */
static const double P_H2_NOM = 180.0;     /* kPa */
static const double U_O2_NOM = 0.50;      /* - */
static const double DT_INT = 0.01;        /* 内部子步（§4 项 3） */

static const char *FMI_GUID = "{fc001f3e-a1b2-c3d4-e5f6-0123456789ab}";
static const char *FMI_MODEL_ID = "fc001_l1";

/* ---- VR 契约（modelDescription.xml 逐字对齐） ----
   inputs : 0 I_load_A / 1 u_o2_valve_cmd / 2 u_drain_valve_cmd /
            3 u_an_valve_cmd / 4 alpha_drain
   outputs: 5..9 五微分态 / 10 p_vap_ca_kPa / 11 p_ca_true_kPa / 12 y_O2_ca_true /
            13 cap_water_ratio_true / 14 V_stack_true_V / 15 P_gross_kW /
            16 P_net_kW / 17 eta_sys_true_pct */
#define NVAR 18

typedef struct {
  /* 物理状态（5 微分态——唯一可积面） */
  double p_o2, p_n2, p_h2, v_water, t_stack;
  /* 输入（ZOH——host 每通信步重设；事件输入冻结于子步起点右值语义由 host 时序承载） */
  double i_load, u_o2, u_drain, u_an, alpha_drain;
  int logging_on;
} Inst;

typedef struct {
  double p_vap, p_ca, y_o2, theta, v_stack, p_gross, p_net, eta;
} Alg;

static void alg_true(const Inst *s, Alg *a) {
  a->p_vap = 30.0 + 1.2 * (s->t_stack - 343.15);            /* EQ-FCFMU-6 */
  a->p_ca = s->p_o2 + s->p_n2 + a->p_vap;                   /* EQ-FCFMU-7 */
  a->y_o2 = s->p_o2 / a->p_ca;                              /* EQ-FCFMU-8 */
  a->theta = s->v_water / V_CAP_MAX;                        /* EQ-FCFMU-9 */
  double lin = 40.0 * (a->y_o2 - 0.60);
  double sat1 = 10.0 * ((a->theta - 0.40) > 0.0 ? (a->theta - 0.40) : 0.0);
  double sat2 = 35.0 * ((a->theta - 0.60) > 0.0 ? (a->theta - 0.60) : 0.0);
  a->v_stack = 52.0 + lin - sat1 - sat2 * (a->theta - 0.60) + 0.08 * (s->t_stack - 343.15); /* EQ-FCFMU-10 */
  a->p_gross = a->v_stack * s->i_load / 1000.0;             /* EQ-FCFMU-11 */
  a->p_net = a->p_gross - P_AUX_KW;                         /* EQ-FCFMU-12 */
  a->eta = 100.0 * a->p_net / P_H2_LHV_KW;                  /* EQ-FCFMU-13 */
}

typedef struct {
  double dp_o2, dp_n2, dp_h2, dv, dt3;
} Deriv;

static void derivs(const Inst *s, Deriv *d) {
  Alg a;
  alg_true(s, &a);
  d->dp_o2 = G_O2_IN * 1.0 * s->u_o2 - K_O2_REACT * s->i_load - (s->p_o2 - P_O2_NOM) / TAU_CA;   /* EQ-FCFMU-1 */
  d->dp_n2 = K_N2_ACCUM * (U_O2_NOM - 1.0 * s->u_o2) - (s->p_n2 - P_N2_NOM) / TAU_N2;            /* EQ-FCFMU-2 */
  d->dp_h2 = G_H2_IN * s->u_an - K_H2_REACT * s->i_load - (s->p_h2 - P_H2_NOM) / TAU_AN;         /* EQ-FCFMU-3 */
  d->dv = Q_COND * s->i_load - Q_DRAIN_MAX * s->alpha_drain * s->u_drain;                        /* EQ-FCFMU-4 */
  d->dt3 = (((N_CELL * E_LHV - a.v_stack) * s->i_load) / 1000.0 - H_COOL * (s->t_stack - T_COOL_IN)) / C_TH; /* EQ-FCFMU-5 */
}

static void set_nominal(Inst *s) {
  s->p_o2 = 120.0; s->p_n2 = 50.0; s->p_h2 = 180.0; s->v_water = 200.0; s->t_stack = 343.15; /* APPROVED §3.1 */
  s->i_load = I_LOAD_NOM; s->u_o2 = 0.50; s->u_drain = 0.50; s->u_an = 0.50; s->alpha_drain = 1.0;
}

/* ---------------- FMI 2.0 CS 最小合规面 ---------------- */

FMI_EXPORT const char *fmi2GetTypesPlatform(void) { return "default"; }
FMI_EXPORT const char *fmi2GetVersion(void) { return "2.0"; }

FMI_EXPORT void *fmi2Instantiate(void *context, int fmu_type, const char *guid,
                                 const char *model_identifier, const char *resources,
                                 const void *callbacks, int logging_visible) {
  (void)context; (void)resources; (void)callbacks; (void)logging_visible;
  if (fmu_type != 1) return NULL;                 /* 仅 Co-Simulation（fmi2CoSimulation=1） */
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
  (void)tolerance; (void)start_time; (void)stop_time_defined; (void)stop_time;
  return 0;                                        /* fmi2OK */
}

FMI_EXPORT int fmi2EnterInitializationMode(void *c) { (void)c; return 0; }
FMI_EXPORT int fmi2ExitInitializationMode(void *c) { (void)c; return 0; }
FMI_EXPORT int fmi2Terminate(void *c) { (void)c; return 0; }

FMI_EXPORT int fmi2Reset(void *c) { set_nominal((Inst *)c); return 0; }

FMI_EXPORT int fmi2SetDebugLogging(void *c, int logging_on, size_t n_categories, const char *const *categories) {
  (void)n_categories; (void)categories;
  if (!c) return 3;                                /* fmi2Error */
  ((Inst *)c)->logging_on = logging_on;
  return 0;
}

FMI_EXPORT int fmi2SetReal(void *c, const unsigned int *vrs, size_t n, const double *values) {
  Inst *s = (Inst *)c;
  if (!s) return 3;
  for (size_t i = 0; i < n; i++) {
    switch (vrs[i]) {
      case 0: s->i_load = values[i]; break;
      case 1: s->u_o2 = values[i]; break;
      case 2: s->u_drain = values[i]; break;
      case 3: s->u_an = values[i]; break;
      case 4: s->alpha_drain = values[i]; break;
      default: break;                              /* output VR 不可写（sealed 面） */
    }
  }
  return 0;
}

FMI_EXPORT int fmi2GetReal(void *c, const unsigned int *vrs, size_t n, double *values) {
  Inst *s = (Inst *)c;
  if (!s) return 3;
  Alg a;
  alg_true(s, &a);
  for (size_t i = 0; i < n; i++) {
    switch (vrs[i]) {
      case 0: values[i] = s->i_load; break;
      case 1: values[i] = s->u_o2; break;
      case 2: values[i] = s->u_drain; break;
      case 3: values[i] = s->u_an; break;
      case 4: values[i] = s->alpha_drain; break;
      case 5: values[i] = s->p_o2; break;
      case 6: values[i] = s->p_n2; break;
      case 7: values[i] = s->p_h2; break;
      case 8: values[i] = s->v_water; break;
      case 9: values[i] = s->t_stack; break;
      case 10: values[i] = a.p_vap; break;
      case 11: values[i] = a.p_ca; break;
      case 12: values[i] = a.y_o2; break;
      case 13: values[i] = a.theta; break;
      case 14: values[i] = a.v_stack; break;
      case 15: values[i] = a.p_gross; break;
      case 16: values[i] = a.p_net; break;
      case 17: values[i] = a.eta; break;
      default: return 3;                           /* 未知 VR */
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
  long n = (long)(communication_step_size / DT_INT + 0.5);   /* 0.1 → 10 子步 */
  if (n < 1) return 3;
  for (long i = 0; i < n; i++) {
    Deriv k1, k2, k3, k4;
    derivs(s, &k1);
    double p_o2_2 = s->p_o2 + DT_INT / 2.0 * k1.dp_o2;
    double p_n2_2 = s->p_n2 + DT_INT / 2.0 * k1.dp_n2;
    double p_h2_2 = s->p_h2 + DT_INT / 2.0 * k1.dp_h2;
    double v_w_2 = s->v_water + DT_INT / 2.0 * k1.dv;
    double t_s_2 = s->t_stack + DT_INT / 2.0 * k1.dt3;
    {
      Inst tmp = *s;
      tmp.p_o2 = p_o2_2; tmp.p_n2 = p_n2_2; tmp.p_h2 = p_h2_2; tmp.v_water = v_w_2; tmp.t_stack = t_s_2;
      derivs(&tmp, &k2);
    }
    double p_o2_3 = s->p_o2 + DT_INT / 2.0 * k2.dp_o2;
    double p_n2_3 = s->p_n2 + DT_INT / 2.0 * k2.dp_n2;
    double p_h2_3 = s->p_h2 + DT_INT / 2.0 * k2.dp_h2;
    double v_w_3 = s->v_water + DT_INT / 2.0 * k2.dv;
    double t_s_3 = s->t_stack + DT_INT / 2.0 * k2.dt3;
    {
      Inst tmp = *s;
      tmp.p_o2 = p_o2_3; tmp.p_n2 = p_n2_3; tmp.p_h2 = p_h2_3; tmp.v_water = v_w_3; tmp.t_stack = t_s_3;
      derivs(&tmp, &k3);
    }
    double p_o2_4 = s->p_o2 + DT_INT * k3.dp_o2;
    double p_n2_4 = s->p_n2 + DT_INT * k3.dp_n2;
    double p_h2_4 = s->p_h2 + DT_INT * k3.dp_h2;
    double v_w_4 = s->v_water + DT_INT * k3.dv;
    double t_s_4 = s->t_stack + DT_INT * k3.dt3;
    {
      Inst tmp = *s;
      tmp.p_o2 = p_o2_4; tmp.p_n2 = p_n2_4; tmp.p_h2 = p_h2_4; tmp.v_water = v_w_4; tmp.t_stack = t_s_4;
      derivs(&tmp, &k4);
    }
    s->p_o2 = s->p_o2 + DT_INT / 6.0 * (k1.dp_o2 + 2.0 * k2.dp_o2 + 2.0 * k3.dp_o2 + k4.dp_o2);
    s->p_n2 = s->p_n2 + DT_INT / 6.0 * (k1.dp_n2 + 2.0 * k2.dp_n2 + 2.0 * k3.dp_n2 + k4.dp_n2);
    s->p_h2 = s->p_h2 + DT_INT / 6.0 * (k1.dp_h2 + 2.0 * k2.dp_h2 + 2.0 * k3.dp_h2 + k4.dp_h2);
    s->v_water = s->v_water + DT_INT / 6.0 * (k1.dv + 2.0 * k2.dv + 2.0 * k3.dv + k4.dv);
    s->t_stack = s->t_stack + DT_INT / 6.0 * (k1.dt3 + 2.0 * k2.dt3 + 2.0 * k3.dt3 + k4.dt3);
  }
  return 0;
}

/* ---- 最小 stub 面（本 FMU 不承载的面——显式返回 OK/空值，不虚设功能） ---- */
FMI_EXPORT int fmi2GetInteger(void *c, const unsigned int *vrs, size_t n, int *values) {
  (void)c; (void)vrs; (void)values;
  return 0;                                        /* 无 Integer 变量（XML 声明零条） */
}
FMI_EXPORT int fmi2GetBoolean(void *c, const unsigned int *vrs, size_t n, int *values) {
  (void)c; (void)vrs; (void)values;
  return 0;
}
FMI_EXPORT int fmi2GetString(void *c, const unsigned int *vrs, size_t n, const char *const *values) {
  (void)c; (void)vrs; (void)values;
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
  return 3;                                        /* 连续态直写不承载（ME 面——CS 轨不用） */
}
FMI_EXPORT int fmi2GetContinuousStates(void *c, double *x, size_t nx) {
  Inst *s = (Inst *)c;
  if (!s || nx != 5) return 3;
  x[0] = s->p_o2; x[1] = s->p_n2; x[2] = s->p_h2; x[3] = s->v_water; x[4] = s->t_stack;
  return 0;
}
FMI_EXPORT int fmi2GetDerivatives(void *c, double *dx, size_t nx) {
  Inst *s = (Inst *)c;
  if (!s || nx != 5) return 3;
  Deriv d;
  derivs(s, &d);
  dx[0] = d.dp_o2; dx[1] = d.dp_n2; dx[2] = d.dp_h2; dx[3] = d.dv; dx[4] = d.dt3;
  return 0;
}
FMI_EXPORT int fmi2GetEventIndicators(void *c, double *indicators, size_t ni) {
  (void)c; (void)indicators;
  if (ni != 0) return 3;
  return 0;
}
FMI_EXPORT int fmi2GetFMUState(void *c, void **state) {
  (void)c; (void)state;
  return 3;                                        /* canGetAndSetFMUstate=false */
}
FMI_EXPORT int fmi2SetFMUState(void *c, void *state) { (void)c; (void)state; return 3; }
FMI_EXPORT int fmi2FreeFMUState(void *c, void *state) { (void)c; (void)state; return 3; }
FMI_EXPORT int fmi2SerializedFMUStateSize(void *c, size_t *size) {
  (void)c; if (size) *size = 0; return 3;
}
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
  return 3;                                        /* providesDirectionalDerivatives=false */
}
FMI_EXPORT int fmi2GetRealOutputDerivatives(void *c, const unsigned int *vrs, size_t n, const int *order, double *values) {
  (void)c; (void)vrs; (void)n; (void)order; (void)values;
  return 3;                                        /* maxOutputDerivativeOrder=0 */
}
FMI_EXPORT int fmi2GetPartialDerivative(void *c, const unsigned int *unknown_ref,
                                        const unsigned int *known_ref, double *partial) {
  (void)c; (void)unknown_ref; (void)known_ref; (void)partial;
  return 3;                                        /* CS 记录面（fmi2GetDirectionalDerivative 对齐） */
}
