(function(){const module={exports:{}};const require={main:null};
// アウト返し：複数戦略パターン v0.7（v0.6＋C000編集決定：迷いの種類・商談用の台詞・場面ごとの流れ）。外部ライブラリなし。
// generate(input, P, V) … P = patterns.json、V = v2.0 のデータ（断り文句の読み取りと相手の区分だけに使う。読むだけ）
'use strict';

const UNFOUNDED_RE = /必ず|絶対に?|確実に|間違いなく|一番安|最安|業界(No|ナンバー|一|初)|安くなります|手間はかかりません|簡単です|すぐに?慣れ|心配ありません|元が取れ|お客様が増え|売上が(増え|上が)(ます|る)|今がチャンス|今だけ/;
const NEGATIVE_RE = /高い|悪い|弱い|劣|遅い|不満|評判|問題|古い|ダメ|だめ/;
const PERMISSION_RE = /(少し|ちょっと)(だけ)?(、)?(お時間)?(よろしい|いいですか)|30秒|1分だけ|お時間よろしい/;
const isQuestion = (t) => /(か|ますか|ですか|でしょうか|ませんか)[。？]?$|？$/.test(t.trim());
// 引用（『』「」）の中の「？」は、営業の質問として数えない
const unquote = (t) => t.replace(/『[^』]*』|「[^」]*」/g, '〇');
const SCENE = { teleapo: 'テレアポ', first: '初回の訪問', proposal: '提案・商談', existing: '既存のお客様', closing: '契約の直前' };
const sentences = (t) => unquote(t).split(/(?<=[。？])\s*/).filter(s => s.trim());
const bigrams = (s) => { const b = new Set(); const x = s.replace(/[、。「」『』？\s]/g, ''); for (let i = 0; i + 1 < x.length; i++) b.add(x.slice(i, i + 2)); return b; };
const similarity = (a, b) => { const A = bigrams(a), B = bigrams(b); let n = 0; for (const x of A) if (B.has(x)) n++; return n / Math.max(1, Math.min(A.size, B.size)); };

function classify(input, V) {
  const O = V.objections;
  const notes = [];
  let key = input.objection || null;
  const phrase = (input.phrase || '').trim();
  const hits = phrase ? O.order.filter(k => new RegExp(O.objections[k].match).test(phrase)) : [];
  if (!key) key = hits[0] || null;
  if (key !== 'stop' && hits.includes('stop')) { notes.push('連絡を断る言い方が含まれるため、「もう連絡しないでほしい」として扱っています。'); key = 'stop'; }
  return { key, notes, phrase };
}

function generate(input, P, V) {
  const { key, notes, phrase } = classify(input, V);
  const scene = input.scene || 'teleapo';
  const targetKey = V.targets.targets[input.target] ? input.target : '法人';
  const cls = V.targets.targets[targetKey].class;
  const catKey = P.categories[input.category] ? input.category : '*';
  if (input.category && catKey === '*') notes.push(`商材カテゴリ「${input.category}」のデータはまだないため、どの商材でも使える返し方だけを出します。`);
  const cat = P.categories[catKey];
  const C = key && P.cases[key];
  const base = { version: 'objection-patterns-v0.7', objection: key, scene, target: targetKey, category: catKey };
  const caseData = C && (C.byCategory[catKey] || C.byCategory['*']);
  if (!caseData) return Object.assign(base, { label: C ? C.label : '', notes: notes.concat(C ? `「${C.label}」×「${catKey === '*' ? '商材未入力' : catKey}」の返し方は、まだ用意していません（ほかの組み合わせは承認後に作ります）。` : 'この断り文句の返し方は、まだ用意していません。これまでの台本（v2.0）を使ってください。'), primary: null, patterns: [], excluded: [], issues: [] });
  if (cat.business === '法人' && cls === 'C') notes.push(`「${catKey}」は法人向けの商材のため、個人の相手は想定外です。`);

  const facts = input.facts || {};
  const company = input.company || {};
  const filled = (t) => t.replace(/\{(\w+)\}/g, (m, k) => (company[k] || '').trim() || m);
  const strengths = (input.strengths || []).filter(s => s && s.confirmed && s.t).map(s => s.t);
  // strength・target は rules.notRecommendFields（おすすめの根拠にしない）。値は持つが、recommendFields にない限り点にならない
  const fieldVal = { concern: input.concern || '', sat: input.sat || '', phrase, strength: strengths.join(' '), target: targetKey };
  const excluded = [];
  const cands = [];
  // 商談の場面では、商談用の台詞（meeting）があればそれを使う（C000編集決定 v0.7 指示3）。電話の二段階の話し方などは引き継がない
  const useMeeting = P.sceneScript && P.sceneScript[scene] === 'meeting';
  const view = (p) => useMeeting && p.meeting ? Object.assign({}, p, { openingSteps: undefined, openingStepsNote: undefined, openingNote: undefined, openingIfFact: undefined, openingIfNoNeed: undefined }, p.meeting, { base: p }) : p;
  for (const p0 of caseData.patterns) {
    const p = view(p0);
    const ex = (why) => excluded.push({ pattern_id: p.id, axis: p.axis, why });
    if (!p.scenes.includes(scene)) { ex(`この場面（${SCENE[scene] || scene}）の台本は、まだない`); continue; }
    if (p.requires.some(r => !cat.traits.includes(r))) { ex(`この商材には当てはまらない返し方`); continue; }
    if (p.targetNot && p.targetNot.includes(targetKey)) { ex(`相手が「${targetKey}」のときは使わない（${p.notFor}）`); continue; }
    if (p.fact && facts[p.fact] === false) { ex(`前提がないと分かった：${P.facts[p.fact].label}`); continue; }
    if (p.phraseRequired && !new RegExp(p.phraseRequired).test(phrase)) { ex(`相手は時期を言っていない`); continue; }
    // おすすめの点：相手の課題・関心・言葉と、確認済みの事実だけ。自社の強み・役職は使わない
    const basis = [];
    for (const s of p.signals || []) if (P.rules.recommendFields.includes(s.field) && fieldVal[s.field] && new RegExp(s.re).test(fieldVal[s.field])) basis.push({ field: s.field, value: fieldVal[s.field], why: s.why });
    if (p.fact && facts[p.fact] === true) basis.push({ field: 'facts', value: p.fact, why: `確認済みの事実：${P.facts[p.fact].label}` });
    const factUnknown = p.fact && facts[p.fact] === undefined;
    const needMet = !p.needSignal || basis.some(b => b.field !== 'facts');
    cands.push({ p, basis, factUnknown, needMet });
  }
  if (C.single) notes.push(C.single);

  // 主に見せる1つ：根拠が1つに絞れればおすすめ。絞れなければ「最初に試しやすい」（starter）
  const top = Math.max(0, ...cands.map(x => x.basis.length));
  const tops = cands.filter(x => x.basis.length === top);
  let primary;
  if (cands.length === 1) primary = { pattern_id: cands[0].p.id, kind: 'only', basis: [] };
  else if (top >= 1 && tops.length === 1) primary = { pattern_id: tops[0].p.id, kind: 'recommended', basis: tops[0].basis.map(b => b.why) };
  else {
    const st = cands.find(x => x.p.starter && x.p.starterWhy);
    primary = st ? { pattern_id: st.p.id, kind: 'starter', basis: [st.p.starterWhy || '最初に試しやすい返し方です。'].concat(top >= 1 ? ['相手の話に当てはまる返し方が複数あるので、おすすめは1つに決めていません。'] : ['相手が何に困っているかがまだ分からないので、おすすめは1つに決めていません。']) } : (cands.length ? { pattern_id: cands[0].p.id, kind: 'none', basis: ['最初に使う返しは決めていません。'] } : null);
  }

  const sceneSample = (C.sampleByScene && C.sampleByScene[scene]) || C.sample;
  const sample = phrase || sceneSample;
  // 営業場面ごとのゴール（テレアポ＝アポイント獲得、商談・クロージング＝契約、既存＝入力された目的）
  const goalKey = P.sceneGoal[scene];
  const G = P.goals[goalKey];
  const goal = { key: goalKey, label: goalKey === 'purpose' && input.purpose ? `${G.label}：${input.purpose}` : G.label, note: G.note };
  // 分かっていること：相手の言葉・入力された課題・確認済みの事実。心理の仮説（hyp）とは分けて出す（C000判断4）
  const known = (p) => [phrase ? `相手の言葉：「${phrase}」` : `相手の言葉（例）：「${sceneSample}」`]
    .concat(input.concern ? [`入力された相手の課題：${input.concern}`] : [])
    .concat(p.fact && facts[p.fact] === true ? [`確認済みの事実：${P.facts[p.fact].label}`] : [])
    .concat(p.fact && facts[p.fact] === undefined ? [`まだ確認していない：${P.facts[p.fact].label}`] : []);
  const order = cands.slice().sort((a, b) => (a.p.id === (primary && primary.pattern_id) ? -1 : b.p.id === (primary && primary.pattern_id) ? 1 : 0));
  const patterns = order.map(x => {
    const p = x.p;
    const status = primary && p.id === primary.pattern_id && primary.kind !== 'none' ? primary.kind : (x.factUnknown || !x.needMet ? 'conditional' : 'option');
    // C2：前提が確認済みなら、仮定（「もし〜なら」）ではなく言い切りの文（C000判断2）
    let opening = p.needSignal && !x.needMet ? p.openingIfNoNeed : (p.openingIfFact && facts[p.fact] === true ? p.openingIfFact : p.opening);
    // 相手が示した時期（E2）：C000の例の「来週」を、相手が実際に言った時期に置き換える
    const timing = p.phraseRequired && phrase.match(new RegExp(p.phraseRequired));
    if (timing && opening.includes('来週') && timing[0] !== '来週') opening = opening.replace('来週', timing[0]);
    const strengthNote = p.strengthAxis && strengths.some(s => new RegExp(p.strengthAxis).test(s))
      ? (x.needMet ? `確認済みの強み「${strengths.find(s => new RegExp(p.strengthAxis).test(s))}」は、相手が気にしている入金の話と合うので、比べる材料として話してよいです。` : `確認済みの強み「${strengths.find(s => new RegExp(p.strengthAxis).test(s))}」があっても、相手が入金を気にしていると分かるまでは話しません。強みがあるだけでは、おすすめにしません。`)
      : '';
    // 答えにも前提がある（C1の値引きの要望は、プランを調整できる前提）。ないと分かれば出さない
    const answers = p.answers.filter(a => !(a.fact && facts[a.fact] === false));
    return {
      pattern_id: p.id,
      axis: p.axis,
      pattern_name: p.name,
      status,
      condition: p.condition || '',
      condition_check: x.factUnknown ? `使う前に確認：${P.facts[p.fact].label}` : (!x.needMet ? '相手が入金を気にしているか、まだ分からないので、軽く聞く一言だけにしています。弊社の入金条件はまだ話しません。' : ''),
      use_when: p.useWhen,
      not_for: p.notFor,
      insight: { context: caseData.context, known: known(p), hyp: p.hyp || '', read: answers.map(a => ({ if: a.c, means: a.read })) },
      strategy: { aim_logic: p.aimLogic, axis: p.axis },
      script: [{ speaker: 'customer', text: sample }, { speaker: 'sales', text: opening, theory: p.aimLogic, note: p.openingNote || '', steps: p.openingSteps || null, stepsNote: p.openingStepsNote || '' }],
      // B2：軽く聞く一言に「気になる」と返ったら、入金までの日数を比べる言い方へつなぐ（W001補記）
      answers: (p.needSignal && !x.needMet ? [{ customer: '気になりますね。', reply: p.opening, means: '入金を気にしている（推測どおり）。入金までの日数を比べる話に進む', next: '今の入金までの日数を聞く', why: '', by: 'W001', if_continue: null }] : [])
        .concat(answers.map(a => ({
          customer: a.c, reply: a.s, means: a.read + (a.fact && facts[a.fact] === undefined ? `（使う前に確認：${P.facts[a.fact].label}）` : ''),
          next: a.next, why: a.why || '', by: a.by || 'C000', if_continue: a.ifContinue || null
        }))),
      // 興味がない：相手から自発的に質問されたときだけの補助例（C000判断5）
      assists: (p.assists || []).filter(a => (a.needs || []).every(k => (company[k] || '').trim())).map(a => ({ customer: a.c, reply: filled(a.s), means: a.read, next: a.next, only_if: '相手から質問されたときだけ使う' })),
      // 入力がないため台本に出さなかった返し（画面では「入力が必要」として出す）
      input_needed: (p.assists || []).filter(a => !(a.needs || []).every(k => (company[k] || '').trim())).map(a => ({ customer: a.c, needs: a.needs.filter(k => !(company[k] || '').trim()).map(k => ({ key: k, label: P.companyFacts[k].label })) })),
      action_type: p.actionType,
      goal_flow: goalFlow(p, goalKey, P, company),
      action_type_label: P.actionTypes[p.actionType],
      ends: p.endsConversation ? p.next : '',
      then: !p.endsConversation && p.next ? p.next : '',
      strength_note: strengthNote,
      recommend: { is: status === 'recommended', basis: x.basis.map(b => b.why), basis_fields: x.basis.map(b => b.field) },
      by: p.by || 'C000',
      // 変更の記録：v0.3 の判断（1〜7）、v0.4 の日本語品質改善、v0.5 の C000 最終判断（1〜5）、v0.6 の営業ゴール、v0.7 の C000 編集決定（1〜7）
      revised: { v03: [...new Set((p.rev03 || []).map(r => r.item))], v04: (p.rev04 || []).length > 0, v05: [...new Set((p.rev05 || []).map(r => r.item))], v06: (p.rev06 || []).length > 0, v07: [...new Set((p.rev || []).map(r => r.item))] },
      script_set: p.base ? 'meeting' : 'phone'
    };
  });
  const out = Object.assign(base, { goal, ui_labels: Object.assign({}, P.ui, { psychologyNote: P.uiNotes.psychology }, P.uiGoal), label: C.label, single: C.single || null, context: caseData.context, editorNote: caseData.editorNote || '', notes, primary, patterns, excluded });
  out.issues = check(out, { cls, P, current: input.current || '' });
  return out;
}

// ゴールへのつなげ方：場面のゴールの道筋を、相手の反応ごとに返す。自社の事実が入力されていない道筋は出さない（input_needed に出ている）
function goalFlow(p, goalKey, P, company) {
  const g = p.goalFlows && p.goalFlows[goalKey];
  if (!g) return null;
  const G = P.goals[goalKey];
  const has = (k) => (company[k] || '').trim();
  const fill = (t) => t.replace(/\{(\w+)\}/g, (m, k) => has(k) || m);
  const H = P.hesitations || {};
  const paths = g.paths.filter(x => x.turns.every(t => (t.needs || []).every(has))).map(x => ({
    id: x.id, reaction: x.reaction, reaction_label: P.reactions[x.reaction] + (x.hesitation ? `（${H[x.hesitation].label}）` : ''),
    hesitation: x.hesitation || null, hesitation_label: x.hesitation ? H[x.hesitation].label : '', handling: x.hesitation ? H[x.hesitation].handling : '',
    customer_initiated: x.assist !== undefined,
    when: x.when, outcome: x.outcome, outcome_label: P.outcomes[x.outcome],
    reaches_goal: G.success.includes(x.outcome), lands: G.landing.includes(x.outcome), end_condition: x.endCondition,
    turns: x.turns.map(t => ({ speaker: t.speaker, tone: t.tone || null, hesitation: t.hesitation || null, stage: t.stage || null, stage_label: t.stage ? (t.stage === 'ask' ? P.askKinds[t.kind] : P.stages[t.stage]) : (t.tone === 'hesitant' && t.hesitation ? `迷い（${H[t.hesitation].label}）` : P.reactions[t.tone] || null), kind: t.kind || null, text: fill(t.text), value: t.value ? fill(t.value) : '', direction: t.direction || '', why: t.why || '' }))
  }));
  return { goal: goalKey, goal_label: G.label, pursue: g.pursue, note: g.note, flow: (P.sceneFlow || {})[goalKey] || [], paths };
}

function checkFlows(out, c, issues) {
  const P = c.P;
  const inv = new RegExp(P.rules.inventRe);
  const ph = new RegExp(P.rules.placeholderRe);
  const dur = P.rules.durationRe ? new RegExp(P.rules.durationRe) : null;
  const asks = [];
  for (const p of out.patterns) {
    const g = p.goal_flow;
    const id = p.pattern_id;
    if (!g) continue;
    const G = P.goals[g.goal];
    // G1 道筋がそろっている：ゴールを追うなら、着地できる道筋と、着地できない場合の終わり方の両方がある
    if (g.pursue) {
      if (!g.paths.some(x => x.lands)) issues.push(`G1:${id} ゴールに着地する道筋がない`);
      if (!g.paths.some(x => !x.lands)) issues.push(`G1:${id} ゴールに至らない場合の道筋がない`);
    }
    for (const x of g.paths) {
      const T = x.turns;
      const at = `${id}/${x.id}`;
      // G5 話し手が交互（営業の質問攻め・長い説明を防ぐ）。最初は相手
      T.forEach((t, i) => { if (i > 0 && T[i - 1].speaker === t.speaker) issues.push(`G5:${at} 同じ話し手が続く（${i}手目）`); });
      if (T.length && T[0].speaker !== 'customer') issues.push(`G5:${at} 最初が相手の反応ではない`);
      let positive = false, confirmed = false, refused = false, hesitantSinceLastPositive = false, interest = false, stopped = false;
      const HES = P.hesitations || {};
      T.forEach((t, i) => {
        if (t.speaker === 'customer') {
          if (['positive', 'accept'].includes(t.tone)) { positive = true; hesitantSinceLastPositive = false; }
          if (t.tone === 'hesitant') hesitantSinceLastPositive = true;
          if (['refusal', 'stop', 'decline'].includes(t.tone)) refused = true;
          if (t.tone === 'stop') stopped = true;
          if (t.tone === 'interest') interest = true;
          // G11 迷いの種類：迷いには種類があり、種類ごとの対応をする（C000編集決定 v0.7 指示2）
          if (t.tone === 'hesitant') {
            const nx = T[i + 1];
            if (!HES[t.hesitation]) issues.push(`G11:${at} 迷いの種類が分からない（${i}手目）`);
            else if (t.hesitation === 'later') { if (nx && (nx.stage !== 'end' || sentences(nx.text).some(isQuestion))) issues.push(`G11:${at} 「今は決めない」の後に、意向を尊重して終えていない`); }
            else if (nx && !(nx.stage === 'confirm' && sentences(nx.text).some(isQuestion))) issues.push(`G11:${at} 迷い（${HES[t.hesitation].label}）の後に、確認がない`);
          }
          return;
        }
        const tx = t.text;
        const sn = sentences(tx).filter(x => !/^(お時間をいただき、|今日は)?ありがとうございま(した|す)。$/.test(x)), qn = sn.filter(isQuestion).length;
        // G5 1回の発話は短く、質問は1つ
        if (tx.length > P.rules.flowTurnMaxChars || sn.length > P.rules.flowTurnMaxSentences) issues.push(`G5:${at} 営業の発話が長い（${tx.length}字・${sn.length}文）`);
        if (qn > 2 || (qn === 2 && !/それとも/.test(tx))) issues.push(`G5:${at} 質問が続く`);
        // G6 契約条件・自社の強みを作らない。台本の安全（P3と同じ）。記号を出さない
        if (inv.test(tx)) issues.push(`G6:${at} 契約条件や強みの創作「${tx}」`);
        if (UNFOUNDED_RE.test(tx)) issues.push(`G6:${at} 断定・保証「${tx}」`);
        if (PERMISSION_RE.test(tx)) issues.push(`G6:${at} 許可の取り直し「${tx}」`);
        if (ph.test(tx)) issues.push(`G6:${at} 記号か未入力の差し込み「${tx}」`);
        if (c.cls === 'C' && /社内|御社|貴社|社員/.test(tx)) issues.push(`G6:${at} 個人に法人の言葉`);
        // G4 拒否・連絡停止の後は追撃しない（終える台詞だけ。質問しない）
        if (refused && (t.stage !== 'end' || qn > 0)) issues.push(`G4:${at} 拒否の後に追撃している「${tx}」`);
        // G13 アポの所要時間を固定しない（確認済みの情報がない限り。C000編集決定 v0.7 指示4）
        if (dur && dur.test(tx)) issues.push(`G13:${at} 所要時間を決めている「${tx.match(dur)[0]}」`);
        if (['confirm', 'resolve', 'intent'].includes(t.stage)) confirmed = true;
        if (t.stage === 'ask') {
          // G2 打診の前に、相手の前向きな反応と、必要な確認・合意がある
          const prev = T[i - 1];
          if (['appointment', 'contract'].includes(t.kind)) {
            if (!positive || hesitantSinceLastPositive) issues.push(`G2:${at} 相手が前向きになる前に${P.askKinds[t.kind]}をしている`);
            if (!confirmed) issues.push(`G2:${at} ${P.askKinds[t.kind]}の前に、必要な確認・合意がない`);
          }
          if (t.kind === 'date' && !(prev && prev.tone === 'accept')) issues.push(`G2:${at} 相手が承諾する前に日時を聞いている`);
          if (prev && ['refusal', 'stop', 'decline'].includes(prev.tone)) issues.push(`G2:${at} 断られた直後に打診している`);
          // G7 場面のゴールに合う打診だけ（テレアポで契約を打診しない）
          if (!G.asks.includes(t.kind)) issues.push(`G7:${at} この場面のゴールに合わない打診（${P.askKinds[t.kind]}）`);
          // G9 ゴールを追わないケース：連絡停止では打診しない。興味がないでは、相手が自分から新しい関心を示し、続きを望んだときだけ（指示5）
          if (!g.pursue && (out.objection === 'stop' || stopped || !x.customer_initiated || !interest)) issues.push(`G9:${at} ゴールを追わないケースで、相手からの関心なしに打診している`);
          // G12 場面の流れ（指示4）。テレアポ：アポ・次の行動の打診は、アポの価値を伝えてから。商談：契約の打診は、懸念の解消と意思確認の後
          if (g.goal === 'appointment' && ['appointment', 'next_action'].includes(t.kind) && !(t.value && tx.includes(t.value))) issues.push(`G12:${at} アポの価値を伝えずに打診している`);
          const st = T.slice(0, i).map(u => u.stage);
          if (g.goal === 'contract' && t.kind === 'contract' && !(st.includes('resolve') && st.lastIndexOf('intent') > st.indexOf('resolve'))) issues.push(`G12:${at} 懸念の解消と意思確認の前に、契約を打診している`);
          if (['appointment', 'contract'].includes(t.kind)) asks.push({ id, at, text: tx });
        }
        // G8 相手が答えていないことを、答えたことにしない（台詞の数字・曜日は、それまでの相手の言葉に出ている）
        const said = T.slice(0, i).filter(u => u.speaker === 'customer').map(u => u.text).join(' ');
        for (const m of tx.match(/\d+(台|人|日|月|時)|[月火水木金土日]曜/g) || []) if (!said.includes(m) && !(new RegExp(m.replace('曜', '曜?')).test(said))) issues.push(`G8:${at} 相手が言っていない「${m}」を使っている`);
      });
      // G3 道筋の着地：最後は営業の締め（着地・終える）。質問で終わらない。着地の種類が結果と合う
      const last = T[T.length - 1];
      if (T.length && (last.speaker !== 'sales' || !['close', 'end', 'reply'].includes(last.stage) || sentences(last.text).some(isQuestion))) issues.push(`G3:${at} 道筋が、営業の締めの台詞で終わっていない`);
      if (x.lands && !T.some(t => t.stage === 'ask')) issues.push(`G3:${at} 着地したのに、打診と合意がない`);
      if (x.lands && T.length && T[T.length - 2] && T[T.length - 2].tone !== 'accept') issues.push(`G3:${at} 相手の承諾なしに着地している`);
      if (!x.lands && T.some(t => t.stage === 'ask' && ['appointment', 'contract'].includes(t.kind)) && !T.some(t => t.tone === 'decline')) issues.push(`G3:${at} 着地しない道筋に、断られていない打診がある`);
      // G12 アポイントに着地した道筋は、相手の承諾の後に日程を聞いている（テレアポの流れの最後＝日程打診）
      if (x.outcome === 'appointment' && !T.some((t, i) => t.kind === 'date' && T.slice(0, i).some(u => u.kind === 'appointment'))) issues.push(`G12:${at} アポの打診の後に、日程を聞いていない`);
      // G11 判断材料・比較・社内判断の迷いは、確かめた後に、説明・比較・次の行動へつなぐ（相手がその後に断るか、今は決めないと言った場合を除く）
      const hi = T.findIndex(t => t.tone === 'hesitant' && t.hesitation !== 'later');
      if (hi >= 0 && !x.lands && !T.slice(hi + 1).some(t => ['refusal', 'decline', 'stop'].includes(t.tone) || t.hesitation === 'later')) issues.push(`G11:${at} 判断材料を求める迷いなのに、次につなげずに終えている`);
      if (x.reaction === 'hesitant' && !T.some(t => t.tone === 'hesitant' && t.hesitation === x.hesitation)) issues.push(`G11:${at} 道筋の迷いの種類と、会話の中の迷いが合わない`);
      // 連絡停止は終了（P10と同じ）
      if (x.reaction === 'stop' && T.some(t => t.speaker === 'sales' && t.stage !== 'end' && t.stage !== 'reply')) issues.push(`G4:${at} 連絡停止の後に続けている`);
    }
  }
  // G10 同じ打診文の貼り付けを禁止：同じ出力の中で、パターンが違えば打診の言葉も違う
  for (let i = 0; i < asks.length; i++) for (let j = i + 1; j < asks.length; j++) if (asks[i].id !== asks[j].id && (asks[i].text === asks[j].text || similarity(asks[i].text, asks[j].text) >= 0.6)) issues.push(`G10:${asks[i].at}と${asks[j].at} の打診がほぼ同じ（貼り付け）`);
}

function check(out, c) {
  const issues = [];
  const P = out.patterns;
  const refusal = ['stop', 'nointerest'].includes(out.objection);
  for (const p of P) {
    const id = p.pattern_id;
    const S = [p.script[1].text].concat(p.answers.map(a => a.reply), p.answers.filter(a => a.if_continue).map(a => a.if_continue.s), p.assists.map(a => a.reply));
    // P1 一本の営業ストーリーとしての欠け（仮説・狙いと理屈・台詞・答えか終え方・使う／向かない条件）
    if (!p.insight.hyp || !p.strategy.aim_logic || !p.script[1].text || !p.use_when || !p.not_for) issues.push(`P1:${id} 項目の欠け`);
    if (!p.answers.length && !p.ends && !p.then) issues.push(`P1:${id} 答えへの返しも、次の行動もない`);
    for (const a of p.answers.concat(p.assists)) if (!a.means || !a.next) issues.push(`P1:${id} 答えの見極めか次の行動がない`);
    // P3 台詞の安全
    for (const t of S) {
      if (PERMISSION_RE.test(t)) issues.push(`P3:${id} 許可の取り直し「${t}」`);
      if (UNFOUNDED_RE.test(t)) issues.push(`P3:${id} 断定・保証「${t}」`);
      if (((c.current && t.includes(c.current)) || /他社/.test(t)) && NEGATIVE_RE.test(t)) issues.push(`P3:${id} 競合への評価「${t}」`);
      if (/^(でも|ですが|いえ|いや)/.test(t) || /なぜ|どうして(?!も)/.test(t)) issues.push(`P3:${id} 否定・問い詰め「${t}」`);
      if (c.cls === 'C' && /社内|御社|貴社|社員/.test(t)) issues.push(`P3:${id} 個人に法人の言葉「${t}」`);
      if (out.objection === 'stop' && isQuestion(t)) issues.push(`P3:${id} 連絡拒否の後に質問`);
    }
    // P5 最初の一言は原則2文程度。10〜20秒で言える長さ。質問は1つ（二択の「それとも」は1つとみなす）
    // 二段階で話す場合は、各段を1回の発話として数える
    for (const op of p.script[1].steps || [p.script[1].text]) {
    const qn = sentences(op).filter(isQuestion).length;
    if (sentences(op).length > c.P.rules.openingMaxSentences) issues.push(`P5:${id} 最初の一言が長い（${sentences(op).length}文）`);
    if (op.length > c.P.rules.openingMaxChars) issues.push(`P5:${id} 最初の一言が長い（${op.length}字）`);
    if (qn > 2 || (qn === 2 && !/それとも/.test(op))) issues.push(`P5:${id} 質問が続く（${qn}問）`);
    }
    const op = p.script[1].text;
    // P8 条件つきのパターンは、条件を表示する
    if (p.status === 'conditional' && !p.condition) issues.push(`P8:${id} 条件つきなのに条件の表示がない`);
    // P9 会話を終えるパターンは、質問で終わらない
    if (p.ends && isQuestion(op)) issues.push(`P9:${id} 終えるパターンが質問で終わる`);
    // P10 拒否（興味がない・連絡しないで）の後：営業から質問しない。提案・資料・再連絡へ戻る流れを持たない（C000判断5）
    // 次の行動の「〜しない」「〜はしない」と打ち消している部分は、戻る流れとみなさない
    if (refusal) {
      for (const t of p.answers.map(a => a.reply).concat(p.assists.map(a => a.reply))) if (sentences(t).some(isQuestion)) issues.push(`P10:${id} 拒否の後に営業から質問「${t}」`);
      const nre = new RegExp(c.P.rules.refusalNextForbiddenRe);
      for (const a of p.answers.concat(p.assists)) if (a.next.split('。').some(s => nre.test(s) && !new RegExp(c.P.rules.refusalNextAllowRe || 'しない|しません|進めない').test(s))) issues.push(`P10:${id} 拒否の後に再勧誘へ戻る流れ「${a.next}」`);
      if (out.objection === 'stop' && p.assists.length) issues.push(`P10:${id} 連絡停止の希望に補助例がある`);
    } else if (p.assists.length) issues.push(`P10:${id} 補助例は拒否のケースだけ`);
    // P12 本音の仮説は言い切らない（C000判断4）。一文でも言い切りがあれば止める
    if (p.insight.hyp && sentences(p.insight.hyp).some(s => !new RegExp(c.P.rules.hypHedgeRe).test(s))) issues.push(`P12:${id} 仮説が断定になっている「${p.insight.hyp}」`);
    // P13 会話が続いているときの返しに、終わりの文を入れない（C000判断3）
    for (const a of p.answers) if (a.if_continue && /ありがとうございました|失礼します/.test(a.if_continue.s)) issues.push(`P13:${id} 会話が続くときの返しに終わりの文がある`);
  }
  // P16 商談の場面では、電話で使う言葉を台詞に流用しない（C000編集決定 v0.7 指示3）
  if (c.P.sceneScript && c.P.sceneScript[out.scene] === 'meeting' && c.P.rules.phoneOnlyRe) {
    const po = new RegExp(c.P.rules.phoneOnlyRe);
    for (const p of P) for (const t of [p.script[1].text].concat(p.answers.map(a => a.reply), p.goal_flow ? p.goal_flow.paths.flatMap(x => x.turns.map(u => u.text)) : [])) if (po.test(t)) issues.push(`P16:${p.pattern_id} 商談で電話の言葉を使っている「${t}」`);
  }
  // P15 台本に、未入力の差し込みや記号（［ ］・{ }）を出さない（C000最終判断4）
  const ph = new RegExp(c.P.rules.placeholderRe);
  for (const p of P) for (const t of [p.script[1].text].concat(p.answers.map(a => a.reply), p.answers.filter(a => a.if_continue).map(a => a.if_continue.s), p.assists.map(a => a.reply))) if (ph.test(t)) issues.push(`P15:${p.pattern_id} 台本に記号か未入力の差し込み「${t}」`);
  // P14 画面に出る文に、抽象的な営業用語や作業用の札を出さない（日本語品質改善）
  const ng = new RegExp(c.P.rules.plainNgRe);
  for (const t of displayTexts(out)) { const m = t.match(ng); if (m) issues.push(`P14:画面の文に「${m[0]}」「${t.slice(0, 40)}」`); }
  // P4 パターン同士が実質的に違う（判断軸・仮説・最初の一言）
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    if (P[i].axis === P[j].axis) issues.push(`P4:${P[i].pattern_id}と${P[j].pattern_id} の判断軸が同じ`);
    if (P[i].insight.hyp === P[j].insight.hyp) issues.push(`P4:${P[i].pattern_id}と${P[j].pattern_id} の仮説が同じ`);
    if (similarity(P[i].script[1].text, P[j].script[1].text) >= 0.6) issues.push(`P4:${P[i].pattern_id}と${P[j].pattern_id} の最初の一言が似すぎ（言い換えの水増し）`);
  }
  // P6 明確な拒否は1つだけ
  if (refusal && P.length > 1) issues.push('P6:明確な拒否に複数のパターン');
  // P7 おすすめは根拠つき。自社の強み・役職だけを根拠にしない
  if (out.primary && out.primary.kind === 'recommended') {
    const r = P.find(p => p.pattern_id === out.primary.pattern_id);
    if (!r.recommend.basis.length) issues.push('P7:根拠のないおすすめ');
    if (r.recommend.basis_fields.some(f => c.P.rules.notRecommendFields.includes(f))) issues.push('P7:自社の強みか役職を、おすすめの根拠にしている');
  }
  checkFlows(out, c, issues);
  return [...new Set(issues)];
}

// 画面に出る文（P14 の対象）
function displayTexts(o) {
  const T = [o.context, o.single].concat(o.notes, o.primary ? o.primary.basis : [], o.excluded.map(e => `${e.axis} ${e.why}`));
  for (const p of o.patterns) {
    T.push(p.axis, p.pattern_name, p.condition, p.condition_check, p.use_when, p.not_for, p.insight.hyp, p.strategy.aim_logic, p.script[1].text, p.script[1].note, p.script[1].stepsNote, p.ends, p.then, p.strength_note);
    T.push(...p.insight.known, ...p.recommend.basis);
    if (p.goal_flow) for (const x of p.goal_flow.paths) { T.push(x.when, x.end_condition); for (const t of x.turns) T.push(t.text, t.direction, t.why); }
    for (const a of p.answers.concat(p.assists)) T.push(a.reply, a.means, a.next, a.why, a.only_if, a.if_continue && a.if_continue.s, a.if_continue && a.if_continue.next, a.if_continue && a.if_continue.when);
  }
  return T.filter(Boolean);
}

const STATUS = { recommended: 'おすすめ', starter: '最初に試しやすい', option: 'ほかの返し方', conditional: '条件が合えば使う', only: '' };
function toText(o) {
  const L = [];
  const U = o.ui_labels || {};
  if (o.goal) L.push(`◎ ${U.goal || '営業のゴール'}：${o.goal.label}（${SCENE[o.scene] || o.scene}）`);
  L.push(`■ ${U.objection || 'お客様の断り文句'}：${o.patterns[0] ? `「${o.patterns[0].script[0].text}」― ` : ''}${o.label}（${SCENE[o.scene] || o.scene}／${o.target}／商材：${o.category === '*' ? '未入力' : o.category}）`);
  o.notes.forEach(n => L.push(`・${n}`));
  if (!o.patterns.length) return L.join('\n');
  L.push(`この断り文句でよくある事情：${o.context}`);
  if (o.patterns.length > 1) {
    L.push('');
    L.push(`【${U.choose}】`);
    L.push(U.chooseNote);
    for (const p of o.patterns) L.push(`・${p.pattern_name}${STATUS[p.status] ? `［${STATUS[p.status]}］` : ''}${p.status === 'conditional' ? `（${p.condition}）` : ''}`);
    if (o.primary.basis.length) L.push(`　最初に表示する理由：${o.primary.basis.join('')}`);
  }
  if (o.excluded.length) L.push(`今回は出していない返し方：${o.excluded.map(e => `${e.axis}（${e.why}）`).join('／')}`);
  for (const p of o.patterns) {
    L.push('');
    L.push(`━━ ${p.pattern_name}${STATUS[p.status] ? `［${STATUS[p.status]}］` : ''}${p.condition ? `（${p.condition}）` : ''}`);
    L.push(`タブの名前：${p.axis}／返しの型：${p.action_type_label}`);
    if (p.condition_check) L.push(`　${p.condition_check}`);
    L.push(`使う場面：${p.use_when}`);
    L.push(`使わない場面：${p.not_for}`);
    L.push(`分かっていること：${p.insight.known.join('／')}`);
    L.push(`${U.psychology}：${p.insight.hyp}　${U.psychologyNote}`);
    L.push(`${U.reason}：${p.strategy.aim_logic}`);
    if (p.script[1].steps) { L.push(`${U.script}（2回に分けて）：①「${p.script[1].steps[0]}」→ 相手の答えを待つ → ②「${p.script[1].steps[1]}」`); L.push(`　※${p.script[1].stepsNote}`); }
    else L.push(`${U.script}：「${p.script[1].text}」`);
    if (p.script[1].note) L.push(`　※${p.script[1].note}`);
    if (p.answers.length) L.push(`〔${U.followUps}〕`);
    for (const a of p.answers) {
      L.push(`・相手が『${a.customer}』と言ったら　→ 考えられること：${a.means}${a.by.includes('v0.1') ? '［v0.1から採用］' : ''}\n　返し：「${a.reply}」\n　この後：${a.next}`);
      if (a.why) L.push(`　この言葉にする理由：${a.why}`);
      if (a.if_continue) L.push(`　${a.if_continue.when}は、こう返す：「${a.if_continue.s}」→ ${a.if_continue.next}`);
    }
    if (p.assists.length) {
      L.push(`〔${p.assists[0].only_if}返し〕`);
      for (const a of p.assists) L.push(`・相手が『${a.customer.replace(/^（相手から）/, '')}』と聞いてきたら　→ 考えられること：${a.means}\n　返し：「${a.reply}」\n　この後：${a.next}`);
    }
    for (const n of p.input_needed) L.push(`〔入力が必要なため、台本に出していない返し〕『${n.customer.replace(/^（相手から）/, '')}』への返し → 必要な自社の事実：${n.needs.map(x => x.label).join('／')}`);
    if (p.goal_flow) {
      const g = p.goal_flow;
      if (g.note) L.push(`〔${U.goal}〕${g.note}`);
      if (g.flow && g.flow.length && g.pursue) L.push(`〔台本の流れ〕${g.flow.join(' → ')}`);
      L.push(`〔${U.reactions}〕${g.paths.map(x => `${x.reaction_label}→${x.outcome_label}`).join('／')}`);
      const show = (x) => {
        L.push(`◆ ${x.reaction_label} → ${x.outcome_label}${x.when ? `（${x.when}）` : ''}`);
        if (x.handling) L.push(`　迷いへの対応：${x.handling}`);
        for (const t of x.turns) {
          if (t.speaker === 'customer') L.push(`　お客様${t.tone === 'hesitant' || t.tone === 'interest' ? `［${t.stage_label}］` : ''}：「${t.text}」`);
          else {
            L.push(`　営業［${t.stage_label}］：「${t.text}」`);
            if (t.value) L.push(`　　（伝えるアポの価値：${t.value}）`);
            if (t.direction) L.push(`　　（その場ですること：${t.direction}）`);
            if (t.why) L.push(`　　なぜ：${t.why}`);
          }
        }
        L.push(`　→ 終了条件：${x.end_condition}`);
      };
      const ok = g.paths.filter(x => x.lands), ng = g.paths.filter(x => !x.lands);
      if (ok.length) { L.push(`〔${U.toGoal}〕`); ok.forEach(show); }
      if (ng.length) { L.push(`〔${U.noGoal}〕`); ng.forEach(show); }
    } else if (o.goal && o.goal.key !== 'purpose') L.push(`〔${U.toGoal}〕この返し方の、${o.goal.label}へのつなげ方は、まだ作っていない（承認後）。`);
    if (p.ends || p.then) L.push(`この後どうするか：${p.ends || p.then}`);
    if (p.strength_note) L.push(`自社の強み：${p.strength_note}`);
  }
  return L.join('\n');
}

function loadAll(dir, v2dir) {
  const fs = require('fs');
  const path = require('path');
  const j = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
  return { P: j(path.join(dir, 'patterns.json')), V: { objections: j(path.join(v2dir, 'objections.json')), targets: j(path.join(v2dir, 'rm016-r3.1', 'targets.json')) } };
}

if (typeof module !== 'undefined') module.exports = { generate, check, toText, loadAll, similarity, sentences, isQuestion, displayTexts, STATUS, SCENE };


if (require.main === module) {
  const path = require('path');
  const { P, V } = loadAll(path.join(__dirname, '..', 'data'), path.join(__dirname, '..', '..', 'v2.0', 'data'));
  const o = generate(JSON.parse(process.argv[2] || '{}'), P, V);
  console.log(toText(o));
  if (o.issues.length) console.log('\n検査：' + o.issues.join(' / '));
}

window.W001Engine=module.exports;})();