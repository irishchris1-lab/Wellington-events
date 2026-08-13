/* ============================================================================
   DISTF / DCIP Self-Assessment — application logic
   Vanilla JS, no build step, no network calls. State lives in localStorage.
   ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'distf-self-assessment-v1';
  var state = load();
  var panels = [];   // ordered list of panel ids for the progress rail

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* private browsing, corrupt data — start clean */ }
    return { triage: {}, readiness: {}, savedAt: null };
  }

  function save() {
    state.savedAt = new Date().toISOString();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

  /* ── BUILD: triage panels ────────────────────────────────────────────── */
  function buildTriage() {
    var host = document.getElementById('triage-panels');

    TRIAGE_STEPS.forEach(function (step, i) {
      var panel = el('section', 'panel');
      panel.id = 'panel-triage-' + i;

      var card = el('div', 'card');
      card.appendChild(el('div', 'eyebrow', 'Tool 1 · step ' + (i + 1) + ' of ' + TRIAGE_STEPS.length));
      card.appendChild(el('h2', null, step.title));
      card.appendChild(el('p', 'blurb', step.blurb));

      if (step.multi) {
        var multiId = step.multi.id;
        var wrapMulti = el('div', 'checks');
        wrapMulti.setAttribute('data-multi', multiId);
        step.multi.options.forEach(function (opt) {
          var lab = el('label', 'check');
          var input = document.createElement('input');
          input.type = 'checkbox';
          input.value = opt.value;
          input.checked = (state.triage[multiId] || []).indexOf(opt.value) > -1;
          input.addEventListener('change', function () {
            var current = state.triage[multiId] || [];
            if (input.checked) {
              // "none of these" is exclusive in both directions
              if (opt.value === 'none') current = ['none'];
              else current = current.filter(function (v) { return v !== 'none'; }).concat([opt.value]);
            } else {
              current = current.filter(function (v) { return v !== opt.value; });
            }
            state.triage[multiId] = current;
            save();
            syncMulti(multiId);   // state is the source of truth, not the DOM
            updateRail();
          });
          var body = el('div');
          body.appendChild(el('b', null, opt.label));
          body.appendChild(el('span', null, opt.desc));
          lab.appendChild(input);
          lab.appendChild(body);
          wrapMulti.appendChild(lab);
        });
        card.appendChild(wrapMulti);
      }

      (step.questions || []).forEach(function (q) {
        card.appendChild(renderQuestion(step.id, q));
      });

      var actions = el('div', 'actions');
      if (i > 0) {
        actions.appendChild(navBtn('btn btn-ghost', 'Back', 'triage-' + (i - 1)));
      } else {
        actions.appendChild(navBtn('btn btn-ghost', 'Back', 'intro'));
      }
      var nextTarget = (i === TRIAGE_STEPS.length - 1) ? 'triage-result' : 'triage-' + (i + 1);
      var nextLabel = (i === TRIAGE_STEPS.length - 1) ? 'See my result' : 'Next';
      actions.appendChild(navBtn('btn btn-primary', nextLabel, nextTarget));
      card.appendChild(actions);

      panel.appendChild(card);
      host.appendChild(panel);
    });
  }
  /* Re-assert the DOM from state. Selecting "none of these" clears the other
     boxes in state, and the checkboxes have to follow or the two drift apart. */
  function syncMulti(multiId) {
    var group = document.querySelector('[data-multi="' + multiId + '"]');
    if (!group) return;
    var selected = state.triage[multiId] || [];
    group.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
      input.checked = selected.indexOf(input.value) > -1;
    });
  }

  function renderQuestion(stepId, q) {
    var wrap = el('div', 'q');
    wrap.appendChild(el('div', 'q-text', q.text));
    if (q.help) wrap.appendChild(el('div', 'q-help', q.help));

    var opts = el('div', 'opts');
    q.options.forEach(function (label) {
      var lab = el('label', 'opt');
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'tq-' + q.id;
      input.value = label;
      input.checked = state.triage[q.id] === label;
      input.addEventListener('change', function () {
        state.triage[q.id] = label;
        save();
        updateRail();
      });
      lab.appendChild(input);
      lab.appendChild(document.createTextNode(label));
      opts.appendChild(lab);
    });
    wrap.appendChild(opts);
    return wrap;
  }

  /* ── BUILD: readiness panels ─────────────────────────────────────────── */
  function buildReadiness() {
    var host = document.getElementById('readiness-panels');

    READINESS_SECTIONS.forEach(function (section, i) {
      var panel = el('section', 'panel');
      panel.id = 'panel-readiness-' + i;

      var card = el('div', 'card');
      var head = el('div', 'section-head');
      var left = el('div');
      left.appendChild(el('div', 'eyebrow', 'Tool 2 · area ' + (i + 1) + ' of ' + READINESS_SECTIONS.length));
      left.appendChild(el('h2', null, section.title));
      head.appendChild(left);
      var score = el('div', 'section-score', '');
      score.id = 'sec-score-' + section.id;
      head.appendChild(score);
      card.appendChild(head);
      card.appendChild(el('p', 'blurb', section.blurb));

      section.questions.forEach(function (q) {
        var row = el('div', 'rq');
        var main = el('div', 'rq-main');
        var t = el('div', 't');
        t.appendChild(document.createTextNode(q.text));
        if (q.blocker) {
          var b = el('span', 'badge-blocker', 'blocker');
          b.title = 'Leaving this unresolved will stall the application.';
          t.appendChild(b);
        }
        main.appendChild(t);
        if (q.help) main.appendChild(el('div', 'h', q.help));
        row.appendChild(main);

        var opts = el('div', 'opts');
        ANSWER_SCALE.forEach(function (a) {
          var lab = el('label', 'opt');
          var input = document.createElement('input');
          input.type = 'radio';
          input.name = 'rq-' + q.id;
          input.value = a.value;
          input.checked = state.readiness[q.id] === a.value;
          input.addEventListener('change', function () {
            state.readiness[q.id] = a.value;
            save();
            updateSectionScore(section);
            updateRail();
          });
          lab.appendChild(input);
          lab.appendChild(document.createTextNode(a.label));
          opts.appendChild(lab);
        });
        row.appendChild(opts);
        card.appendChild(row);
      });

      var actions = el('div', 'actions');
      var backTarget = i > 0 ? 'readiness-' + (i - 1) : 'triage-result';
      actions.appendChild(navBtn('btn btn-ghost', 'Back', backTarget));
      var nextTarget = (i === READINESS_SECTIONS.length - 1) ? 'report' : 'readiness-' + (i + 1);
      var nextLabel = (i === READINESS_SECTIONS.length - 1) ? 'Build my report' : 'Next area';
      actions.appendChild(navBtn('btn btn-primary', nextLabel, nextTarget));
      var na = el('button', 'btn btn-link', 'Mark this whole area N/A');
      na.addEventListener('click', function () {
        section.questions.forEach(function (q) { state.readiness[q.id] = 'na'; });
        save();
        rerenderReadinessInputs();
        updateSectionScore(section);
        updateRail();
        toast('Marked ' + section.title.toLowerCase() + ' as not applicable');
      });
      actions.appendChild(na);
      card.appendChild(actions);

      panel.appendChild(card);
      host.appendChild(panel);
    });
  }

  function rerenderReadinessInputs() {
    READINESS_SECTIONS.forEach(function (section) {
      section.questions.forEach(function (q) {
        var inputs = document.getElementsByName('rq-' + q.id);
        Array.prototype.forEach.call(inputs, function (input) {
          input.checked = state.readiness[q.id] === input.value;
        });
      });
    });
  }

  function navBtn(cls, label, target) {
    var b = el('button', cls, label);
    b.setAttribute('data-go', target);
    return b;
  }

  /* ── SCORING: triage ─────────────────────────────────────────────────── */
  function scoreTriage() {
    var t = state.triage;
    var types = (t.service_types || []).filter(function (v) { return v !== 'none'; });
    var reasons = [];

    // Nothing answered at all
    var answeredAny = Object.keys(t).some(function (k) {
      var v = t[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });
    if (!answeredAny) {
      return {
        band: 'out',
        title: 'Nothing answered yet',
        copy: 'Work through the five steps and the result will appear here.',
        types: [], reasons: [], score: 0, shapeScore: 0, hardGate: false
      };
    }

    // Scope gate — one clear "No" on any of the three takes you outside the framework
    var inScope = t.handles_info === 'Yes' && t.third_party_reliance === 'Yes' && t.digital_delivery !== 'No';
    var scopeFail =
      t.handles_info === 'No' || t.third_party_reliance === 'No' || t.digital_delivery === 'No';

    if (scopeFail) {
      if (t.handles_info === 'No') {
        reasons.push({ tone: 'pos', text: 'You do not handle information about identified people or organisations. The Trust Framework governs digital identity services, so it does not reach you.' });
      }
      if (t.third_party_reliance === 'No') {
        reasons.push({ tone: 'pos', text: 'Nobody outside your organisation relies on what you assert about people. Reliance by a third party is what makes something a digital identity service — without it, there is nothing for accreditation to underwrite.' });
      }
      if (t.digital_delivery === 'No') {
        reasons.push({ tone: 'pos', text: 'The service is not delivered digitally. Paper certificates and in-person checks sit outside the framework, however carefully they are run.' });
      }
      return {
        band: 'out',
        title: 'Outside the Trust Framework',
        copy: 'Nothing here suggests you are operating an accreditable digital identity service. Your Privacy Act 2020 obligations still apply in full, and if the service changes shape — particularly if third parties start relying on what you assert about people, or if a paper process goes digital — come back and run this again.',
        types: [], reasons: reasons, score: 0, shapeScore: 0, hardGate: false
      };
    }

    // Said "none of these", but the scope questions say otherwise
    if (types.length === 0 && (t.service_types || []).indexOf('none') > -1) {
      if (inScope) {
        reasons.push({ tone: 'neg', text: 'Your answers contradict each other. You handle identity information that a third party relies on, delivered digitally — but you matched none of the five service types. One of the two is wrong, and it matters: the classification determines which Rules apply and what you are assessed against.' });
        reasons.push({ tone: '', text: 'The most common cause is reading the service types too narrowly. Providing verified data to another party is an information service. Confirming that a record belongs to a particular person is a binding service. Neither has to look like a wallet or a login to count.' });
        return {
          band: 'consider',
          title: 'Your answers do not line up — resolve this first',
          copy: 'Rather than guessing, take the service description to the Trust Framework Authority at TFA@gdda.govt.nz. Classification is the one thing worth getting right before any design work, because it decides which obligations attach to you.',
          types: [], reasons: reasons, score: 0, shapeScore: 0, hardGate: false
        };
      }
      reasons.push({ tone: 'pos', text: 'You matched none of the five accreditable service types, and nothing in the scope questions pulls you back in.' });
      return {
        band: 'out',
        title: 'Outside the Trust Framework',
        copy: 'On these answers you are not operating an accreditable digital identity service. Privacy Act 2020 obligations still apply in full. Re-run this if the service starts asserting things about people that others rely on.',
        types: [], reasons: reasons, score: 0, shapeScore: 0, hardGate: false
      };
    }

    // Credential shape
    var shapeKeys = ['reusable', 'binds_authenticator', 'verifiable_independently', 'revocable', 'identity_attributes', 'held_by_subject'];
    var shapeYes = 0, shapePartly = 0;
    shapeKeys.forEach(function (k) {
      var v = t[k];
      if (v === 'Yes') shapeYes++;
      else if (v === 'Partly' || v === 'Some' || v === 'In progress') shapePartly++;
    });
    var shapeScore = shapeYes + shapePartly * 0.5;

    // Drivers
    var driverScore = 0, hardGate = false, gateReasons = [];
    TRIAGE_STEPS.filter(function (s) { return s.id === 'drivers'; })[0].questions.forEach(function (q) {
      var v = t[q.id];
      if (!v) return;
      var w = q.weightYes || 10;
      if (v === 'Yes') driverScore += w;
      else if (v === 'Considering it' || v === 'Somewhat' || v === 'Planned' || v === 'Starting to' || v === 'Maybe') driverScore += w * 0.4;
      if (w >= 100 && v === 'Yes') { hardGate = true; gateReasons.push(q.id); }
    });

    // Reasoning
    if (types.length) {
      reasons.push({
        tone: '',
        text: 'You described your service as ' + types.map(function (k) { return SERVICE_TYPES[k].name.toLowerCase(); }).join(', ') +
              '. Each of these is a service type that can be accredited under the Act, and each is assessed on its own.'
      });
    } else if (inScope) {
      reasons.push({
        tone: 'neg',
        text: 'You did not match your service to any of the five service types, but you do handle identity information that others rely on. That mismatch is worth resolving before you do anything else — either the service is one of the five and you have not recognised it, or it genuinely sits outside the framework.'
      });
    }

    if (gateReasons.indexOf('dcip') > -1) {
      reasons.push({ tone: 'neg', text: 'You intend to issue through DCIP or into the Govt.nz app wallet. DISTF accreditation must be granted before go-live, so this is a precondition rather than a choice. The onboarding guidance has agencies starting the accreditation application at the same time as sandbox access, not after it.' });
    }
    if (gateReasons.indexOf('mark') > -1) {
      reasons.push({ tone: 'neg', text: 'You want to use the Trust Framework accreditation mark or describe the service as accredited. The mark is protected under the Act — using it without accreditation is an offence.' });
    }
    if (shapeScore >= 4.5) {
      reasons.push({ tone: '', text: 'The thing you are issuing behaves like a genuine reusable credential: bound to a holder, independently verifiable, and revocable. That places it squarely in credential service territory rather than being a document or a lookup.' });
    } else if (shapeScore >= 2.5) {
      reasons.push({ tone: '', text: 'Your credential has some but not all of the properties of a reusable credential. The gaps — most likely binding to an authenticator, independent verifiability or revocation — are the same gaps the Rules require you to close, so closing them and pursuing accreditation are largely the same programme of work.' });
    } else if (types.indexOf('credential') > -1) {
      reasons.push({ tone: 'neg', text: 'You called it a credential service, but on the characteristics you selected it looks closer to a digital document or a database lookup. Resolve what it actually is before applying — a PDF that anyone can forward is not a credential, and it will not survive assessment as one.' });
    }
    if (t.high_consequence === 'Yes') {
      reasons.push({ tone: '', text: 'The credential is relied on for high-consequence decisions. That raises the cost of getting it wrong and, in practice, the expectation that it is accredited.' });
    }
    if (t.cross_sector === 'Yes' || t.cross_sector === 'Planned') {
      reasons.push({ tone: '', text: 'Reuse across organisations is the whole point of the framework: accreditation is what lets a relying party you have never met trust what you issue.' });
    }
    if (t.public_sector === 'Yes') {
      reasons.push({ tone: '', text: 'As a public sector issuer you carry a higher expectation of accreditation than the letter of the Act imposes.' });
    }
    if (t.pia === 'No') {
      reasons.push({ tone: 'neg', text: 'No Privacy Impact Assessment yet. A PIA is required for accreditation and is usually the longest single item on the critical path — start it now regardless of what you decide about accreditation.' });
    }
    if (t.evaluators === 'No' && (hardGate || driverScore >= 40)) {
      reasons.push({ tone: 'neg', text: 'No independent evaluators engaged. Independent privacy and security evaluation is part of the accreditation process, and evaluator availability rather than assessment time is usually what sets your date.' });
    }
    if (t.existing_accreditation === 'Accredited') {
      reasons.push({ tone: 'pos', text: 'You already hold accreditation. Check whether it covers this specific service — accreditation attaches to services, so a new credential may need its own.' });
    }
    if (t.id_standards === 'No') {
      reasons.push({ tone: 'neg', text: 'You have not assessed against the Identification Management Standards. Conformance with one or more of them is a requirement for accreditation, so this is a gap you will have to close.' });
    }

    // Band
    var band, title, copy;
    if (hardGate) {
      band = 'required';
      title = 'Accreditation is a precondition for what you want to do';
      copy = 'Accreditation under the Act is voluntary in principle, but not for your plan. What you have described — issuing through the government platform, or using the accreditation mark — is gated on holding it. Treat accreditation as the critical path and start the conversation with the Trust Framework Authority now, in parallel with any technical work.';
    } else if (types.indexOf('credential') > -1 && shapeScore >= 3 && driverScore >= 35) {
      band = 'strong';
      title = 'Accreditation is strongly indicated';
      copy = 'You are operating something that looks and behaves like an accreditable credential service, and the drivers around it — reliance, reuse, consequence — are real. You are not legally compelled, but an unaccredited credential in this position tends to accumulate the obligations of an accredited one without any of the recognition.';
    } else if (driverScore >= 35 || (types.length > 0 && shapeScore >= 3)) {
      band = 'consider';
      title = 'Worth pursuing, on a timeline you choose';
      copy = 'You are running an accreditable service and there are genuine reasons to be accredited, but nothing is forcing your hand this quarter. The sensible move is to close the substantive gaps — privacy, security, identification standards — because they are good practice regardless, and decide on the application once you can see how big the remaining delta is.';
    } else if (types.length > 0) {
      band = 'low';
      title = 'Accreditable, but not indicated right now';
      copy = 'What you operate could be accredited, but nothing in your answers is pulling you toward it. Revisit this if you start issuing into the government wallet, if relying parties outside your organisation begin depending on what you assert, or if the credential starts being used for higher-consequence decisions.';
    } else {
      band = 'consider';
      title = 'Unclear — get advice before you build';
      copy = 'Your answers do not settle cleanly one way or the other. That usually means the service description needs sharpening rather than that the framework is ambiguous. A short conversation with the Trust Framework Authority before you commit to a design will cost you an email and save you a rebuild.';
    }

    return { band: band, title: title, copy: copy, types: types, reasons: reasons, score: driverScore, shapeScore: shapeScore, hardGate: hardGate };
  }

  function renderTriageResult() {
    var r = scoreTriage();

    var v = document.getElementById('triage-verdict');
    v.innerHTML = '';
    var box = el('div', 'verdict v-' + r.band);
    box.appendChild(el('div', 'eyebrow', 'Tool 1 result'));
    box.appendChild(el('h2', null, r.title));
    box.appendChild(el('p', null, r.copy));
    v.appendChild(box);

    var typeHost = document.getElementById('triage-types');
    typeHost.innerHTML = '';
    if (!r.types.length) {
      typeHost.appendChild(el('p', 'blurb', 'No service type selected. If that is wrong, go back to step 2 — the classification drives everything else.'));
    }
    r.types.forEach(function (k) {
      var st = SERVICE_TYPES[k];
      var item = el('div', 'type-item');
      item.appendChild(el('b', null, st.name));
      item.appendChild(el('div', 'def', st.definition));
      item.appendChild(el('div', 'ex', 'Typically: ' + st.examples));
      typeHost.appendChild(item);
    });

    var reasonHost = document.getElementById('triage-reasons');
    reasonHost.innerHTML = '';
    r.reasons.forEach(function (rr) {
      reasonHost.appendChild(el('li', rr.tone, rr.text));
    });

    var nextHost = document.getElementById('triage-next');
    nextHost.innerHTML = '';
    triageNextSteps(r).forEach(function (s, i) {
      nextHost.appendChild(actionRow(i + 1, s.text, s.src));
    });

    state.triageResult = { band: r.band, title: r.title, types: r.types, score: r.score };
    save();
  }

  function triageNextSteps(r) {
    var t = state.triage;
    var steps = [];
    if (r.band === 'out') {
      steps.push({ text: 'Keep your Privacy Act 2020 compliance current — the Trust Framework not applying does not narrow your privacy obligations.', src: 'Privacy Act 2020' });
      steps.push({ text: 'Re-run this assessment if third parties start relying on identity assertions you make, or if you move toward issuing a reusable credential.', src: 'This tool' });
      return steps;
    }
    if (t.existing_accreditation !== 'Accredited') {
      steps.push({ text: 'Email TFA@gdda.govt.nz for a pre-application conversation. The Authority asks providers to make contact before starting the form, and it is free.', src: 'Trust Framework Authority guidance' });
    }
    if (r.hardGate && (state.triage.dcip === 'Yes' || state.triage.dcip === 'Considering it')) {
      steps.push({ text: 'Email issuance@gdda.govt.nz to discuss the credential and your timelines, and to request the DPI Sandbox Access Form.', src: 'DCIP Onboarding Guide, stage 1' });
    }
    if (t.pia !== 'Yes') {
      steps.push({ text: 'Start the Privacy Impact Assessment for this service now — it is required evidence and it is the item most likely to set your date.', src: 'DISTF accreditation requirements' });
    }
    if (t.evaluators !== 'Yes') {
      steps.push({ text: 'Approach independent evaluators for security, privacy and identification management, and get a slot in their book.', src: 'DCIP Onboarding Guide, stage 1' });
    }
    if (t.id_standards !== 'Yes' && t.id_standards !== 'Not applicable') {
      steps.push({ text: 'Assess the service against the NZ Identification Management Standards and record which ones apply, at what level.', src: 'Identification Standards conformance' });
    }
    if (r.shapeScore < 4.5) {
      steps.push({ text: 'Close the design gaps that stop this being a real credential — holder binding, independent verifiability and revocation with a published status.', src: 'DISTF Rules 2024 (incl. revocation, Rule 83)' });
    }
    steps.push({ text: 'Work through the readiness check below and take the resulting gap list to your first GDDA meeting rather than into it cold.', src: 'This tool, part 2' });
    return steps;
  }

  function actionRow(n, text, src) {
    var row = el('div', 'action-item');
    row.appendChild(el('div', 'n', String(n)));
    var body = el('div', 'body');
    body.appendChild(document.createTextNode(text));
    if (src) body.appendChild(el('span', 'src', src));
    row.appendChild(body);
    return row;
  }

  /* ── SCORING: readiness ──────────────────────────────────────────────── */
  function scoreSection(section) {
    var got = 0, possible = 0, answered = 0;
    section.questions.forEach(function (q) {
      var a = state.readiness[q.id];
      if (!a) return;
      answered++;
      if (a === 'na') return;
      var scale = ANSWER_SCALE.filter(function (s) { return s.value === a; })[0];
      possible += q.weight;
      got += q.weight * scale.score;
    });
    return {
      pct: possible ? Math.round((got / possible) * 100) : null,
      answered: answered,
      total: section.questions.length,
      got: got,
      possible: possible
    };
  }

  function updateSectionScore(section) {
    var node = document.getElementById('sec-score-' + section.id);
    if (!node) return;
    var s = scoreSection(section);
    node.textContent = s.answered + ' of ' + s.total + ' answered' + (s.pct !== null ? ' · ' + s.pct + '%' : '');
  }

  function scoreReadiness() {
    var got = 0, possible = 0, answered = 0, total = 0, blockers = [], gaps = [];
    var perSection = [];

    READINESS_SECTIONS.forEach(function (section) {
      var s = scoreSection(section);
      perSection.push({ id: section.id, title: section.title, pct: s.pct, answered: s.answered, total: s.total });
      got += s.got; possible += s.possible; answered += s.answered; total += s.total;

      section.questions.forEach(function (q) {
        var a = state.readiness[q.id];
        if (a === 'na') return;
        if (!a || a === 'no' || a === 'partly') {
          var severity = (!a ? 0.5 : (a === 'no' ? 1 : 0.5));
          gaps.push({
            action: q.action, weight: q.weight, blocker: !!q.blocker,
            section: section.title, severity: severity, unanswered: !a
          });
          if (q.blocker && a === 'no') blockers.push({ text: q.action, section: section.title });
        }
      });
    });

    var pct = possible ? Math.round((got / possible) * 100) : 0;

    gaps.sort(function (a, b) {
      if (a.blocker !== b.blocker) return a.blocker ? -1 : 1;
      var aw = a.weight * a.severity, bw = b.weight * b.severity;
      if (aw !== bw) return bw - aw;
      return a.unanswered - b.unanswered;
    });

    var band, title, copy;
    var coverage = total ? answered / total : 0;
    if (coverage < 0.5) {
      band = 'partial';
      title = 'Not enough answered to score properly';
      copy = 'You have answered ' + answered + ' of ' + total + ' checks. The score below reflects only what you answered, so treat it as a sample rather than a verdict. Finish the areas you skipped — particularly the ones with blockers in them.';
    } else if (blockers.length) {
      band = 'blocked';
      title = 'Blockers first, then the score';
      copy = 'You are at ' + pct + '% on the checks you answered, but ' + blockers.length + ' hard blocker' + (blockers.length > 1 ? 's are' : ' is') + ' outstanding. These are the items that stall an application regardless of how strong everything else looks. Clear them before you book time with the GDDA — the meeting goes differently when they are already closed.';
    } else if (pct >= 80) {
      band = 'ready';
      title = 'Ready to engage';
      copy = 'At ' + pct + '% with no outstanding blockers, you are in good shape to approach the GDDA. Take your gap list with you rather than presenting this as finished — an honest list of the remaining items reads better than a claim of completeness, and the assessors will find them anyway.';
    } else if (pct >= 55) {
      band = 'nearly';
      title = 'Close, with real work left';
      copy = 'At ' + pct + '% you have the foundations. Make the initial contact now — the Authority is explicit that they want to talk before you start the form — but expect the remaining gaps, mostly evidence rather than capability, to set your timeline.';
    } else {
      band = 'early';
      title = 'Early — build before you apply';
      copy = 'At ' + pct + '% the gaps are substantive rather than administrative. An application now would be assessed on what is missing. Use the priority list below as a work programme, and make contact with the GDDA early anyway so that what you build is shaped by what they expect.';
    }

    return { pct: pct, band: band, title: title, copy: copy, blockers: blockers, gaps: gaps,
             perSection: perSection, answered: answered, total: total };
  }

  function renderReport() {
    var r = scoreReadiness();

    // dial
    var circumference = 2 * Math.PI * 56;
    var arc = document.getElementById('dial-arc');
    arc.setAttribute('stroke-dasharray', circumference.toFixed(1));
    arc.setAttribute('stroke-dashoffset', (circumference * (1 - r.pct / 100)).toFixed(1));
    arc.setAttribute('stroke', r.pct >= 80 ? '#1A8A6E' : r.pct >= 55 ? '#B07C12' : '#B8451F');
    document.getElementById('dial-num').textContent = r.pct + '%';
    document.getElementById('band-title').textContent = r.title;
    document.getElementById('band-copy').textContent = r.copy;

    // blockers
    var bc = document.getElementById('blockers-card');
    bc.innerHTML = '';
    if (r.blockers.length) {
      var box = el('div', 'blockers');
      box.appendChild(el('h3', null, r.blockers.length + ' blocker' + (r.blockers.length > 1 ? 's' : '') + ' to clear first'));
      var ol = document.createElement('ol');
      r.blockers.forEach(function (b) {
        ol.appendChild(el('li', null, b.text + ' (' + b.section + ')'));
      });
      box.appendChild(ol);
      bc.appendChild(box);
    }

    // bars
    var bars = document.getElementById('bars');
    bars.innerHTML = '';
    r.perSection.forEach(function (s) {
      var row = el('div', 'bar-row');
      var left = el('div');
      var lab = el('div', 'bar-label', s.title);
      if (s.pct === null) {
        lab.textContent = s.title;
        lab.appendChild(el('span', 'hint', '  · not answered'));
      }
      left.appendChild(lab);
      var track = el('div', 'bar-track');
      var pctVal = s.pct === null ? 0 : s.pct;
      var fill = el('div', 'bar-fill ' + (pctVal >= 80 ? 'fill-good' : pctVal >= 55 ? 'fill-mid' : 'fill-bad'));
      fill.style.width = pctVal + '%';
      track.appendChild(fill);
      left.appendChild(track);
      row.appendChild(left);
      row.appendChild(el('div', 'bar-num', s.pct === null ? '—' : s.pct + '%'));
      bars.appendChild(row);
    });

    // next actions
    var na = document.getElementById('next-actions');
    na.innerHTML = '';
    var top = r.gaps.slice(0, 10);
    if (!top.length) {
      na.appendChild(el('p', 'blurb', 'No gaps recorded. Either you are genuinely ready, or the answers are more generous than the evidence will be — the assessors will test the difference.'));
    }
    top.forEach(function (g, i) {
      var src = g.section + (g.blocker ? ' · blocker' : '') + (g.unanswered ? ' · not yet answered' : '');
      na.appendChild(actionRow(i + 1, g.action, src));
    });

    document.getElementById('summary-text').textContent = buildSummary(r);
    state.readinessResult = { pct: r.pct, band: r.band, blockers: r.blockers.length };
    save();
  }

  function buildSummary(r) {
    var t = state.triageResult;
    var lines = [];
    lines.push('DIGITAL CREDENTIAL ACCREDITATION SELF-ASSESSMENT');
    lines.push('Generated ' + new Date().toLocaleString('en-NZ'));
    lines.push('');
    lines.push('PART 1 — SHOULD IT BE ACCREDITED?');
    if (t) {
      lines.push('  Verdict: ' + t.title);
      lines.push('  Service type(s): ' + (t.types && t.types.length
        ? t.types.map(function (k) { return SERVICE_TYPES[k].name; }).join(', ')
        : 'none selected'));
    } else {
      lines.push('  Not completed.');
    }
    lines.push('');
    lines.push('PART 2 — GDDA ENGAGEMENT READINESS');
    lines.push('  Overall: ' + r.pct + '% (' + r.answered + ' of ' + r.total + ' checks answered)');
    lines.push('  Assessment: ' + r.title);
    lines.push('');
    lines.push('  By area:');
    r.perSection.forEach(function (s) {
      lines.push('    - ' + s.title + ': ' + (s.pct === null ? 'not answered' : s.pct + '%') +
                 ' (' + s.answered + '/' + s.total + ' answered)');
    });
    lines.push('');
    if (r.blockers.length) {
      lines.push('  BLOCKERS (' + r.blockers.length + '):');
      r.blockers.forEach(function (b, i) { lines.push('    ' + (i + 1) + '. ' + b.text); });
      lines.push('');
    }
    lines.push('  PRIORITY ACTIONS:');
    r.gaps.slice(0, 10).forEach(function (g, i) {
      lines.push('    ' + (i + 1) + '. [' + g.section + '] ' + g.action);
    });
    lines.push('');
    lines.push('CONTACTS');
    lines.push('  Trust Framework Authority (accreditation): TFA@gdda.govt.nz');
    lines.push('  DPI / DCIP team (platform onboarding):     issuance@gdda.govt.nz');
    lines.push('');
    lines.push('Indicative self-assessment only. Not legal advice, and not a determination');
    lines.push('by the Trust Framework Authority.');
    return lines.join('\n');
  }

  /* ── NAVIGATION ──────────────────────────────────────────────────────── */
  function panelIdFor(key) { return 'panel-' + key; }

  function go(key) {
    var target = document.getElementById(panelIdFor(key));
    if (!target) return;
    if (key === 'triage-result') renderTriageResult();
    if (key === 'report') renderReport();
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
    target.classList.add('active');
    state.lastPanel = key;
    save();
    updateRail();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildRail() {
    panels = [{ key: 'intro', label: 'Start' }];
    TRIAGE_STEPS.forEach(function (s, i) { panels.push({ key: 'triage-' + i, label: '1.' + (i + 1) + ' ' + shortTitle(s.title) }); });
    panels.push({ key: 'triage-result', label: 'Result 1' });
    READINESS_SECTIONS.forEach(function (s, i) { panels.push({ key: 'readiness-' + i, label: '2.' + (i + 1) + ' ' + shortTitle(s.title) }); });
    panels.push({ key: 'report', label: 'Report' });

    var rail = document.getElementById('rail');
    rail.innerHTML = '';
    panels.forEach(function (p) {
      var b = el('button', 'rail-step', p.label);
      b.setAttribute('data-go', p.key);
      b.id = 'rail-' + p.key;
      rail.appendChild(b);
    });
  }

  function shortTitle(t) {
    var words = t.replace(/[,—].*$/, '').split(' ');
    return words.slice(0, 3).join(' ');
  }

  function updateRail() {
    panels.forEach(function (p) {
      var b = document.getElementById('rail-' + p.key);
      if (!b) return;
      b.setAttribute('aria-current', state.lastPanel === p.key ? 'true' : 'false');
      b.classList.toggle('done', isComplete(p.key) && state.lastPanel !== p.key);
    });
    var active = document.querySelector('.rail-step[aria-current="true"]');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }

  function isComplete(key) {
    var m;
    if ((m = key.match(/^triage-(\d+)$/))) {
      var step = TRIAGE_STEPS[+m[1]];
      if (step.multi) return (state.triage[step.multi.id] || []).length > 0;
      return (step.questions || []).every(function (q) { return !!state.triage[q.id]; });
    }
    if ((m = key.match(/^readiness-(\d+)$/))) {
      var sec = READINESS_SECTIONS[+m[1]];
      return sec.questions.every(function (q) { return !!state.readiness[q.id]; });
    }
    return false;
  }

  /* ── UTIL ────────────────────────────────────────────────────────────── */
  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  function download(filename, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ── INIT ────────────────────────────────────────────────────────────── */
  buildTriage();
  buildReadiness();
  buildRail();

  TRIAGE_STEPS.forEach(function (s) { if (s.multi) syncMulti(s.multi.id); });
  READINESS_SECTIONS.forEach(updateSectionScore);

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-go]');
    if (btn) { go(btn.getAttribute('data-go')); }
  });

  /* Selected-state class, so the UI still reads correctly on browsers
     without :has() support. */
  function syncSelectedClasses(root) {
    (root || document).querySelectorAll('.opt, .check').forEach(function (lab) {
      var input = lab.querySelector('input');
      lab.classList.toggle('sel', !!(input && input.checked));
    });
  }
  document.addEventListener('change', function (e) {
    if (e.target && e.target.matches('.opt input, .check input')) syncSelectedClasses();
  });
  syncSelectedClasses();

  document.getElementById('reset-btn').addEventListener('click', function () {
    if (!confirm('Clear every answer and start again? This cannot be undone.')) return;
    state = { triage: {}, readiness: {}, savedAt: null };
    save();
    document.querySelectorAll('.panel input[type="radio"], .panel input[type="checkbox"]').forEach(function (i) { i.checked = false; });
    READINESS_SECTIONS.forEach(updateSectionScore);
    go('intro');
    toast('Answers cleared');
  });

  document.getElementById('copy-btn').addEventListener('click', function () {
    var text = document.getElementById('summary-text').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Summary copied'); },
        function () { toast('Copy failed — select the text manually'); });
    } else {
      toast('Copy not supported here — select the text manually');
    }
  });

  document.getElementById('json-btn').addEventListener('click', function () {
    var payload = {
      generatedAt: new Date().toISOString(),
      tool: 'DISTF / DCIP self-assessment',
      disclaimer: 'Indicative only. Not legal advice, and not a determination by the Trust Framework Authority.',
      triageAnswers: state.triage,
      triageResult: state.triageResult || null,
      readinessAnswers: state.readiness,
      readinessResult: scoreReadiness()
    };
    download('distf-self-assessment.json', JSON.stringify(payload, null, 2));
    toast('Downloaded');
  });

  document.getElementById('print-btn').addEventListener('click', function () { window.print(); });

  go(state.lastPanel && document.getElementById(panelIdFor(state.lastPanel)) ? state.lastPanel : 'intro');
})();
