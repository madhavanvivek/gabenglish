# Gabroo Real-Time Voice Architecture

Status: Architecture proposal plus an implemented server-side WebSocket control-plane prototype on the current feature branch. Streaming audio, VAD, full-duplex conversation, and real-time avatar/audio synchronization are not implemented.

## 1. Goal

Evolve Gabroo from the current explicit record → upload → transcript review → confirm → text reply → MP3 playback flow into a responsive, low-latency spoken conversation.

The first production milestone should be **streaming, half-duplex turn-taking**: the learner speaks, Gabroo listens until the turn ends, Gabroo responds with synchronized speech and avatar animation, and only then does the next learner turn begin. This is safer and easier to validate than open-microphone full duplex. Full duplex is a later research milestone, not a release assumption.

The existing reviewed-transcript flow remains available as a fallback until the new path passes device, privacy, reliability, and voice-quality acceptance.

## 2. Verified repository baseline

The current implementation already provides useful seams:

- Authenticated, subscription-gated conversation endpoints under `/api/v1/gabroo/conversations`; conversation history, learner memory, vocabulary and teaching policy are assembled server-side.
- Authenticated speech-recognition endpoint `POST /api/v1/gabroo/recognition`. It accepts a complete audio body, requires `x-gabroo-consent: true`, and returns `review_required: true`. The recognition provider contract receives a complete `Uint8Array`; it is not a streaming recognizer.
- Authenticated speech playback ticket and MP3 endpoints under `/api/v1/gabroo/speech`. The synthesis provider supports a streamed MP3 response, but synthesis starts from complete text; it is not token/audio co-streaming from the language model.
- Provider-neutral live-session and turn state contracts exist in `packages/contracts/src/gabroo-live-session.ts` and `gabroo-turn.ts`. These are state contracts only; they do not create a transport or capture audio.
- Avatar viseme/expression/gesture timelines exist in `gabroo-avatar.ts`; `gabroo-avatar-runtime.ts` samples them against real playback elapsed time. The synthesis response currently does not provide a validated timeline or phoneme alignment, and the runtime is not proof of a rendered 3D avatar integration.
- Mobile recording and playback already coordinate Expo AV's process-wide audio mode, serialize mode transitions, and guard stale asynchronous cleanup.

Do not describe the current app as streaming, full duplex, continuously listening, or locked-screen capable.

## 3. Target architecture

### Mobile session coordinator

One coordinator owns the session ID, generation/sequence number, connection state, active learner turn, active tutor response, cancellation and reconnect policy. It is the only component allowed to start/stop capture or accept incoming audio for the current session.

Use the existing provider-neutral session state machine as the domain boundary. Extend it only when a concrete transport requires a new state or event. Every asynchronous callback must carry the session ID and turn ID; callbacks for an old generation are ignored.

### Capture and turn detection

- Ask for microphone permission and explicit session consent before connecting or capturing.
- Begin capture only after the user starts a session and the server accepts it.
- Use on-device voice activity detection (VAD) to identify speech start/end; do not continuously upload silence.
- Add configurable end-of-turn silence, maximum utterance duration, and a visible listening state.
- Provide a visible push-to-talk fallback when VAD is unavailable or unreliable.
- Stop capture immediately on user stop, permission revocation, app focus loss (unless a separately approved native foreground mode is active), route failure, or session expiry.
- Never use a hidden microphone, background polling, or a transcript to auto-submit without the session's explicit turn policy.

### Realtime transport and API gateway

Recommended first implementation: an authenticated WebSocket session transport between mobile and the Fastify API, subject to a short technical spike confirming supported React Native WebSocket behaviour, proxy/load-balancer timeouts, deployment limits, and graceful shutdown.

Do not send a long-lived access token in a URL query string. Authenticate the normal HTTPS session-creation request, then issue a short-lived, single-use, session-scoped connection ticket. Bind it to the learner, entitlement, allowed origin/device session, expiry, and intended websocket path. Store only a digest; consume atomically. Redact tickets and audio metadata from logs.

The transport should carry typed control events and bounded audio frames. Enforce:
- maximum frame bytes, total bytes per turn, duration and concurrent sessions;
- monotonically increasing sequence numbers and turn IDs;
- backpressure and bounded server queues;
- heartbeat and idle timeout;
- cancellation on disconnect, entitlement loss, session expiry or learner stop;
- per-learner rate limits and concurrency limits;
- no raw audio persistence by default.

If the spike shows WebSocket is not viable for the target mobile/network environments, compare WebRTC with a managed realtime media gateway before implementation. Do not couple domain contracts to a vendor SDK.

### Server-side turn pipeline

For each accepted learner turn:

1. Receive bounded audio frames and run streaming speech recognition through an injected provider adapter.
2. Emit partial transcript hypotheses only as provisional UI data; do not store them as confirmed learner messages.
3. Detect end-of-turn and finalize a transcript.
4. Apply the existing learner context, subscription entitlement and teaching policy.
5. Generate Gabroo's text response. Preserve the existing text conversation path as the compatibility fallback.
6. Generate speech audio and timing/alignment metadata. Stream audio chunks to the client as soon as safely available.
7. Emit a terminal turn event with completion/failure status.

The first release should remain half-duplex: server rejects or queues a new learner turn while Gabroo is speaking, unless the learner explicitly interrupts. An interrupt cancels generation and playback and advances the turn generation before a new capture can begin.

### Speech and avatar synchronization

Audio playback is the source of truth for animation time. Never run an independent generic talking loop.

A speech response should carry:
- stable audio/segment ID;
- codec, sample rate, channel count and duration when known;
- ordered audio chunks with sequence numbers;
- timed viseme/phoneme events mapped to the canonical Gabroo rig;
- optional expression and gesture events;
- a terminal marker and cancellation semantics.

The mobile renderer samples the timeline using the actual playback clock and checks the active audio ID on every tick. Missing/invalid alignment must fall back to neutral mouth controls, not fabricated lip motion. If the voice provider cannot return reliable alignment, add a separate alignment adapter or a validated forced-alignment stage; do not claim accurate lip-sync from text length or guessed timings.

### Provider adapters

Keep recognition, language generation, speech synthesis and alignment as separate interfaces. Credentials stay on the server. Each adapter must support abort/cancellation, bounded output, timeouts, structured errors and provider-independent tests.

Do not select a generic default voice. The production voice ID must be explicitly approved through Gabroo's voice audition/benchmark process. Natural Kerala Malayalam pronunciation, English code-switching quality, latency and consistency are release gates, not configuration assumptions.

## 4. Versioned control protocol contract

Control messages are JSON objects with a version, type, session ID, and where applicable a turn ID and sequence number. Audio travels as binary frames associated with the current turn.

Client → server:
- `session.ready`: confirms client is ready after authenticated connection.
- `turn.start`: begins an explicitly consented learner turn using 16 kHz mono PCM in the current transport prototype.
- `audio.frame`: JSON metadata followed immediately by one binary frame; metadata identifies the turn, sequence and exact byte length.
- `turn.end`: ends the learner turn; server finalizes recognition.
- `tutor.interrupt`: cancels the active tutor response.
- `session.stop`: stops capture and closes the session.

Server → client:
- `session.connected`: authenticated control connection established; this does not mean audio streaming is ready.
- `session.accepted`: future negotiated audio capabilities, emitted only after an audio pipeline is actually available.
- `turn.accepted`: accepted turn ID and limits; it acknowledges a bounded audio turn, not a live partial-transcript stream.
- `transcript.partial`: provisional transcript, clearly marked as unconfirmed.
- `transcript.final`: buffered recognition result for the ended turn, with detected language and `review_required: true`; it is never submitted to the conversation automatically.
- `tutor.text.delta` / `tutor.text.final`: response text stream.
- `tutor.audio.start` / binary audio frames / `tutor.audio.end`: ordered speech output.
- `tutor.timeline`: validated viseme/expression/gesture timeline associated with an audio ID.
- `turn.completed`, `turn.failed`, `session.interrupted`, `session.closed`: terminal lifecycle events.

The versioned message and frame-metadata schemas live in `packages/contracts/src/gabroo-realtime-protocol.ts`. The API now issues authenticated, paid-entitlement-gated one-time session tickets and exposes an atomic consume helper. A WebSocket upgrade handler is implemented at `/api/v1/gabroo/realtime/connect`: it accepts the ticket in the `Sec-WebSocket-Protocol` header (never a URL), checks the configured browser origin when present, atomically consumes the ticket, rechecks the learner account and paid entitlement, binds the connection to the ticket's session/user, and allows only one active connection per learner in this process. It emits `session.connected`, handles `session.stop`, sends periodic ping heartbeats, and enforces 60-second idle and 15-minute absolute connection limits. The WebSocket accepts `turn.start`, JSON frame metadata followed by matching binary payloads, and `turn.end` for 16 kHz mono PCM. It enforces sequential frame numbers, exact payload lengths, 64 KiB per-frame bounds, a 5 MiB/120-second turn ceiling and a 60-frame/second limit. At turn end it currently buffers the bounded PCM in memory, wraps it as WAV, and calls the existing complete-file recognition provider; it returns a final transcript marked `review_required: true`, without creating or sending a conversation message. This is buffered end-of-turn recognition, not streaming STT or partial transcripts. Recognition can be interrupted and is cleaned up on session stop/disconnect; a second learner turn is rejected while recognition is pending. The mobile app now has a consent-gated helper to request the one-use session ticket through its normal secure token-refresh path, plus a typed WebSocket transport that validates server messages, sends ordered metadata/binary frame pairs, and exposes turn end/interruption/session stop controls. The connection helper waits for `session.connected` and fails closed on malformed messages, socket errors, early close or a 12-second handshake timeout. This is transport/session setup only: it does not open the microphone or provide PCM capture. The mobile recording/review/confirm fallback remains available until a native streaming capture adapter and device QA are complete.

The ticket endpoint is `POST /api/v1/gabroo/realtime/session-ticket`. It requires the existing verified learner authentication, an active subscription, and the explicit `x-gabroo-consent: true` confirmation before issuing a connection ticket. Tickets expire after 60 seconds, are single-use, and only their SHA-256 digests are persisted in `gabroo_realtime_session_tickets` (migration `0025_gabroo_realtime_session_tickets.sql`). Issuing a replacement invalidates the learner's previous unconsumed ticket. `consumeGabrooRealtimeSessionTicket` performs the atomic expiry-checked consume used by the WebSocket upgrade handler. The transport validates message schemas, exact frame lengths and sequence order. Audio bytes are held only in bounded process memory for the duration of the turn and are not persisted or logged. Buffered STT uses the existing provider adapter; true streaming STT and mobile capture remain disabled.

## 5. Privacy, safety and operational rules

- No capture before explicit permission and session consent.
- Visible, persistent listening state and immediate stop control.
- Raw audio is transient by default; do not write audio frames to application logs, analytics, database rows or object storage.
- Partial transcripts are ephemeral. Persist only the final learner message under the existing conversation retention policy after the turn is accepted.
- Disconnect and cancellation must abort provider work and discard uncommitted audio/transcript state.
- Use TLS, single-use connection tickets, strict origin checks, bounded message parsing and rate limits.
- Redact `Sec-WebSocket-Protocol` at the reverse proxy/load balancer because the short-lived ticket is carried there; never log the raw ticket or audio payloads.
- Never expose provider credentials or raw access tokens to the mobile client.
- Provide a clear fallback to the current record/review/confirm path when streaming is unavailable.
- Locked-screen/background microphone support is a separate native platform project with its own permission, foreground-service, child privacy and app-store review. This architecture does not authorize background capture.

## 6. Delivery plan and gates

### Stage A — transport and provider spike
- [ ] Verify WebSocket support in the current Expo/React Native target builds and hosting topology. The API-side handshake prototype is not evidence of mobile or production-proxy compatibility.
- Measure connect time, round-trip latency, audio frame stability, reconnect behaviour and server resource cost.
- Select streaming STT/TTS providers only after testing Malayalam, English and mixed Malayalam-English samples.
- Record vendor terms, data processing, retention, regional processing and child/family privacy review.

Exit: written decision on transport/provider feasibility; no production microphone changes.

### Stage B — contracts and server session foundation
- [x] Define versioned control-event and bounded audio-frame metadata schemas in `packages/contracts`.
- [x] Add initial contract tests for protocol versioning, malformed audio format, frame bounds, payload-length matching and server event shapes.
- [x] Add authenticated, subscription-gated session-ticket issuance with explicit `x-gabroo-consent: true`, a 60-second lifetime, one unconsumed ticket per learner, and SHA-256 digest-only persistence. The raw ticket is returned once with `Cache-Control: private, no-store`.
- [x] Add an atomic single-use ticket-consumption helper for the future WebSocket handshake; malformed, expired and replayed tickets fail closed.
- [x] Bind ticket consumption to the WebSocket upgrade; recheck account/entitlement, validate configured browser origins, and bind the connection to its consumed session/user.
- [x] Add one-active-connection-per-learner process guard, ping/pong heartbeat, 60-second idle timeout, 15-minute session ceiling, and clean shutdown handling.
- [ ] Add distributed connection/rate limits and session revocation across multiple API instances.
- [x] Add WebSocket upgrade validation and a live handshake/close integration test.
- [x] Accept 16 kHz mono PCM turns with JSON frame metadata and immediately-following binary payloads.
- [x] Enforce exact payload lengths, contiguous sequence numbers, 64 KiB frames, 5 MiB/120-second turn bounds and 60 frames/second.
- [x] Add live integration coverage for valid metadata-plus-binary frames and the buffered recognition review response.
- [x] Abort in-flight recognition on learner interruption/session teardown and prevent overlapping half-duplex turns.
- [x] Add integration coverage for invalid frame sequence and recognition cancellation.
- [ ] Add WebSocket invalid-length, stale-session, backpressure and multi-instance tests.
- Keep audio bytes transient and prove no persistence/logging.

Exit: authenticated test client can connect, stream bounded 16 kHz mono PCM frames, receive a learner-review transcript through the existing complete-file STT adapter, interrupt recognition, and close safely without microphone capture. True streaming STT, mobile device feasibility and provider integration remain outstanding.

### Stage C — streaming learner turn
- Implement mobile capture adapter, VAD, bounded frame streaming and push-to-talk fallback.
- Add streaming recognition adapter and provisional/final transcript events.
- Add interruption, app background, permission revocation, network loss and audio-route recovery.
- Keep existing record/review/confirm fallback available.

Exit: physical-device turn capture and transcript quality accepted across target Android devices and real network conditions.

### Stage D — streamed tutor response
- Stream tutor text/audio with cancellation and backpressure.
- Reuse the existing teaching policy and conversation storage rules.
- Measure end-of-utterance-to-first-audio latency, interruption latency and completion reliability.
- Preserve the existing MP3 path as fallback.

Exit: quality and latency thresholds are met on representative Malayalam, English and code-switched turns.

### Stage E — synchronized Gabroo avatar
- Obtain provider timing/alignment or implement a validated alignment adapter.
- Map visemes to the single approved Concept C rig; synchronize to the actual audio playback clock.
- Add expression and gesture timing with deterministic cancellation.
- Run frame/audio sync review with human raters; do not accept a looping mouth animation as lip-sync.

Exit: measurable audio/viseme synchronization and approved character consistency across devices.

### Stage F — screen-free and production hardening
- Only after Stages C–E: evaluate Android foreground microphone service and iOS background-audio feasibility separately.
- Complete physical-device QA for calls, Bluetooth, wired headsets, lock/unlock, background/foreground, permission changes, thermal/battery, network handoff and force-stop.
- Complete privacy, child/family, security and store-policy review.

Exit: documented device matrix and release sign-off. CI alone is insufficient.

## 7. Initial performance and quality metrics

Instrument aggregate timings without retaining raw audio:
- session connection time;
- learner end-of-speech → final transcript;
- learner end-of-speech → first tutor audio;
- first audio → complete playback;
- interruption request → playback stopped;
- reconnect success and failed-turn rate;
- VAD false-end / missed-end rate;
- Malayalam, English and mixed-language transcript quality from consented test sets;
- human-rated naturalness, pronunciation, conversational relevance and voice identity consistency;
- human-rated viseme/audio synchronization.

Set numeric release thresholds only after the Stage A benchmark establishes a baseline on representative devices and network conditions. Never invent a latency or accuracy claim.

## 8. Explicit non-goals for this milestone

- No always-on or hidden microphone.
- No automatic sending of unreviewed transcripts through the existing fallback path.
- No full-duplex barge-in until half-duplex interruption is reliable.
- No claim of locked-screen microphone support.
- No fabricated lip-sync, generic talking loop or unapproved default voice.
- No vendor-specific protocol leaking into the learning contracts.
- No replacement of the current working fallback before the streaming path passes its acceptance gates.
