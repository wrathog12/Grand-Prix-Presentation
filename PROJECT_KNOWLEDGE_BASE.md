# THE SILENT CO-DRIVER — Project Knowledge Base

> **Purpose of this file.** This is a self-contained context document for building a
> **scroll-animated presentation website** (a "PPT for judges") about this project, in a
> **different directory / repo**. Everything an agent or a human needs to write that site is
> here: the story, the architecture, the real numbers, the design system, the demo beats.
> You should not need to read the source repo.
>
> **Every number in this file was verified against the source code and data files on
> 2026-08-21.** Where the project's own `README.md`, `SETUP.md` and `SOLUTION.md` disagree
> with reality, this file records **both** and marks the docs as stale. See
> [§20 Stale-claims table](#20-stale-claims--do-not-repeat-these) — that section exists
> specifically so the presentation site does not repeat numbers that are wrong.

---

## Table of contents

1. [Identity & elevator pitch](#1-identity--elevator-pitch)
2. [The problem statement](#2-the-problem-statement)
3. [The core insight — why fatigue is invisible to off-the-shelf models](#3-the-core-insight--why-fatigue-is-invisible-to-off-the-shelf-models)
4. [What the product actually does — a user's tour](#4-what-the-product-actually-does--a-users-tour)
5. [System architecture](#5-system-architecture)
6. [The ML pipeline, stage by stage](#6-the-ml-pipeline-stage-by-stage)
7. [The fusion head — real trained weights](#7-the-fusion-head--real-trained-weights)
8. [Per-driver calibration (baselines)](#8-per-driver-calibration-baselines)
9. [The deterministic strategy layer](#9-the-deterministic-strategy-layer)
10. [Lead-lag: does the voice move before the stopwatch?](#10-lead-lag-does-the-voice-move-before-the-stopwatch)
11. [The race-context layer](#11-the-race-context-layer)
12. [The agent layer (chat) and the findings layer (LLM briefing)](#12-the-agent-layer-chat-and-the-findings-layer-llm-briefing)
13. [Biometrics — the deliberately empty channel](#13-biometrics--the-deliberately-empty-channel)
14. [Complete API surface](#14-complete-api-surface)
15. [Frontend architecture — every component](#15-frontend-architecture--every-component)
16. [Design system](#16-design-system)
17. [Data inventory (verified)](#17-data-inventory-verified)
18. [Ops, setup and the offline story](#18-ops-setup-and-the-offline-story)
19. [Design philosophy: honesty by construction](#19-design-philosophy-honesty-by-construction)
20. [Stale claims — do not repeat these](#20-stale-claims--do-not-repeat-these)
21. [Known limitations & honest caveats](#21-known-limitations--honest-caveats)
22. [Narrative beats for the scroll site](#22-narrative-beats-for-the-scroll-site)
23. [Suggested scroll-site structure, section by section](#23-suggested-scroll-site-structure-section-by-section)
24. [Glossary](#24-glossary)
25. [Repo file map](#25-repo-file-map)

---

## 1. Identity & elevator pitch

| Field | Value |
|---|---|
| **Name** | The Silent Co-Driver |
| **One-liner** | Reads driver stress and fatigue from team-radio audio and turns it into pit-wall strategy calls. |
| **Event** | AI Race Month · GrandPrix — **problem statement 1**, theme *Racing Strategy & Decision-Making* |
| **Offline judging round** | 22 August 2026 (the demo is judged with venue wifi assumed dead) |
| **Repo** | `github.com/shreevatsdhyani/grandprix` |
| **Project lead named in docs** | Shreevats Dhyani |
| **Working branch at time of writing** | `wrathog` |
| **App version constant** | `config.VERSION = "0.1.0"` |
| **FastAPI title / description** | "The Silent Co-Driver" / "Reads driver stress from team-radio audio and turns it into pit-wall strategy calls. AI Race Month · GrandPrix, problem statement 1." |

**The 30-second pitch.**
A Formula 1 pit wall has telemetry for the car and nothing for the driver. It hears the
driver on the radio and throws the audio away. This project keeps the audio: it transcribes
team radio, measures the *voice* — pitch, energy, speech rate, pauses, jitter — against that
driver's own calm baseline, fuses that with two neural models (acoustic emotion + text
emotion), and produces one of three states: **Calm / Stressed / Tired**. Then it does the
thing a mood label alone can never do: it lines the stress curve up against the lap-time
curve and asks whether the voice moved *first*. When it does, the gap is warning time — and
warning time is what a strategy call is made of.

**The claim the whole dashboard is built to support, stated on screen at signage size:**
> *"The voice cracked N laps before the stopwatch."*

**The three words that define the vocabulary:** `Calm`, `Stressed`, `Tired`.
Note what is missing: *frustrated*, *angry*, *happy*. This is deliberate — see §3.

---

## 2. The problem statement

The brief asked for a system that:

1. lets you **play *or* upload** a radio clip,
2. produces a **readable transcript**,
3. produces a **mood label**,
4. gives a **simple visual showing whether mood is affecting lap performance**,
5. and lands inside the theme **Racing Strategy & Decision-Making** — i.e. the output has to
   be a *decision*, not a sentiment score.

Three of those five deliverables live in a single panel of the UI (`RadioInspector`), on
purpose: a judge working from the spec looks for them before anything the team invented.

**Why it's genuinely hard, and not a sentiment-analysis exercise:**

- **The audio is terrible.** Team radio is band-limited, compressed, clipped, and sits on top
  of a 15,000 rpm engine and 300 km/h wind noise. Pitch trackers happily lock onto engine
  harmonics. (Handled: F0 search restricted to 60–400 Hz.)
- **The clips are short.** Most transmissions are one to five seconds. Many are half a
  sentence.
- **There is no ground truth for driver state.** No team publishes driver heart rate, core
  temperature or fatigue. There is no labelled corpus of "tired F1 driver".
- **"Tired" is not an emotion.** Every public speech-emotion model's label space is emotions.
  See §3.
- **A pit wall ignores anything unreliable.** A system that changes its answer on reload, or
  that escalates on every clip, gets switched off. This drove two architectural decisions:
  the strategy layer is *deterministic rules* (not an LLM), and one of its five calls is
  explicitly **HOLD — do nothing**.

---

## 3. The core insight — why fatigue is invisible to off-the-shelf models

This is the intellectual centre of the project and should be the first "aha" beat of the
presentation.

**The setup.** You can download a speech-emotion-recognition (SER) model today and get
respectable numbers. `superb/wav2vec2-base-superb-er` is trained on IEMOCAP. RAVDESS is the
other standard corpus. Their label spaces are *emotions*: angry, happy, sad, neutral,
fearful, disgusted, surprised, calm.

**The problem.** **None of them has a `tired` class.** Fatigue is therefore not something
these models can be wrong about — it is something they cannot express. A tired driver's
audio gets projected onto the nearest emotion, usually `sad` or `neutral`. On a pit wall,
"neutral" and "the driver has nothing left" are opposite instructions.

**The insight.** Fatigue is not an emotional state, it is a **vocal-production** change. When
a person is physically spent:

- **pitch drops and flattens** (less laryngeal tension, narrower F0 range),
- **energy falls** (weaker subglottal pressure → lower RMS),
- **articulation slows** (speech rate down),
- **pauses lengthen** (more breaths per sentence → higher pause ratio),
- **jitter rises** (less stable period-to-period control).

Every one of those is measurable with classical signal processing. None of them requires a
model that has ever seen a tired person. So the architecture becomes: **let the neural models
do what they are good at (emotional arousal), and hand-engineer the branch that can see
fatigue.**

**The consequence, which is the strongest demo moment in the project.**
The dashboard ships an A/B toggle: **Naive** vs **Fusion**.

- *Naive* = argmax of the acoustic SER model, mapped onto the three classes. Because the
  mapping table has **no route to `Tired`** (Tired is pinned at a fixed 0.06 residual
  probability), the naive path is **structurally incapable of ever returning Tired.**
- *Fusion* = the three-branch model.

So flipping the toggle doesn't just move a number. It makes an entire class of driver state
appear and disappear. That is the argument for fusion, made visually, in one click. Both
paths are precomputed for every clip, so the toggle is instantaneous.

**Verified numbers on the A/B (see §7 for the caveat that matters):**
`cv_accuracy = 0.8875` (fusion, leave-one-out CV) vs `naive_accuracy = 0.4513`, over
`n_train = 853` labelled clips.

---

## 4. What the product actually does — a user's tour

The dashboard is a single page. Reading top to bottom:

**Header — three pickers and nothing else.**
Race (9 cached Grands Prix), Driver (up to 23), Scoring mode (Fusion / Naive). Plus a live
health badge fed by `/api/health` that reports whether real models are actually loaded. On
mobile the row wraps and every control keeps a 40 px hit target — switching driver is the
main interaction on the page and must never be two taps.

**Verdict hero — the answer before the evidence.**
A signage-size sentence (`"The voice cracked 3 laps before the stopwatch"`), the four numbers
behind it (peak stress + lap, pace-loss lap, correlation, n samples), the caveat attached,
plus the driver plate: portrait, full name, car number, team, hand-drawn SVG helmet in that
driver's colours, all in the team's livery colour. Re-mounts on driver change so the entrance
animation replays — that replay *is* the change confirmation.

**Race timeline — the hero chart.**
Two vertically stacked, crosshair-synced charts sharing one lap axis:
- **Pace delta** (cyan `#00d9ff`): the driver's lap time minus a centred 5-lap rolling median
  of their *own clean laps*. Positive = slower.
- **Stress index** (red `#ff0050`): 0–100, one point per scored radio call, with the mood as
  a coloured marker.
Behind both: continuous tyre-compound bands in Pirelli's own colours (red/yellow/white =
soft/medium/hard), wet-lap shading, and flag/safety-car markers. Clicking any point selects
that clip everywhere on the page.

**Track trace + conditions + tyres.**
- **Track trace**: the real circuit outline, extracted as an SVG path from the fastest race
  lap's GPS trace in the cached FastF1 position data, arc-length resampled to 460 points.
  Switching from Silverstone to Monza genuinely redraws the track. Radio calls are plotted
  *at the point on the track where they happened*.
- **Track conditions**: track temperature trace (the number nobody quotes and everybody
  needs — Silverstone 2024 swung 20.7 → 37.9 °C), air temp behind it, wet laps shaded. Drawn
  as bare SVG because it's one line and a reference rule.
- **Tyre stints**: bars sized by stint length, coloured by compound, degradation slope
  labelled **"modelled"** every single time it appears.

**Top findings — the LLM's ranked reading of the session.**
Six findings, ranked by *actionability* (not severity), each citing specific laps. The panel
carries its provenance openly: which model wrote it, which data domains it could see, its own
stated confidence, and **how many of its findings were thrown away for citing data we don't
hold**. Deliberately styled to look *different* from the strategy calls below, because it is
a different kind of claim.

**Strategy calls + lead-lag.**
- **Strategy calls**: deterministic rules firing. Same input, same output, every time.
- **Lead-lag panel**: correlation-by-lag as a signed bar chart, lags −4 … +4. The peak bar is
  emphasised; everything else recedes. This is the working behind the hero verdict.

**Scored against — the baseline panel.**
States plainly which of three references the stress score was measured against: this driver's
own calm calls, the pooled cohort, or population priors. Below it a three-zone band with a
single arrow showing where this specific call landed and how decisively.

**Signal bars.**
The three branches (prosody / acoustic / text) shown as separate contributions rather than
hidden inside one score. This is also the visual argument for fusion: *the acoustic bar
routinely disagrees with the other two on fatigue.*

**Biometrics panel.**
The second, independent stress channel — upload heart-rate data and it plots alongside voice
stress. **There is no data. The panel says so, plainly, rather than drawing a flat line at
zero.** See §13; this is the single clearest expression of the project's design ethic.

**Right sidebar — radio inspector + clip library.**
- **Radio inspector**: custom audio player, transcript, mood at headline size against a
  livery-weight bar, the stage-by-stage pipeline progress readout, upload control.
- **Clip library**: every indexed clip for this driver/session by lap, scored or not.
  Selecting an unscored one runs the real pipeline live over a WebSocket (~13 s) and streams
  each stage as it happens.

**Floating "Ask the Pit Wall".**
A grounded chat agent with 10 read-only tools over this session's own data. It names the
tools it called, so an answer can be checked rather than trusted. Feature-flagged; a 404
retires the launcher entirely rather than leaving a button that always fails.

---

## 5. System architecture

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  BROWSER — React 19 + TypeScript 6 + Vite 8 + Tailwind 3 + Recharts 3         │
│                                                                               │
│   App.tsx  ──orchestrates──▶ 26 components                                    │
│      │                                                                        │
│      ├─ api.ts   REST + WebSocket client, ApiError carries HTTP status        │
│      └─ types.ts MIRROR of backend/app/schemas.py (hand-kept in sync)         │
└──────────────┬────────────────────────────────────────────────────────────────┘
               │  /api/*  (Vite proxies /api in dev, same-origin in prod)
┌──────────────▼────────────────────────────────────────────────────────────────┐
│  FastAPI 0.115 + Pydantic 2.10 + Uvicorn 0.34  (Python 3.11/3.12)             │
│                                                                               │
│  ROUTERS         health · session · analyse · clips · biometrics               │
│                  + agent · findings   ← mounted only when GP_AGENT=1          │
│                                                                               │
│  schemas.py      730 lines. THE single source of truth for the API contract.   │
│  config.py       145 lines of plain module constants ("greppable at 2am").     │
│                                                                               │
│  ┌── PIPELINE (per clip) ──────────────────────────────────────────────────┐  │
│  │  preprocess → vad → stt → prosody → ser → text_emotion → fusion         │  │
│  │              ↳ baseline (z-scores)                                       │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│  ┌── ANALYSIS (per session) ───────────────────────────────────────────────┐  │
│  │  strategy.py  (deterministic rules)   leadlag.py  (cross-correlation)   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│  ┌── DATA ─────────────────────────────────────────────────────────────────┐  │
│  │  fastf1_client (cache-only) · laps (pace deltas) · store (clip index +   │  │
│  │  result cache) · timeline (composes the whole payload)                   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│  ┌── CONTEXT (8 modules, UTC-instant-first resolver) ──────────────────────┐  │
│  │  provider · resolver · frames · track · tyre · position · situation ·    │  │
│  │  biometrics                                                              │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│  ┌── LLM (feature-flagged, GP_AGENT=1) ────────────────────────────────────┐  │
│  │  agent.py (10 tools, tool-calling loop)   findings.py (citation gate)   │  │
│  │  groq_client.py (runtime model resolution)  agent_cache.py (TTL cache)  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────┬─────────────────────────────────┘
               │                              │
    ┌──────────▼─────────┐        ┌───────────▼──────────────┐
    │ LOCAL DISK         │        │ GROQ API (optional)      │
    │ data/cache  FastF1 │        │ openai/gpt-oss-120b      │
    │ data/clips  mp3s   │        │  → openai/gpt-oss-20b    │
    │ data/results cache │        └──────────────────────────┘
    │ data/labels weights│
    │ data/context json  │        ┌──────────────────────────┐
    │ ~/.cache/hugging…  │        │ 4 HF MODELS (local, CPU) │
    └────────────────────┘        └──────────────────────────┘
```

**There is no database.** Race data is FastF1's pickle + SQLite HTTP cache. Clip metadata is
one CSV. Analyses are JSON files on disk. Trained weights are two JSON files. This is a
deliberate choice for an offline-judged demo: nothing to start, nothing to migrate, nothing
to be down.

**Boot sequence.** `main.py`'s `lifespan` warms all models off-thread at uvicorn boot. It is
*best-effort by design*: a model that fails to load must not stop the API from starting,
because `/api/health` is exactly how you would diagnose it. Before this existed, the ~20 s
model-load bill landed on the first upload of the demo, behind a button that just said
"Analysing…".

---

## 6. The ML pipeline, stage by stage

Eleven stages, each emitted as a `ProgressEvent` over the WebSocket so a judge can watch it
run:

`RECEIVED → PREPROCESS → VAD → STT → PROSODY → ACOUSTIC → TEXT → FUSION → ALIGN → DONE`
(plus `ERROR`)

**A subtlety worth putting on the presentation site, because it shows the team understood the
models rather than just chaining them:**
> **Prosody runs on speech-only (post-VAD) audio. STT and the acoustic SER model get the
> *full, untrimmed* clip.** Whisper uses surrounding context to decode, and the emotion model
> was trained on whole utterances. Feeding either a VAD-trimmed clip degrades it. Feeding
> prosody the untrimmed clip poisons the pause and rate features with dead air.

### 6.1 Preprocess — `pipeline/preprocess.py` (84 lines)

- Resample to `TARGET_SR = 16_000` Hz mono.
- **RMS normalise to a fixed target** so energy features are comparable across clips recorded
  at different broadcast levels. Without this, `rms_mean` measures the broadcast mixer, not
  the driver.
- Duration guards: `MIN_CLIP_SECONDS = 0.4` (raises `AudioTooShort`), `MAX_CLIP_SECONDS = 30.0`.

### 6.2 VAD — `pipeline/vad.py` (173 lines)

- **Model:** `istupakov/silero-vad-onnx`, file `silero_vad_16k_op15.onnx`. Silero v5, run
  through **onnxruntime, not torch**.
- **Why not pyannote:** `pyannote/segmentation-3.0` is a gated model on Hugging Face. A
  gated model means a token, and a token means the offline setup can fail at the venue.
- **The bug that matters, and it's a great slide:** Silero v5 needs a **576-sample window**
  (`HOP = 512` + `CONTEXT = 64`). Feed it a bare 512 and *it runs without error and returns
  near-zero speech probability on obvious speech.* A silent wrong answer. The constants are
  named and commented for exactly this reason.
- Params: `SPEECH_THRESHOLD = 0.5`, `PAD_MS = 96`, `MAX_GAP_MS = 320`, `MIN_SPEECH_MS = 120`.
- Degrades gracefully: if VAD fails, the pipeline continues on untrimmed audio rather than
  dying.
- Outputs `speech_ratio`, which becomes the prosody `pause_ratio` feature.

### 6.3 STT — `pipeline/stt.py`

- **Model:** `distil-whisper/distil-small.en`.
- English-only (`.en` suffix) models **reject the `task` and `language` kwargs** — passing
  them is an error, which is why they aren't passed.
- Requests word-level timestamps; falls back to plain decode with a warning when they're
  unavailable. Output: `Transcript { text, words[], language, duration_s }`.

### 6.4 Prosody — `pipeline/prosody.py` (115 lines) — **the fatigue-capable branch**

Eight features:

| Feature | What it measures | Fatigue direction |
|---|---|---|
| `f0_mean` | mean fundamental frequency (pitch) | ↓ |
| `f0_std` | pitch variability / range | ↓ (flatter) |
| `rms_mean` | vocal energy | ↓ |
| `rms_std` | energy variability | ↓ |
| `speech_rate` | articulation rate over **spoken time only** | ↓ |
| `pause_ratio` | from the VAD speech ratio of the **original** clip | ↑ |
| `jitter` | mean absolute period-to-period F0 variation, normalised | ↑ |
| `spectral_centroid` | brightness / spectral tilt | ↓ |

Implementation notes worth quoting:
- **`F0_MIN, F0_MAX = 60.0, 400.0`** — a hard band that rejects engine harmonics. Without it
  the tracker locks onto the car.
- Uses **`librosa.pyin`**, not `piptrack`. Slower, but robust on band-limited radio.
- **Articulation rate is computed over spoken time only**, not clip duration. Rate over total
  duration is a pause measure wearing a rate's name.
- **Unmeasurable features are OMITTED, never zero-filled.** This is load-bearing: a pitch of
  0 Hz z-scores to a huge negative deviation, which reads as *extreme fatigue*. A zero-fill
  here would fabricate the project's headline finding.

### 6.5 Acoustic SER — `pipeline/ser.py`

- **Model:** `superb/wav2vec2-base-superb-er` (IEMOCAP-trained, 4-class).
- Its emotion posterior is projected onto a 0–100 **stress weight**:

| Label | Weight |
|---|---|
| ang / angry | 95 |
| fea / fear | 85 |
| dis / disgust | 70 |
| sad | 60 |
| sur / surprise | 55 |
| hap / happy | 25 |
| neu / neutral | 15 |
| calm | 5 |
| *unmapped* | `DEFAULT_WEIGHT = 40.0` + a logged warning |

### 6.6 Text emotion — `pipeline/text_emotion.py`

- **Model:** `j-hartmann/emotion-english-distilroberta-base`, run over the Whisper transcript.
- Same projection idea, different table: anger 90, fear 85, disgust 70, sadness 65,
  surprise 45, neutral 15, joy 10.
- Plus **domain keyword cues**, because generic emotion models don't know racing:
  - `FATIGUE_CUES` = "nothing left", "can't keep", "how many laps", "exhausted", "i'm done",
    "no more", "struggling", "hanging on", "dying"
  - `STRESS_CUES` = "come on", "unbelievable", "what the", "not fair", "he pushed",
    "dangerous", "no grip", "losing", "box box", "damage", "he hit"
- `CUE_BONUS = 12.0`, with the design rule stated in the source: **"a keyword nudges, it does
  not decide."**

### 6.7 Fusion — `pipeline/fusion.py` (234 lines)

Feature vector, **positional and it must match the stored head exactly**:

```
(f0_mean_z, f0_std_z, rms_mean_z, speech_rate_z, pause_ratio_z, jitter_z,
 acoustic_score, text_score)
```

Six z-scored prosody features + the two model scores = 8 inputs → multinomial logistic
regression → 3 class probabilities.

**Stress index** (the 0–100 number on the chart):
```
stress_index = 100 * (P(Stressed) + 0.9 * P(Tired))
```
Note the consequence, which the UI is careful about: **Tired and Stressed both push the index
high**, so a reading of 60 is ambiguous on its own. That's why the baseline band draws its
arrow from the *probabilities*, not from `stress_index`.

**The naive path.** `NAIVE_MAP` projects the acoustic model's argmax onto the three classes,
and **has no route to `TIRED`** — Tired receives a fixed 0.06 residual. It cannot fire. This
is the point.

**Fallbacks.** If no trained head is on disk, `_rule_based()` computes arousal / fatigue /
agitation from the z-scores and softmaxes hand-written logits, so the app still works — and
`MoodResult.fitted` stays `False` so the UI can't claim a trained model it doesn't have.

**A documented bug fix worth a slide.** scikit-learn's binary convention stores a *single*
coefficient row that scores `classes_[1]`. Code that assumed one row per class therefore
scored every clip as `classes_[0]` **at 100% confidence** — a wrong answer delivered with
total certainty. The fix is an explicit branch, and the comment explaining it survives in the
source.

### 6.8 Align

Attach lap number and session context to the result, cache it to `data/results/<clip_id>.json`.

### 6.9 Prosody score for display

`run.py`'s `_prosody_score()` averages the **absolute** z-deviations of 5 features, × 40,
capped at 100. Absolute is deliberate: fatigue pushes some features down and agitation pushes
others up, and a signed average lets them **cancel to zero** — a driver who is simultaneously
exhausted and furious would read as perfectly calm.

### 6.10 Model loading — `pipeline/models.py` (108 lines)

Lazy `functools.lru_cache` loaders for `stt()`, `ser()`, `text_emotion()`. `_warm_audio_stack()`
pays the librosa import and numba JIT cost on synthetic audio at boot. Honours
`local_files_only` when `OFFLINE_MODE` is set. `warm()` returns *which* components loaded, so
health reporting is truthful rather than binary.

**Cold-start timings:** first uploaded clip ≈ **13 s**; subsequent ≈ **8 s**; cached clips are
instant (microseconds — they're read from JSON).

---

## 7. The fusion head — real trained weights

Trained by `backend/scripts/fit_fusion.py`, stored at `data/labels/fusion_head.json`
(committed to the repo — it's not regenerable without the labels).

**Training setup, verified from source:**
- `sklearn.linear_model.LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced")`
- Multinomial, 3 classes
- Validation: **`LeaveOneOut` via `cross_val_predict`** (i.e. 853-fold CV)
- Refuses to fit with fewer than 15 labelled clips; warns loudly if only two classes are present

**Metrics as stored in the file:**

| Field | Value |
|---|---|
| `n_train` | **853** |
| `cv_accuracy` (fusion, LOO-CV) | **0.8875 → 88.75 %** |
| `naive_accuracy` (acoustic argmax) | **0.4513 → 45.13 %** |
| Improvement | **+43.6 points** |
| `classes` | `["Calm", "Stressed", "Tired"]` |

**The actual trained coefficient matrix** (a nice artifact to show — these are real numbers
from a real file, not a diagram):

| class | f0_mean_z | f0_std_z | rms_mean_z | speech_rate_z | pause_ratio_z | jitter_z | acoustic_score | text_score | intercept |
|---|---|---|---|---|---|---|---|---|---|
| **Calm** | −0.544 | +0.522 | +0.052 | 0.000 | −0.059 | −0.413 | **−4.080** | **−4.342** | +3.664 |
| **Stressed** | +1.011 | +0.815 | +0.181 | 0.000 | −0.166 | −0.288 | **+5.263** | −1.770 | −2.457 |
| **Tired** | −0.466 | −1.337 | −0.233 | 0.000 | +0.225 | **+0.701** | −1.182 | **+6.112** | −1.207 |

**How to read it honestly** — and the presentation should say this, because a judge who reads
the table will notice:
- The **Tired** row is exactly the fatigue signature the hypothesis predicted for the prosody
  features: pitch variability down (−1.337), energy down (−0.233), pauses up (+0.225),
  **jitter up (+0.701, the largest positive prosody weight for any class)**.
- **Stressed** is dominated by the acoustic model (+5.263), which is precisely what an
  IEMOCAP-trained SER model is good at. The division of labour the architecture assumed is
  visible in the fitted weights.
- **Tired is dominated by `text_score` (+6.112)**, not by prosody. The transcript's
  `FATIGUE_CUES` are doing most of the work. So the accurate claim is *"fatigue is recovered
  by the two branches an acoustic-only model doesn't have — prosody **and** language"*, not
  *"prosody alone finds fatigue."* Prosody contributes the right-signed evidence; language
  carries the decision. **Do not overclaim prosody on the slide.**
- **`speech_rate_z` has a coefficient of exactly 0.000 in all three rows.** That feature is
  effectively dead in this fit. Worth acknowledging rather than hiding — see §21.

### ⚠️ The caveat that must accompany the 88.75 %

**The 853 training labels were not produced by humans.** `data/clips/index.csv` has an
`annotator` column and it is **empty for all 855 rows**. The labels were written by
`backend/scripts/auto_label.py`, whose own docstring says:

> *"No human listening. No external API. The HF models do the labelling."*

It reads `fusion.mood` out of each cached result JSON (produced by the **rule-based** fusion
fallback) and writes it back into `index.csv` as the label. `fit_fusion.py` then trains on
those.

So the precise, defensible statement is:

> **88.75 % is leave-one-out cross-validated accuracy at reproducing the labels generated by
> the rule-based fusion of four models. It is a distillation/agreement figure, not accuracy
> against human ground truth.**

And correspondingly:

> **45.13 % is how often the acoustic-only path agrees with that same target.** The 43-point
> gap remains a *real and meaningful* result — it demonstrates that a single acoustic model
> cannot reproduce a three-class judgement that includes fatigue, which is exactly the thesis
> — but it is a statement about *model agreement*, not about human-validated truth.

An interactive labelling tool **does** exist (`scripts/label_clips.py` — browser UI on port
5050, keys `1`=Calm `2`=Stressed `3`=Tired `s`=skip, saves on every keypress, supports
multiple annotators writing to separate CSVs). It was built. It was not used for this label
set. **Presenting this openly is stronger than being caught on it**, and it fits the
project's whole ethic (§19). Suggested framing for the site: *"the labels are model-generated,
the tool for human labels is built and ready, and human validation is the first item on the
roadmap."*

---

## 8. Per-driver calibration (baselines)

`pipeline/baseline.py` (152 lines). Stored at `data/labels/driver_baselines.json`.

**The problem it solves:** drivers have different voices. Some are simply loud. An absolute
pitch or energy threshold labels a naturally loud driver as permanently stressed and a quiet
one as permanently calm. That's not a model, it's a microphone.

**The mechanism:** every prosody feature is **z-scored against that driver's own
Calm-labelled clips**. The score is therefore *"loud for them"*, not *"loud"*.

**Three-tier fallback chain, and the tier in use is always reported:**

| `source` | Meaning |
|---|---|
| `driver` | This driver's own Calm calls (needs ≥ `MIN_BASELINE_CLIPS = 3`) |
| `cohort` | The pooled cohort (`COHORT_KEY = "__cohort__"`) — too few Calm calls for this driver |
| `prior` | Hard-coded population priors — nothing individually calibrated |

**`DriverBaseline.source` is a required field on the API response**, so the UI physically
cannot claim "calibrated to this driver" when it's running on priors. The `Baseline` panel in
`App.tsx` writes three different sentences for the three cases.

**`POPULATION_PRIOR` — the actual shipped values** `[mean, sd]`:

| Feature | mean | sd |
|---|---|---|
| f0_mean | 125.0 | 35.0 |
| f0_std | 28.0 | 14.0 |
| rms_mean | 0.095 | 0.030 |
| rms_std | 0.050 | 0.020 |
| speech_rate | 4.2 | 1.1 |
| pause_ratio | 0.25 | 0.15 |
| jitter | 0.020 | 0.012 |
| spectral_centroid | 1800.0 | 500.0 |

**Coverage as shipped:** `driver_baselines.json` holds **21 keys** — 20 driver baselines
(ALB ALO BOT GAS HAM HUL LEC MAG NOR OCO PER PIA RIC RUS SAI SAR STR TSU VER ZHO) plus
`__cohort__`. Three drivers appearing in the clip index (COL, DEV, LAW) have **no individual
baseline** and fall back down the chain.

---

## 9. The deterministic strategy layer

`pipeline/strategy.py` (166 lines). **No LLM. Pure rules.** The reason is stated in the
module docstring and is a good quote for the site: a pit wall that changes its answer on
reload gets ignored.

**Thresholds:**
```
STRESS_ELEVATED   = 60.0    # stress index above which a call can trigger
SUSTAINED_LAPS    = 3       # consecutive laps needed to count as sustained
PACE_WORSENING    = 0.03    # s/lap slope that counts as losing time
PACE_STABLE       = 0.02    # s/lap slope that counts as holding
RADIO_BURST_WINDOW= 6       # laps
RADIO_BURST_COUNT = 3       # calls in that window = saturated
```

**The five calls, with exact headlines and urgencies:**

| Code | Headline (verbatim) | Urgency | Fires when |
|---|---|---|---|
| `HOLD` | **HOLD — driver venting, pace unaffected** | info | Stress elevated, pace stable |
| `BOX_NOW` | **BOX THIS LAP — driver degradation confirmed** | critical | Sustained stress **and** pace worsening |
| `PIT_WINDOW_OPENING` | **PIT WINDOW OPENING — fatigue ahead of tyre cliff** | warning | Fatigue signal before the modelled tyre cliff |
| `MONITOR` | **MONITOR — stress rising** | info | Stress trending up, not yet sustained |
| `REDUCE_RADIO_LOAD` | **REDUCE RADIO LOAD — driver is saturated** | warning | ≥3 calls in a 6-lap window |

**The design decision to put on a slide, quoting the source docstring:**
> *"The most important rule here is HOLD… Knowing when not to act is most of race strategy,
> and a system that only ever escalates is a system the pit wall learns to ignore."*

That sentence is the difference between a demo and a product, and it is the single best
answer to "why should a race engineer trust this?"

---

## 10. Lead-lag: does the voice move before the stopwatch?

`pipeline/leadlag.py` (132 lines). This is the mechanism behind the hero verdict.

**What it computes.** Cross-correlation between the **stress series** and the **pace-delta
series** across lag offsets `LEAD_LAG_RANGE = range(-4, 5)` — i.e. −4 … +4 laps. A
**negative peak lag means stress moved first**, which is the whole claim: the signal is
*predictive*, not merely *descriptive*.

**Guards, all of them load-bearing:**
- `MIN_PAIRS = 4` — fewer usable lap-pairs than that and no coefficient is computed at all.
- Pairs are formed on **clean laps only** (see §11.2 for what "clean" excludes).
- `MIN_SAMPLES_FOR_SIGNIFICANCE = 25` — below this, `is_significant` stays `False` and the
  interpretation string reads *"Indicative only — N clips in this session."* rather than
  *"Based on N clips."*
- **`LeadLagPoint.correlation` is `Optional[float]` and is `None` when unmeasurable, never
  `0.0`.** Reason, from the source: coercing unmeasurable lags to 0.0 previously let the
  peak-picker select a fabricated data point, producing the headline *"stress peaks N laps
  before pace loss (r = 0.00)"*. The peak is now picked among **measured lags only**.
- Four distinct interpretation strings, including an explicit *"no positive relationship at
  any offset"* case. The panel can say the finding isn't there.

### ⚠️ The honest result, and it must be on the site

`SETUP.md` contains the team's own measured summary, and it is refreshingly blunt:

> *"Lead-lag is computed **per driver, per session** — not across the whole dataset… it
> spreads to only 5–13 clips per driver, which is 5–11 usable lap-pairs.*
> *At full coverage, measured: **11 of 36 driver/session pairs show a negative peak** (stress
> first), and **none clear the significance floor**. The highest correlations sit on the
> fewest pairs — the classic small-sample signature.*
> *The code says so itself… Don't paper over that; the guard firing correctly is a better
> result than a green tick."*

(That "36 pairs" figure is from the 446-clip era; the index now holds **164 driver/session
pairs**, most with very few clips. The qualitative conclusion is unchanged and if anything
better supported: the effect is directionally present in a minority of pairs and does not
reach the project's own significance floor.)

**Best demo pairs** (from `SETUP.md`, most lap-pairs first):

| Session | Driver | Clips | Peak lag | r |
|---|---|---|---|---|
| 2023-dutch-r | **ALO** | 13 | **−3** | 0.31 |
| 2023-dutch-r | VER | 11 | −2 | 0.18 |
| 2023-dutch-r | HUL | 10 | −4 | 0.48 |

**How the presentation should frame this.** The correct story is *not* "we proved voice
predicts lap time." It is:

> *"We built the instrument that can measure it, and we built it so it refuses to overclaim.
> On this dataset the effect appears in a minority of driver/session pairs and does not clear
> our own significance floor — so the dashboard says 'indicative only', in the interface's own
> voice. The significance guard firing correctly is the result."*

That is a far stronger position in front of technical judges than a green tick nobody
believes, and it is the thesis of §19 made concrete.

---

## 11. The race-context layer

**Eight modules in `backend/app/context/`, entirely absent from `README.md` and
`SOLUTION.md`.** This is one of the largest pieces of undocumented work in the project and
deserves real space on the presentation site.

**What it's for.** A transcript alone leaves the engineer guessing what the driver was
reacting to. This layer answers: *which corner, how fast, what tyres, what the track was
doing, and who was around them* — resolved from the radio call's **exact broadcast UTC
timestamp**.

### 11.1 The modules

| Module | Lines | Job |
|---|---|---|
| `__init__.py` | — | Documents the layering |
| `provider.py` | 147 | Provider seam: `CachedRaceContextProvider` today, `LiveRaceContextProvider` later |
| `resolver.py` | 207 | `SessionFrames`, `lap_at()`, `_phase()`, `resolve_at()` — the UTC-instant resolver |
| `frames.py` | 86 | Loads and caches the per-session dataframes |
| `track.py` | 151 | Air/track temperature, rainfall, grip proxy, track evolution curve |
| `tyre.py` | 168 | Modelled tyre state: compound, age, stint, degradation slope, cliff |
| `position.py` | 173 | Intra-lap track position + telemetry (speed, throttle, brake, gear) |
| `situation.py` | 216 | Race position, gaps, race-control flags, traffic |
| `biometrics.py` | 209 | Heart-rate ingestion and alignment |

### 11.2 Details worth putting on slides

**The UTC-instant-first design.** `data/clips/index.csv` has a `notes` column that carries the
radio transmission's **ISO-8601 UTC timestamp** (e.g. `2024-07-07T13:22:02.763Z`). **100 of
the 855 clips have a blank `lap` field** — the resolver recovers their lap number from the
timestamp. Without it, those clips could not be placed in the race at all.

**The three-time-columns trap (excellent slide material).** FastF1 telemetry carries three
time columns:

| Column | Meaning |
|---|---|
| `Date` | **absolute UTC** ← this is the one to match on |
| `SessionTime` | time since session start |
| `Time` | **resets every lap** |

The source comment records the failure mode: matching the wrong one *"silently clamps every
lookup to the last sample of the lap."* No exception, no warning — every radio call just
reports the telemetry from the end of its lap. A silent wrong answer, caught by verification
rather than by a crash.

**Verified-against-reality checks, baked into the source as comments:**
- `situation.py` gaps were verified against **2024 British GP lap 41**: HAM leading,
  NOR +2.338 s, VER +5.636 s.
- `track.py` records that Silverstone 2024 track temperature ranged **20.7 – 37.9 °C**.

**`tyre.py` opens with the sentence that defines the project's relationship to data:**
> ***"There is no public source of real F1 tyre data."***

Surface temperature, pressure and wear percentage are measured by every team and published by
none. So every tyre number in this app is **inferred** from the three things F1 *does*
publish: which compound, how many laps old, and what the lap times did. And therefore:

> **`TyreState.basis` is a constant string `"modelled"`, not a boolean flag.** The source
> comment explains why: *a flag can be forgotten.* A constant cannot be set wrong. Every tyre
> figure in the UI is labelled "modelled" every time it appears, because the label is
> structurally impossible to omit.

**Cliff detection is deliberately incomplete rather than guessed.** `TyreState.past_cliff` is
left `None` in the timeline path, with the comment: *"`past_cliff=False` would assert we
checked."*

**Context is optional everywhere.** If `scripts/build_context.py` hasn't been run, every
context field is `None` and the dashboard renders exactly as it did before the layer existed.
Absent context is never an error.

### 11.3 Lap and pace computation — `data/laps.py` (146 lines)

**Pace delta** = lap time minus a **centred rolling median (`BASELINE_WINDOW = 5`) of that
driver's own clean laps**, interpolated across excluded laps. Per-driver, per-session — never
compared to the field.

**`_is_clean()` excludes:** unset laps, in-laps and out-laps (any lap with `PitInTime` or
`PitOutTime`), any lap not purely green (`TrackStatus` set ≠ `{"1"}`), and steward-deleted
laps.

**`TRACK_STATUS_MEANING`:** `1`→green, `2`→yellow, `3`→unknown, `4`→safety car, `5`→red,
`6`→VSC, `7`→VSC ending.

`pace_trend()` = polyfit slope over a 3-lap window — this is what feeds `PACE_WORSENING`.

**A documented crash fix:** a `pd.NA` lap number *"surfaced as a bare 500 on `/api/timeline`
and froze the dashboard on 'Loading session…'"*. Fixed and commented.

### 11.4 One more fix worth mentioning

`data/timeline.py`'s `_situation_by_lap()` computes position/gaps/flags for **every lap**.
Previously they came only from clip contexts, which left them populated on *2 to 11 laps out
of 70* — which made the findings prompt's flags column look empty and stopped the chart from
ever showing race context. Same for `_tyre_for_lap()` and `_track_for_lap()`: they prefer the
resolved clip context and fall back to per-lap / session-evolution data, so compound bands
and rain overlays are **continuous** rather than appearing only on the handful of laps that
happen to have a radio call. Gaps in a band read as missing data, not as a design choice.

---

## 12. The agent layer (chat) and the findings layer (LLM briefing)

Both are behind **`GP_AGENT=1`** and both need a Groq key, so they are absent *together* —
rather than one 404-ing and the other 500-ing.

### 12.1 Model resolution — `groq_client.py` (82 lines)

```
GROQ_MODEL_CANDIDATES = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]
```

`resolve_model()` **asks the Groq platform what it currently serves, once per process**, and
picks the first available candidate. Raises `GroqUnavailable` if none are.

**Why this exists, and it's a genuinely good engineering story:** Groq retires models with no
notice. It **broke this app twice**. Every Llama chat model the project originally used
(`llama-3.3-70b-versatile` among them) has since been removed from the platform. Hardcoding a
model id is therefore a time bomb; resolving at runtime is the fix.

**Two models were evaluated and explicitly rejected**, with the reasons in the source:
- `groq/compound` and `compound-mini` — they have **built-in web search**, so they would
  answer from the internet. That is *"exactly the failure mode this app is built to avoid"*:
  the entire point is that every claim is grounded in this session's own measured data.
- `qwen/qwen3.6-27b` — fails `tool_choice` forcing, which the findings layer depends on.

`GroqUnavailable` maps to HTTP **503, not 500** — "the service is unavailable" is a different
statement from "we crashed", and the frontend treats them differently.

### 12.2 Chat agent — `routers/agent.py` (627 lines)

`POST /api/agent/ask`. A tool-calling loop, `tool_choice="auto"`, up to
`AGENT_MAX_ITERATIONS = 5` turns, `AGENT_TEMPERATURE = 0.1`, `AGENT_MAX_TOKENS = 1024`.

**Ten read-only tools** (README says five — the five extra ones are the race-context tools
added with that layer):

| # | Tool | Returns |
|---|---|---|
| 1 | `get_stress_series` | Stress index by lap |
| 2 | `get_lap_deltas` | Pace delta by lap |
| 3 | `get_transcript` | Transcript for a clip / lap |
| 4 | `find_stressed_moments` | Laps above the stress threshold |
| 5 | `get_lead_lag_info` | The correlation-by-lag analysis |
| 6 | `get_session_summary` | Session-level overview |
| 7 | `get_track_conditions` | Air/track temp, rainfall, grip |
| 8 | `get_tyre_state` | Modelled compound / age / degradation |
| 9 | `get_clip_context` | Corner, speed, telemetry at the call |
| 10 | `get_race_situation` | Position, gaps, flags, traffic |

**Performance detail:** `_timeline()` is memoised with `functools.lru_cache(maxsize=64)`,
because one question typically triggers 3–4 tool calls and each would otherwise rebuild the
entire timeline from scratch.

**Caching:** responses go into an in-memory TTL cache (`routers/agent_cache.py`, 90 lines) —
`AGENT_CACHE_TTL_SECONDS = 3600`, `AGENT_CACHE_MAX_SIZE = 1000`.

**The system prompt** (`agent_config.py`, 199 lines) has explicit `CRITICAL RULES`,
`TYRE DATA`, `RADIO PHASE` and `STYLE` sections. The tyre section forces the model to describe
tyre figures as modelled. The radio-phase section exists because of the problem in §12.3.

**The UI contract:** the chat names the tools it called for each answer, so a judge can check
the answer rather than trust it.

### 12.3 Findings layer — `pipeline/findings.py` (718 lines) + `routers/findings.py`

`GET /api/findings/{session_id}` → six ranked, lap-cited findings about the session.

**`build_context_block()`** renders a fully **deterministic** prompt — same session in, same
prompt out. Its sections:
`HOW TO READ THIS DATA` (a legend) · race length · circuit corners · `STRESS CALIBRATION` ·
`TRACK AND WEATHER` · `TYRE STINTS` · `DATA CAVEATS` · `PER-LAP DATA` (a table) · radio split
by phase (`racing` / `pre_race` / `post_race` / `unknown`) · `DETERMINISTIC STRATEGY CALLS` ·
`STRESS/PACE LEAD-LAG` · `DRIVER BIOMETRICS`.

**`validate()` — the citation gate. This is the best single slide in the LLM section.**
Every finding must cite laps that exist in the data we actually hold. Findings that cite
unknown laps, or that cite no lap at all, are **dropped**. Remaining ranks are renumbered
contiguously. And then:

> **`FindingsResponse.dropped_findings` is returned to the client and displayed in the UI.**
> The system publishes its own LLM's failure rate. It is not swallowed.

**`_phase_conflicts()`** — a specific, memorable failure the team found and fixed:
> Hamilton's **2024 British GP victory radio** — the emotional, shouting, just-won-my-home-race
> transmission — scored **97.6 "Stressed"** and was filed against **lap 52**. Acoustically it
> is indistinguishable from acute distress. Contextually it is the opposite. So radio is now
> tagged by phase (`racing` / `pre_race` / `post_race`) and the prompt is told not to read
> post-race elation as in-race stress.

This is an outstanding beat for the presentation: it's concrete, it's funny, it's a real
limitation of acoustic emotion recognition, and the fix is contextual reasoning rather than a
bigger model.

**Token budgeting — real engineering against a real free-tier limit:**
```
FINDINGS_MAX_TOKENS       = 4000
GROQ_TPM_LIMIT            = 8000     # tokens per minute, free tier
GROQ_TPM_MARGIN           = 700
FINDINGS_MIN_TOKENS       = 1400
FINDINGS_REASONING_EFFORT = "low"
FINDINGS_TEMPERATURE      = 0.2
FINDINGS_TARGET_COUNT     = 6
FINDINGS_RETRY_COUNTS     = [4, 3]   # retry ladder: 6 → 4 → 3 findings
```
- `estimate_tokens()` uses **3.2 chars/token — deliberately pessimistic**, because
  underestimating means a hard rate-limit failure mid-demo.
- `_looks_truncated()` and `_looks_rate_limited()` sniff the error and response shape.
- `_laps_worth_showing()` produces a **compact** context block for retries, so the retry
  actually fits in a smaller budget rather than failing the same way.

**Caching:** 1-hour cache, shared with the chat agent. A `?refresh=true` query bypasses it —
that's what the panel's "regenerate" button sends.

---

## 13. Biometrics — the deliberately empty channel

`POST /api/biometrics`, `GET /api/biometrics/{session_id}` (`routers/biometrics.py`, 116 lines
+ `context/biometrics.py`, 209 lines). Deliberately **not** behind `GP_AGENT`: it is a data
path, not an LLM feature, and must work in an offline deployment with no Groq key.

**The rationale**, straight from the panel's docstring:
> *"Stress in this app is read from the driver's voice. Heart rate would be an independent
> measurement, and two independent signals agreeing is evidence where one is a hypothesis.
> This is the path for getting real data in."*

**`data/biometrics/` is empty. There is no biometric data.** And:

> *"The empty state says so plainly rather than drawing a flat line at zero. That is the whole
> reason this panel is honest: a fabricated heart-rate trace sitting beside a measured track
> temperature is indistinguishable from a measurement, and the rest of this dashboard is
> built on not doing that."*

Nothing is ever synthesised: a missing file yields `None`, and the UI says "no biometric
data". The endpoint returns **404 on missing data rather than an empty series** — an empty
series is a claim that we looked and there was nothing, which is a different statement.

**This is the single best slide for the "engineering ethics" section of the presentation.** A
finished-looking panel that refuses to draw is a harder thing to build than a fake one, and
it is the clearest possible demonstration of the project's design ethic.

---

## 14. Complete API surface

Base: `http://localhost:8000`. Interactive docs at `/docs`. All app routes are prefixed
`/api`.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/` | `{service, version, docs}`. Excluded from the OpenAPI schema. |
| `GET` | `/api/health` | → `HealthResponse` |
| `GET` | `/api/sessions` | → `SessionMeta[]`. **503** if no sessions are cached. |
| `GET` | `/api/timeline/{session_id}?driver=&mode=` | → `Timeline`. The main payload. |
| `GET` | `/api/laps/{session_id}?driver=` | → `Lap[]`. **501** under fixtures. |
| `POST` | `/api/analyse` | multipart: `file`, `driver`, `session_id`, `lap?` → `ClipAnalysis` |
| `WS` | **`/api/analyse/ws`** | ← `{"clip_id": "..."}`, → stream of `ProgressEvent`, then `{"stage":"done","result":ClipAnalysis}` |
| `GET` | `/api/clips/library?session_id=&driver=` | → `ClipSummary[]` — every indexed clip, scored or not |
| `GET` | `/api/clips/{clip_id}` | streams the audio file |
| `GET` | `/api/clips` | full clip list |
| `POST` | `/api/biometrics` | multipart: `file`, `session_id`, `driver` → `BiometricSeries` |
| `GET` | `/api/biometrics/{session_id}?driver=` | → `BiometricSeries`. **404** when none. |
| `POST` | `/api/agent/ask` | 🔒 `GP_AGENT=1`. Tool-calling chat. **503** on `GroqUnavailable`. |
| `GET` | `/api/findings/{session_id}?driver=&mode=&refresh=` | 🔒 `GP_AGENT=1` → `FindingsResponse` |

> ⚠️ **`SOLUTION.md` says the WebSocket is at `/api/analyse/stream`. It is not. It is
> `/api/analyse/ws`.** Both `api.ts` and `analyse.py` agree on `/ws`.

**Upload limits:** `MAX_UPLOAD_BYTES = 25 MB` on the backend (returns **413**);
`VALIDATION.AUDIO_MAX_SIZE_MB = 10` on the frontend; accepted MIME types
`audio/mpeg, audio/mp3, audio/wav, audio/ogg`. Other status codes from `/api/analyse`: **400**
(bad audio), **422** (too short), **500** (pipeline failure). The pipeline runs via
`asyncio.to_thread` so it never blocks the event loop.

**`POST /api/analyse` deliberately has no fixture branch.** The old default of
`USE_FIXTURES="1"` meant the endpoint returned canned data **without reading the uploaded
file at all** — the demo's live-upload proof was fake and nobody could tell. The default is
now `"0"` and the route has no fixture path.

**HTTP status conventions the frontend depends on** (this is a nice "the contract is the
design" point):
- **404** = *this feature is switched off* → the component hides itself entirely
  (`findingsAvailable` is set `false` and never re-armed; `PitWallChat` retires its launcher).
- **503** = *the feature is on but currently unavailable* — missing key, retired model, rate
  limit — and that distinction is shown to the user rather than flattened into "something
  went wrong".
- **501** on `/api/laps` under fixtures = "not implemented in this mode", not "broken".

### Key schema shapes

`schemas.py` is **730 lines** and is the single source of truth; `frontend/src/types.ts`
mirrors it by hand. The file ends with `TimelinePoint.model_rebuild()` and
`Timeline.model_rebuild()` because FastAPI builds the OpenAPI schema at import time and the
forward references must be resolved by then.

**Enums:** `Mood` = Calm | Stressed | Tired · `ScoringMode` = fusion | naive ·
`Urgency` = info | warning | critical ·
`PipelineStage` = received | preprocess | vad | stt | prosody | acoustic | text | fusion |
align | done | error.

**The `Timeline` object** — one request, everything the page needs:
```
Timeline {
  session: SessionMeta          driver: str            mode: ScoringMode
  points: TimelinePoint[]       # per lap: delta_s, stress_index, mood, clip_id,
                                #          track, tyre, situation
  clips: ClipAnalysis[]         # only clips with a cached analysis
  strategy_calls: StrategyCall[]
  lead_lag: LeadLagAnalysis
  baseline: DriverBaseline | null
  session_context: SessionContext | null
  clip_contexts: {clip_id: ClipContext}
  biometrics: BiometricSeries | null
}
```

**`ClipAnalysis`** carries **both** scored paths so the A/B toggle is free:
```
ClipAnalysis { clip_id, session_id, driver, lap?, duration_s, transcript,
               signals: SignalBreakdown{prosody, acoustic, text},
               fusion: MoodResult, naive: MoodResult }
```

**`ProgressEvent` has no `status` field** — and the frontend documents the consequence: a
stage is emitted when it *starts* (`run.py` calls `emit()` **before** doing the work), so
completion is *inferred* (a stage is done once a later stage arrives), and `elapsed_ms` is
cumulative from socket open, so per-stage duration is the difference between consecutive
events.

**Full model list in `schemas.py`:** `Mood`, `ScoringMode`, `Urgency`, `Word`, `Transcript`,
`ProsodySignal`, `AcousticSignal`, `TextSignal`, `SignalBreakdown`, `MoodResult`,
`ClipSummary`, `ClipAnalysis`, `Lap`, `SessionMeta`, `StrategyCall`, `LeadLagPoint`,
`LeadLagAnalysis`, `TimelinePoint`, `DriverBaseline`, `Timeline`, `PipelineStage`,
`ProgressEvent`, `HealthResponse`, `TrackConditions`, `TyreState`, `TrackPosition`,
`RaceControlEvent`, `RaceSituation`, `BiometricSample`, `BiometricPoint`, `BiometricSeries`,
`ClipContext`, `StintSummary`, `TrackEvolutionPoint`, `SessionContext`, `Finding`,
`FindingsResponse`.

### `/api/health` — the demo-morning check

`routers/health.py` reports all **four** models (STT, SER, text, **and VAD**) by checking
`~/.cache/huggingface/hub/models--<id>` **by path** — fast enough to poll. Then:
```
offline_ready = all(models_present) and sessions_cached
status        = "ok" | "degraded"
```
`offline_ready: true` is literally the one-line check on the morning of the offline round.

---

## 15. Frontend architecture — every component

**Stack** (`frontend/package.json`, exact):

| Package | Version |
|---|---|
| react / react-dom | `^19.2.8` |
| recharts | `^3.10.1` |
| typescript | `~6.0.2` |
| vite | `^8.2.0` |
| @vitejs/plugin-react | `^6.0.4` |
| tailwindcss | `^3.4.19` |
| postcss / autoprefixer | `^8.5.26` / `^10.5.4` |
| oxlint | `^1.75.0` (linter — not ESLint) |
| playwright | `^1.62.1` (used by `src/shot.mjs` for screenshots) |
| @types/node | `^24.13.3` |

Scripts: `dev` → `vite` · `build` → `tsc -b && vite build` · `lint` → `oxlint` · `preview`.

**Notable TS config detail:** `erasableSyntaxOnly` is on, which **forbids constructor
parameter properties** — that's why `ApiError` declares and assigns `readonly status` by hand.

### 15.1 `App.tsx` (696 lines) — state and layout

**State**: `mode`, `sessions`, `sessionId`, `driver` (defaults `'HAM'`), `timeline`,
`timelineLoaded`, `findings` (+ `findingsLoading`, `findingsError`, `findingsAvailable`,
`findingsNonce`), `biometrics`, `health`, `selectedClipId`, `uploaded`, `uploadLap`, `busy`,
`error`, `progress`, `streamingClipId`, `analysed`, `libraryVersion`, `socketRef`.

**Patterns worth naming on the site:**

- **`useHeldFlag(active, ms = 620)`** — holds a transient state on screen for a minimum time.
  Cached sessions resolve in under 100 ms, and *"a loader that appears and vanishes inside two
  frames reads as a flicker, not as feedback."* The beat is the same length whether the answer
  came from cache or a cold read. **This is a great scroll-site detail:** the loading state is
  deliberately *slowed down* to be honest about what happened.
- **Findings are fetched separately from the timeline**, not embedded in it: an LLM call takes
  seconds against the timeline's tens of milliseconds, so blocking the chart on it *"would
  make every driver switch feel broken."*
- **`analysed` map keyed by clip_id** — the timeline only refetches on session/driver/mode
  change, so a freshly WebSocket-analysed clip would otherwise vanish from the inspector the
  moment the stream closed.
- **Driver validity guard** — not every driver started every race, and requesting a missing
  one 404s, so the driver resets (preferring HAM) when the race changes.
- **Socket hygiene** — an orphaned WebSocket keeps a backend worker thread busy and pushes
  stage events for a clip nobody is looking at.
- **Every livery accent reads CSS variables `--team` / `--team-ink`** set once at the root,
  rather than threading the driver down as a prop.

**The "detached upload" honesty feature — a whole slide on its own.**
If you upload a clip *without* a lap number, it belongs to no lap. Every panel in the left
column then describes a race the clip is not connected to. The code's reasoning:

> *"Leaving them at full strength is the actual risk: a full timeline beside a freshly
> uploaded clip reads as being **about** that clip. Dimming them is the honest signal, and it
> beats blanking them — the session data is still real, it just isn't related."*

So: the left column gets `opacity-40 saturate-50`, **plus** a sticky banner that says it in
words (sticky because the panels it disclaims are ~4000 px tall and *"a banner that scrolls
away stops disclaiming them about one screen in"*).

And the exception proves the care: **`SignalBars` is deliberately NOT dimmed** — voice
features are intrinsic to the audio, so they are *exactly* as valid for a random clip off the
internet as for a curated one. *"Dimming it would disown the one panel that still holds."*

**Layout:** `max-w-[1680px]`; two columns —
`lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]`, widening to `_minmax(360px,450px)` at
`xl` (≈65–70 % evidence / 30–35 % inspector). `items-start` so the sidebar isn't stretched to
the much taller evidence column.

**A real layout bug and its fix, documented in the source** — good "we sweated the details"
material: the sidebar was `sticky top-[88px] h-fit`, which is *why* it felt stuck. `h-fit` let
it grow past the viewport while `sticky` pinned its top, so its lower half sat permanently
below the fold with no way to reach it — the only scrollbar on the page belonged to the
document, and spending it ran the tall left column to the bottom while the sidebar sat still.
Now: `lg:h-[calc(100vh-104px)] lg:overflow-y-auto lg:overscroll-contain`, so the wheel acts on
whichever panel the pointer is over, and `overscroll-contain` stops a fling from re-coupling
the two.

**Error handling:** a top-level `ErrorBoundary` plus a `ComponentErrorBoundary` around *every*
panel individually — one panel throwing must not white-screen the dashboard.

### 15.2 The 26 components

Each entry below paraphrases the component's own docstring, which is where the design
reasoning lives. **These docstrings are the richest source of presentation copy in the whole
repo.**

| Component | Lines | What it is and why it's built that way |
|---|---|---|
| **VerdictHero** | 241 | *"The answer, before the evidence."* Everything below is a chart that can support or undermine one claim, and the claim used to be reachable only by reading all of them. Stated at signage size with four numbers and the caveat attached, *"so someone who reads nothing else still leaves knowing what the project found."* |
| **RaceTimeline** | 557 | The hero chart. Uses **Pirelli's own compound colours**, borrowed deliberately: every F1 viewer already reads red-yellow-white as soft-medium-hard, so inventing a palette would be strictly worse. **Never the only signal** — the compound name is always printed alongside. |
| **Header** | 258 | *"Three pickers and nothing else."* Everything that used to sit up here as decoration moved into the verdict band, where it can carry a number. On a phone the row wraps and each control keeps a 40 px target — switching driver *"should never be two taps."* |
| **SelectMenu** | 278 | Exists because a native `<select>` cannot be styled where it matters: the closed box takes CSS, **the open list is drawn by the OS** — on Windows a flat light-grey menu with square corners on top of a dark carbon UI, and `option { background }` does not reach it. Rebuilt as a real ARIA listbox: focus stays on the trigger, active row announced via `aria-activedescendant`, so arrows / Home / End / Enter / Escape / type-ahead all behave natively. |
| **DriverPlate** | 146 | *"Who is on screen, in one glance."* The app speaks in three-letter codes, which is right for a dense table and useless as an anchor — *"HAM and HUL are the same screen with two letters changed."* Name set like a broadcast lower-third (given name small above, family name at signage size) so it fits 330 px without truncating Hülkenberg or Verstappen. Re-mounts on driver change so the entrance animation replays — *that replay is the change confirmation.* |
| **Helmet** | 114 | Driver identity **drawn, not fetched**. A photograph is the obvious answer and the wrong one: the demo runs with no network and licensed press images can't ship in the repo. A helmet in each driver's own three colours does the same job in a few kB of vector. |
| **CircuitMap** | 137 | The venue as it actually is: outline from the fastest race lap's GPS trace, so changing GP genuinely redraws Silverstone into Monza. Two cars run the lap as light streaks — *"the one thing on this page that is decoration, and it earns its place by making the venue switch legible from across a room."* Depth is offset copies of the path, not a 3D library. |
| **TrackTrace** | 272 | Radio calls plotted at their spatial position on the circuit. Uses **literal token values rather than `var(--…)`**, because the design tokens are declared twice under different names (`hairline-bright` vs `--edge-bright`) and getting it wrong **fails silently**: the SVG stroke renders as `none` and the shape simply isn't there. |
| **TrackConditions** | 297 | *"What the track was doing underneath the driver."* Track temperature is *"the number that matters and the one nobody quotes"* — it swings far wider than air temp (Silverstone 2024: 33 °C down to 21 °C and back) and a cooling surface costs front grip, which is what produces understeer complaints on the radio. Bare SVG, not a chart library: one line, one reference rule, some shaded spans. |
| **TyreStints** | 164 | *"The honest framing matters more here than anywhere else on the page."* Real tyre data is measured by every team and published by none; there is no API. Everything is inferred from compound, tyre age and lap times — so the degradation figure is **labelled as modelled every time it appears**, with a footnote saying why. *"A dashboard that showed a confident tyre temperature here would be inventing it."* |
| **StrategyCalls** | 89 | *"Where the analysis becomes an instruction a race engineer could act on."* The brief's theme is decision-making, so *"no screen ends at a mood label."* **Status colour never carries meaning alone** — every row has a glyph and the instruction in words. |
| **LeadLagPanel** | 144 | The brief asks for a visual showing whether mood *affects* performance — *"a relationship, not two charts side by side."* Correlation-by-lag is ordered magnitude on a signed axis, so a bar chart with a zero rule, not a line: the discrete lags are the point. The peak bar takes emphasis slot 1, all others recede to a muted step of the same hue. One series → no legend. |
| **SignalBars** | 114 | The three branches as contributions rather than hidden inside one score. *"Explainability is a judged criterion, and this panel is also the visual argument for why one model isn't enough: the acoustic bar routinely disagrees with the other two on fatigue."* Colours validated all-pairs against the dark surface — **worst CVD ΔE 9.4, worst normal-vision ΔE 20.9**. |
| **BaselineBand** | 174 | One band, one arrow. Three fixed zones; the arrow sits in the zone of the winning mood so it *cannot* point somewhere the mood chip disagrees with. Its position *within* the zone encodes the margin over the runner-up. **Why not slide it by stress index:** `stress_index = 100*(P(stressed) + 0.9*P(tired))`, so Tired and Stressed both push it high and a 60 could be either — the arrow would land in amber while the verdict above it said Tired. Drawn from the probabilities, which are what the label is argmax'd from. |
| **RadioInspector** | 262 | **Three of the brief's five deliverables live here**: upload/play, transcript, mood label — all visible without scrolling or opening a tab, *"a judge working from the spec looks for these before anything we invented."* Mood set at headline size against a livery-weight bar *"because it is a verdict, not a field."* |
| **ClipBrowser** | 189 | The brief's *"play **or** upload"* — upload was built, this is the play half. Without it the curated clips on disk were unreachable: the timeline only lists clips with a cached analysis, so an empty `results/` meant an empty timeline and nothing to play. Selecting an unscored clip runs the real pipeline (~13 s), and **the row says so before it is clicked** and shows its own progress — *"a row that silently goes quiet for that long reads as a broken click."* |
| **PipelineProgress** | 149 | *"The point of this panel is evidentiary, not decorative. A 13-second silent 'Analysing…' button is indistinguishable from a fixture replay with a setTimeout, and 'is your backend real?' is the question a judge actually wants answered. Watching STT sit for four seconds and the three signal branches tick past in order is the answer."* |
| **ClipContextCard** | 279 | *"The moment around a radio call."* A transcript alone leaves the engineer to guess what the driver was reacting to; this is the answer — corner, speed, tyres, track, who was around them, all resolved from the call's exact broadcast timestamp. Laid out as a timing-screen data block, not prose, *"because that is how this information is read on a pit wall"*: label above value, fixed columns, tabular figures so numbers line up when you flick between calls. |
| **TopFindings** | 219 | *"Deliberately shaped to look **different** from StrategyCalls, because it is a different kind of claim."* Rules firing vs an LLM writing. Carries provenance openly: which model, which data domains it could see, its stated confidence, **and how many findings were thrown away for citing data we do not hold.** Ranked by actionability, not severity — so rank 1 is not necessarily the scariest row, and the rank badge and severity rail encode different things, both labelled in words. |
| **PitWallChat** | 257 | *"Ask the pit wall."* Grounded QA over this session's own data — reads the same timeline, transcripts and correlations the panels do, *"and names the tools it called so an answer can be checked rather than trusted."* A 404 retires the launcher *"rather than leaving a button that always fails."* |
| **AgentChat** | 145 | The inner chat surface; feature-flagged, degrades to a visible error. |
| **BiometricsPanel** | 153 | See §13. The panel that refuses to draw. |
| **StartLights** | 136 | *"The loading state, as the start gantry."* Every wait in this app is the same wait — a session being pulled and scored — *"so it gets one recognisable signal rather than a different spinner per panel."* Five lamps illuminate left to right then go out **together**. Driven from state, not staggered CSS delays, because *"the lamps must all extinguish on the same frame, and percentage keyframes with per-lamp delays cannot express that."* **This is the best single motion idea in the project to steal for the scroll site.** |
| **LoadingSplash** | 43 | Initial-load splash while models initialise. |
| **CustomAudioPlayer** | 170 | Native controls replaced; dark theme with cyan accents. |
| **ErrorBoundary** | 163 | `ErrorBoundary` + `ComponentErrorBoundary`. Prevents a white screen. |
| **BaselineBand / Baseline** | — | The `Baseline` wrapper lives inside `App.tsx`: *"small, and last on the page, but it is the difference between 'this driver sounds loud' and 'this driver sounds loud **for them**'"* — and it names which of the three references is actually in play *"rather than implying the best case."* |

### 15.3 `src/lib/`

- **`drivers.ts`** (94 lines) — grid identity for every driver the cached sessions can return:
  code, first/last name, car number, team, livery colour + readable ink, and a three-stop
  helmet scheme *"in the spirit of each driver's real lid. It is an evocation, not a
  reproduction: enough to make HAM and VER unmistakable at a glance, drawn entirely in SVG so
  nothing has to be fetched at runtime."*
- **`circuits.ts`** — real circuit geometry for all 9 sessions. Each path is the fastest race
  lap's GPS trace, **arc-length resampled to 460 points**, normalised into a 1000-unit box
  with y flipped for screen space. Regenerated by `backend/scripts/extract_circuits.py`.
- **`trackGeometry.ts`** — geometry helpers for placing points on the trace.
- **`verdict.ts`** (108 lines) — derives the hero claim from the timeline the backend already
  sends. *"Nothing here invents a number."* Three states: `lead` / `no-lead` / `no-clips`, each
  with its own headline and support line. `significant` is carried through untouched *"so the
  headline can hedge when the sample is too small to support it."* The `criticalCall` falls
  back critical → warning → first, because *"a count of 2 next to 'nothing triggered' reads as
  a bug even when both calls are only advisory."*

### 15.4 Team colours (from `lib/drivers.ts`)

| Team | Colour | Ink |
|---|---|---|
| Red Bull Racing | `#3671C6` | `#ffffff` |
| Mercedes | `#27F4D2` | `#04211c` |
| Ferrari | `#E8002D` | `#ffffff` |
| McLaren | `#FF8000` | `#1a0d00` |
| Aston Martin | `#229971` | `#ffffff` |
| Alpine | `#2C8FE0` | `#ffffff` |
| Williams | `#64C4FF` | `#00131f` |
| RB | `#6692FF` | `#050b1c` |
| Kick Sauber | `#52E252` | `#041a04` |
| Haas F1 Team | `#E6002B` | `#ffffff` |

Sample driver entries (code, name, number, helmet `[shell, stripe, accent]`):
`VER` Max Verstappen 1 `['#0A1E5C','#E4002B','#FFC400']` ·
`HAM` Lewis Hamilton 44 `['#F7E600','#FFFFFF','#101010']` ·
`LEC` Charles Leclerc 16 `['#F4F4F4','#E8002D','#FFC400']` ·
`NOR` Lando Norris 4 `['#D6FF00','#FF8000','#101010']` ·
`ALO` Fernando Alonso 14 `['#1B3A8C','#FFD200','#E4002B']` ·
`PIA` Oscar Piastri 81 `['#0C2340','#47C7F4','#FF8000']`.

**22 driver portrait JPGs** ship in `frontend/public/drivers/` (ALB ALO BOT COL GAS HAM HUL
LAW LEC MAG NOR OCO PER PIA RIC RUS SAI SAR STR TSU VER ZHO) plus a `CREDITS.md`. They are
pulled from **Wikimedia Commons at build time** by `scripts/fetch_portraits.py`, which *skips
any image whose licence is not clearly free* — so the running app never touches the network
and nothing unlicensed is in the repo.

---

## 16. Design system

### 16.1 Type — three faces, three jobs

Declared in `frontend/src/index.css` (725 lines), which opens with the design-system rationale:

> *"Archivo carries the voice of the page and is the only face allowed to stretch: headlines
> run wide (`wdth 112`) so they read as signage, while lap numbers and deltas run condensed
> (`wdth 75`) so they read as a timing tower. Inter carries prose. JetBrains Mono carries
> anything a machine emitted verbatim — model ids, transcripts of telemetry.*
> *All three are self-hosted variable fonts: **the demo is judged offline and a webfont request
> that fails takes the whole type system with it.**"*

| Face | Family | File | Range |
|---|---|---|---|
| Display / signage | `Archivo` | `/fonts/archivo-var-latin.woff2` | weight 100–900, **stretch 62 %–125 %** |
| Body / prose | `InterVar` | `/fonts/inter-var-latin.woff2` | weight 100–900 |
| Machine output | `JetBrainsMonoVar` | `/fonts/jetbrainsmono-var-latin.woff2` | weight 100–800 |

CSS vars: `--font-display`, `--font-body`, `--font-mono`. All `font-display: swap`.

### 16.2 Colour — the current palette (`index.css`, authoritative)

```css
/* Surfaces — a blue-black carbon rather than a dead grey-black: the cyan and
   red the data uses both sit on the cool side, and a neutral ground made them
   look like stickers. */
--carbon:      #07080b;   /* page plane */
--panel:       #0e1015;
--panel-2:     #161a21;
--edge:        #232833;
--edge-bright: #38404f;

--ice:   #eef2f8;   /* primary text */
--ash:   #98a2b3;   /* secondary text */
--slate: #626c7c;   /* muted text */

/* Data colours — load-bearing across charts, mood chips and the clip library.
   The mapping is already learned, so the hues never change. */
--series-1: #00d9ff;   /* pace delta */
--series-2: #ff0050;   /* stress index */
--series-3: #00ff88;   /* transcript signal */

--status-good:     #00ff88;
--status-warning:  #ffaa00;
--status-serious:  #ff6b00;
--status-critical: #ff0050;

--brand:       #00d9ff;   /* racing cyan — red is reserved for critical states */
--accent-cyan: #00E5FF;

--gridline: #1a1f27;
--axis:     #2b323d;

/* Livery colour of the driver on screen; set from JS. Every accent that should
   follow the driver reads this instead of hardcoding a hue. */
--team:     #00d9ff;
--team-ink: #04121a;
```

**Semantic colour rule, stated in `tailwind.config.js`:**
`green = calm/good` · `amber #ffaa00 = stressed` · `orange #ff6b00 = serious` ·
**`red #ff0050 = CRITICAL ONLY`**. The brand colour was deliberately **changed from red to
cyan** so that red always means something. Mood mapping: **Calm `#00ff88` · Tired `#ffaa00` ·
Stressed `#ff0050`**.

> ⚠️ **Two token systems exist and they disagree.** `src/constants.ts` still holds the *older*
> palette (`BRAND: '#ff0050'`, `PLANE: '#050505'`, `SURFACE: '#0f0f0f'`, `RAISED: '#1a1a1a'`),
> while `index.css` + `tailwind.config.js` hold the current blue-black carbon with cyan brand.
> **`index.css` is authoritative — use it for the presentation site.** Tailwind's colour
> *names* were kept from the first build (`plane`, `surface`, `raised`, `hairline`) so existing
> markup keeps resolving; only the values moved. `TrackTrace.tsx` documents the trap this
> creates (see §15.2).

### 16.3 Texture, surfaces and motion

**Carbon weave** — the background texture, and a very reusable idea for the scroll site:
```css
body::before {
  content: ''; position: fixed; inset: 0; z-index: 0;
  pointer-events: none; opacity: 0.55;
  background-image:
    repeating-linear-gradient( 45deg, rgba(255,255,255,0.016) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(-45deg, rgba(255,255,255,0.016) 0 1px, transparent 1px 4px);
}
```
> *"Two opposed hairline gratings at 4px — at arm's length it is a texture, not a pattern, and
> it stops the large dark areas reading as a void."*

**Glass panel** (from `constants.ts` `GLASS.PANEL`, still the shape in use):
```
background:      linear-gradient(145deg, rgba(15,15,15,0.85) 0%, rgba(10,10,10,0.9) 100%)
backdrop-filter: blur(20px)
border:          1px solid rgba(255,255,255,0.08)
box-shadow:      0 20px 60px rgba(0,0,0,0.5),
                 0 0 1px rgba(255,0,80,0.2),
                 inset 0 1px 0 rgba(255,255,255,0.05)
```
Variants: `GLASS.HEADER` (135° three-stop, blur 20), `GLASS.CONTROL`
(`rgba(26,26,26,0.8)`, blur 10), `GLASS.BUTTON_RING` (blur 24).

**Named CSS classes available** (`index.css`): `.display` `.tower` `.eyebrow` `.section-title`
`.timing-number` `.racing-divider` `.mono` `.tabular` `.panel` `.card` `.card-title`
`.panel-evidence` `.panel-team` `.field-label` `.control` `.control-glass` `.menu-pop`
`.menu-row` `.btn` `.btn-primary` `.btn-ghost` `.chip` `.gp-car` `.gp-car--chase` `.anim-rise`
`.anim-wipe` `.anim-flare` `.anim-pulse` `.spinner`.

**Keyframes:** `gp-menu-in`, `gp-rise`, `gp-wipe-in`, `gp-flare`, `gp-spin`, `gp-pulse`,
`gp-lap`.

**Tailwind extras:** glow shadows `glow-red` / `glow-cyan` / `glow-green` /
`glow-team` (`0 0 26px color-mix(in srgb, var(--team) 45%, transparent)`), a `bevel` shadow,
`racing-gradient` (`linear-gradient(135deg, #e6002b 0%, #00d9ff 100%)`) and its vertical
variant, animations `pulse-slow` (3 s) and `spin-slow` (3 s).

**Motion timings** (`constants.ts` `UI`): `TRANSITION_FAST 150ms`, `TRANSITION_NORMAL 200ms`,
`TRANSITION_SLOW 300ms`, `ANIMATION_PULSE 2000ms`. Held-loader beat: **620 ms**.

**Accessibility, and this is worth a slide of its own:**
- `@media (prefers-reduced-motion: reduce)` block is present and honoured.
- `*:focus-visible { outline: 2px solid var(--accent-cyan); outline-offset: 2px; }` globally.
- `MIN_HIT_TARGET: 24` px, and chart dots get a **24 px invisible hit target** because a
  5.5 px dot is not clickable.
- **Status colour never carries meaning alone** — every coloured row also has a glyph and
  words (`StrategyCalls`, `TopFindings`).
- `SignalBars` colours were validated all-pairs for colour-vision deficiency:
  **worst CVD ΔE 9.4, worst normal-vision ΔE 20.9.**
- Real ARIA listbox with `aria-activedescendant` in `SelectMenu`; `role="alert"` on the error
  banner; `role="status"` on the detached-upload banner; `aria-label` on sections.

**Chart conventions** (`constants.ts` `CHART`): robust y-axis from the **2nd–95th percentile**
with 15 % padding (not min/max — one outlier lap would flatten the whole series), pace domain
floor `[-0.25, 0.5]`, stress `[0, 100]`, dot 5.5 px → 7 px when selected, stroke 2 px, grid
opacity 0.5, and **`syncId: 'race'`** which is what couples the crosshairs between the pace
and stress panels.

---

## 17. Data inventory (verified)

Counted directly from disk on 2026-08-21.

### 17.1 Headline counts

| Thing | Verified count |
|---|---|
| Rows in `data/clips/index.csv` | **855** |
| `.mp3` files in `data/clips/` | **855** |
| Cached analyses in `data/results/` | **854** |
| Fusion head training set (`n_train`) | **853** |
| Distinct sessions | **9** |
| Distinct drivers | **23** |
| Distinct driver × session pairs | **164** |
| Clips with a lap number in the CSV | **755** |
| Clips with a **blank** lap (recovered from UTC) | **100** |
| Per-driver baselines shipped | **20** + `__cohort__` |
| Biometric files | **0** |

### 17.2 Label distribution

| Label | Count | Share |
|---|---|---|
| **Calm** | 360 | 42.1 % |
| **Tired** | 281 | 32.9 % |
| **Stressed** | 212 | 24.8 % |
| *(blank)* | 2 | 0.2 % |

**Source of labels:** `scripts/auto_label.py` (model-generated — see the caveat in §7). The
`annotator` column is empty on all 855 rows.

### 17.3 The nine sessions

| session_id | Grand Prix | Circuit | Country | Laps | km | Turns | Clips |
|---|---|---|---|---|---|---|---|
| `2023-monaco-r` | 2023 Monaco GP | Monaco | Monaco | 78 | 3.337 | 19 | **209** |
| `2023-dutch-r` | 2023 Dutch GP | Zandvoort | Netherlands | 72 | 4.259 | 14 | **172** |
| `2023-sao-paulo-r` | 2023 São Paulo GP | Interlagos | Brazil | 71 | 4.309 | 15 | **87** |
| `2023-bahrain-r` | 2023 Bahrain GP | Sakhir | Bahrain | 57 | 5.412 | 15 | **84** |
| `2024-singapore-r` | 2024 Singapore GP | Marina Bay | Singapore | 62 | 4.940 | 19 | **77** |
| `2023-singapore-r` | 2023 Singapore GP | Marina Bay | Singapore | 62 | 4.940 | 19 | **66** |
| `2024-italian-r` | 2024 Italian GP | Monza | Italy | 53 | 5.793 | 11 | **65** |
| `2024-monaco-r` | 2024 Monaco GP | Monaco | Monaco | 78 | 3.337 | 19 | **50** |
| `2024-british-r` | 2024 British GP | Silverstone | United Kingdom | 52 | 5.891 | 18 | **45** |

Session-id format is produced by `fastf1_client.make_session_id()`:
`"2024 British Grand Prix R"` → `2024-british-r`.

### 17.4 The 23 drivers in the clip index

`ALB ALO BOT COL DEV GAS HAM HUL LAW LEC MAG NOR OCO PER PIA RIC RUS SAI SAR STR TSU VER ZHO`

Missing a per-driver baseline (fall back to cohort/prior): **COL, DEV, LAW**.

### 17.5 Richest driver × session pairs (best demo material)

| Session | Driver | Clips |
|---|---|---|
| 2023-monaco-r | **SAI** | 28 |
| 2023-monaco-r | RUS | 23 |
| 2023-monaco-r | VER | 18 |
| 2023-dutch-r | **ALO** | 16 |
| 2023-dutch-r | VER | 15 |
| 2023-dutch-r | ALB | 15 |
| 2023-monaco-r | ALO | 15 |
| 2023-dutch-r | HUL | 14 |
| 2023-dutch-r | OCO | 13 |
| 2023-dutch-r | SAI | 13 |
| 2023-monaco-r | HUL | 13 |
| 2024-singapore-r | LEC | 11 |
| 2023-sao-paulo-r | HAM | 11 |

> Note: even the best pair (28 clips) is a small sample for a per-driver, per-session
> correlation. This is the honest ceiling of the current dataset and drives §10 and §21.

### 17.6 `index.csv` schema

```
clip_id, session_id, driver, lap, filename, label, annotator, notes
```
Example row:
```
2024-british-r-LEC-142152, 2024-british-r, LEC, , 2024-british-r-LEC-142152.mp3,
Tired, , 2024-07-07T13:22:02.763Z
```
- `clip_id` format: `{session_id}-{DRIVER}-{HHMMSS}`
- `notes` carries the **UTC broadcast timestamp** — this is what the context resolver matches on
- `lap` is frequently blank (100 rows) and is recovered from `notes`

`data/store.py` reads this file **skipping malformed rows rather than crashing**, sanitises
`clip_id` against directory escape when building result paths, and **deletes unreadable or
stale cache entries** instead of raising.

### 17.7 On-disk footprint

| Path | Size | In git? | Regenerate with |
|---|---|---|---|
| `backend/.venv/` | 2.0 GB | no | `pip install -r requirements.txt` |
| `~/.cache/huggingface/` | 2.3 GB | no | `scripts/warm_models.py` |
| `data/cache/` (FastF1) | 550 MB | no | `scripts/cache_sessions.py` |
| `data/clips/*.mp3` | ~86 MB+ | no | `scripts/fetch_radio.py` |
| `data/results/*.json` | ~15 MB+ | no | `scripts/batch_analyse.py` |
| `frontend/node_modules/` | 160 MB | no | `npm install` |
| `backend/.env` | <1 KB | no (gitignored) | by hand |
| **`data/clips/index.csv`** | — | **YES** | not regenerable |
| **`data/labels/fusion_head.json`** | — | **YES** | `scripts/fit_fusion.py` |
| **`data/labels/driver_baselines.json`** | — | **YES** | `scripts/fit_fusion.py` |
| `data/context/*.json` | — | (18 files) | `scripts/build_context.py` |

`data/context/` holds two files per session: `{session_id}.json` (resolved context) and
`openf1_radio_{session_id}.json` (the OpenF1 `/team_radio` manifest, cached so reruns are
offline).

### 17.8 The four models

| Role | Hugging Face id | Notes |
|---|---|---|
| STT | `distil-whisper/distil-small.en` | English-only; rejects `task`/`language` kwargs |
| Acoustic SER | `superb/wav2vec2-base-superb-er` | IEMOCAP-trained; **no `tired` class** |
| Text emotion | `j-hartmann/emotion-english-distilroberta-base` | 7 emotions |
| VAD | `istupakov/silero-vad-onnx` | file `silero_vad_16k_op15.onnx`; run via onnxruntime |

**All four are public — no HF token required.** That was a selection criterion, not luck: a
gated model means a token, and a token is a thing that can fail at an offline venue.

### 17.9 Backend dependency versions (exact, from `requirements.txt`)

```
fastapi==0.115.6        uvicorn[standard]==0.34.0   pydantic==2.10.4
python-multipart==0.0.20
fastf1==3.4.4           pandas==2.2.3               numpy==1.26.4
librosa==0.10.2.post1   soundfile==0.12.1           audioread==3.0.1
torch==2.5.1            transformers==4.47.1        scikit-learn==1.6.0
onnxruntime==1.20.1     huggingface-hub==0.36.2
groq==0.11.0            httpx==0.27.2               python-dotenv==1.2.2
```

**Three pins with real stories behind them** — good "we know why every number is there"
material:
- **`numpy==1.26.4`, deliberately `<2.0`** — several audio wheels still link against the 1.x ABI.
- **`torch==2.5.1` CPU-only on purpose** — *"the demo runs on a laptop with no GPU, so we
  develop against the same hardware we present on."* The CPU wheel is ~200 MB vs ~2.5 GB for CUDA.
- **`httpx==0.27.2` pinned** — `groq==0.11.0` passes `proxies=` to `httpx.Client()`, which
  **httpx 0.28 removed**. Unpinned, pip resolves to 0.28.x and **every agent call 500s at
  client construction.**

### 17.10 Configuration constants (`backend/app/config.py`)

Plain module constants, described in the file as *"greppable at 2am on demo eve"*:

```python
VERSION = "0.1.0"
# Directories
data/cache · data/clips · data/labels · data/results · data/context · data/biometrics
# Audio
TARGET_SR = 16_000        MAX_CLIP_SECONDS = 30.0     MIN_CLIP_SECONDS = 0.4
# Fusion
DEFAULT_FUSION_WEIGHTS = {"prosody": 0.45, "acoustic": 0.30, "text": 0.25}
MIN_BASELINE_CLIPS = 3
# Analysis
MIN_SAMPLES_FOR_SIGNIFICANCE = 25    LEAD_LAG_RANGE = range(-4, 5)
RACE_CONTROL_WINDOW_S = 120          MIN_LAPS_FOR_DEG_SLOPE = 4
IN_TRAFFIC_GAP_S = 1.5               HIGH_SPEED_MIN_KPH = 250
CORNER_PROXIMITY_M = 60              BRAKING_ZONE_MIN_BRAKE = 0.5
# Env-gated
OFFLINE_MODE   (env)      USE_FIXTURES = env default "0"    CORS_ORIGINS
```

**`USE_FIXTURES` default was flipped from `"1"` to `"0"`**, with a long comment explaining
why: the old default made `POST /api/analyse` return canned data **without reading the
uploaded file**. The demo's most important proof — "upload your own clip and watch it run" —
was silently fake.

---

## 18. Ops, setup and the offline story

**Requirements:** Python **3.11 or 3.12** (hard boundary both ways), Node 20+, ffmpeg.
Setup budget ~45 min, most of it unattended download.

**The Python-version trap is the #1 setup failure**, and both ends break:
- **3.13+** → `torch==2.5.1` and `numpy==1.26.4` publish **no wheels**.
- **3.9 or older** → `onnxruntime==1.20.1` publishes **no wheels** (1.19.2 was its last 3.9
  release). macOS is the usual victim: `/usr/bin/python3` is 3.9, so a bare `python3 -m venv`
  *silently builds an unusable venv* and pip fails halfway through.

**Setup sequence:**
```bash
pip install -r requirements.txt        # ~3 min  (+ --extra-index-url .../whl/cpu on Linux/Win)
python scripts/warm_models.py          # ~2.3 GB of HF models
python scripts/cache_sessions.py       # FastF1 sessions → data/cache/
python scripts/fetch_radio.py          # radio mp3s → data/clips/ + index.csv rows
python scripts/build_context.py        # OpenF1 radio manifests + resolved context
cd ../frontend && npm install
cd ../backend && python scripts/batch_analyse.py    # ~30 min — REQUIRED
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
npm run dev            # → http://localhost:5173 ; API docs → :8000/docs
```

**`batch_analyse.py` is not optional, and this is a genuinely instructive point.** Steps 2–4
download *lap times and audio*. Neither computes stress. The timeline only plots clips that
already have a cached analysis, so skipping it gives you a *working app with three empty
panels*: no stress line, lead-lag reads "not enough radio calls", strategy feed blank, and the
chatbot answers *"I don't have access to that data"* to everything. This is the single most
common "the UI shows nothing" report. Every script is incremental and safe to interrupt.

**The offline design, top to bottom** — the demo is judged with no network:

| Layer | How it survives no network |
|---|---|
| Race data | FastF1 client is **cache-only**; a cache miss is an **error, not a fetch** |
| Models | `local_files_only` when `OFFLINE_MODE` is set; all 4 pre-warmed to disk |
| Fonts | Three self-hosted variable `woff2` files — no webfont request |
| Driver portraits | Fetched from Wikimedia **at build time**, shipped as JPEGs |
| Circuit geometry | Extracted to SVG paths **at build time** into `lib/circuits.ts` |
| Radio manifests | OpenF1 responses cached to `data/context/openf1_radio_*.json` |
| Analyses | Cached to `data/results/` so the timeline never re-infers |
| LLM layers | Feature-flagged off; **a 404 makes each panel hide itself** |
| The check | **`GET /api/health` → `offline_ready: true` and 4 models `true`** |

**Verification commands, verbatim from `SETUP.md`:**
```bash
curl http://localhost:8000/api/health      # want: "offline_ready": true, 4 models true
ls data/results/ | wc -l                   # want: (matches your clip count)
curl "http://localhost:8000/api/timeline/2023-dutch-r?driver=ALO"   # want: points[] with stress_index
```

**Enabling the LLM layer** — `backend/.env`:
```
GROQ_API_KEY=gsk_...
GP_AGENT=1
```
**There is deliberately no `.env.example`.** Both `.env` and `.env.*` are gitignored on
purpose, and `SETUP.md` explains why: *"the template file previously carried a real key, which
is the usual way secrets escape — a file named 'example' reads as inert and nobody checks
it."* `.env` is read at import, so **uvicorn must be restarted** after creating it.

**Also worth knowing:** `app.main` resolves relative to the working directory — run uvicorn
from `backend/`, not `backend/scripts/`, or you get
`ModuleNotFoundError: No module named 'app'`. On Windows, prefix scripts with `PYTHONUTF8=1`
to avoid `UnicodeEncodeError: 'charmap'`. Don't rename the events in `cache_sessions.py`:
**FastF1 fuzzy-matches nicknames like "Monza" to the wrong race without erroring.**

**The eleven scripts in `backend/scripts/`:**

| Script | Lines | Job |
|---|---|---|
| `warm_models.py` | 61 | Download all 4 HF models. *"After this the app works with wifi off, which is the requirement for the offline GrandPrix round on 22 Aug."* |
| `cache_sessions.py` | 102 | Pull real F1 sessions to disk. *"Run this on day one and never think about it again."* |
| `fetch_radio.py` | 228 | The dataset builder. The F1 live-timing service publishes a per-session team-radio manifest with a UTC timestamp and car number per transmission: `UTC + car number → driver code + lap number → index.csv row`, *"which replaces days of manually clipping broadcast footage."* |
| `build_context.py` | 336 | Precompute race context. *"The only part of this project that reaches the network at build time"* — and it caches what it fetches so reruns are offline. |
| `batch_analyse.py` | 113 | Pre-analyse clips into `data/results/`. *"Analysing on demand during the demo is not an answer either: ~13 s per clip, and the timeline needs tens of them."* |
| `label_clips.py` | 385 | Browser labelling UI on :5050. `1`=Calm `2`=Stressed `3`=Tired `s`=skip, Space=play, ←=back. Saves on every keypress. Supports separate output CSVs per annotator. |
| `auto_label.py` | 146 | Label from model output. *"No human listening. No external API. The HF models do the labelling."* ⚠️ This is what produced the shipped labels. |
| `fit_fusion.py` | 256 | Fit the head + per-driver baselines. *"The script that turns the project from 'plumbing works' into 'the classifier works'."* Has `--dry-run`. |
| `extract_circuits.py` | 80 | Real circuit outlines → normalised SVG paths, *"so the frontend can draw the actual track geometry instead of a hand-drawn approximation."* |
| `fetch_portraits.py` | 130 | Freely-licensed portraits from Wikimedia Commons. Skips anything not clearly free. |
| `dev.sh` | — | Dev convenience runner. |

**Testing.** ⚠️ **Only one test file exists on disk: `backend/tests/test_agent.py`.** The
README's claim of 71 tests across three files (`test_agent.py`, `test_agent_cache.py`,
`test_timeline.py`) at ~40 % coverage does **not** match the repo. Do not put a test-count or
coverage number on the presentation site. Frontend linting is `oxlint`, and `src/shot.mjs` uses
Playwright for screenshots.

---

## 19. Design philosophy: honesty by construction

**This is the project's actual differentiator and it should be a major section of the
presentation, not a footnote.** Plenty of hackathon projects fuse three models. The thing that
is genuinely unusual here is that the codebase is **architected so that overclaiming is hard
to do by accident.** The pattern repeats a dozen times, always the same move: *make the honest
thing structural, not a matter of remembering.*

**The catalogue, all verified in source:**

| Mechanism | Where | Why it's built that way |
|---|---|---|
| `MoodResult.fitted` **defaults to `False`** | `schemas.py` | Claiming a trained head must be a **deliberate act**, never a default. |
| `TyreState.basis` is a **constant** `"modelled"`, not a flag | `schemas.py` | *"A flag can be forgotten."* A constant cannot be set wrong. |
| `DriverBaseline.source` ∈ {`driver`,`cohort`,`prior`} is **required** | `schemas.py` | The UI physically cannot say "calibrated to this driver" while running on priors. |
| `LeadLagPoint.correlation` is `None`, **never `0.0`**, when unmeasurable | `leadlag.py` | Zeros let the peak-picker select fabricated data — it had already produced the headline *"stress peaks N laps before pace loss (r = 0.00)"*. |
| `TyreState.past_cliff` left `None` | `timeline.py` | *"`past_cliff=False` would assert we checked."* |
| Prosody features **omitted**, never zero-filled | `prosody.py` | A 0 Hz pitch z-scores to extreme fatigue — a zero-fill would fabricate the headline finding. |
| Biometrics **never synthesised**; 404 not empty series | `biometrics.py` | *"A fabricated heart-rate trace beside a measured track temperature is indistinguishable from a measurement."* |
| `FindingsResponse.dropped_findings` **surfaced in the UI** | `findings.py` | The system publishes its own LLM's failure rate rather than swallowing it. |
| Citation gate drops uncited/miscited findings | `findings.py` | An LLM claim without a lap number is not checkable, so it doesn't ship. |
| `is_significant` stays `False` below 25 samples; copy changes to *"Indicative only"* | `leadlag.py` | *"The guard firing correctly is a better result than a green tick."* |
| `HOLD` is one of the five strategy calls | `strategy.py` | *"A system that only ever escalates is a system the pit wall learns to ignore."* |
| Strategy is **rules, not an LLM** | `strategy.py` | *"A pit wall that changes its answer on reload gets ignored."* |
| `USE_FIXTURES` default flipped to `"0"`; `/api/analyse` has **no fixture branch** | `config.py`, `analyse.py` | The old default returned canned data **without reading the uploaded file**. |
| Fixtures shout **"THIS IS NOT REAL DATA"** | `fixtures/demo.py` | Fixture output must be unmistakable if it ever escapes. |
| Groq models with **built-in web search explicitly rejected** | `agent_config.py` | They would answer from the internet — *"exactly the failure mode this app is built to avoid."* |
| Radio tagged by **phase** (racing / pre-race / post-race) | `findings.py` | Hamilton's victory radio scored 97.6 "Stressed". Context, not a bigger model, is the fix. |
| Detached uploads **dim** the whole left column + sticky banner | `App.tsx` | *"A full timeline beside a freshly uploaded clip reads as being **about** that clip."* |
| …but `SignalBars` is **exempt** from that dimming | `App.tsx` | Voice features are intrinsic to the audio. *"Dimming it would disown the one panel that still holds."* |
| Health reports **which** components loaded, not a boolean | `health.py`, `models.py` | Partial degradation is a real state and gets reported as one. |
| Model warm-up is **best-effort** and cannot block boot | `main.py` | *"/api/health is exactly how we'd diagnose it."* |
| Loading states **held for 620 ms minimum** | `App.tsx` | A cache hit and a cold read take the same visible time — the UI doesn't imply speed it didn't earn. |
| Empty timeline says *"Real lap data, no radio scored yet"* | `App.tsx` | Names exactly which half of the page is real. |
| Every tyre figure labelled "modelled" wherever it appears | `TyreStints.tsx` | *"A dashboard that showed a confident tyre temperature here would be inventing it."* |
| Chat **names the tools it called** | `PitWallChat.tsx` | *"So an answer can be checked rather than trusted."* |
| Live WebSocket stage streaming | `PipelineProgress.tsx` | *"A 13-second silent 'Analysing…' button is indistinguishable from a fixture replay with a setTimeout."* |

**The one-sentence version for a slide:**
> *We didn't build a system that tells the truth. We built one where lying requires effort.*

**And the meta-point, which is the honest place to land it:** this document itself found that
the project's own README overstates several numbers (§20) and that the training labels are
model-generated rather than human (§7). The right response — and the response consistent with
everything above — is to **put the corrected numbers on the presentation site and name the
label provenance out loud.** A project whose entire thesis is "don't overclaim" cannot ship a
deck with stale metrics on it.

---

## 20. Stale claims — do not repeat these

`README.md`, `SETUP.md` and `SOLUTION.md` were written earlier and have not kept up with the
code. **Use the right column.**

| Claim in README / SETUP / SOLUTION | ✅ Verified reality |
|---|---|
| Fusion accuracy **82.1 %** | **88.75 %** (`cv_accuracy: 0.8875`, LeaveOneOut CV) |
| Naive baseline **48.4 %** | **45.13 %** (`naive_accuracy: 0.4513`) |
| **446** clips | **855** index rows / **855** mp3s / **854** cached results / `n_train` **853** |
| Labels: Calm 199 / Stressed 92 / Tired 155 | **Calm 360 / Tired 281 / Stressed 212** (+2 blank) |
| **5** sessions | **9** sessions (see §17.3) |
| **20** drivers | **23** drivers in the index (20 have individual baselines) |
| Agent has **5** tools | **10** tools (§12.2) |
| Groq `llama-3.3-70b-versatile` | **`openai/gpt-oss-120b`** → fallback `openai/gpt-oss-20b`, resolved at runtime. **All Llama chat models have been retired from Groq.** |
| WebSocket at `/api/analyse/stream` | **`/api/analyse/ws`** |
| Lead-lag: **−4 laps, r = 0.62, n = 446** | Computed **per driver, per session, at request time** over lags −4…+4. Nothing hardcodes those figures. Measured reality: a minority of pairs show a negative peak and **none clear the significance floor** (§10). |
| **71 tests** across 3 files, **~40 %** coverage | Only **`backend/tests/test_agent.py`** exists on disk. |
| `446 hand labels` (SETUP.md) | Labels are **model-generated** by `auto_label.py`; the `annotator` column is empty on all 855 rows (§7). |
| README/SOLUTION document the race-context layer | They don't mention it **at all** — 8 modules, ~1,300 lines (§11). |
| README/SOLUTION document biometrics ingestion | Not mentioned. Exists (§13). |
| README/SOLUTION document the LLM findings layer | Not mentioned. Exists — 718 lines (§12.3). |
| SOLUTION.md's ML pipeline code blocks | **Illustrative pseudo-code, not the implementation.** It shows `whisper_model.transcribe()` and `fusion_model.predict_proba()`; the real code uses a transformers `pipeline` and a hand-rolled `coef @ x + intercept` + softmax with an explicit sklearn-binary-convention branch. |
| SOLUTION.md's confusion matrix | Not reproducible from anything on disk. **Don't ship it.** |
| SOLUTION.md's ROI figure ($1–2 M in prize money for 5 championship points) | A rhetorical illustration, not a measured result. Present as framing at most, clearly labelled. |
| `constants.ts` palette (`BRAND: #ff0050`, `PLANE: #050505`) | Superseded. **`index.css` is authoritative**: `--brand: #00d9ff`, `--carbon: #07080b` (§16.2). |
| SOLUTION.md marked "Last Updated: August 14, 2026, Version 1.0.0" | `config.VERSION = "0.1.0"`. |

**Version numbers that ARE still correct** in SOLUTION.md (cross-checked against
`package.json` and `requirements.txt`): React 19.2.8, TypeScript 6.0.2, Vite 8.2.0,
Tailwind 3.4.19, Recharts 3.10.1, FastAPI 0.115.6, Pydantic 2.10.4, Uvicorn 0.34.0,
torch 2.5.1, transformers 4.47.1, librosa 0.10.2.post1, fastf1 3.4.4, scikit-learn 1.6.0,
groq 0.11.0.

---

## 21. Known limitations & honest caveats

Put these on the site. In a project whose thesis is honesty, a visible limitations section is
an asset, and judges reward it.

1. **The training labels are model-generated, not human.** 88.75 % is LOO-CV agreement with a
   rule-based teacher, not accuracy against ground truth (§7). The human labelling tool is
   built and unused. **This is the single biggest caveat.**
2. **The lead-lag effect does not clear the project's own significance floor.** By the team's
   own measurement, a minority of driver/session pairs show a negative peak, and none clear
   `MIN_SAMPLES_FOR_SIGNIFICANCE = 25`. The highest correlations sit on the fewest pairs —
   the classic small-sample signature (§10).
3. **Per-driver-per-session samples are tiny.** 855 clips spread over **164** driver × session
   pairs; the richest pair has 28 clips, most have a handful. Lead-lag needs ≥4 usable
   lap-pairs to compute anything at all.
4. **`speech_rate_z` has a coefficient of exactly 0.000 in all three classes** of the fitted
   head. One of the eight features is contributing nothing in this fit.
5. **`Tired` is carried mostly by the text branch, not prosody** (`text_score` +6.112 vs the
   largest prosody weight +0.701). The fatigue keyword list is doing heavy lifting. Prosody
   supplies correctly-signed supporting evidence, not the decision. Phrase the thesis as
   *"the two branches an acoustic-only model doesn't have"*, not *"prosody finds fatigue."*
6. **Three drivers (COL, DEV, LAW) have no individual baseline** and fall back to cohort or
   population priors — their stress scores are less well calibrated, and the UI says so.
7. **All tyre data is modelled**, from compound + age + lap times. There is no public source
   of real F1 tyre telemetry. Labelled as such everywhere (§11.2).
8. **There is no biometric data at all.** The second, independent channel exists as a path,
   not as evidence (§13).
9. **Acoustic emotion recognition cannot distinguish elation from distress.** Hamilton's
   2024 British GP victory radio scored 97.6 "Stressed". Mitigated with phase tagging, not
   solved.
10. **Only one test file exists.** No coverage claim is defensible.
11. **Two competing token systems** in the frontend (`constants.ts` vs `index.css`), with a
    documented silent-failure trap when the wrong name is used in an SVG attribute (§16.2).
12. **The LLM layers are optional and external.** No Groq key → no chat, no findings. Both
    panels hide themselves; the core dashboard is unaffected by design.
13. **Groq model availability is outside the project's control.** Runtime resolution mitigates
    it; it has already broken the app twice.
14. **The docs are stale** (§20) — including in ways that *understate* the project (855 clips,
    9 sessions, 10 tools, 88.75 %).
15. **English-only STT.** `distil-small.en` — no multilingual radio.
16. **Real F1 team radio is heavily edited before broadcast.** The publicly available
    transmissions are a curated subset, which is a sampling bias no amount of modelling fixes.

---

## 22. Narrative beats for the scroll site

Ranked by strength. Each is a self-contained scroll moment with a visual.

**Beat 1 — "The pit wall is deaf."**
A pit wall has thousands of channels of telemetry for the car and zero for the driver. It
*hears* the driver and throws the audio away.
*Visual:* a telemetry wall of live-looking car channels, then one channel labelled DRIVER
that's just flat static.

**Beat 2 — "No model has a word for tired."** ⭐ *the strongest intellectual beat*
Show the actual label spaces: IEMOCAP → angry / happy / sad / neutral. RAVDESS → 8 emotions.
Highlight the absence. *Fatigue isn't something these models get wrong — it's something they
cannot say.*
*Visual:* label chips animating in, then a hard cut to an empty slot where `tired` should be.

**Beat 3 — "Fatigue isn't a feeling. It's physics."**
Pitch drops. Range flattens. Energy falls. Speech slows. Pauses lengthen. Jitter rises. All
six are measurable with signal processing; none needs a model that has ever heard a tired
person.
*Visual:* six mini-waveform/feature animations, each with its arrow direction.

**Beat 4 — "So we built the branch that can see it."**
The three-branch diagram assembling: prosody (hand-engineered, 6 z-scored features) +
acoustic (wav2vec2) + text (DistilRoBERTa over the Whisper transcript) → logistic regression
→ Calm / Stressed / Tired.

**Beat 5 — "Loud for them, not loud."**
Two drivers, same absolute pitch, opposite verdicts, because each is z-scored against their
own calm baseline. Then the three-tier fallback (driver → cohort → prior) and the fact that
the UI **always says which tier it's on**.

**Beat 6 — Flip the switch.** ⭐ *the strongest interactive beat*
The A/B toggle. Naive: the Tired class **vanishes from the entire timeline** — not because
the model is wrong, but because it structurally cannot produce that class. Fusion: it comes
back. `45.13 % → 88.75 %`.
*Visual:* a real toggle on the scroll page that makes amber markers disappear and reappear.
**This is the money interaction. Build it if you build nothing else interactive.**

**Beat 7 — "Did the voice move first?"**
Two curves — stress and pace delta — sliding across each other lag by lag, −4 to +4, with the
correlation bar chart filling in beneath. Land on the negative peak: *the gap is warning time.*

**Beat 8 — "And then it refuses to call it significant."** ⭐ *the beat nobody else will have*
The honest turn. n = 11 clips. Below the floor of 25. The interface writes *"Indicative only
— 11 clips in this session"* in its own voice. **The guard firing correctly is the result.**
Immediately follow with why this is a feature: a pit wall ignores a system that overclaims
once.

**Beat 9 — "The answer is an instruction, not a mood."**
The five strategy calls, then linger on **HOLD — driver venting, pace unaffected**, with the
quote: *"Knowing when not to act is most of race strategy, and a system that only ever
escalates is a system the pit wall learns to ignore."*

**Beat 10 — "The panel that refuses to draw."** ⭐ *the ethics beat*
The biometrics panel. Show the fake version you *could* have shipped — a plausible heart-rate
trace — then delete it and show the real empty state. *"A fabricated heart-rate trace beside a
measured track temperature is indistinguishable from a measurement."*

**Beat 11 — "Hamilton won and our model panicked."** ⭐ *the memorable failure*
2024 British GP. Hamilton's home win. Victory radio, shouting, elated. Score: **97.6
Stressed**, filed against lap 52. Acoustically identical to acute distress. The fix wasn't a
bigger model — it was **context**: tag the radio by phase and tell the system that post-race
elation is not in-race stress.

**Beat 12 — "Silent wrong answers are the enemy."**
A gallery of bugs that produced *no error at all*, only a confident wrong number:
- Silero VAD with a 512-sample window instead of 576 → near-zero speech probability on obvious
  speech.
- Matching FastF1's `Time` instead of `Date` → every telemetry lookup silently clamped to the
  last sample of the lap.
- sklearn's binary coefficient convention → every clip classified as class 0 **at 100 %
  confidence**.
- `USE_FIXTURES=1` by default → `/api/analyse` returned canned data **without reading the
  uploaded file**.
- Zero-filled prosody → a 0 Hz pitch reads as extreme fatigue.
- Zero-filled correlations → the headline *"stress peaks N laps before pace loss (r = 0.00)."*
*This is the beat that says "these people can engineer."*

**Beat 13 — "Watch it actually run."**
The WebSocket stage stream. STT sitting for four seconds. Three branches ticking past in
order. *"A 13-second silent 'Analysing…' button is indistinguishable from a fixture replay
with a setTimeout."*

**Beat 14 — "It cites its sources or it doesn't ship."**
The findings citation gate. Every finding must cite laps we hold; the ones that don't are
dropped — **and the drop count is displayed in the UI.**

**Beat 15 — "Built for a room with no wifi."**
The offline story as a single checklist that ticks itself off: cache-only FastF1, four
pre-warmed local models, self-hosted variable fonts, build-time portraits and circuit
geometry, cached radio manifests, `offline_ready: true`.

**Beat 16 — "The venue redraws itself."**
The circuit morph. Silverstone → Monza → Monaco, from real GPS traces of the fastest race lap.
Nine circuits.
*Visual:* SVG path interpolation between the real `lib/circuits.ts` paths. Cheap, gorgeous,
and genuinely true.

**Closing beat — the honest ledger.**
Side by side: what was built, and what it does not yet prove. Then the roadmap: human
validation of the labels first, more clips per driver second, real biometrics third.

---

## 23. Suggested scroll-site structure, section by section

A concrete running order. Each section lists the payload data you'd need.

| # | Section | Scroll mechanic | Data / assets needed |
|---|---|---|---|
| 00 | **Cold open** | Full-bleed carbon; five start lights illuminate on scroll, extinguish together, title wipes in | Start-lights motion (steal `StartLights.tsx`'s state-driven approach), Archivo `wdth 112` |
| 01 | **The deaf pit wall** | Telemetry channels stream in; the DRIVER channel stays flat | Beat 1 |
| 02 | **No word for tired** | Label chips assemble, then the empty slot | IEMOCAP/RAVDESS label lists |
| 03 | **Fatigue is physics** | Six feature cards reveal in sequence, each with its arrow | §6.4 table |
| 04 | **Architecture assembles** | The three-branch diagram draws itself branch by branch, then the fusion head | §5 + §6.7 |
| 05 | **The eleven stages** | Horizontal pinned scroll through the pipeline stages | `PipelineStage` enum, real per-stage timings |
| 06 | **Loud for them** | Two driver waveforms, same absolute pitch, opposite verdicts | §8 + the three-tier chain |
| 07 | **THE TOGGLE** ⭐ | Sticky section; a real Naive/Fusion switch redraws a real timeline | A baked `Timeline` JSON for one good driver/session (suggest `2023-dutch-r` / `ALO`) |
| 08 | **The numbers** | Counters animate to value | 88.75 % · 45.13 % · +43.6 pts · 853 · 9 · 23 · 855 |
| 09 | **The real weights** | The coefficient matrix types itself in; the Tired row highlights | §7 table |
| 10 | **Did the voice move first** | Two curves slide across each other; the lag bar chart fills | Lead-lag payload for the demo pair |
| 11 | **…and it says no** ⭐ | The "Indicative only — N clips" line writes itself in | §10 |
| 12 | **From mood to instruction** | Five strategy cards deal in; HOLD gets the spotlight | §9 table + the docstring quote |
| 13 | **The moment around a call** | A radio call plays; corner, speed, tyre, gaps, flags resolve around it | One real `ClipContext` + circuit path |
| 14 | **The venue redraws** | SVG path morph across nine circuits | `lib/circuits.ts` paths + §17.3 table |
| 15 | **Ask the pit wall** | A scripted chat exchange typing out, tool names appearing as chips | The 10-tool list |
| 16 | **It cites or it's dropped** | Findings appear; two visibly fail the gate and are struck out; the drop counter increments | §12.3 |
| 17 | **Hamilton won, we panicked** ⭐ | Waveform + transcript + the 97.6 score, then the phase tag corrects it | §12.3 |
| 18 | **Silent wrong answers** | Six bug cards, each showing the wrong-but-confident output | Beat 12 |
| 19 | **The panel that refuses to draw** ⭐ | The fake trace is drawn, then erased, then the honest empty state | §13 |
| 20 | **Honesty by construction** | The §19 catalogue as a long scroll of mechanism/reason pairs | §19 table |
| 21 | **Built for no wifi** | A checklist ticking itself; ends on `offline_ready: true` | §18 |
| 22 | **The honest ledger** | Two columns: proven / not yet proven | §21 |
| 23 | **Stack & scale** | Version grid, dependency stories, on-disk footprint | §17.7, §17.9 |
| 24 | **Roadmap + close** | Human labels → more clips per driver → real biometrics | — |

**Assets to copy out of this repo into the presentation project:**
- `frontend/src/lib/circuits.ts` — nine real SVG circuit paths (self-contained, no deps)
- `frontend/src/lib/drivers.ts` — names, numbers, team colours, helmet schemes
- `frontend/public/fonts/*.woff2` — the three variable fonts
- `frontend/public/drivers/*.jpg` + `CREDITS.md` — 22 licensed portraits
- `frontend/src/index.css` — the token block and keyframes (§16)
- One or two real `data/results/*.json` files — genuine `ClipAnalysis` payloads
- One baked `GET /api/timeline/...` response — for the toggle section
- `data/labels/fusion_head.json` — the real coefficient matrix

**Production guidance:**
- **Everything animated must be true.** This project's whole argument is that it doesn't
  fabricate. A fabricated chart on the presentation site would undercut the thesis more than
  a plain one ever could. Use real payloads; if you must fake something, label it.
- **Respect `prefers-reduced-motion`.** The app does; the deck must.
- **Red means critical only.** Cyan is the brand. Amber is stressed. Green is calm. Don't
  break the mapping the dashboard taught.
- **Colour is never the only channel.** Glyph + words alongside, as in `StrategyCalls`.
- **Type does the work.** Archivo wide for signage, Archivo condensed for numbers, Inter for
  prose, JetBrains Mono for anything a machine emitted verbatim.

---

## 24. Glossary

| Term | Meaning |
|---|---|
| **Pace delta** | Lap time minus a centred 5-lap rolling median of that driver's own *clean* laps. Positive = slower. Never a comparison to the field. |
| **Clean lap** | Not unset, not an in/out lap, purely green track status (`{"1"}`), not steward-deleted. |
| **Stress index** | `100 * (P(Stressed) + 0.9 * P(Tired))`. 0–100. Ambiguous alone, since both non-calm classes raise it. |
| **Naive mode** | Argmax of the acoustic SER model mapped onto 3 classes. **Cannot produce Tired.** |
| **Fusion mode** | The 8-feature logistic-regression head over all three branches. |
| **Lead-lag** | Cross-correlation of stress vs pace-delta across lag offsets −4…+4 laps. Negative peak = voice moved first. |
| **Baseline / z-score** | Prosody features standardised against a reference distribution — this driver's Calm calls, the cohort, or population priors. |
| **`source`** | Which baseline tier was actually used: `driver` / `cohort` / `prior`. Always reported. |
| **`basis: "modelled"`** | A constant on `TyreState`. Every tyre number is inferred, never measured. |
| **`fitted`** | Whether a trained fusion head was used. Defaults `False`. |
| **Citation gate** | `findings.validate()` — drops LLM findings that cite laps we don't hold or cite no lap. |
| **`dropped_findings`** | How many findings the gate rejected. Shown in the UI. |
| **Detached upload** | A clip uploaded with no lap number; it belongs to no lap, so the session panels dim and a banner says so. |
| **Phase** | Radio call classification: `racing` / `pre_race` / `post_race` / `unknown`. Stops victory radio reading as distress. |
| **`offline_ready`** | `/api/health` field: all four models cached **and** sessions cached. The demo-morning check. |
| **`GP_AGENT`** | Env flag. `1` mounts the chat + findings routers. Absent → those endpoints 404 → those panels hide themselves. |
| **Cliff** | The point where tyre performance falls off sharply. `past_cliff` is left `None` rather than guessed. |
| **Tyre cliff / degradation slope** | s/lap trend within a stint, modelled from lap times. |
| **FastF1** | The Python library providing official F1 timing, telemetry, weather and race-control data. Used **cache-only** here. |
| **OpenF1** | Third-party API providing the `/team_radio` manifest that maps broadcast timestamps to drivers. |

---

## 25. Repo file map

```
grandprix/
├─ README.md                    ⚠️ stale numbers — see §20
├─ SETUP.md                     mostly accurate ops guide; clip counts stale
├─ SOLUTION.md                  50 KB / 1485 lines; ⚠️ pseudo-code + stale metrics
├─ PROJECT_KNOWLEDGE_BASE.md    ← this file
│
├─ backend/
│  ├─ requirements.txt
│  ├─ app/
│  │  ├─ main.py             96   FastAPI app, lifespan model warm-up, router mounting
│  │  ├─ config.py          145   All constants, "greppable at 2am on demo eve"
│  │  ├─ schemas.py         730   ★ THE API CONTRACT — single source of truth
│  │  ├─ agent_config.py    199   Prompts, model candidates, token budgeting
│  │  ├─ groq_client.py      82   GroqUnavailable + runtime model resolution
│  │  ├─ routers/
│  │  │  ├─ health.py             /api/health — offline_ready
│  │  │  ├─ session.py            /api/sessions, /api/timeline, /api/laps
│  │  │  ├─ analyse.py      165   POST /api/analyse + WS /api/analyse/ws
│  │  │  ├─ clips.py        140   /api/clips/library, /{clip_id} (audio), /
│  │  │  ├─ biometrics.py   116   POST + GET biometrics
│  │  │  ├─ agent.py        627   🔒 10 tools + tool-calling loop
│  │  │  ├─ findings.py      60   🔒 GET /api/findings/{session_id}
│  │  │  └─ agent_cache.py   90   In-memory TTL cache
│  │  ├─ pipeline/
│  │  │  ├─ run.py          141   Orchestrator; emits ProgressEvents
│  │  │  ├─ preprocess.py    84   Resample, RMS-normalise, duration guards
│  │  │  ├─ vad.py          173   Silero v5 ONNX; the 576-sample window
│  │  │  ├─ stt.py                distil-whisper/distil-small.en
│  │  │  ├─ prosody.py      115   ★ 8 features; the fatigue-capable branch
│  │  │  ├─ ser.py                wav2vec2 → stress weight projection
│  │  │  ├─ text_emotion.py       DistilRoBERTa + domain keyword cues
│  │  │  ├─ baseline.py     152   Per-driver z-scores; driver→cohort→prior
│  │  │  ├─ fusion.py       234   ★ The head + NAIVE_MAP + rule-based fallback
│  │  │  ├─ strategy.py     166   ★ Five deterministic calls, incl. HOLD
│  │  │  ├─ leadlag.py      132   ★ Cross-correlation + significance guard
│  │  │  ├─ findings.py     718   ★ LLM briefing + citation gate
│  │  │  └─ models.py       108   Lazy cached loaders, warm(), local_files_only
│  │  ├─ data/
│  │  │  ├─ timeline.py     258   ★ Composes the whole Timeline payload
│  │  │  ├─ laps.py         146   Pace deltas, clean-lap rules, track status
│  │  │  ├─ store.py        140   index.csv reader + result cache
│  │  │  └─ fastf1_client.py 131  Cache-only FastF1 access, make_session_id()
│  │  ├─ context/                 ★ 8 modules, ~1300 lines, UNDOCUMENTED in README
│  │  │  ├─ provider.py     147   Cached vs Live provider seam
│  │  │  ├─ resolver.py     207   UTC-instant resolver; recovers 100 blank laps
│  │  │  ├─ frames.py        86   Per-session dataframe cache
│  │  │  ├─ track.py        151   Weather, grip proxy, track evolution
│  │  │  ├─ tyre.py         168   Modelled tyre state ("no public source…")
│  │  │  ├─ position.py     173   Intra-lap position + telemetry; Date vs Time
│  │  │  ├─ situation.py    216   Position, gaps, flags; verified vs 2024 GBR L41
│  │  │  └─ biometrics.py   209   Heart-rate ingestion and alignment
│  │  └─ fixtures/demo.py   267   Synthetic fixtures; shouts "THIS IS NOT REAL DATA"
│  ├─ scripts/                    11 scripts — see §18
│  └─ tests/test_agent.py         ⚠️ the only test file on disk
│
├─ frontend/
│  ├─ package.json                React 19.2.8 · TS 6.0.2 · Vite 8.2.0
│  ├─ tailwind.config.js          Colour/type/shadow/animation extensions
│  ├─ vite.config.ts              /api proxy with ws:true
│  ├─ .oxlintrc.json              oxlint, not ESLint
│  ├─ public/
│  │  ├─ drivers/                 22 portraits + CREDITS.md (Wikimedia, build-time)
│  │  └─ fonts/                   3 self-hosted variable woff2
│  └─ src/
│     ├─ App.tsx            696   ★ State, layout, detached-upload honesty
│     ├─ api.ts             216   REST + WS client; ApiError carries status
│     ├─ types.ts                 Hand-kept mirror of schemas.py
│     ├─ constants.ts       211   ⚠️ contains the SUPERSEDED palette
│     ├─ index.css          725   ★ The design system (authoritative tokens)
│     ├─ main.tsx / shot.mjs      Entry / Playwright screenshots
│     ├─ lib/                     circuits · drivers · trackGeometry · verdict
│     └─ components/              26 files — see §15.2
│
└─ data/
   ├─ cache/            FastF1 pickles + fastf1_http_cache.sqlite  (2023/, 2024/)
   ├─ clips/            855 mp3s + index.csv (COMMITTED)
   ├─ labels/           fusion_head.json + driver_baselines.json (COMMITTED)
   ├─ results/          854 cached ClipAnalysis JSONs
   ├─ context/          9 session contexts + 9 OpenF1 radio manifests
   └─ biometrics/       EMPTY — by design (§13)
```

★ = read this first if you need to go deeper. 🔒 = behind `GP_AGENT=1`.

---

*Compiled 2026-08-21 by reading the source, the data files and the trained weights directly.
Where this document and the repo's own README/SOLUTION disagree, this document is the one that
was checked against disk.*
