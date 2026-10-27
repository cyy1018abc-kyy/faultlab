/* monitor contrast + compare */
FL.store.actions.createMonitorContrast();
FL.store.actions.setTime(26, { pause: true });
var st = FL.store.getState();
FL.store.actions.setPageState('compare', { trialRunId: st.activeRun.runId, baselineRunId: st.baselineRun ? st.baselineRun.runId : null, view: 'split' });
FL.store.actions.navigate('compare');
