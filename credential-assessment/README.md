# Digital Credential Accreditation Self-Assessment

A standalone, client-side self-assessment tool for New Zealand businesses and public sector
agencies with two questions to answer:

1. **Should this credential be accredited?** — classify the service against the five
   accreditable digital identity service types under the Digital Identity Services Trust
   Framework (DISTF), test whether what you issue is genuinely a credential, and weigh the
   drivers pushing you toward accreditation.
2. **Are you ready to engage the GDDA?** — 54 weighted checks across the five Rules subjects
   plus DCIP technical onboarding, producing a readiness score, a blocker list and a
   prioritised set of next actions.

Open `index.html`. No build step, no dependencies, no network calls. Answers are held in
`localStorage` under `distf-self-assessment-v1` and never leave the browser.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell: header, disclaimer, progress rail, result and report sections |
| `data.js` | All question content, service type definitions, weights and blocker flags |
| `assessment.js` | Rendering, state, scoring, navigation, export |
| `assessment.css` | Styles, including print rules for saving the report as PDF |

Question content lives entirely in `data.js`. Adding a question is a matter of adding an
object to the relevant section — ids must stay unique across both tools, since they key the
saved state.

## How the scoring works

### Tool 1 — accreditation triage

Three gates run in order:

1. **Scope.** A clear "No" to handling identity information, to third-party reliance, or to
   digital delivery puts you outside the framework and stops there.
2. **Classification.** Selecting "none of these" while still answering Yes to all three scope
   questions is treated as a contradiction rather than a result — the tool says so and points
   at the Trust Framework Authority, because classification decides which obligations attach.
3. **Bands.** Two answers act as hard gates and force the top band regardless of everything
   else: intending to issue via DCIP or into the Govt.nz app wallet, and wanting to use the
   accreditation mark. Below that, a weighted driver score and a "credential shape" score
   (reusable, bound to an authenticator, independently verifiable, revocable, carries identity
   attributes, held by the subject) place the result into *strongly indicated*, *worth
   pursuing*, or *not indicated right now*.

### Tool 2 — GDDA readiness

Each check is answered Yes (1.0), Partly (0.5), No (0) or N/A (excluded from the denominator),
and carries a weight of 1 or 2. The score is the weighted percentage of answered,
non-N/A checks — so skipping a section lowers coverage rather than the score, and coverage
below 50% is called out in the result rather than presented as a verdict.

Twelve checks are flagged as **blockers**: items that stall an application regardless of how
strong the rest looks. Any blocker answered "No" is surfaced above the score. The priority
list ranks gaps by blocker status, then weight × severity, with unanswered items ranked below
explicit "No" answers.

## Where the content comes from

The question set and the guidance text are an interpretation of publicly available material.
Nothing here is official, and the tool says so on every screen.

**Legislation and rules**

- Digital Identity Services Trust Framework Act 2023 — in force 1 July 2024. Establishes the
  Trust Framework Authority as regulator, defines the accreditable service types, and protects
  the accreditation mark.
- Digital Identity Services Trust Framework Regulations 2024 — service type definitions,
  application content.
- Digital Identity Services Trust Framework Rules 2024 — published 8 November 2024. Operational
  requirements across five subjects: identification management; privacy and confidentiality;
  security and risk; information and data management; sharing and facilitation. The eight
  readiness areas map onto these five, plus mandate/funding and DCIP technical readiness, which
  come from the platform onboarding material rather than the Rules.
- NZ Identification Management Standards — conformance with one or more is a precondition for
  accreditation.

**Platform documentation** — [NZ Digital Credential Issuance Platform](https://github.com/NZ-Digital-Public-Infrastructure/nz-digital-credential-issuance-platform):

- *DCIP Onboarding Guide* — the three-stage process, the GM-level signature on the sandbox
  access form, running accreditation in parallel with technical onboarding, appointing an
  independent evaluator, the production PKI ceremony, and accreditation as a go-live
  precondition.
- *Digital Credentials Technical Guide* — mdoc format (ISO/IEC 18013-5 / 23220), OID4VCI
  authorization-code and pre-authorised-code flows, the prohibition on `claimsToPersist`, the
  publicly resolvable custom domain, Token Status List revocation, and capturing `credentialId`
  via webhook at issuance.
- *README* — eligible credential types, ecosystem roles, and the fee structure (one-off
  production tenant fee plus an annual tiered fee, charged from production activation or three
  months after sandbox activation).

**Contacts referenced in the tool**

- Trust Framework Authority, for accreditation: `TFA@gdda.govt.nz`
- DPI / DCIP team, for platform onboarding: `issuance@gdda.govt.nz`

## Keeping it current

The Rules and the platform documentation both change. Two things to re-check periodically:

- **Service type definitions** in `SERVICE_TYPES` (`data.js`) — these are paraphrased, not
  quoted from the Regulations. If you need statutory wording, take it from the Regulations
  directly.
- **DCIP technical checks** in the `technical` readiness section — supported credential
  formats, flows and platform constraints are the fastest-moving part of this content.

## Limitations

- Indicative triage only. Not legal advice, and not a determination by the Trust Framework
  Authority.
- Self-reported answers. The tool scores what you say, and the assessors will test the
  difference between that and your evidence.
- Fee tiers, application forms and evaluator requirements are described qualitatively. Current
  figures come from the GDDA.
