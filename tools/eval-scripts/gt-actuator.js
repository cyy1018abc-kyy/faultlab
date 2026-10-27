/* GT actuator scenario -> signals actuator category */
FL.store.actions.updateDraft(function (d) {
  d.fault.family = 'actuator_fault';
  d.fault.faultId = 'fuel_valve_stuck';
  d.fault.t_start_s = 20;
  d.fault.params = { magnitude: 50 };
});
FL.store.actions.createRun();
FL.store.actions.setPageState('signals', { category: 'actuator' });
FL.store.actions.setTime(30, { pause: true });
FL.store.actions.navigate('signals');
