/* owner: lead | module: export | contract: docs/CONTRACT.md */
(function () {
  'use strict';
  const FL = window.FL = window.FL || {};

  function pad(n) { return String(n).padStart(2, '0'); }
  function stamp(d) {
    const t = d || new Date();
    return t.getFullYear() + pad(t.getMonth() + 1) + pad(t.getDate()) + '-' + pad(t.getHours()) + pad(t.getMinutes()) + pad(t.getSeconds());
  }
  function isoNow() { return new Date().toISOString(); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function csvCell(v) {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function n(v, d) {
    if (typeof v !== 'number' || !isFinite(v)) return '';
    return v.toFixed(d == null ? 10 : d);
  }
  function num(v, d) {
    if (typeof v !== 'number' || !isFinite(v)) return '—';
    const s = v.toFixed(d == null ? 4 : d);
    return s.replace(/\.?0+$/, '') || '0';
  }
  function fmtTime(t) { return n(t, 1).replace(/\.0$/, '') + ' s'; }

  /* ===================================================================
     CSV
     =================================================================== */
  function csv(run) {
    if (!run) throw new Error('csv: run 为空');
    const sigs = run.signals || [];
    const lines = [];
    lines.push('# FaultLab V0.1 run export');
    lines.push('# run_id=' + run.runId);
    lines.push('# system_id=' + run.systemId);
    lines.push('# label=' + (run.label || ''));
    lines.push('# created_at=' + (run.createdAt || ''));
    lines.push('# engine_version=' + (run.engineVersion || ''));
    lines.push('# config_hash=' + (run.configHash || ''));
    lines.push('# model_hash=' + (run.modelHash || ''));
    lines.push('# effective_mode=' + ((run.config && run.config.feedback_mode) || ''));
    lines.push('# fault_family=' + ((run.config && run.config.fault && run.config.fault.family) || 'none'));
    lines.push('# sampling=' + run.timeseries.t.length + ' points, dt=' + ((run.config && run.config.dt_s) || 0.1) + ' s');
    lines.push('# data_kind=解析/行为级演示数据，非 Simulink、非实测');
    lines.push('# signals: id | label | unit | source_kind');
    sigs.forEach((s) => {
      lines.push('#  ' + s.id + ' | ' + s.label + ' | ' + s.unit + ' | ' + s.sourceKind);
    });
    const header = ['time_s'].concat(sigs.map((s) => s.id));
    lines.push(header.join(','));
    const times = run.timeseries.t;
    const signals = run.timeseries.signals;
    for (let i = 0; i < times.length; i++) {
      const row = [times[i].toFixed(1)];
      for (let j = 0; j < sigs.length; j++) {
        const arr = signals[sigs[j].id];
        row.push(arr && typeof arr[i] === 'number' ? String(arr[i]) : '');
      }
      lines.push(row.join(','));
    }
    return lines.join('\n') + '\n';
  }

  /* ===================================================================
     manifests
     =================================================================== */
  function configManifest(run) {
    if (!run) throw new Error('configManifest: run 为空');
    let model = null;
    try { model = FL.core.modelManifest(run.systemId); } catch (e) { model = null; }
    return {
      schema: 'faultlab.run-manifest.v1',
      generated_at: isoNow(),
      run_manifest: {
        run_id: run.runId,
        system_id: run.systemId,
        label: run.label,
        role: run.role,
        status: run.status,
        created_at: run.createdAt,
        config_hash: run.configHash,
        model_hash: run.modelHash,
        engine_version: run.engineVersion
      },
      config: run.config,
      model: model,
      events: run.events,
      quality_checks: run.quality,
      metrics: run.metrics,
      truth_demo_mode: run.truth || null,
      provenance: {
        data_kind: '解析/行为级演示数据（L0），非 Simulink、非实测',
        source_kind_legend: ['CONFIG', 'MODEL_STATE', 'OBSERVATION', 'CONTROLLER', 'FAULT_EVENT', 'DERIVED', 'MODEL_ASSUMPTION'],
        estimator_method: (run.signals || []).some((s) => s.id === 'SOC_est_pct') && run.systemId === 'FC-001'
          ? 'ems_power_balance_estimate' : 'naive_coulomb_counting',
        hash_semantics: '浏览器端 SHA-256（规范化 JSON）仅证明导出内容一致性，不代表签名/来源/第三方认证。',
        evidence_levels: {
          model_internal_consistency: 'passed_for_demo',
          model_validated_against_experiment: 'not_performed',
          real_hardware_verified: 'not_performed'
        },
        notes: '说明文本不作为计算数据源；观测残差不是能量损失。'
      }
    };
  }

  /* ===================================================================
     comparison helpers
     =================================================================== */
  function getComparison(baseline, trial, comparison) {
    if (comparison) return comparison;
    if (baseline && trial && FL.core && FL.core.compareRuns) return FL.core.compareRuns(baseline, trial);
    return null;
  }

  function summaryText(payload) {
    const o = payload || {};
    const baseline = o.baseline, trial = o.trial;
    const comp = getComparison(baseline, trial, o.comparison);
    if (!trial) throw new Error('summaryText: 缺少试验运行');
    const lines = [];
    lines.push('FaultLab V0.1 · 实验摘要');
    lines.push('试验运行 ' + trial.runId + ' · ' + (trial.label || ''));
    if (baseline) lines.push('基准运行 ' + baseline.runId + ' · ' + (baseline.label || ''));
    lines.push('模型 ' + (trial.modelHash || '').slice(0, 12) + ' · 配置 ' + (trial.configHash || '').slice(0, 12));
    if (comp) {
      comp.checks.forEach((c) => lines.push('[' + (c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '×') + '] ' + c.label + '：' + c.message));
      if (comp.pairs) {
        lines.push('关键指标（基准 → 试验）：');
        comp.pairs.slice(0, 8).forEach((p) => {
          const b = p.baseline && p.baseline.value != null ? num(p.baseline.value, 5) : '不可用';
          const t = p.trial && p.trial.value != null ? num(p.trial.value, 5) : '不可用';
          const u = (p.trial && p.trial.unit) || '';
          lines.push('  · ' + p.metric_id + '：' + b + ' → ' + t + ' ' + u);
        });
      }
      if (comp.findings) comp.findings.forEach((f) => lines.push('发现：' + f.title + ' — ' + f.text));
    }
    lines.push('数据性质：解析/行为级（L0）演示数据，非 Simulink、非实测结论。');
    return lines.join('\n');
  }

  /* ===================================================================
     evidence bundle
     =================================================================== */
  function evidenceBundle(payload) {
    const o = payload || {};
    const baseline = o.baseline, trial = o.trial;
    const comp = getComparison(baseline, trial, o.comparison);
    const failed = !!(comp && comp.valid === false) || (trial && trial.quality && trial.quality.some((q) => q.status === 'fail'));
    const runs = [trial, baseline].filter(Boolean).map((run) => ({
      run_manifest: {
        run_id: run.runId, system_id: run.systemId, label: run.label, role: run.role,
        created_at: run.createdAt, config_hash: run.configHash, model_hash: run.modelHash,
        engine_version: run.engineVersion, status: run.status
      },
      config: run.config,
      events: run.events,
      metrics: run.metrics,
      quality_checks: run.quality,
      timeseries_digest: {
        points: run.timeseries.t.length,
        dt_s: run.config.dt_s,
        signals: (run.signals || []).map((s) => ({ id: s.id, unit: s.unit, source_kind: s.sourceKind })),
        data_hash: digestTimeseries(run)
      }
    }));
    return {
      schema: 'faultlab.evidence-bundle.v1',
      generated_at: isoNow(),
      validation_status: failed ? 'validation_failed' : 'validation_passed_for_demo',
      validation_note: failed
        ? '本证据包包含未通过的数值校验项，标记为“验证未通过”，不得用于“可信仿真”结论。'
        : '本证据包通过演示级数值校验；数据仍为解析/行为级演示数据（非实测）。',
      runs,
      comparison: comp ? {
        valid: comp.valid, diffAllowed: comp.diffAllowed,
        checks: comp.checks, pairs: comp.pairs, findings: comp.findings, warnings: comp.warnings
      } : null,
      provenance: {
        data_kind: '解析/行为级演示数据（L0），非 Simulink、非实测',
        source_kind_legend: ['CONFIG', 'MODEL_STATE', 'OBSERVATION', 'CONTROLLER', 'FAULT_EVENT', 'DERIVED', 'MODEL_ASSUMPTION'],
        hash_semantics: '浏览器端 SHA-256（规范化 JSON）仅证明导出内容一致性，不代表签名/来源/第三方认证。',
        evidence_levels: {
          model_internal_consistency: 'passed_for_demo',
          model_validated_against_experiment: 'not_performed',
          real_hardware_verified: 'not_performed'
        }
      }
    };
  }

  function digestTimeseries(run) {
    try {
      if (FL.core && FL.core.hashObject) {
        const sigs = run.timeseries.signals;
        const ids = Object.keys(sigs).sort();
        const arr = ids.map((id) => sigs[id].map((v) => Math.round(v * 1e9) / 1e9));
        return (FL.core.hashObject({ t: run.timeseries.t, signals: arr, ids }) || '').slice(0, 32);
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  /* ===================================================================
     HTML report (self-contained)
     =================================================================== */
  function htmlReport(payload) {
    const o = payload || {};
    const trial = o.trial, baseline = o.baseline;
    const comp = getComparison(baseline, trial, o.comparison);
    const system = o.system || null;
    if (!trial) throw new Error('htmlReport: 缺少试验运行');
    const now = o.generatedAt ? new Date(o.generatedAt) : new Date();
    const failed = !!(comp && comp.valid === false) || (trial.quality || []).some((q) => q.status === 'fail');
    const statusLabel = failed ? '内部一致性检查未通过（FAIL · 仅排障用途）' : '内部一致性检查通过（演示级）';

    const css = `
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f4f5f2; color: #15191c; font-family: "Segoe UI", "Microsoft YaHei UI", sans-serif; font-size: 14px; line-height: 1.6; }
      .wrap { max-width: 1040px; margin: 0 auto; padding: 40px 32px 64px; }
      .brand { display: flex; align-items: baseline; gap: 12px; border-bottom: 3px solid #15191c; padding-bottom: 14px; }
      .brand .mark { font-weight: 800; letter-spacing: .16em; font-size: 22px; }
      .brand .sub { font-family: "Cascadia Mono", Consolas, monospace; font-size: 10px; letter-spacing: .14em; color: #5b6570; text-transform: uppercase; }
      .badge { display: inline-block; font-family: "Cascadia Mono", Consolas, monospace; font-size: 10px; letter-spacing: .08em; padding: 3px 8px; border: 1px solid #a9b1a6; color: #3e4a3f; text-transform: uppercase; }
      .badge.fail { border-color: #b23a4a; color: #9c2434; background: #fbeff0; }
      h1 { font-size: 25px; margin: 26px 0 6px; letter-spacing: .01em; }
      h2 { font-size: 15px; letter-spacing: .06em; text-transform: uppercase; font-family: "Cascadia Mono", Consolas, monospace; margin: 34px 0 12px; color: #3f4850; border-bottom: 1px solid #d9ddd6; padding-bottom: 6px; }
      p { margin: 8px 0; }
      .meta { color: #57616a; font-size: 12.5px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-top: 12px; }
      .card { border: 1px solid #d7dcd4; background: #fbfcf9; padding: 10px 12px; }
      .card .k { font-family: "Cascadia Mono", Consolas, monospace; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: #6a747c; }
      .card .v { font-size: 19px; font-weight: 600; margin-top: 3px; font-variant-numeric: tabular-nums; }
      table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 6px; }
      th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid #e2e6df; vertical-align: top; }
      th { font-family: "Cascadia Mono", Consolas, monospace; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #5d676f; background: #eef1ea; }
      td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: "Cascadia Mono", Consolas, monospace; }
      .pass { color: #2f7d4f; font-weight: 600; }
      .warn { color: #9a6a10; font-weight: 600; }
      .fail { color: #a32335; font-weight: 600; }
      .notice { border-left: 3px solid #c8ccbf; background: #eef1ea; padding: 10px 13px; font-size: 12.5px; margin: 12px 0; }
      .notice.warn { border-color: #d9a53a; background: #fbf5e6; }
      .notice.fail { border-color: #c04556; background: #fbeff0; }
      code, .mono { font-family: "Cascadia Mono", Consolas, monospace; font-size: 11.5px; }
      ul { margin: 6px 0; padding-left: 20px; }
      .foot { margin-top: 40px; border-top: 1px solid #d9ddd6; padding-top: 12px; font-size: 11.5px; color: #6a747c; }
      @media print { body { background: #fff; } .wrap { padding: 0; } }
    `;

    const metricRows = (comp && comp.pairs ? comp.pairs : []).map((p) => {
      const b = p.baseline && p.baseline.value != null ? num(p.baseline.value, p.baseline.precision != null ? p.baseline.precision : 6) : '不可用';
      const t = p.trial && p.trial.value != null ? num(p.trial.value, p.trial.precision != null ? p.trial.precision : 6) : '不可用';
      const d = p.delta != null ? (p.delta > 0 ? '+' : '') + num(p.delta, 6) : '—';
      const unit = (p.trial && p.trial.unit) || (p.baseline && p.baseline.unit) || '';
      const win = p.trial && p.trial.time_window ? p.trial.time_window[0] + '–' + p.trial.time_window[1] + ' s' : '—';
      return `<tr><td><span class="mono">${esc(p.metric_id)}</span><div class="meta">${esc((p.trial && p.trial.label) || '')}</div></td>
        <td class="num">${esc(b)}</td><td class="num">${esc(t)}</td><td class="num">${esc(d)}</td>
        <td>${esc(unit)}</td><td class="num">${esc(win)}</td></tr>`;
    }).join('');

    const checksRows = (comp && comp.checks ? comp.checks : []).map((c) =>
      `<tr><td><span class="mono">${esc(c.id)}</span></td><td>${esc(c.label)}</td>
       <td class="${esc(c.status)}">${c.status === 'pass' ? '通过' : c.status === 'warn' ? '警告' : '未通过'}</td>
       <td>${esc(c.message)}</td></tr>`).join('');

    const qualityRows = (trial.quality || []).map((q) =>
      `<tr><td><span class="mono">${esc(q.check_id)}</span></td><td>${esc(q.label)}</td>
       <td class="${q.status === 'pass' ? 'pass' : q.status === 'warn' ? 'warn' : 'fail'}">${q.status === 'pass' ? '通过' : q.status === 'warn' ? '警告' : '失败'}</td>
       <td>${esc(q.tolerance || '')}</td><td>${esc(num(q.computed_value, 8))}</td><td>${esc(q.message || '')}</td></tr>`).join('');

    const eventRows = (trial.events || []).map((e) =>
      `<tr><td><span class="mono">${esc(e.event_id)}</span></td><td>${esc(e.event_type)}</td>
       <td class="num">${esc(num(e.trigger_s, 1))} s</td><td>${esc(e.target_signal || '')}</td>
       <td class="num">${esc(num(e.magnitude, 3))}</td><td>${esc(e.unit || '')}</td><td>${esc(e.label || '')}</td></tr>`).join('');

    const findings = (comp && comp.findings ? comp.findings : []).map((f) =>
      `<li><strong>${esc(f.title)}</strong>：${esc(f.text)}</li>`).join('');

    const assumptions = ((system && system.model && system.model.assumptions) || []).map((a) =>
      `<li>${esc(a.id ? a.id + '：' : '')}${esc(a.text || a.id)}</li>`).join('');
    const limitations = ((system && system.model && system.model.limitations) || []).map((l) => `<li>${esc(l)}</li>`).join('');

    const validityNote = comp && comp.valid === false
      ? '<div class="notice fail">本对比不可比（incomparable）：不得表述为“因故障导致”的因果结论，请先核对白名单差异项。</div>'
      : '<div class="notice">对比一致性检查通过（模型、参数、时钟）。</div>';

    return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FaultLab 报告 · ${esc(trial.runId)} · ${esc(trial.label || '')}</title>
<style>${css}</style></head>
<body><div class="wrap">
  <div class="brand"><span class="mark">FAULTLAB</span><span class="sub">Virtual Energy Lab · V0.1 实验报告</span>
    <span class="spacer" style="flex:1"></span>
    <span class="badge ${failed ? 'fail' : ''}">${esc(statusLabel)}</span></div>

  <h1>${esc((system && system.title) || trial.systemId)} · ${esc((system && system.experimentName) || trial.label || '')}</h1>
  <p class="meta">生成时间 ${esc(now.toLocaleString('zh-CN'))} · 引擎版本 ${esc(trial.engineVersion || '')} · 模型哈希 <span class="mono">${esc((trial.modelHash || '').slice(0, 24))}</span> · 配置哈希 <span class="mono">${esc((trial.configHash || '').slice(0, 24))}</span></p>

  <h2>运行身份</h2>
  <table><thead><tr><th>角色</th><th>Run ID</th><th>说明</th><th>模式</th><th>状态</th><th>创建时间</th></tr></thead><tbody>
  ${[baseline, trial].filter(Boolean).map((r) => `<tr><td>${r.runId === (trial && trial.runId) ? '试验' : '基准'}</td><td class="mono">${esc(r.runId)}</td><td>${esc(r.label || '')}</td><td>${esc((r.config && r.config.feedback_mode) === 'monitor' ? '仅监测' : '闭环反馈')}</td><td class="pass">已完成</td><td class="mono">${esc(r.createdAt || '')}</td></tr>`).join('')}
  </tbody></table>

  <h2>对比有效性</h2>
  ${validityNote}
  <table><thead><tr><th>检查项</th><th>名称</th><th>状态</th><th>说明</th></tr></thead><tbody>${checksRows || '<tr><td colspan="4">无可比性数据（需要基准与试验两个运行）</td></tr>'}</tbody></table>

  <h2>关键指标</h2>
  <table><thead><tr><th>指标</th><th class="num">基准</th><th class="num">试验</th><th class="num">差值</th><th>单位</th><th class="num">时间窗</th></tr></thead>
  <tbody>${metricRows || '<tr><td colspan="6">不可用</td></tr>'}</tbody></table>

  <h2>真实/测量功率平衡</h2>
  <div class="notice">真实残差 r_true = P_gen,true + P_bat,true − P_load 恒为 0（理想平衡）；观测一致性残差 r_meas = P_gen,true + P_bat,meas − P_load 在故障期间为测量残差（例如 +4 kW），它不是能量损失，也不是额外发电的能量。</div>

  <h2>故障事件</h2>
  <table><thead><tr><th>事件</th><th>类型</th><th class="num">时刻</th><th>目标通道</th><th class="num">幅值</th><th>单位</th><th>说明</th></tr></thead><tbody>${eventRows || '<tr><td colspan="7">无故障（基准运行）</td></tr>'}</tbody></table>

  <h2>数值校验</h2>
  <table><thead><tr><th>检查</th><th>名称</th><th>状态</th><th>容差</th><th class="num">计算值</th><th>说明</th></tr></thead><tbody>${qualityRows}</tbody></table>

  <h2>重要发现</h2>
  <ul>${findings || '<li>不可用（需要基准与试验两个运行）</li>'}</ul>
  ${comp && comp.warnings && comp.warnings.length ? '<div class="notice warn">' + comp.warnings.map(esc).join('<br>') + '</div>' : ''}

  <h2>模型假设与局限</h2>
  <ul>${assumptions || '<li>见运行配置清单</li>'}</ul>
  <ul>${limitations || ''}</ul>

  <div class="foot">
    数据性质：解析/行为级（L0）演示数据（synthetic）；非 Simulink、非现场数据、非实测。所有结论可回溯到上面记录的运行、模型哈希与配置哈希。<br>
    来源分类：CONFIG / MODEL_STATE / OBSERVATION / CONTROLLER / FAULT_EVENT / DERIVED / MODEL_ASSUMPTION。说明文本不作为计算数据源。
    <div class="mono" data-testid="export-footer" style="margin-top:8px;word-break:break-all;">${esc(evidenceFooter(trial))}</div>
  </div>
</div></body></html>`;
  }

  /* ===================================================================
     EvidenceBundle v1（G0-DEC-10）：7 数据文件 + SHA256SUMS.txt 的浏览器导出/导入
     =================================================================== */
  function bundleFilePrefix(run) {
    return 'FaultLab_Bundle_' + (run ? run.runId : 'run') + '_';
  }

  function downloadBundle(run) {
    if (!FL.bundle || !FL.bundle.buildBundleFiles) throw new Error('FL.bundle 未就绪');
    const files = FL.bundle.buildBundleFiles(run);
    const prefix = bundleFilePrefix(run);
    const names = Object.keys(files);
    names.forEach((name, i) => {
      const text = files[name];
      const mime = /\.csv$/.test(name) ? 'text/csv;charset=utf-8'
        : /\.json$/.test(name) ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8';
      setTimeout(() => download(prefix + name, text, mime), i * 220);
    });
    return { count: names.length, prefix };
  }

  function importBundleFromFileList(fileList) {
    const known = (FL.bundle && FL.bundle.ALL_FILES) || [];
    const files = {};
    const readers = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const base = String(f.name || '').replace(/^FaultLab_Bundle_[^_]+_/, '');
      if (known.indexOf(base) === -1) continue;
      readers.push(new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => { files[base] = String(reader.result); resolve(); };
        reader.onerror = () => reject(new Error('读取文件失败：' + base));
        reader.readAsText(f, 'utf-8');
      }));
    }
    return Promise.all(readers).then(() => {
      if (!files['manifest.json']) {
        const err = new Error('[CN-E01] 未选择有效证据包文件（需要 manifest.json 等 8 个文件）');
        err.code = 'CN-E01';
        throw err;
      }
      return FL.bundle.importBundle(files);
    });
  }

  /* ===================================================================
     证据等级页脚（UI_COPY_GUARDRAILS §1.5 固定串；导出必带，逐字锁定）
     =================================================================== */
  function evidenceFooter(run) {
    const mf = (run && run.manifest) || {};
    const quality = (run && run.quality) || [];
    const failedChecks = quality.some((q) => q.status === 'fail');
    const checksStatus = (mf.verification && mf.verification.consistency_checks) || (failedChecks ? 'fail' : 'pass');
    const runHash = (mf.integrity && mf.integrity.run_hash) || (run && run.runHash) || '';
    const parts = [
      'model_provenance=analytical_demo',
      'data=synthetic',
      'verification.consistency_checks=' + checksStatus,
      'verification.model_validation=' + ((mf.verification && mf.verification.model_validation) || 'not_performed'),
      'verification.hardware_verification=' + ((mf.verification && mf.verification.hardware_verification) || 'not_performed'),
      'integrity.checks_status=' + ((mf.integrity && mf.integrity.checks_status) || checksStatus),
      'integrity.run_hash=sha256:' + runHash,
      'hash=content_integrity_only(not_a_signature)',
      'rounding=round-half-up',
      '内容校验和：不代表签名/来源/第三方认证'
    ];
    const prefix = failedChecks ? 'FAIL · 内部一致性检查未通过 | ' : '';
    return prefix + parts.join(' | ');
  }

  /* ===================================================================
     download / copy
     =================================================================== */
  function download(filename, text, mime) {
    const type = mime || 'text/plain;charset=utf-8';
    let blob;
    try { blob = new Blob([text], { type }); } catch (e) { blob = new Blob([String(text)], { type: 'text/plain;charset=utf-8' }); }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 900);
    return true;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function csvFilename(run) {
    return 'FaultLab_' + (run.systemId || 'EXP') + '_' + run.runId + '_' + stamp() + '.csv';
  }
  function jsonFilename(run, kind) {
    return 'FaultLab_' + (kind || 'manifest') + '_' + (run ? run.runId : 'all') + '_' + stamp() + '.json';
  }
  function reportFilename(run) {
    return 'FaultLab_report_' + run.runId + '_' + stamp() + '.html';
  }

  FL.exporter = {
    csv,
    configManifest,
    htmlReport,
    summaryText,
    evidenceBundle,
    download,
    copyText,
    csvFilename,
    jsonFilename,
    reportFilename,
    downloadBundle,
    importBundleFromFileList,
    evidenceFooter,
    bundleFilePrefix,
    _helpers: { esc, num, csvCell, stamp }
  };
})();
