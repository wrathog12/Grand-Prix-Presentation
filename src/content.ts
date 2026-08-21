/**
 * Every string and number on this site lives here.
 *
 * Two rules, both inherited from the project itself:
 *  1. Everything here is traceable to PROJECT_KNOWLEDGE_BASE.md, which was
 *     verified against source and data files on 2026-08-21. Nothing is invented.
 *  2. Anything modelled, inferred or illustrative is marked as such, because
 *     the project's whole thesis is that it does not overclaim. A fabricated
 *     figure on this deck would undercut the argument more than a plain one.
 */

export const meta = {
  team: 'BotGods',
  project: 'The Silent Co-Driver',
  hackathon: 'AI Race Month · GrandPrix',
  problemStatement: 'Problem Statement 1',
  theme: 'Racing Strategy & Decision-Making',
  round: 'Offline judging round · 22 August 2026',
  oneLiner:
    'Reads driver stress and fatigue from team-radio audio and turns it into pit-wall strategy calls.',
  members: [
    'Divyanshu Kasherwal',
    'Shreevats Dhyani',
    'Akshat Saraswat',
    'Abhishek Choudhary',
  ],
} as const

/* ── 01 · Problem ─────────────────────────────────────────────────────────── */

export const problem = {
  eyebrow: 'The problem',
  headline: 'The pit wall is deaf',
  lead: 'A Formula 1 pit wall carries thousands of telemetry channels for the car and zero for the driver. It hears the driver on the radio — and throws the audio away.',
  brief: {
    title: 'What the brief asked for',
    items: [
      'Play or upload a radio clip',
      'Produce a readable transcript',
      'Produce a mood label',
      'Show whether mood is affecting lap performance',
      'Land inside Racing Strategy & Decision-Making — the output has to be a decision, not a sentiment score',
    ],
  },
  hard: {
    title: 'Why it is not a sentiment-analysis exercise',
    items: [
      {
        title: 'The audio is hostile',
        body: 'Band-limited, compressed, clipped, over a 15,000 rpm engine and 300 km/h wind. Pitch trackers lock onto engine harmonics.',
      },
      {
        title: 'The clips are tiny',
        body: 'Most transmissions run one to five seconds. Many are half a sentence.',
      },
      {
        title: 'There is no ground truth',
        body: 'No team publishes driver heart rate, core temperature or fatigue. There is no labelled corpus of "tired F1 driver".',
      },
      {
        title: 'A pit wall ignores anything unreliable',
        body: 'A system that changes its answer on reload, or escalates on every clip, gets switched off.',
      },
    ],
  },
} as const

/* ── 02 · Solution ────────────────────────────────────────────────────────── */

export const solution = {
  eyebrow: 'Our solution',
  headline: 'No model has a word for tired',
  lead: 'Every public speech-emotion model is trained on emotions — angry, happy, sad, neutral, fearful. None of them has a tired class. Fatigue is not something they get wrong. It is something they cannot say.',
  emotionLabels: ['angry', 'happy', 'sad', 'neutral', 'fearful', 'disgusted', 'surprised', 'calm'],
  missingLabel: 'tired',
  consequence:
    'A tired driver gets projected onto the nearest emotion — usually sad or neutral. On a pit wall, "neutral" and "the driver has nothing left" are opposite instructions.',
  insight: {
    title: 'Fatigue is not a feeling. It is physics.',
    body: 'When a person is physically spent, their voice production changes measurably — and every one of those changes is reachable with classical signal processing. None of it needs a model that has ever heard a tired person.',
    signals: [
      { name: 'Pitch', detail: 'less laryngeal tension', dir: 'down' },
      { name: 'Pitch range', detail: 'flatter, narrower F0', dir: 'down' },
      { name: 'Energy', detail: 'weaker subglottal pressure', dir: 'down' },
      { name: 'Speech rate', detail: 'articulation slows', dir: 'down' },
      { name: 'Pauses', detail: 'more breaths per sentence', dir: 'up' },
      { name: 'Jitter', detail: 'less stable period control', dir: 'up' },
    ],
  },
  branches: [
    {
      key: 'prosody',
      name: 'Prosody',
      kind: 'Hand-engineered',
      body: '8 features, z-scored against this driver\'s own calm baseline. The branch that can see fatigue.',
      colour: 'var(--color-series-3)',
    },
    {
      key: 'acoustic',
      name: 'Acoustic',
      kind: 'wav2vec2 · IEMOCAP',
      body: 'Emotional arousal, which is what an SER model is genuinely good at.',
      colour: 'var(--color-series-2)',
    },
    {
      key: 'text',
      name: 'Text',
      kind: 'DistilRoBERTa',
      body: 'Emotion over the Whisper transcript, plus racing-specific fatigue and stress cues.',
      colour: 'var(--color-series-1)',
    },
  ],
  outcome: {
    title: 'The answer is an instruction, not a mood',
    body: 'Three states in, five deterministic calls out. Same input, same output, every time — because a pit wall that changes its answer on reload gets ignored.',
  },
} as const

/* ── 03 · Technical depth ─────────────────────────────────────────────────── */

export const technical = {
  eyebrow: 'Technical depth',
  headline: 'Eleven stages, and none of them guess',
  stages: [
    'RECEIVED',
    'PREPROCESS',
    'VAD',
    'STT',
    'PROSODY',
    'ACOUSTIC',
    'TEXT',
    'FUSION',
    'ALIGN',
    'DONE',
  ],
  stageNote:
    'Streamed to the browser over a WebSocket, stage by stage, so a judge can watch the real ~13 s run instead of a silent "Analysing…" button.',
  details: [
    {
      title: 'Prosody gets speech only. STT and SER get the whole clip.',
      body: 'Whisper uses surrounding context to decode and the emotion model was trained on whole utterances, so a VAD-trimmed clip degrades both. Feeding prosody the untrimmed clip poisons the pause and rate features with dead air. Two different diets, on purpose.',
    },
    {
      title: 'Loud for them, not loud.',
      body: 'Every prosody feature is z-scored against that driver\'s own calm-labelled clips. An absolute threshold labels a naturally loud driver as permanently stressed — that is not a model, it is a microphone. The three-tier fallback is driver → cohort → population prior, and the API requires the tier to be reported, so the UI physically cannot claim "calibrated to this driver" while running on priors.',
    },
    {
      title: 'Engine harmonics are locked out by hand.',
      body: 'F0 search is hard-banded to 60–400 Hz using librosa.pyin rather than piptrack — slower, but robust on band-limited radio. Articulation rate is computed over spoken time only, because rate over total duration is a pause measure wearing a rate\'s name.',
    },
    {
      title: 'Unmeasurable features are omitted, never zero-filled.',
      body: 'A pitch of 0 Hz z-scores to a huge negative deviation, which reads as extreme fatigue. A zero-fill here would have fabricated the project\'s own headline finding.',
    },
    {
      title: 'A race-context layer resolves every call to an instant.',
      body: 'Eight modules, ~1,300 lines, keyed off the radio transmission\'s exact broadcast UTC timestamp: which corner, how fast, what tyres, what the track was doing, who was around them. It also recovers the lap number for the 100 clips whose lap field is blank — without it those clips could not be placed in the race at all.',
    },
  ],
  silentBugs: {
    title: 'Silent wrong answers are the enemy',
    body: 'None of these threw an error. Each returned a confident wrong number, and each was caught by verification rather than by a crash.',
    items: [
      {
        cause: 'Silero VAD fed a 512-sample window instead of 576',
        effect: 'Near-zero speech probability on obvious speech',
      },
      {
        cause: "Matching FastF1's Time column instead of Date",
        effect: 'Every telemetry lookup silently clamped to the last sample of the lap',
      },
      {
        cause: "sklearn's binary coefficient convention",
        effect: 'Every clip classified as class 0 at 100 % confidence',
      },
      {
        cause: 'USE_FIXTURES defaulted to 1',
        effect: 'Upload endpoint returned canned data without reading the uploaded file',
      },
      {
        cause: 'Zero-filled prosody features',
        effect: 'A 0 Hz pitch read as extreme fatigue',
      },
      {
        cause: 'Zero-filled correlations',
        effect: 'Headline read "stress peaks N laps before pace loss (r = 0.00)"',
      },
    ],
  },
  stack: {
    frontend: ['React 19.2.8', 'TypeScript 6.0.2', 'Vite 8.2.0', 'Tailwind 3.4.19', 'Recharts 3.10.1'],
    backend: ['FastAPI 0.115.6', 'Pydantic 2.10.4', 'Uvicorn 0.34.0', 'Python 3.11 / 3.12'],
    ml: ['torch 2.5.1 (CPU)', 'transformers 4.47.1', 'librosa 0.10.2', 'scikit-learn 1.6.0', 'onnxruntime 1.20.1'],
    data: ['fastf1 3.4.4', 'No database — CSV, JSON and a pickle cache on disk'],
  },
} as const

/* ── 04 · The model ──────────────────────────────────────────────────────── */

export const model = {
  eyebrow: 'The model',
  headline: 'Four models, one fitted head',
  models: [
    { role: 'STT', id: 'distil-whisper/distil-small.en', note: 'English-only' },
    { role: 'Acoustic SER', id: 'superb/wav2vec2-base-superb-er', note: 'IEMOCAP · no tired class' },
    { role: 'Text emotion', id: 'j-hartmann/emotion-english-distilroberta-base', note: '7 emotions' },
    { role: 'VAD', id: 'istupakov/silero-vad-onnx', note: 'onnxruntime, not torch' },
  ],
  modelsNote:
    'All four are public — no Hugging Face token required. That was a selection criterion, not luck: a gated model means a token, and a token is a thing that can fail at an offline venue.',
  head: {
    title: 'The fusion head',
    body: 'Multinomial logistic regression over 8 inputs — 6 z-scored prosody features plus the acoustic and text scores. Validated with leave-one-out cross-validation across all 853 labelled clips.',
    config: 'LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced")',
    classes: ['Calm', 'Stressed', 'Tired'],
  },
  /** The real trained coefficient matrix from data/labels/fusion_head.json. */
  weights: {
    features: [
      'f0_mean_z',
      'f0_std_z',
      'rms_mean_z',
      'speech_rate_z',
      'pause_ratio_z',
      'jitter_z',
      'acoustic_score',
      'text_score',
      'intercept',
    ],
    rows: [
      { cls: 'Calm', values: [-0.544, 0.522, 0.052, 0.0, -0.059, -0.413, -4.08, -4.342, 3.664] },
      { cls: 'Stressed', values: [1.011, 0.815, 0.181, 0.0, -0.166, -0.288, 5.263, -1.77, -2.457] },
      { cls: 'Tired', values: [-0.466, -1.337, -0.233, 0.0, 0.225, 0.701, -1.182, 6.112, -1.207] },
    ],
  },
  reading: [
    {
      title: 'The Tired row is the hypothesis, fitted',
      body: 'Pitch variability down (−1.337), energy down (−0.233), pauses up (+0.225), jitter up (+0.701 — the largest positive prosody weight of any class). The fatigue signature we predicted is visible in the learned weights.',
    },
    {
      title: 'Stressed is the acoustic model\'s job',
      body: 'Dominated by acoustic_score at +5.263, which is exactly what an IEMOCAP-trained SER model is good at. The division of labour the architecture assumed shows up in the fit.',
    },
    {
      title: 'Tired is carried by language, not prosody',
      body: 'text_score is +6.112 against a largest prosody weight of +0.701. So the accurate claim is that fatigue is recovered by the two branches an acoustic-only model does not have — prosody and language. Not "prosody alone finds fatigue."',
    },
    {
      title: 'One feature is dead',
      body: 'speech_rate_z has a coefficient of exactly 0.000 in all three rows. It contributes nothing in this fit, and saying so costs less than being caught on it.',
    },
  ],
  data: {
    title: 'What it was trained on',
    stats: [
      { value: 855, label: 'radio clips indexed', suffix: '' },
      { value: 853, label: 'in the training set', suffix: '' },
      { value: 9, label: 'Grands Prix', suffix: '' },
      { value: 23, label: 'drivers', suffix: '' },
      { value: 164, label: 'driver × session pairs', suffix: '' },
    ],
    labels: [
      { cls: 'Calm', count: 360, share: 42.1, colour: 'var(--color-calm)' },
      { cls: 'Tired', count: 281, share: 32.9, colour: 'var(--color-tired)' },
      { cls: 'Stressed', count: 212, share: 24.8, colour: 'var(--color-stressed)' },
    ],
  },
  caveat: {
    title: 'The caveat that travels with the 88.75 %',
    body: 'The 853 labels were not produced by humans. They were written by a script that reads the rule-based fusion\'s own output — the annotator column is empty on all 855 rows. So the defensible statement is: 88.75 % is leave-one-out cross-validated accuracy at reproducing labels generated by the rule-based fusion of four models. It is a distillation and agreement figure, not accuracy against human ground truth.',
    footer:
      'An interactive human-labelling tool is built and ready — browser UI, three keys, saves on every keypress. It was not used for this label set. Human validation is the first item on the roadmap.',
  },
} as const

/* ── 05 · Versus the traditional one-way model ───────────────────────────── */

export const versus = {
  eyebrow: 'Why fusion',
  headline: 'Flip the switch',
  lead: 'The dashboard ships an A/B toggle. Naive is the argmax of the acoustic model mapped onto three classes. Because that mapping table has no route to Tired — it is pinned at a fixed 0.06 residual probability — the naive path is structurally incapable of ever returning Tired.',
  punch:
    'So the toggle does not move a number. It makes an entire class of driver state appear and disappear.',
  accuracy: {
    naive: 45.13,
    fusion: 88.75,
    delta: 43.6,
    nTrain: 853,
    method: 'Leave-one-out cross-validation, 853 folds',
  },
  comparison: [
    {
      axis: 'Label space',
      naive: 'Emotions only. No route to Tired, ever.',
      fusion: 'Calm · Stressed · Tired — fatigue is reachable.',
    },
    {
      axis: 'Calibration',
      naive: 'One absolute threshold for every driver.',
      fusion: "Z-scored against each driver's own calm baseline.",
    },
    {
      axis: 'Evidence',
      naive: 'One number from one model. Take it or leave it.',
      fusion: 'Three branches shown separately, so disagreement is visible.',
    },
    {
      axis: 'Output',
      naive: 'A sentiment score.',
      fusion: 'A strategy call, including the call to do nothing.',
    },
    {
      axis: 'Failure mode',
      naive: 'Silently returns the nearest emotion.',
      fusion: 'Reports which tier, which basis, and how much it does not know.',
    },
  ],
  calls: [
    {
      code: 'HOLD',
      headline: 'HOLD — driver venting, pace unaffected',
      urgency: 'info',
      when: 'Stress elevated, pace stable',
    },
    {
      code: 'BOX_NOW',
      headline: 'BOX THIS LAP — driver degradation confirmed',
      urgency: 'critical',
      when: 'Sustained stress and pace worsening',
    },
    {
      code: 'PIT_WINDOW_OPENING',
      headline: 'PIT WINDOW OPENING — fatigue ahead of tyre cliff',
      urgency: 'warning',
      when: 'Fatigue signal before the modelled tyre cliff',
    },
    {
      code: 'MONITOR',
      headline: 'MONITOR — stress rising',
      urgency: 'info',
      when: 'Stress trending up, not yet sustained',
    },
    {
      code: 'REDUCE_RADIO_LOAD',
      headline: 'REDUCE RADIO LOAD — driver is saturated',
      urgency: 'warning',
      when: '3 or more calls in a 6-lap window',
    },
  ],
  holdQuote:
    'Knowing when not to act is most of race strategy, and a system that only ever escalates is a system the pit wall learns to ignore.',
  honesty: {
    title: 'And then it refuses to call it significant',
    body: 'The hero claim is that the voice moves before the stopwatch. We built the instrument that measures it — cross-correlation across lags −4 to +4 laps — and then built it so it cannot overclaim. On this dataset a minority of driver/session pairs show a negative peak, and none clear our own significance floor of 25 samples. So the interface writes "Indicative only — 11 clips in this session" in its own voice.',
    punch: 'The guard firing correctly is the result.',
  },
  hamilton: {
    title: 'Hamilton won and our model panicked',
    body: '2024 British GP. Hamilton\'s home victory radio — shouting, elated — scored 97.6 Stressed against lap 52. Acoustically it is indistinguishable from acute distress. Contextually it is the opposite.',
    fix: 'The fix was not a bigger model. Radio is now tagged by phase — racing, pre-race, post-race — and the system is told that post-race elation is not in-race stress.',
  },
  construction: {
    title: 'Honesty by construction',
    body: 'Plenty of projects fuse three models. The unusual thing here is that the codebase is architected so that overclaiming is hard to do by accident. The same move, a dozen times over: make the honest thing structural, not a matter of remembering.',
    items: [
      { mechanism: 'TyreState.basis is a constant "modelled", not a boolean flag', reason: 'A flag can be forgotten. A constant cannot be set wrong.' },
      { mechanism: 'MoodResult.fitted defaults to False', reason: 'Claiming a trained head must be a deliberate act, never a default.' },
      { mechanism: 'DriverBaseline.source is a required field', reason: 'The UI cannot say "calibrated" while running on priors.' },
      { mechanism: 'Correlations are None when unmeasurable, never 0.0', reason: 'Zeros let the peak-picker select a fabricated data point.' },
      { mechanism: 'past_cliff left None rather than False', reason: 'False would assert that we checked.' },
      { mechanism: 'The LLM\'s dropped-finding count is displayed in the UI', reason: 'The system publishes its own failure rate rather than swallowing it.' },
      { mechanism: 'Loading states held for a 620 ms minimum', reason: "The UI doesn't imply a speed it didn't earn." },
      { mechanism: 'The chat names every tool it called', reason: 'So an answer can be checked rather than trusted.' },
    ],
    quote: "We didn't build a system that tells the truth. We built one where lying requires effort.",
  },
} as const

/* ── 06 · Impact, business, cost ─────────────────────────────────────────── */

export const impact = {
  eyebrow: 'Impact · business · cost',
  headline: 'It runs on a laptop',
  cost: {
    title: 'What it costs to run',
    lead: 'The core product has no per-inference cost and no cloud dependency. Every number below is a property of the shipped system, not a projection.',
    items: [
      { label: 'Inference hardware', value: 'CPU only', note: 'torch is pinned to the CPU wheel on purpose — we develop against the same hardware we present on. ~200 MB instead of ~2.5 GB for CUDA.' },
      { label: 'Model licensing', value: 'Free · public', note: 'All four Hugging Face models are public. No token, no gated repo, no vendor account.' },
      { label: 'Per-clip cost', value: '~13 s of CPU', note: 'Pre-analysed into a JSON cache, so the dashboard never re-infers.' },
      { label: 'Database', value: 'None', note: 'A CSV, JSON files and a pickle cache. Nothing to start, nothing to migrate, nothing to be down.' },
      { label: 'External API', value: 'Optional', note: 'Groq powers the chat and findings layers only, behind a feature flag. No key means both panels hide themselves and the core dashboard is unaffected.' },
      { label: 'Network at runtime', value: 'Zero', note: 'Cache-only race data, local models, self-hosted fonts, build-time portraits and circuit geometry.' },
    ],
  },
  offline: {
    title: 'Built for a room with no wifi',
    items: [
      'Race data: the FastF1 client is cache-only — a cache miss is an error, not a fetch',
      'Models: all four pre-warmed to disk, local_files_only when offline mode is set',
      'Fonts: three self-hosted variable woff2 files, no webfont request',
      'Circuit geometry and driver portraits: extracted at build time',
      'LLM layers: feature-flagged off, and a 404 makes each panel hide itself',
      'The check: GET /api/health returns offline_ready: true and four models true',
    ],
  },
  business: {
    title: 'Where it fits',
    lead: 'This is a pit-wall decision-support instrument. The deployment shape is deliberately unglamorous — it adds a channel to infrastructure a team already owns.',
    items: [
      {
        title: 'It uses a feed teams already have',
        body: 'Team radio is already recorded, already timestamped, already archived. No new sensor, no driver hardware, no FIA approval for a new device. The input is a byproduct the sport currently discards.',
      },
      {
        title: 'It runs where the data already is',
        body: 'No GPU, no cloud egress, no third-party processor touching driver data. That matters commercially: a team\'s radio archive is competitively sensitive, and a system that never leaves the garage is a far easier sell than one that uploads it.',
      },
      {
        title: 'The output slots into an existing workflow',
        body: 'Strategy engineers already act on a small vocabulary of calls. Five deterministic calls — one of which is do nothing — is an addition to that vocabulary, not a replacement for the human making it.',
      },
      {
        title: 'The same instrument generalises past racing',
        body: 'Any operator on a recorded voice channel has the same gap: long-haul freight, aviation, control rooms, emergency dispatch. The fatigue branch is not F1-specific — it is signal processing on a human voice.',
        flag: 'extrapolation',
      },
    ],
    caveat:
      'That last point is a direction, not a result. We have not tested this outside F1 team radio, and we are not going to present an addressable-market figure we did not measure.',
  },
  social: {
    title: 'Why it matters beyond the stopwatch',
    items: [
      {
        title: 'Driver welfare is currently unmonitored',
        body: 'A team measures every degree and every millibar in the car and nothing at all about the human in it. Fatigue is a safety variable in a sport at 300 km/h, and right now nobody has an instrument pointed at it.',
      },
      {
        title: 'Warning time is the product',
        body: 'If the voice moves before the lap time, the gap between them is warning time — and warning time is what a decision is made of, whether the decision is a pit stop or a driver change.',
      },
      {
        title: 'It is a template for honest ML in high-stakes rooms',
        body: 'The transferable contribution is not the classifier. It is the pattern: report which calibration tier you are on, refuse to draw a channel you have no data for, publish your own failure rate, and let the significance guard say no. That pattern belongs anywhere a model advises a human under time pressure.',
      },
    ],
  },
  ledger: {
    title: 'The honest ledger',
    proven: [
      '855 real radio clips across 9 Grands Prix and 23 drivers, indexed and analysed',
      'A three-branch fusion head with real fitted weights, LOO-cross-validated at 88.75 % against its training target',
      'A +43.6 point gap over the acoustic-only path, demonstrating one model cannot reproduce a three-class judgement that includes fatigue',
      'Per-driver calibration with the tier in use reported on every response',
      'Deterministic strategy output — same input, same output, every time',
      'A race-context layer resolving every call to its exact broadcast instant',
      'Full offline operation, verified by a health endpoint',
    ],
    notYet: [
      'Human-validated labels. The 853 labels are model-generated; the labelling tool is built and unused',
      'A statistically significant lead-lag result. A minority of pairs show the effect and none clear our own floor of 25 samples',
      'Real biometric data. The second independent channel exists as a path, not as evidence',
      'Real tyre telemetry. Every tyre figure is modelled from compound, age and lap times, and is labelled as such',
      'Any test coverage claim. One test file exists on disk',
      'Anything outside English-language F1 team radio',
    ],
  },
  roadmap: [
    { step: '01', title: 'Human labels', body: 'Run the labelling tool that is already built. Replace the model-generated label set and re-report the accuracy honestly, whichever way it moves.' },
    { step: '02', title: 'More clips per driver', body: '164 driver × session pairs is too thin for per-pair correlation. Depth per pair, not breadth, is what clears the significance floor.' },
    { step: '03', title: 'Real biometrics', body: 'Two independent signals agreeing is evidence where one is a hypothesis. The ingestion path is built and waiting for data.' },
  ],
} as const

export const closing = {
  headline: 'The voice cracked before the stopwatch',
  body: 'We built the instrument that can measure that — and we built it so it refuses to overclaim.',
} as const
