# -*- coding: utf-8 -*-
import io

p = 'src/core/arena-protocol.js'
s = io.open(p, encoding='utf-8').read()
a = """    return {
      schema: SCHEMA_REVEAL,
      testsetId: opts.testsetId,"""
b = """    return {
      schema: SCHEMA_REVEAL,
      testset_id: opts.testsetId,"""
assert a in s, 'reveal key anchor missing'
s = s.replace(a, b, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('buildRevealV2 key fixed')

p2 = 'tools/arena2-session.mjs'
s2 = io.open(p2, encoding='utf-8').read()
a2 = """  try {
    return {
      agent: sub.agent.name,
      report: AP.scoreV2({ bundle, submission: sub, reveal, blindSha256: blindSha, submissionSha256: subSha })
    };
  } catch (e) {
    console.error('[DEBUG] scoreV2 fail:', e.code, e.field, e.message);
    console.error('[DEBUG] reveal.testset_id=', reveal.testset_id, 'bundle.testset_id=', bundle.testset_id);
    console.error('[DEBUG] reveal.match_id=', reveal.match_id, 'bundle.match_id=', bundle.match_id,
      'mapping len=', (reveal.mapping || []).length);
    throw e;
  }
});"""
b2 = """  return {
    agent: sub.agent.name,
    report: AP.scoreV2({ bundle, submission: sub, reveal, blindSha256: blindSha, submissionSha256: subSha })
  };
});"""
assert a2 in s2, 'debug block anchor missing'
s2 = s2.replace(a2, b2, 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(s2)
print('session debug removed')
