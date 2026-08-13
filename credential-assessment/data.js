/* ============================================================================
   DISTF / DCIP Self-Assessment — question and reference data
   ----------------------------------------------------------------------------
   All content here is an indicative interpretation of publicly available
   material about the Digital Identity Services Trust Framework Act 2023,
   the DISTF Regulations 2024, the DISTF Rules 2024, and the NZ Digital
   Credential Issuance Platform (DCIP) documentation. It is a triage aid,
   not legal advice. See README.md for sources.
   ========================================================================== */

/* --- The five accreditable digital identity service types ----------------- */
const SERVICE_TYPES = {
  information: {
    name: 'Information service',
    plain: 'We provide, hold or validate verified information about a person or organisation, and others rely on it.',
    definition:
      'A digital identity service that provides or validates personal or organisational information so that another party can rely on it — for example a verified-data API, a registry lookup, or an entity or address validation service.',
    examples: 'Verified data APIs, register/registry lookups, entity and address validation.'
  },
  binding: {
    name: 'Binding service',
    plain: 'We link information to a specific person or entity — confirming this record really belongs to this person.',
    definition:
      'A digital identity service that binds personal or organisational information to the individual or entity it relates to, so that information is correctly attributed and reliance is safe.',
    examples: 'Identity verification and document checks, liveness/biometric matching, entity-to-officer binding.'
  },
  credential: {
    name: 'Credential service',
    plain: 'We create a reusable digital credential that others can rely on without coming back to us.',
    definition:
      'A digital identity service that creates a reusable credential — a digital record combining an authenticator with bound personal or organisational information — that a relying party can rely on without separately verifying the information with the issuer.',
    examples: 'Digital driver licence, qualification credential, professional registration, proof of entitlement, delegated authority.'
  },
  authentication: {
    name: 'Authentication service',
    plain: 'We let people prove control of an authenticator in order to reach another service.',
    definition:
      'A digital identity service that enables a person to use an authenticator to access another service — for example a log-in service or a two-factor authentication service.',
    examples: 'Single sign-on, passkey providers, MFA/OTP services, federated login.'
  },
  facilitation: {
    name: 'Facilitation service',
    plain: 'We give people somewhere to hold their credentials and a way to present them.',
    definition:
      'A digital identity service that enables a person to claim, hold, manage and present a credential to a relying party.',
    examples: 'Digital wallets, credential exchange/presentation brokers, holder apps.'
  }
};

/* --- Tool A: is this a credential that should be accredited? -------------- */
const TRIAGE_STEPS = [
  {
    id: 'scope',
    title: 'Is this a digital identity service at all?',
    blurb:
      'The Trust Framework only bites on digital identity services — services where information about an identified person or organisation is handled in a way that someone else relies on.',
    questions: [
      {
        id: 'handles_info',
        text:
          'Does your service handle information about identified people or organisations in digital form — collecting, verifying, binding, storing, asserting or presenting it?',
        help: 'Anonymous or aggregate data does not count. It has to be about identified or identifiable people or entities.',
        options: ['Yes', 'No', 'Not sure']
      },
      {
        id: 'third_party_reliance',
        text:
          'Does anyone other than you rely on that information, or on an assertion you make about it, to make a decision?',
        help:
          'Granting access, confirming eligibility, letting someone through a gate, paying a claim, admitting to a course. If the only consumer is you, the Trust Framework is unlikely to apply.',
        options: ['Yes', 'No', 'Not sure']
      },
      {
        id: 'digital_delivery',
        text: 'Is the service delivered digitally (an API, an app, a wallet, a credential, a login)?',
        help: 'Paper certificates and in-person checks sit outside the framework.',
        options: ['Yes', 'Partly', 'No']
      }
    ]
  },
  {
    id: 'classify',
    title: 'Which service type(s) are you?',
    blurb:
      'Accreditation is granted per service, not per organisation. Pick every description that fits what you actually operate — many organisations are two or three of these at once.',
    multi: {
      id: 'service_types',
      text: 'Select all that apply.',
      options: Object.keys(SERVICE_TYPES).map(function (k) {
        return { value: k, label: SERVICE_TYPES[k].name, desc: SERVICE_TYPES[k].plain };
      }).concat([
        { value: 'none', label: 'None of these describe us', desc: 'We do something else entirely.' }
      ])
    }
  },
  {
    id: 'credential',
    title: 'What shape is the credential?',
    blurb:
      'These characteristics separate a genuine reusable credential from a lookup, a receipt or a PDF. The more that are true, the more clearly you are running a credential service.',
    questions: [
      {
        id: 'reusable',
        text: 'Is it reusable — the same credential works in more than one context or with more than one relying party?',
        options: ['Yes', 'Partly', 'No', 'Not sure']
      },
      {
        id: 'binds_authenticator',
        text:
          'Does it combine the information with an authenticator the holder controls (a device key, PIN or biometric), so a verifier can tell the right person is presenting it?',
        help: 'This is the difference between a credential and a document. A PDF anyone can forward is not bound.',
        options: ['Yes', 'Partly', 'No', 'Not sure']
      },
      {
        id: 'verifiable_independently',
        text: 'Can a relying party check it without contacting you to confirm the underlying facts?',
        help: 'Cryptographic verification against your signing key, rather than a callback to your database.',
        options: ['Yes', 'Partly', 'No', 'Not sure']
      },
      {
        id: 'revocable',
        text: 'Can you revoke or suspend it after issue, and can verifiers see the current status?',
        help: 'Revocation is a Rules obligation for accredited credential services (Rule 83), not an optional extra.',
        options: ['Yes', 'In progress', 'No', 'Not sure']
      },
      {
        id: 'identity_attributes',
        text:
          'Does it carry identity attributes (name, date of birth, photo, identifiers) or entitlements tied to a named person or entity?',
        options: ['Yes', 'Some', 'No']
      },
      {
        id: 'held_by_subject',
        text: 'Is it held by the person or organisation it is about, rather than passed between systems behind their back?',
        options: ['Yes', 'Partly', 'No']
      }
    ]
  },
  {
    id: 'drivers',
    title: 'What is pushing you toward accreditation?',
    blurb:
      'Accreditation under the Act is voluntary in law. In practice several doors only open once you hold it — and the first two below are hard preconditions, not preferences.',
    questions: [
      {
        id: 'dcip',
        text:
          'Do you intend to issue into the Govt.nz app wallet, or through the Digital Credential Issuance Platform (DCIP)?',
        help:
          'DISTF accreditation must be granted before go-live on DCIP. It is a gate, and accreditation runs in parallel with technical onboarding.',
        options: ['Yes', 'Considering it', 'No'],
        weightYes: 100
      },
      {
        id: 'mark',
        text: 'Do you want to display the Trust Framework accreditation mark, or describe your service as accredited?',
        help: 'The mark is protected. Using it without accreditation is an offence under the Act.',
        options: ['Yes', 'Considering it', 'No'],
        weightYes: 100
      },
      {
        id: 'nz_verify',
        text: 'Do you need your credentials to be verifiable through NZ Verify or by other accredited parties?',
        options: ['Yes', 'Considering it', 'No'],
        weightYes: 30
      },
      {
        id: 'procurement',
        text:
          'Are relying parties, government buyers or Marketplace listings already asking whether your service is accredited?',
        options: ['Yes', 'Starting to', 'No'],
        weightYes: 25
      },
      {
        id: 'high_consequence',
        text:
          'Is the credential relied on for high-consequence decisions — age restriction, licence to practise, entitlement to a benefit, right to work or enter?',
        options: ['Yes', 'Somewhat', 'No'],
        weightYes: 25
      },
      {
        id: 'cross_sector',
        text: 'Will it be reused across organisations or sectors, beyond your own service?',
        options: ['Yes', 'Planned', 'No'],
        weightYes: 20
      },
      {
        id: 'public_sector',
        text: 'Are you a public sector agency issuing to the public?',
        help: 'Public agencies carry a higher expectation of accreditation even where the law does not compel it.',
        options: ['Yes', 'No'],
        weightYes: 20
      },
      {
        id: 'scale',
        text: 'Will it be issued at scale (tens of thousands of holders or more), or to a vulnerable cohort?',
        options: ['Yes', 'Maybe', 'No'],
        weightYes: 15
      }
    ]
  },
  {
    id: 'position',
    title: 'Where are you starting from?',
    blurb: 'This tunes the advice at the end. Nothing here changes whether you should be accredited — only how far away it is.',
    questions: [
      {
        id: 'existing_accreditation',
        text: 'Are you already accredited, or have you applied?',
        options: ['Accredited', 'Applied / in assessment', 'Talked to the TFA', 'No contact yet']
      },
      {
        id: 'pia',
        text: 'Have you completed a Privacy Impact Assessment for this service?',
        help: 'A PIA is required for DISTF accreditation.',
        options: ['Yes', 'In progress', 'No']
      },
      {
        id: 'id_standards',
        text: 'Have you assessed the service against the NZ Identification Management Standards?',
        help: 'Conformance with one or more Identification Standards is a requirement for accreditation.',
        options: ['Yes', 'In progress', 'No', 'Not applicable']
      },
      {
        id: 'evaluators',
        text: 'Have you engaged independent privacy, security and identification evaluators?',
        help: 'Independent evaluation of your privacy and security settings is part of the accreditation process.',
        options: ['Yes', 'Identified, not engaged', 'No']
      }
    ]
  }
];

/* --- Tool B: are you ready to engage the GDDA? ---------------------------- */
/* Answers: yes = 1, partly = 0.5, no = 0, na = excluded from the denominator */
const READINESS_SECTIONS = [
  {
    id: 'sponsorship',
    title: 'Mandate, ownership and funding',
    blurb: 'GDDA onboarding starts with a named business owner and a budget. Without these the conversation stalls at the first form.',
    questions: [
      {
        id: 'owner',
        text: 'Is there a named business owner at General Manager level (or equivalent) who can sign the sandbox access form?',
        action: 'Identify and brief a GM-level business owner — the DPI Sandbox Access Form requires their signature.',
        weight: 2, blocker: true
      },
      {
        id: 'usecase',
        text: 'Can you state in one paragraph what the credential is, who holds it, who verifies it, and what decision it supports?',
        action: 'Write a one-paragraph credential statement covering holder, verifier, attributes and the decision it enables.',
        weight: 2
      },
      {
        id: 'funding',
        text: 'Is funding approved for the one-off production tenant fee and the annual tiered fee?',
        help: 'DCIP charges a one-off production tenant creation fee plus an annual fee tiered on the number of potential recipients. Charging starts at production activation, or three months after sandbox activation — whichever comes first.',
        action: 'Get budget approval covering the one-off production fee and ongoing annual fees, including the 3-month sandbox clock.',
        weight: 2, blocker: true
      },
      {
        id: 'timeline',
        text: 'Do you have a target go-live date with accreditation and technical onboarding planned in parallel, not in sequence?',
        action: 'Rebuild the plan so accreditation and technical build run concurrently — accreditation is the long pole.',
        weight: 1
      },
      {
        id: 'legal',
        text: 'Do you have legal authority to issue this credential and to disclose the attributes it contains?',
        action: 'Confirm the statutory or contractual basis for issuing and disclosing each attribute before you commit to a design.',
        weight: 2, blocker: true
      },
      {
        id: 'team',
        text: 'Is there a standing team (product, legal/privacy, security, engineering) rather than a single part-time owner?',
        action: 'Stand up a cross-functional team — accreditation evidence spans privacy, security, identification and engineering.',
        weight: 1
      }
    ]
  },
  {
    id: 'identification',
    title: 'Identification management',
    blurb: 'Conformance with one or more of the NZ Identification Management Standards is a precondition for accreditation.',
    questions: [
      {
        id: 'standards_mapped',
        text: 'Have you mapped your service against the Identification Management Standards and identified which apply?',
        action: 'Map the service to the Identification Management Standards and record which apply and at what level.',
        weight: 2, blocker: true
      },
      {
        id: 'loi',
        text: 'Have you set and documented the level of confidence required for the identity information in the credential?',
        action: 'Document the required level of confidence for information, binding and authentication, with the rationale.',
        weight: 2
      },
      {
        id: 'source_authority',
        text: 'Is the underlying information sourced from an authoritative source you control or have a formal agreement with?',
        action: 'Secure a documented agreement with the authoritative source, or record why your own register is authoritative.',
        weight: 2, blocker: true
      },
      {
        id: 'binding_process',
        text: 'Is there a documented process for binding the credential to the right holder at issue time?',
        action: 'Document the binding process — how you know the person receiving the credential is the person it describes.',
        weight: 2
      },
      {
        id: 'accuracy',
        text: 'Do you have a defined process for correcting inaccurate information and reissuing affected credentials?',
        action: 'Define correction and reissue procedures, including how holders raise a correction.',
        weight: 1
      },
      {
        id: 'lifecycle',
        text: 'Are issuance, renewal, suspension, revocation and expiry defined end-to-end for the credential?',
        action: 'Write the full credential lifecycle, including who can trigger revocation and how fast it propagates.',
        weight: 2
      }
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy and confidentiality',
    blurb: 'A completed PIA and a published privacy statement are baseline accreditation evidence, not nice-to-haves.',
    questions: [
      {
        id: 'pia_done',
        text: 'Is a Privacy Impact Assessment complete for this specific service?',
        action: 'Complete a PIA for the service. This is required evidence and takes weeks, not days.',
        weight: 2, blocker: true
      },
      {
        id: 'privacy_statement',
        text: 'Is there a published privacy statement covering this service specifically?',
        help: 'All Trust Framework providers must have a privacy statement.',
        action: 'Publish a service-specific privacy statement covering collection, use, disclosure, retention and holder rights.',
        weight: 2, blocker: true
      },
      {
        id: 'consent',
        text: 'Do holders give informed, specific consent before the credential is issued and before it is presented?',
        action: 'Build explicit consent into issuance and presentation, with a record of what was consented to and when.',
        weight: 2
      },
      {
        id: 'minimisation',
        text: 'Have you minimised attributes to only what relying parties actually need?',
        help: 'Selective disclosure means a verifier can ask for "over 18" rather than a date of birth.',
        action: 'Cut the attribute set to the minimum and support selective disclosure where the format allows.',
        weight: 1
      },
      {
        id: 'breach',
        text: 'Is there a tested privacy breach response process with notification obligations mapped?',
        action: 'Document and rehearse a privacy breach response, including Privacy Commissioner notification thresholds.',
        weight: 1
      },
      {
        id: 'privacy_officer',
        text: 'Is there a named privacy officer accountable for this service?',
        action: 'Name a privacy officer for the service and record their accountabilities.',
        weight: 1
      },
      {
        id: 'no_persist',
        text: 'Have you confirmed that credential data will not be persisted in the platform against data residency obligations?',
        help: 'DCIP guidance is explicit that agencies must not use claimsToPersist, on privacy and data residency grounds.',
        action: 'Confirm your integration design does not persist claims in the platform, and record the decision.',
        weight: 2
      }
    ]
  },
  {
    id: 'security',
    title: 'Security and risk management',
    blurb: 'The Rules cover security governance, information security, physical security and personnel security. Evidence is expected across all four.',
    questions: [
      {
        id: 'sec_governance',
        text: 'Is there a documented security governance framework with an accountable owner for this service?',
        action: 'Document security governance for the service — accountable owner, decision rights, reporting line.',
        weight: 2, blocker: true
      },
      {
        id: 'risk_register',
        text: 'Is there a current risk assessment and register specific to this service, with treatments and owners?',
        action: 'Produce a service-specific risk assessment with rated risks, treatments and named owners.',
        weight: 2
      },
      {
        id: 'infosec_controls',
        text: 'Are information security controls documented and operating (access control, logging, encryption in transit and at rest)?',
        action: 'Document and evidence baseline infosec controls; screenshots of settings are not evidence, policies plus test results are.',
        weight: 2
      },
      {
        id: 'key_management',
        text: 'Do you have a key management approach that supports HSM-backed production signing keys and a PKI ceremony?',
        help: 'Production DCIP tenants use manually managed certificates from an HSM, with the DPI team orchestrating the PKI ceremony.',
        action: 'Define key management for signing keys, including HSM custody, rotation and the production PKI ceremony.',
        weight: 2
      },
      {
        id: 'personnel',
        text: 'Are personnel security controls in place (vetting, role-based access, offboarding) for staff touching the service?',
        action: 'Apply and evidence vetting, least-privilege access and offboarding for everyone with production access.',
        weight: 1
      },
      {
        id: 'physical',
        text: 'Are physical security controls documented for the facilities and infrastructure involved?',
        action: 'Document physical security for relevant facilities, including any third-party hosting.',
        weight: 1
      },
      {
        id: 'incident',
        text: 'Is there a tested security incident response plan covering credential compromise and mass revocation?',
        action: 'Write and test an incident plan that includes credential compromise and a mass-revocation scenario.',
        weight: 2
      },
      {
        id: 'pentest',
        text: 'Has the service had an independent security assessment or penetration test in the last 12 months?',
        action: 'Commission an independent security assessment — the assessor will ask for one.',
        weight: 1
      }
    ]
  },
  {
    id: 'data',
    title: 'Information and data management',
    blurb: 'Where the data comes from, how long you keep it, and who else touches it.',
    questions: [
      {
        id: 'data_inventory',
        text: 'Do you have an inventory of every attribute in the credential, its source, and its authority?',
        action: 'Build an attribute inventory: field, source system, authority, refresh frequency, sensitivity.',
        weight: 2
      },
      {
        id: 'retention',
        text: 'Are retention and disposal schedules defined for issuance records, logs and status data?',
        action: 'Define retention and disposal for issuance records, audit logs and status list data.',
        weight: 1
      },
      {
        id: 'residency',
        text: 'Do you know where every piece of data is stored and processed, including by sub-processors?',
        action: 'Map data residency end-to-end, including all sub-processors, and check it against your obligations.',
        weight: 2
      },
      {
        id: 'third_parties',
        text: 'Are contracts in place with any third parties in the issuance chain, covering their Trust Framework obligations?',
        action: 'Flow Trust Framework obligations down into contracts with every third party in the chain.',
        weight: 1
      },
      {
        id: 'audit_log',
        text: 'Is there a tamper-evident audit trail of issuance, status changes and administrative actions?',
        action: 'Implement a tamper-evident audit log for issuance, revocation and admin actions.',
        weight: 2
      },
      {
        id: 'data_quality',
        text: 'Do you monitor data quality in the source system, with a threshold that would pause issuance?',
        action: 'Set data quality monitoring and a defined threshold at which issuance pauses.',
        weight: 1
      }
    ]
  },
  {
    id: 'sharing',
    title: 'Sharing, facilitation and holder control',
    blurb: 'How the credential moves, and how much say the holder has over it.',
    questions: [
      {
        id: 'holder_control',
        text: 'Can holders see what they hold, what has been presented, and to whom?',
        action: 'Give holders visibility of their credentials and a presentation history.',
        weight: 1
      },
      {
        id: 'holder_revoke',
        text: 'Can holders surrender, replace or report loss of a credential, with a defined response time?',
        action: 'Build a holder-initiated loss/replacement path with a published response time.',
        weight: 1
      },
      {
        id: 'verifier_terms',
        text: 'Have you defined who may verify the credential and on what terms?',
        action: 'Define the verifier population and terms — including whether unaccredited parties may verify.',
        weight: 1
      },
      {
        id: 'support',
        text: 'Is there a support model for holders who cannot get, hold or present their credential?',
        action: 'Design the holder support model, including the non-digital fallback.',
        weight: 2
      },
      {
        id: 'inclusion',
        text: 'Is there a non-digital alternative for people who cannot or will not use the digital credential?',
        action: 'Keep or design a non-digital path so the credential does not become a barrier to entitlement.',
        weight: 2
      },
      {
        id: 'te_tiriti',
        text: 'Have you considered Te Tiriti o Waitangi obligations and Māori data governance for this credential?',
        help: 'The Act carries Tiriti provisions; the TFA will expect to see this considered rather than asserted.',
        action: 'Engage on Te Tiriti and Māori data governance implications and record the outcome.',
        weight: 2
      }
    ]
  },
  {
    id: 'evaluation',
    title: 'Independent evaluation and application evidence',
    blurb: 'Accreditation is an evidence exercise. Independent evaluators assess your privacy, security and identification settings.',
    questions: [
      {
        id: 'evaluators_engaged',
        text: 'Have you appointed independent evaluators for security, privacy and identification management?',
        help: 'The DCIP onboarding guide has agencies appointing an independent evaluator at the same time as starting the accreditation application.',
        action: 'Appoint independent evaluators now — availability, not assessment time, is usually the constraint.',
        weight: 2, blocker: true
      },
      {
        id: 'tfa_contact',
        text: 'Have you contacted the Trust Framework Authority (TFA@gdda.govt.nz) to talk through your application?',
        help: 'The TFA asks providers to discuss the application before starting it.',
        action: 'Email TFA@gdda.govt.nz for a pre-application conversation before filling in anything.',
        weight: 1
      },
      {
        id: 'evidence_pack',
        text: 'Are you assembling an evidence pack mapped question-by-question to the application form and guidance?',
        action: 'Build the evidence pack against the TFA application form and guidance, using the supplied checklist.',
        weight: 2
      },
      {
        id: 'rules_mapped',
        text: 'Have you mapped your controls against all five Rules subjects and identified the gaps?',
        help: 'Identification management, privacy and confidentiality, security and risk, information and data management, sharing and facilitation.',
        action: 'Run a clause-by-clause gap analysis against the DISTF Rules 2024 and log every gap with an owner.',
        weight: 2, blocker: true
      },
      {
        id: 'maintenance',
        text: 'Do you have a plan for maintaining accreditation — annual obligations, change notifications, ongoing conformance?',
        action: 'Plan for post-accreditation maintenance: reporting, change notification and re-evaluation.',
        weight: 1
      }
    ]
  },
  {
    id: 'technical',
    title: 'DCIP technical readiness',
    blurb: 'Only relevant if you intend to issue through the Digital Credential Issuance Platform. Mark items N/A if you are accrediting a non-DCIP service.',
    questions: [
      {
        id: 'mdoc',
        text: 'Is your credential designed as an mdoc (ISO/IEC 18013-5 / 23220), with a DocType and namespace decided?',
        help: 'DCIP supports the mdoc format. You define your own DocType and can use org.iso.23220.1 for standard personal attributes.',
        action: 'Design the credential as an mdoc: choose the DocType, namespace and attribute schema.',
        weight: 2
      },
      {
        id: 'oid4vci',
        text: 'Does your team understand the OID4VCI issuance flows and which one you will use?',
        help: 'Authorization Code flow authenticates the user with you at issuance time; Pre-authorised Code flow issues via a QR/link plus a six-digit transaction code you share separately.',
        action: 'Pick and document the OID4VCI flow (authorization code vs pre-authorised code) and the holder authentication it implies.',
        weight: 2
      },
      {
        id: 'api_integration',
        text: 'Do you have engineering capacity to integrate with the platform API for offers, status and revocation?',
        action: 'Allocate engineering capacity for API integration — credential offers, status management and revocation.',
        weight: 2
      },
      {
        id: 'domain',
        text: 'Can you create and operate a publicly resolvable custom domain for the tenant (e.g. issuance.agency.govt.nz)?',
        help: 'The domain is embedded in every credential and serves the status list, so it has to be stable for the life of the credential.',
        action: 'Provision a stable custom domain and treat it as permanent — it is baked into every credential you issue.',
        weight: 2, blocker: true
      },
      {
        id: 'status_list',
        text: 'Have you planned status list hosting and revocation handling (Token Status List, 1-bit)?',
        action: 'Plan status list hosting and revocation propagation against the Token Status List spec.',
        weight: 2
      },
      {
        id: 'webhook',
        text: 'Can you receive webhooks and capture the credentialId at issuance so you can revoke later?',
        help: 'Without capturing credentialId at issue, you cannot revoke that credential afterwards.',
        action: 'Implement the issuance webhook and persist credentialId against your own record — revocation depends on it.',
        weight: 2, blocker: true
      },
      {
        id: 'wallet_uri',
        text: 'Do you handle the transformation of the credential offer URI into the Govt.nz app wallet form?',
        action: 'Implement the openid-credential-offer URI transformation for the Govt.nz app wallet.',
        weight: 1
      },
      {
        id: 'branding',
        text: 'Do you have credential branding ready (colour and logo) for wallet display?',
        action: 'Prepare credential branding assets — colour and logo — for the sandbox access form.',
        weight: 1
      },
      {
        id: 'verification_template',
        text: 'If verification through NZ Verify is in scope, have you specified the verification template?',
        action: 'Specify the NZ Verify verification template, or record that verification is out of scope.',
        weight: 1
      },
      {
        id: 'test_plan',
        text: 'Do you have a test plan covering sandbox issuance, verification and revocation, then a production smoke test?',
        help: 'Go-live includes an end-to-end production smoke test: issue a test credential, verify it, then revoke it.',
        action: 'Write the test plan through to the production smoke test (issue, verify, revoke).',
        weight: 1
      }
    ]
  }
];

const ANSWER_SCALE = [
  { value: 'yes', label: 'Yes', score: 1 },
  { value: 'partly', label: 'Partly', score: 0.5 },
  { value: 'no', label: 'No', score: 0 },
  { value: 'na', label: 'N/A', score: null }
];
