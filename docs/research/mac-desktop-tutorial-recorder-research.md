# Mac Desktop Tutorial Recorder - Technical Research Document

## Table of Contents
1. [Existing Solutions Analysis](#1-existing-solutions-analysis)
2. [Mac-Specific APIs & Technologies](#2-mac-specific-apis--technologies)
3. [Framework Options for Mac Desktop Apps](#3-framework-options-for-mac-desktop-apps)
4. [AI/ML Capabilities](#4-aiml-capabilities)
5. [Multi-App Tutorial Specific Challenges](#5-multi-app-tutorial-specific-challenges)
6. [Key Takeaways & Recommendations](#6-key-takeaways--recommendations)

---

## 1. Existing Solutions Analysis

### 1.1 ScreenFlow (by Telestream)
- **What it does well**:
  - Premier Mac-native all-in-one recording + editing solution
  - Excellent multi-monitor recording support
  - Seamless multi-app recording: switch between apps without missing a beat
  - Simultaneous capture from external audio, Mac app audio, and iPhone
  - AI-powered features (2025/2026): audio cleanup, transcript-based editing, auto-captions, pacing suggestions
  - Styles and Templates for tutorial series consistency
  - Can show keyboard interactions and highlight areas
- **Gaps**:
  - Mac/iOS only (no cross-platform)
  - $169-$287 one-time purchase (per 2 machines)
  - No automatic step detection or narration
  - Limited interactivity features (no quizzes, clickable CTAs)
  - Heavy manual editing still required to create step-by-step tutorials from raw recordings
  - No semantic understanding of user actions

### 1.2 OBS Studio
- **What it does well**:
  - Free, open-source, incredibly flexible
  - Extensible plugin architecture (C/C++, Lua, Python scripts)
  - Mac-specific `mac-capture` plugin using ScreenCaptureKit
  - Supports sources (display/window/app capture), outputs, encoders
  - Can capture multiple sources simultaneously
  - Large community and ecosystem
- **Gaps**:
  - Steep learning curve; optimized for streaming, not tutorial creation
  - No built-in video editor
  - No automatic step detection or narration
  - Mac-specific limitation: stalls with multiple display widgets in same window
  - Raw capture tool - requires external post-processing for tutorials

### 1.3 Loom
- **What it does well**:
  - Fastest path from recording to sharing
  - Instant link sharing, cloud hosted
  - Simple cam + screen recording
  - Good for quick "how-to" videos, internal team comms
  - AI features: auto-titles, chapters, summaries, transcripts
- **Gaps**:
  - Not a production suite - minimal editing
  - No automatic step extraction
  - Cloud-dependent (no offline)
  - No per-window capture intelligence
  - No action detection or semantic understanding
  - Subscription model ($12.50-$15/user/month)

### 1.4 Scribe
- **What it does well**:
  - **Automatic step capture**: Records clicks and generates screenshot-based guides with text instructions automatically
  - Browser extension + desktop app
  - Scribe Pages: Combine multiple guides, videos, text into one document
  - AI-powered descriptions for each captured step
  - Fastest workflow-to-documentation path
- **Gaps**:
  - Outputs static screenshot guides, not video tutorials
  - Browser extension captures are more reliable than desktop
  - Limited to click-based actions (misses complex gestures, drag-and-drop nuances)
  - No video output / no timeline editing
  - No voice narration in guides

### 1.5 Tango
- **What it does well**:
  - Automatic step capture similar to Scribe
  - **Guidance feature**: Live on-screen walk-throughs showing users where to click in real-time
  - Clean, visual output format
  - Interactive overlay approach for user onboarding
- **Gaps**:
  - Primarily browser-based (Chrome extension)
  - Desktop capture limited compared to browser capture
  - Static guide output primarily (though Guidance is interactive)
  - No video tutorial generation
  - No voice narration

### 1.6 Guidde
- **What it does well**:
  - **AI-powered video tutorial generation**: Records workflow and generates complete video tutorials with voiceover
  - "Magic Capture": Identifies clicks, scrolls, keystrokes automatically
  - AI storyline generation in under 2 seconds
  - 100+ voices and languages for automated narration
  - Branded Player with customizable fonts, themes, CTAs
  - 11x faster than traditional tutorial creation
  - Embeds, sharing, workspace libraries
- **Gaps**:
  - Primarily Chrome extension based (browser workflows)
  - Desktop app coverage less mature than browser capture
  - Cloud-dependent for AI processing
  - Multi-app desktop workflow capture is limited
  - Subscription pricing ($20-$44/creator/month)
  - Cannot handle complex multi-app desktop tutorials spanning Figma, VS Code, Terminal, etc.

### 1.7 Competitive Gap Analysis

| Feature | ScreenFlow | OBS | Loom | Scribe | Tango | Guidde | **Our Opportunity** |
|---------|-----------|-----|------|--------|-------|--------|-------------------|
| Multi-app desktop recording | Good | Good | Basic | Limited | Limited | Limited | **Full** |
| Automatic step detection | No | No | No | Yes | Yes | Yes | **Yes** |
| AI narration/voiceover | No | No | No | No | No | Yes | **Yes** |
| Per-window capture | No | Partial | No | No | No | No | **Yes** |
| Action semantic understanding | No | No | No | Basic | Basic | Moderate | **Advanced** |
| Video tutorial output | Yes | Yes | Yes | No | No | Yes | **Yes** |
| Offline/local processing | Yes | Yes | No | No | No | No | **Yes** |
| Interactive output | No | No | Limited | Limited | Yes | Limited | **Yes** |
| Mac-native performance | Excellent | Good | Good | N/A | N/A | N/A | **Excellent** |

**Key Opportunity**: No existing tool combines Mac-native multi-app desktop recording with intelligent action detection, automatic step extraction, and AI-powered tutorial narration — especially for complex workflows spanning multiple desktop applications.

---

## 2. Mac-Specific APIs & Technologies

### 2.1 ScreenCaptureKit (macOS 12.3+)

The **modern, recommended** framework for screen capture on macOS.

- **Core Architecture**:
  - `SCShareableContent` — enumerates available content (displays, windows, apps)
  - `SCContentFilter` — defines what to capture (any combination of windows, apps, displays)
  - `SCStreamConfiguration` — configures how to capture (resolution, frame rate, pixel format, color space)
  - `SCStream` — the actual capture stream with start/stop controls
  - `SCStreamOutput` protocol — receives media sample buffers
  - `SCScreenshotManager` — single-frame screenshots (replaces deprecated `CGWindowListCreateImage`)

- **Key Capabilities**:
  - Capture any combination of windows, apps, and displays simultaneously
  - Up to native resolution and frame rate
  - Dynamic property changes without recreating the stream (resolution, frame rate, pixel format)
  - GPU-backed capture buffers (reduced memory copies)
  - Hardware-accelerated content capture, scaling, pixel/color format conversion
  - Both video and audio capture (audio from macOS 13+)
  - Per-window and per-app filtering

- **Privacy/Permissions**:
  - Requires user consent via "Screen Recording" privacy setting
  - macOS Sequoia (15.0): Users must re-authorize monthly and after reboots
  - Deprecated APIs being phased out in favor of ScreenCaptureKit

- **Relevance**: This is the **primary capture engine** we should build on. It gives us per-window capture, multi-display support, and hardware acceleration.

### 2.2 AVFoundation

- Audio/video recording and processing framework
- Can compose multiple audio/video tracks
- Provides `AVAssetWriter` for encoding captured frames to video files
- Works alongside ScreenCaptureKit for the encoding/writing pipeline
- Supports hardware-accelerated H.264/H.265 encoding via VideoToolbox

### 2.3 CGWindowList / CGWindowListCreateImage (Legacy)

- `CGWindowListCopyWindowInfo` — returns metadata for all windows (title, bounds, owning app, layer, etc.)
  - **Not deprecated** — still useful for enumerating and inspecting windows
- `CGWindowListCreate` — returns list of window IDs
- `CGWindowListCreateImage` — **Deprecated** in favor of SCScreenshotManager
- Useful for: getting window positions, sizes, titles, and ownership for overlay/annotation purposes

### 2.4 Accessibility API (AXUIElement)

The **most powerful API** for understanding user actions and UI state.

- **Capabilities**:
  - Read UI hierarchy of any application (buttons, text fields, menus, labels)
  - Get element attributes: role, title, value, position, size, description
  - Monitor UI changes via notifications:
    - `AXFocusedUIElementChanged` — focus changes
    - `AXValueChanged` — input value changes
    - `AXUIElementDestroyed` — element removal
    - `AXWindowCreated` — new window
    - `AXWindowResized` — window resizing
    - `AXTitleChanged` — title changes
    - `AXFocusedWindowChanged` — window focus changes
  - Perform actions on elements (click, press, etc.)
  - Get the element under a specific screen coordinate

- **Permission**: Requires "Accessibility" permission in System Preferences
- **Libraries**: AXorcist (Swift wrapper), Apple's UIElementInspector sample code

- **Relevance**: **Critical for action detection**. When a user clicks, we can query what UI element they clicked, in which app, and what role/title it has. This enables semantic understanding of tutorial steps.

### 2.5 NSEvent Global Monitoring

- `NSEvent.addGlobalMonitorForEvents(matching:handler:)` — monitors events in OTHER apps
- `NSEvent.addLocalMonitorForEvents(matching:handler:)` — monitors events in OUR app
- Must install both for comprehensive monitoring
- **Monitorable events**: mouse clicks, mouse movement, key presses, scroll, gestures, tablet events
- **Keyboard monitoring** requires Accessibility permission
- Newer APIs: `CGPreflightListenEventAccess()`, `CGRequestListenEventAccess()`

- **Relevance**: **Primary input event source**. Captures every click, keystroke, and scroll across all apps. Combined with AXUIElement, gives us both the "what happened" (click) and "where/what" (button titled "Save" in Figma).

### 2.6 CoreGraphics

- `NSEvent.mouseLocation` — current cursor position
- `CGMainDisplayID()`, `CGGetActiveDisplayList()` — display enumeration
- Display configuration change notifications
- Screen coordinate space management across multiple displays

### 2.7 ApplicationServices / NSWorkspace

- `NSWorkspace.shared.frontmostApplication` — currently active app
- `NSWorkspace.didActivateApplicationNotification` — app switching detection
- `NSRunningApplication` — enumerate running apps, get bundle identifiers, icons
- Process-level monitoring for app launches/terminations

- **Relevance**: Essential for detecting context switches between apps during a tutorial recording.

### 2.8 Permission Summary

| Permission | Required For | User Experience |
|-----------|-------------|----------------|
| Screen Recording | ScreenCaptureKit, CGWindowList | System prompt, monthly re-auth on Sequoia |
| Accessibility | AXUIElement, keyboard monitoring | System prompt, requires restart |
| Microphone | Voice narration recording | System prompt, one-time |

---

## 3. Framework Options for Mac Desktop Apps

### 3.1 Swift + SwiftUI + AppKit (Native)

**Pros**:
- Direct access to ALL macOS APIs (ScreenCaptureKit, Accessibility, NSEvent, etc.)
- Best performance, lowest memory footprint
- Apple Silicon optimization (Metal, Accelerate, CoreML)
- Native UI feels right at home on macOS
- Code signing and notarization straightforward
- SwiftUI for modern declarative UI
- AppKit for low-level system integration when needed

**Cons**:
- macOS only (no cross-platform)
- Smaller developer pool (Swift vs. JS/TS)
- SwiftUI still maturing for complex desktop UIs
- AppKit has a steep learning curve for web developers
- Web-based tutorial viewer/editor would need separate implementation

**Best for**: Maximum performance, deep system integration, and the best user experience on Mac.

### 3.2 Tauri 2.0 (Rust + Web UI)

**Pros**:
- Small bundle size (often < 10 MB vs Electron's 100+ MB)
- Low memory usage (~30-40 MB idle)
- Fast startup (< 0.5s vs Electron's 1-2s)
- Uses system WebView (no bundled Chromium)
- Rust backend for performance-critical code
- Web UI (React, Vue, Svelte, etc.) for familiar frontend development
- Plugin system for native access: `tauri-plugin-macos-permissions`, `tauri-plugin-screenshots`
- Potential cross-platform reach (Windows, Linux)
- Strong security model: opt-in API access

**Cons**:
- Rust learning curve for backend
- Less mature ecosystem than Electron
- Native macOS API access requires writing Rust bindings or Swift bridge code
- ScreenCaptureKit integration would need custom plugin development
- Accessibility API integration not available as plugin (needs custom work)
- WebView performance limitations for video editing UI

**Best for**: Teams that want web UI flexibility with near-native performance and eventual cross-platform support.

### 3.3 Electron (Node.js + Chromium)

**Pros**:
- Massive ecosystem (npm)
- Familiar web technologies (React, TypeScript)
- Mature and well-documented
- Cross-platform (Windows, Mac, Linux)
- Many existing screen recording libs (e.g., ElectronCaptureKit)
- Large talent pool

**Cons**:
- Heavy: 100+ MB bundle, high memory usage (200-500 MB typical)
- Slow startup (1-2s)
- Bundles Chromium = security surface area
- Native macOS API access through node-native-addons or ffi (fragile)
- Performance overhead for real-time capture and processing
- Battery drain on laptops

**Best for**: Teams prioritizing cross-platform from day one and leveraging existing web technology expertise.

### 3.4 Flutter (Dart)

**Pros**:
- Single codebase for mobile + desktop
- Growing desktop support
- Good UI toolkit for custom interfaces
- dart:ffi for native API access

**Cons**:
- macOS desktop support still maturing
- Screen capture plugins are nascent and limited
- FFI bridge for Accessibility API / ScreenCaptureKit would be significant work
- Smaller desktop ecosystem
- Performance concerns for video-heavy workflows
- Not a natural fit for this type of system-level application

**Best for**: Teams already invested in Flutter wanting mobile + desktop from one codebase.

### 3.5 Framework Comparison Matrix

| Criteria | Swift+AppKit | Tauri 2.0 | Electron | Flutter |
|----------|-------------|-----------|----------|---------|
| macOS API Access | Direct | Via plugins/FFI | Via node addons | Via FFI |
| Performance | Excellent | Very Good | Moderate | Good |
| Bundle Size | ~5-20 MB | ~5-15 MB | 100-200 MB | 30-60 MB |
| Memory Usage | Low | Low | High | Moderate |
| UI Flexibility | Good (SwiftUI) | Excellent (Web) | Excellent (Web) | Good |
| Cross-platform | Mac only | Win/Mac/Linux | Win/Mac/Linux | Win/Mac/Linux/Mobile |
| Developer Ecosystem | Moderate | Growing | Massive | Large |
| Screen Capture Ready | Native | Needs plugins | Needs addons | Needs plugins |
| Accessibility API | Native | Custom plugin | Custom addon | Custom FFI |
| Web companion app synergy | Low | High | High | Low |

### 3.6 Recommended Approach: Hybrid Architecture

Given that vibe-tuto already has a Next.js web app, the ideal architecture would be:

**Option A: Native Swift core + Web UI via embedded WebView**
- Swift handles all system-level capture (ScreenCaptureKit, Accessibility, NSEvent)
- WebView hosts the tutorial editor/viewer UI (shared code with web app)
- Best of both worlds: native performance + shared web UI

**Option B: Tauri 2.0 with custom Swift plugins**
- Tauri provides the app shell and web UI layer
- Custom Rust/Swift plugins bridge to ScreenCaptureKit and Accessibility APIs
- More unified codebase with web frontend

---

## 4. AI/ML Capabilities

### 4.1 Apple Vision Framework (On-device OCR & UI Recognition)

- **VNRecognizeTextRequest**: OCR for printed and handwritten text across multiple languages
- **VNDetectRectanglesRequest**: Detect UI elements, buttons, cards
- **VNDetectBarcodesRequest**: Barcode/QR detection
- Optimized for Apple Silicon — fast on-device processing
- Can process captured frames in real-time to extract text from UI elements
- Useful for: identifying button labels, menu text, input field content, error messages

### 4.2 CoreML (On-device Inference)

- Run custom ML models on Apple Silicon (CPU, GPU, ANE)
- Convert models from PyTorch/TensorFlow via coremltools
- Optimizations: quantization, model compression
- Can run image classification, object detection, NLP models locally
- Useful for: classifying UI states, detecting meaningful actions, sentiment analysis of screen content

### 4.3 Whisper for Transcription

**WhisperKit** (by Argmax) — the primary solution for macOS:
- Swift package integrating OpenAI Whisper with CoreML
- Runs entirely on Apple Silicon (no cloud needed)
- Streaming audio for near real-time transcription
- Multiple model sizes (tiny → large)
- Presented at ICML 2025

**whisper.cpp**:
- C/C++ port of Whisper
- Metal/CoreML acceleration on Mac
- Lower-level but very flexible
- Supports macOS Sonoma+ for best results

**Use cases**:
- Transcribe voice narration during recording
- Enable transcript-based editing (edit by editing text)
- Generate automatic captions/subtitles
- Search within tutorials by spoken content

### 4.4 LLMs for Automatic Step Narration

**Local LLM options (privacy-preserving)**:
- **Ollama**: Easy local model management, supports Llama 3, Mistral, etc.
- **LM Studio**: Polished GUI for local LLM management
- **Jan**: Offline ChatGPT alternative
- **MLX** (Apple): Optimized inference on Apple Silicon
- Models: Llama 4, Qwen3, DeepSeek V3, Phi-3 — all runnable locally

**API-based options (higher quality)**:
- Claude API: Best for complex reasoning about multi-step tutorials
- OpenAI GPT-4o: Good multimodal capabilities (screenshot analysis)
- Google Gemini: Strong multimodal understanding

**Hybrid approach** (recommended):
- **Local**: Quick, real-time analysis (step detection, basic narration, OCR)
- **API**: Complex tutorial narration, content organization, quality enhancement
- User chooses privacy level (fully local vs. cloud-enhanced)

**What LLMs can generate**:
- Step-by-step text descriptions from captured actions
- Natural language narration scripts from action sequences
- Contextual tips and explanations
- Summary and overview text
- Alternative approaches or best practices callouts

### 4.5 AI Pipeline for Tutorial Generation

```
User Actions → NSEvent + AXUIElement → Action Events
                                           ↓
Screen Frames → ScreenCaptureKit → Vision OCR → Context
                                           ↓
Audio → AVFoundation → WhisperKit → Transcript
                                           ↓
              [Action Events + Context + Transcript]
                                           ↓
                    LLM (Local or API) → Tutorial Steps
                                           ↓
                         [Steps + Frames + Audio]
                                           ↓
                    Tutorial Output (Video / Interactive / Doc)
```

---

## 5. Multi-App Tutorial Specific Challenges

### 5.1 Detecting Meaningful User Actions vs. Noise

**Problem**: Users perform hundreds of actions during a workflow (mouse movements, accidental clicks, window resizes, etc.). Only a fraction are "meaningful" tutorial steps.

**Solution approach**:
- **Debounce mouse movements**: Only capture clicks, not continuous motion
- **AXUIElement context**: A click on a "Save" button is meaningful; a click on empty space is not
- **Dwell time analysis**: User pausing on an element suggests it's important
- **Action classification model**: Train/use a model to classify action significance
  - Button clicks → usually meaningful
  - Text input → meaningful (capture the input)
  - Scroll → sometimes meaningful (navigating to a section)
  - Window move/resize → rarely meaningful (noise)
  - Keyboard shortcuts → almost always meaningful
- **AI post-processing**: LLM can review action sequence and identify the "story" — removing noise

### 5.2 Context Switching Between Apps

**Problem**: Multi-app tutorials involve switching between, e.g., VS Code, Terminal, Browser, Figma.

**Solution approach**:
- `NSWorkspace.didActivateApplicationNotification` — detect every app switch
- Record app switches as explicit "Switch to [App Name]" steps
- Maintain per-app state tracking (which window, which tab, what content)
- Use `CGWindowListCopyWindowInfo` to get window titles for context
- AI can understand: "User switched from Figma to VS Code" → "Now implement the design in code"

### 5.3 Per-Window Recording vs. Full Screen

**Problem**: Full-screen recording captures everything including sensitive content, notifications, personal messages.

**Solution approach**:
- ScreenCaptureKit's `SCContentFilter` supports per-window and per-app filtering
- Record only the windows involved in the tutorial
- Automatically exclude: notification center, Spotlight, system dialogs
- Let users mark "tutorial-relevant" windows during setup
- Blur/redact sensitive regions using Vision framework for PII detection

### 5.4 Handling Multiple Displays

**Problem**: Users may have 2-4 displays, with tutorial-relevant windows on different screens.

**Solution approach**:
- `CGGetActiveDisplayList` — enumerate all displays
- ScreenCaptureKit can capture across multiple displays
- Track which display each window is on
- Record per-window rather than per-display for efficiency
- In output: show display context as needed, but focus on active windows

### 5.5 Permission Model

**Required permissions** (macOS Sequoia):
1. **Screen Recording** — needed for ScreenCaptureKit
   - Monthly re-authorization required on Sequoia
   - Requires restart of app after initial grant
2. **Accessibility** — needed for AXUIElement and keyboard monitoring
   - Also requires monthly re-auth on Sequoia
3. **Microphone** — needed if recording voice narration
   - One-time authorization

**Onboarding challenge**: Three permission prompts can be overwhelming.

**Solution approach**:
- Guided onboarding flow explaining why each permission is needed
- Check permissions on startup, request only what's missing
- Graceful degradation: work without Accessibility (lose action detection, but capture still works)
- Use `CGPreflightListenEventAccess()` / `CGRequestListenEventAccess()` for keyboard
- Pre-flight checks before recording starts

### 5.6 Action Timing and Short Intervals

**Problem**: Fast user actions (rapid clicking, keyboard shortcuts) can be missed or misattributed.

**Solution approach**:
- High-frequency event sampling (NSEvent delivers at ~60Hz)
- Timestamp correlation between NSEvent, AXUIElement queries, and screen frames
- Buffer recent events and resolve timing conflicts in post-processing
- Use frame timestamps from ScreenCaptureKit to sync video with action events

### 5.7 Recording Performance Impact

**Problem**: Simultaneous screen capture + event monitoring + AI processing can impact system performance.

**Solution approach**:
- ScreenCaptureKit is hardware-accelerated and GPU-backed (minimal CPU overhead)
- Run AI inference on Apple Neural Engine (separate from CPU/GPU)
- Queue non-critical processing (OCR, action classification) for post-recording
- Target 30fps capture (sufficient for tutorials, half the CPU of 60fps)
- Use Metal for any image processing
- Monitor system load and adapt capture quality dynamically

---

## 6. Key Takeaways & Recommendations

### 6.1 Market Opportunity

The market has a clear gap: **no tool combines Mac-native multi-app desktop recording with intelligent action detection and AI-powered tutorial generation**. Existing tools are either:
- Great recorders but dumb (ScreenFlow, OBS) — require manual editing
- Smart but browser-limited (Scribe, Tango, Guidde) — can't handle multi-app desktop workflows
- Quick-share focused (Loom) — not for structured tutorials

### 6.2 Technical Architecture Recommendation

**Recommended stack**:
1. **Core**: Swift + AppKit for system integration (ScreenCaptureKit, Accessibility, NSEvent)
2. **UI**: Web-based editor/viewer (shared with existing vibe-tuto Next.js app) served in embedded WebView or via Tauri shell
3. **AI**: WhisperKit for local transcription, Vision for OCR, Claude/local LLM for narration generation
4. **Output**: Synced with vibe-tuto web platform for sharing/embedding

**Why this stack**:
- Direct access to all macOS APIs without FFI overhead
- Best capture performance (hardware-accelerated)
- Shared web UI code with existing platform
- AI processing can be local-first with optional cloud enhancement

### 6.3 Minimum Viable Feature Set

1. Multi-app screen recording (ScreenCaptureKit)
2. Click + keyboard event capture (NSEvent)
3. UI element identification at click points (AXUIElement)
4. Automatic step extraction from action sequence
5. AI-generated step descriptions
6. Basic tutorial editor (trim, reorder, annotate)
7. Export to vibe-tuto web platform

### 6.4 Differentiators

- **Multi-app aware**: Tracks context across desktop applications
- **Semantic action detection**: Knows you clicked "Save" in Figma, not just "clicked at (x,y)"
- **Per-window capture**: Privacy-preserving, focused recording
- **Local-first AI**: Transcription and basic analysis on-device
- **Web platform integration**: Seamless sharing via existing vibe-tuto infrastructure

---

## Sources

- [ScreenCaptureKit - Apple Developer](https://developer.apple.com/documentation/screencapturekit/)
- [Meet ScreenCaptureKit - WWDC22](https://developer.apple.com/videos/play/wwdc2022/10156/)
- [AXUIElement - Apple Developer](https://developer.apple.com/documentation/applicationservices/axuielement)
- [NSEvent Global Monitoring - Apple Developer](https://developer.apple.com/documentation/appkit/nsevent/1535472-addglobalmonitorforevents)
- [WhisperKit - GitHub](https://github.com/argmaxinc/WhisperKit)
- [whisper.cpp - GitHub](https://github.com/ggml-org/whisper.cpp)
- [Vision Framework - Apple Developer](https://developer.apple.com/documentation/vision)
- [Tauri 2.0 Plugins](https://v2.tauri.app/plugin/)
- [OBS Studio Architecture - DeepWiki](https://deepwiki.com/obsproject/obs-studio/4.1-frontend-api)
- [Guidde Review 2025](https://digitalsoftwarelabs.com/ai-reviews/guidde/)
- [Scribe vs Tango - Guidde Comparison](https://www.guidde.com/blog/automated-step-by-step-guide-creation-scribe-vs-tango-vs-alternative-solutions)
- [Tauri vs Electron - Hopp](https://www.gethopp.app/blog/tauri-vs-electron)
- [ScreenCaptureKit on macOS Sonoma - Nonstrict](https://nonstrict.eu/blog/2023/a-look-at-screencapturekit-on-macos-sonoma/)
- [macOS Screen Recording Permissions - Apple Support](https://support.apple.com/guide/mac-help/control-access-screen-system-audio-recording-mchld6aa7d23/mac)
- [AXorcist - Swift Accessibility Wrapper](https://github.com/steipete/AXorcist)
- [tauri-plugin-macos-permissions](https://github.com/ayangweb/tauri-plugin-macos-permissions)
