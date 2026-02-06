# Vibe Tuto Desktop Recorder -- Consolidated Plan

> **"Hit record, do your thing, done."**

---

## 1. Executive Summary

### Vision

Vibe Tuto Desktop Recorder is a **lightweight native macOS menu-bar app** that captures multi-application workflows and uploads structured tutorial data (screenshots, action metadata, audio) to the Vibe Tuto web platform. The web app handles all editing, AI processing, annotation, export, and sharing.

The desktop app does **one thing exceptionally well: capture**. It fills a critical market gap where no existing tool combines native Mac multi-app step detection with structured metadata upload to a full-featured web editor.

### Problem Statement

Tutorial creators working across desktop applications (IDEs, terminals, design tools, browsers) face a fragmented landscape:
- **Browser-only tools** (Scribe, Tango, Guidde) detect steps automatically but only work in browsers
- **Desktop recorders** (ScreenFlow, OBS, Loom) capture everything but produce flat video/screenshots with no structured step data
- **No tool** captures semantic action data (what button was clicked, in which app, with what context) across all desktop applications

### Target Audience

| Persona | Role | Key Need |
|---------|------|----------|
| Alex | Developer Advocate | Record across terminal + IDE + browser, auto-detect steps |
| Maya | Content Creator | Record with narration, every click as a potential step |
| Jordan | Support Team Lead | Quick re-record workflows, minimal friction |
| Dr. Chen | Educator | Reliable multi-app capture, meaningful step boundaries |
| Sam | Knowledge Worker | Zero-config: hit record, do workflow, stop |

---

## 2. Market Analysis

### Competitive Landscape

| Feature | Vibe Tuto Recorder | Loom Desktop | CleanShot X | Scribe/Tango | Guidde |
|---|---|---|---|---|---|
| Multi-app recording | Yes (any app) | Yes (video only) | Yes (capture only) | Browser only | Browser only |
| Auto step detection | Yes (Accessibility API) | No | No | Yes (browser only) | Yes (browser only) |
| Click coordinate capture | Yes | No | No | Yes (browser only) | Yes (browser only) |
| Audio narration | Yes | Yes | No | No | No |
| Structured step output | Yes | No (flat video) | No (flat image) | Yes (browser only) | Yes (browser only) |
| Lightweight (menu bar) | Yes | No (full window) | Yes | No (browser ext.) | No (browser ext.) |
| Native macOS | Yes (Swift) | Yes (Electron) | Yes (Swift) | No (web) | No (web) |
| Offline capable | Yes (local buffer) | No | Yes | No | No |
| AI processing | Via web app | Built-in | No | Basic | Built-in |

### Key Differentiation

The Vibe Tuto Recorder is the only tool that combines:
1. **Native multi-app step detection** using macOS Accessibility API (not just video or screenshots)
2. **Structured metadata** for each step (click coordinates, element role/label, app context, URL)
3. **Upload to a full-featured web editor** for AI processing, annotation, and multi-format export

### Market Gap

Existing tools are either:
- **Smart but browser-limited** (Scribe, Tango, Guidde) -- cannot capture IDE, terminal, or native app workflows
- **Desktop-capable but dumb** (ScreenFlow, OBS, Loom) -- produce raw recordings with no structured step data
- **Capture-only with no editing** (CleanShot X) -- great screenshots, no tutorial workflow

---

## 3. Technical Architecture

### 3.1 High-Level Architecture

The desktop app is a **capture-only client** that uploads to the existing web platform.

```
+------------------------------------------------------------------+
|                   Desktop Recorder (Swift/AppKit)                 |
|                                                                  |
|  +------------------+  +------------------+  +----------------+  |
|  | Capture Engine   |  | Event Monitor    |  | Audio Recorder |  |
|  | (ScreenCapture-  |  | (NSEvent global  |  | (AVFoundation  |  |
|  |  Kit)            |  |  + AXUIElement)  |  |  mic capture)  |  |
|  +--------+---------+  +--------+---------+  +-------+--------+  |
|           |                      |                     |          |
|           v                      v                     v          |
|  +-------------------------------------------------------------+ |
|  |                    Session Manager                           | |
|  |  Step Detector | Action Buffer | Context Tracker             | |
|  +----------------------------+--------------------------------+ |
|                               |                                  |
|  +----------------------------v--------------------------------+ |
|  |                    Upload Manager                            | |
|  |  Screenshot compression | Parallel upload | Retry logic      | |
|  +----------------------------+--------------------------------+ |
+--------------------------------|----------------------------------+
                                 | HTTPS (Supabase REST + Storage)
                                 v
+------------------------------------------------------------------+
|                   Vibe Tuto Web Platform                          |
|  (Existing Next.js app + Supabase backend)                       |
|                                                                  |
|  API Layer:                                                      |
|    /api/tutorials      - Create tutorial from recording          |
|    /api/sources        - Create sources from steps               |
|    /api/upload         - Upload screenshots                      |
|    /api/transcribe     - Transcribe audio narration              |
|    /api/process        - AI step caption generation              |
|                                                                  |
|  Web Editor:                                                     |
|    /editor/[id]        - Full editing, annotation, export        |
+------------------------------------------------------------------+
```

### 3.2 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| App Framework | Swift 5.9+ / AppKit | Direct macOS API access, best performance |
| UI | NSStatusItem + NSPopover + NSPanel | Native menu-bar app, no WebView needed |
| Screen Capture | ScreenCaptureKit (macOS 12.3+) | GPU-accelerated, per-window filtering |
| Action Detection | AXUIElement + NSEvent | Semantic UI element understanding + input events |
| Audio | AVFoundation (AVAudioEngine) | Mic capture with noise reduction |
| App Tracking | NSWorkspace notifications | App switch detection |
| Local Storage | SQLite (GRDB.swift) | Buffer recordings before upload |
| Cloud Sync | Supabase Swift SDK | Auth, REST API, Storage upload |
| Updates | Sparkle framework | Auto-updates for direct distribution |

**Why native Swift (not Tauri/Electron)?**
- ScreenCaptureKit, AXUIElement, and NSEvent require native code -- bridging adds fragility
- Menu-bar utility apps must be lightweight (< 30 MB, < 50 MB RAM)
- No WebView needed since the app has no editor UI
- Electron's 100+ MB bundle and 200-500 MB RAM is inappropriate for a background utility

### 3.3 Key Components

**CaptureEngine** -- ScreenCaptureKit wrapper:
- Modes: full screen, single app, region, selected windows
- Background capture at 2fps for timeline context
- Action-triggered high-res screenshots via SCScreenshotManager
- Hardware-accelerated, GPU-backed (< 10% CPU target)

**EventMonitor** -- NSEvent global + local monitoring:
- Captures clicks, keystrokes, scroll, drag across all apps
- Combined with AXUIElement for semantic context (element role, title, value)
- Keyboard monitoring requires Accessibility permission

**StepDetector** -- Converts raw events into tutorial steps:
- Classifies actions as meaningful vs noise (confidence scoring)
- Merges related actions (click + type = single step)
- 11 action types: click, type, keyboard shortcut, app switch, URL navigation, menu selection, drag, scroll, dialog interaction, manual marker
- Template-based captions: "Click the 'Save' button in the toolbar"

**UploadManager** -- Handles data upload to web platform:
- Parallel screenshot upload (4 concurrent)
- Audio file upload
- Action metadata as JSON
- Auto-retry on failure with local persistence
- Progress reporting to floating toolbar

### 3.4 Permissions Required

| Permission | API | UX Impact |
|---|---|---|
| Screen Recording | ScreenCaptureKit | System prompt, monthly re-auth on Sequoia |
| Accessibility | AXUIElement, keyboard | System prompt, monthly re-auth on Sequoia |
| Microphone | AVAudioEngine | System prompt, one-time (optional) |

Graceful degradation:
- **No Accessibility**: Recording works, but no action detection or keyboard capture. User must use manual markers.
- **No Microphone**: Recording works, no audio narration.
- **No Screen Recording**: Cannot record. Must have.

### 3.5 Project Structure

```
apps/
  desktop/
    VibeTuto/
      App/
        VibeTutoApp.swift           # @main, NSApplication subclass
        AppDelegate.swift           # Lifecycle, login item registration
        MenuBarController.swift     # NSStatusItem + dropdown panel
      Core/
        Capture/
          CaptureEngine.swift       # ScreenCaptureKit wrapper
          FrameProcessor.swift      # Screenshot processing (Metal)
        Events/
          EventMonitor.swift        # NSEvent global/local
          AccessibilityReader.swift # AXUIElement queries
          AppSwitchTracker.swift    # NSWorkspace notifications
        Audio/
          AudioRecorder.swift       # AVAudioEngine mic capture
      Detection/
        StepDetector.swift          # Action classification
        ActionBuffer.swift          # Temporal buffering + merging
        ContextTracker.swift        # Per-app state tracking
      Upload/
        UploadManager.swift         # Orchestrates upload pipeline
        SupabaseClient.swift        # Auth + API + Storage
        RetryQueue.swift            # Failed upload retry logic
      UI/
        RecordingToolbar.swift      # Floating pill (NSPanel)
        RecordingBorder.swift       # Screen border overlay
        UploadPanel.swift           # Upload progress UI
        OnboardingWindow.swift      # First-launch flow
        PreferencesWindow.swift     # Settings (SwiftUI)
      Plugins/
        PluginProtocol.swift        # App-specific intelligence
        BrowserPlugin.swift         # URL extraction for browsers
        VSCodePlugin.swift          # File/branch from window title
        TerminalPlugin.swift        # Command detection
        FigmaPlugin.swift           # Design context
      Storage/
        LocalStore.swift            # SQLite for pending uploads
        RecordingSession.swift      # Session data model
    VibeTutoTests/
    VibeTuto.xcodeproj
  web/                              # Existing -- receives uploads
  extension/                        # Existing Chrome extension
```

---

## 4. UX/UI Vision

### 4.1 Design Principles

1. **Invisible**: Forgettable during recording. Users focus on their workflow, not the tool
2. **Instant**: One click or one hotkey to start/stop. Zero configuration needed
3. **Reliable**: Never lose a recording. Auto-retry uploads. Local persistence until confirmed
4. **Native**: Indistinguishable from a first-party Apple utility. No custom chrome
5. **Complementary**: Desktop captures. Web app does everything else. Clean separation

### 4.2 User Journey

There is one journey:

```
Menu Bar Click --> Configure (optional) --> Record --> Stop --> Upload --> Open Web Editor
```

### 4.3 Key Screens

**Menu Bar Dropdown** (~280 x 320 pt):
- Primary "Record" button (accent color, capsule)
- Recording mode selector (Full Screen / Single App / Region)
- Options toggles (mic, system audio, action detection)
- Recent Recordings list (links to web editor)
- Preferences / Quit

**Floating Recording Toolbar** (260 x 40 pt capsule):
- Recording dot + timer + step counter + Pause + Marker + Stop
- Auto-collapses to minimal indicator (100 x 32 pt) after 4s
- Always-on-top, draggable, click-through for rest of screen
- NSVisualEffectView with `.popover` material

**Upload Panel** (~300 x 160 pt):
- Transforms from toolbar on Stop
- Animated progress bar with step count
- Completion state with "Open in Editor" button
- Error state with "Retry" + "Save Locally"

**Onboarding** (3 screens: Welcome, Permissions, Sign In):
- Lightweight, ~400 x 500 pt
- Permission grants update in real-time
- OAuth browser-based sign-in

**Preferences** (~480 x 400 pt, tabbed):
- General: launch at login, countdown, quality, account
- Shortcuts: configurable global hotkeys
- Audio: input device, noise reduction, level meter
- Advanced: detection sensitivity, grouping delay, upload URL

### 4.4 Upload Data Schema

What gets uploaded per recording:

```json
{
  "recording": {
    "duration": 167,
    "started_at": "2026-02-06T10:30:00Z",
    "macos_version": "15.3",
    "screen_resolution": "2560x1600",
    "apps_used": ["com.google.Chrome", "com.microsoft.VSCode", "com.apple.Terminal"]
  },
  "steps": [
    {
      "order_index": 0,
      "timestamp": 3.2,
      "action_type": "click",
      "screenshot_key": "step-0.png",
      "click_x": 0.45,
      "click_y": 0.32,
      "viewport_width": 2560,
      "viewport_height": 1600,
      "app_bundle_id": "com.google.Chrome",
      "app_name": "Google Chrome",
      "window_title": "GitHub - Pull Requests",
      "url": "https://github.com/org/repo/pulls",
      "element_info": {
        "role": "AXButton",
        "title": "New pull request",
        "parent_chain": ["AXToolbar", "AXWindow", "AXApplication"]
      },
      "auto_caption": "Click the 'New pull request' button"
    }
  ],
  "audio_key": "narration.m4a"
}
```

---

## 5. Feature Roadmap

### Phase 1: MVP Recorder (8 weeks)

**Goal**: Ship a working menu-bar recorder that captures multi-app workflows and uploads to the web platform.

| Week | Milestone | Deliverables |
|------|-----------|-------------|
| 1-2 | **Project Setup & Core Capture** | Xcode project, ScreenCaptureKit integration, basic screenshot capture (full screen mode) |
| 3-4 | **Event Monitoring & Step Detection** | NSEvent global monitor, AXUIElement queries, basic StepDetector with click/type/shortcut classification |
| 5 | **Menu Bar UI & Recording Flow** | NSStatusItem, dropdown panel, floating toolbar, countdown, pause/resume, recording border |
| 6 | **Upload Pipeline** | Supabase auth, screenshot upload to Storage, metadata upload via REST API, tutorial creation |
| 7 | **Web App Integration** | New API endpoint to receive desktop recordings, process sources into steps with auto-captions, deep link to editor |
| 8 | **Polish & Testing** | Onboarding flow, preferences, error handling, auto-retry, manual testing across apps |

**MVP Scope**:
- Full Screen recording mode
- Click + keyboard shortcut detection
- App switch tracking
- Screenshot per detected action
- Basic auto-captions (template-based)
- Upload to web platform
- Open in web editor

**MVP Exclusions**:
- Single App / Region modes (Phase 2)
- Audio narration (Phase 2)
- Plugin system (Phase 3)
- Auto-updates (Phase 2)

### Phase 2: Intelligence & Polish (6 weeks)

**Goal**: Add remaining recording modes, audio narration, AI-powered step enhancement, and production readiness.

| Week | Milestone | Deliverables |
|------|-----------|-------------|
| 9-10 | **Recording Modes & Audio** | Single App mode (SCContentFilter per-app), Region mode (crosshair selector), microphone capture (AVAudioEngine), system audio capture |
| 11-12 | **AI Enhancement (Web Side)** | Whisper transcription of narration audio, Claude-powered caption enhancement from action metadata + OCR, smart auto-annotation (click indicators, blur suggestions) |
| 13-14 | **Production Readiness** | Sparkle auto-updates, code signing + notarization, crash reporting (opt-in), performance optimization, Sequoia permission re-auth handling |

**Phase 2 Scope**:
- All 3 recording modes (Full Screen, Single App, Region)
- Microphone + system audio capture
- AI caption enhancement via web app
- Audio transcription via web app
- Auto-update mechanism
- Signed + notarized distribution

### Phase 3: App Intelligence (6 weeks)

**Goal**: Add app-specific plugins for richer step context and smarter detection.

| Week | Milestone | Deliverables |
|------|-----------|-------------|
| 15-16 | **Plugin System & Browser Plugin** | PluginProtocol, PluginHost, BrowserPlugin (Safari, Chrome, Firefox, Edge, Arc URL extraction), tab switch detection |
| 17-18 | **IDE & Terminal Plugins** | VSCodePlugin (file/branch from title), TerminalPlugin (command detection), FigmaPlugin (design context) |
| 19-20 | **Advanced Detection** | Menu selection path detection, drag-and-drop tracking, multi-display support, sensitivity tuning UI |

**Phase 3 Scope**:
- Plugin architecture with 4 built-in plugins
- Browser URL extraction across 6 browsers
- IDE context extraction (filename, branch)
- Terminal command detection
- Multi-display recording
- Advanced step detection (menus, drag, dialogs)

### Phase 4: Platform & Growth (6 weeks)

**Goal**: Team features, third-party integrations, and growth mechanics.

| Week | Milestone | Deliverables |
|------|-----------|-------------|
| 21-22 | **Team Features** | Team workspace support (shared upload targets), recording templates (pre-configured modes per workflow), batch upload from local queue |
| 23-24 | **Integrations** | Notion export (web app), Confluence export (web app), Slack notification on upload complete, API for third-party triggers |
| 25-26 | **Growth & Distribution** | Mac App Store submission (if sandboxing permits), Homebrew cask formula, landing page + download flow, analytics (opt-in) |

---

## 6. Dependency Graph

```
Phase 1: MVP Recorder (Weeks 1-8)
================================================

[Xcode Setup]
     |
     v
[ScreenCaptureKit] ---> [Screenshot Capture]
     |                        |
     v                        v
[NSEvent Monitor] -----> [StepDetector] ------> [Upload Manager]
     |                        |                       |
     v                        v                       v
[AXUIElement] ---------> [ActionBuffer]         [Supabase Auth]
     |                        |                       |
     v                        v                       v
[AppSwitchTracker] ---> [ContextTracker]        [Web API Endpoint]
                                                      |
[Menu Bar UI] -----> [Recording Toolbar]              v
     |                    |                    [Web Editor Integration]
     v                    v                           |
[Preferences] ----> [Onboarding Flow]                 v
                         |                     [Deep Link Handoff]
                         v
                    [Upload Panel]


Phase 2: Intelligence (Weeks 9-14)
================================================

[Single App Mode] -----+
                       |
[Region Mode] ---------+--> [Recording Mode Selector]
                       |
[Audio Recorder] ------+
     |
     v
[Audio Upload] -------> [Whisper Transcription (Web)]
                              |
[Caption Enhancement] <-------+------> [Claude API (Web)]
                                            |
[Auto-Annotation (Web)] <------------------+

[Code Signing] -------> [Notarization] -------> [Sparkle Updates]


Phase 3: App Intelligence (Weeks 15-20)
================================================

[PluginProtocol] ------> [PluginHost]
                              |
     +----------+--------+---+---+-----------+
     |          |        |       |           |
     v          v        v       v           v
[Browser]  [VSCode] [Terminal] [Figma]  [Future Plugins]

[Menu Path Detection] ---+
                         |
[Drag Tracking] ---------+--> [Advanced StepDetector]
                         |
[Multi-Display] ---------+


Phase 4: Platform (Weeks 21-26)
================================================

[Team Workspaces] ----> [Recording Templates]
                              |
[Notion Export (Web)] --------+
                              |
[Confluence Export (Web)] ----+
                              |
[Slack Notifications] --------+--> [Growth Features]
                              |
[Mac App Store] --------------+
                              |
[Homebrew Cask] -------------+
```

---

## 7. Risk Assessment

### Technical Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **macOS Sequoia monthly permission re-auth** disrupts user flow | High | Certain | Check permissions on every launch; show gentle re-auth prompt before recording; cache permission state |
| **AXUIElement inconsistency** across apps (some apps expose poor accessibility trees) | Medium | High | Graceful degradation -- fall back to screenshot-only steps when AX data is poor; plugin system for app-specific workarounds |
| **ScreenCaptureKit API changes** in future macOS versions | Medium | Medium | Pin minimum macOS version (12.3+); monitor WWDC for API changes; abstract behind CaptureEngine protocol |
| **App Store sandbox restrictions** block Accessibility API | High | High | Primary distribution via direct download + notarization; App Store as secondary if sandbox-compatible entitlements work |
| **Upload reliability** on poor networks | Medium | Medium | Local SQLite buffer for pending uploads; automatic retry with exponential backoff; "Save Locally" fallback |
| **Performance impact** on user's workflow during recording | High | Low | ScreenCaptureKit is GPU-backed; 2fps background capture; defer all AI to web app; target < 10% CPU |
| **Web app API changes** break desktop upload | Medium | Low | Version the upload API; desktop app sends API version header; backward-compatible endpoints |

### Business Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Users expect editing in desktop app | Medium | Medium | Clear messaging: "Capture on Mac, edit in browser"; ensure handoff is seamless (< 5 seconds from Stop to Editor) |
| Scribe/Tango add desktop capture | Medium | Medium | Our advantage: native macOS (not Electron), Accessibility API depth, integration with full tutorial platform |
| Apple launches competing feature | Low | Low | macOS features tend to be basic (Quick Time). Our differentiation is AI + structured steps + web platform |

---

## 8. Team Requirements

### Core Team (Phase 1-2)

| Role | Count | Responsibilities |
|------|-------|------------------|
| **macOS Engineer (Swift)** | 1-2 | CaptureEngine, EventMonitor, AccessibilityReader, StepDetector, UI, upload pipeline |
| **Full-Stack Engineer** | 1 | Web API endpoints for receiving desktop recordings, processing pipeline, editor integration |
| **Designer** | 0.5 | Menu bar UI, toolbar, onboarding flow (minimal surface area) |

### Expanded Team (Phase 3-4)

| Role | Count | Responsibilities |
|------|-------|------------------|
| **macOS Engineer** | 2 | Plugin system, advanced detection, multi-display, performance |
| **Full-Stack Engineer** | 1 | Team features, integrations, Notion/Confluence export |
| **QA** | 0.5 | Cross-app testing, permission edge cases, macOS version matrix |
| **DevOps** | 0.25 | Auto-update infrastructure, notarization CI, App Store submission |

### Key Hiring Criteria

The most critical hire is a **senior macOS engineer** with experience in:
- ScreenCaptureKit or CGWindowList APIs
- Accessibility API (AXUIElement)
- AppKit (NSStatusItem, NSPanel, NSEvent monitoring)
- AVFoundation for audio capture
- Ideally: experience with screen recording apps (OBS, ScreenFlow, CleanShot)

---

## 9. Success Metrics

### Phase 1 (MVP) KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Recording completion rate | > 90% | Recordings started vs. successfully uploaded |
| Time from Stop to Editor open | < 10 seconds | Upload completion time for 20-step tutorial |
| Steps detected per recording | > 5 average | Automatic step count across users |
| Step detection accuracy | > 70% precision | Manual review: are detected steps meaningful? |
| App crash rate | < 1% of sessions | Crash reports |
| CPU during recording | < 10% | Performance profiling |
| Memory usage | < 100 MB | Instruments profiling |

### Phase 2+ KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily active recorders | 100+ by month 6 | Analytics (opt-in) |
| Recordings per user per week | > 2 | Usage tracking |
| Desktop-originated tutorials as % of all tutorials | > 30% | Database query |
| User retention (week 4) | > 40% | Cohort analysis |
| AI caption edit rate | < 50% (most auto-captions kept as-is) | Web app analytics |
| Net Promoter Score | > 50 | In-app survey |

---

## 10. Integration with Existing Platform

### What the Web App Needs

To support desktop recordings, the existing web app (`apps/web`) needs:

1. **New API endpoint**: `POST /api/recordings` -- accepts desktop recording payload (screenshots + metadata + audio)
2. **Processing pipeline**: Convert recording payload into tutorial with sources and steps
3. **AI caption generation**: Generate step captions from action metadata (element role + title + app context)
4. **Audio transcription**: Run Whisper on uploaded narration audio
5. **Click indicator auto-annotation**: Create click indicator annotations from click coordinates
6. **Desktop badge in editor**: Show "Recorded from Mac" indicator, contextual onboarding

### Data Model Compatibility

The desktop upload maps cleanly to the existing data model:

| Desktop Data | Web Model | Table |
|---|---|---|
| Recording metadata | Tutorial | `tutorials` |
| Step screenshots | Source screenshots | Supabase Storage |
| Step action data | Source records | `sources` (existing) |
| Auto-generated steps | Step records | `steps` (existing) |
| Click coordinates | `click_x`, `click_y` | `sources.click_x/y` |
| Element info | `element_info` JSON | `sources.element_info` |
| App name + window title | New fields on source | Extend `sources` table |

Required schema additions to `sources`:
```sql
ALTER TABLE sources ADD COLUMN app_bundle_id TEXT;
ALTER TABLE sources ADD COLUMN app_name TEXT;
ALTER TABLE sources ADD COLUMN window_title TEXT;
ALTER TABLE sources ADD COLUMN action_type TEXT;  -- click, type, shortcut, app_switch, etc.
ALTER TABLE sources ADD COLUMN auto_caption TEXT;
ALTER TABLE sources ADD COLUMN recording_id TEXT;  -- groups sources from same recording session
```

---

## 11. Open Questions

1. **Minimum macOS version**: 12.3 (ScreenCaptureKit) or 13.0 (audio capture in SCKit)? Recommend 13.0 for full feature set.

2. **Distribution strategy**: Direct download + notarization (more flexibility, AX access guaranteed) vs. Mac App Store (discovery, trust) vs. both? Recommend direct download first, App Store later if sandbox permits.

3. **Free vs. paid**: Should the desktop recorder be free (drives web platform adoption) or part of a paid tier? Recommend free recorder with web platform subscription for AI features.

4. **Offline-first**: Should the app work fully offline with local-only recording (export later), or require internet for upload? Recommend offline recording with deferred upload.

5. **Chrome extension overlap**: The existing Chrome extension already captures browser steps. How do desktop recordings interact with extension recordings? Recommend desktop supersedes extension when both are active.

---

## Appendix: Reference Documents

- **Research Document**: `docs/research/mac-desktop-tutorial-recorder-research.md` -- Competitive analysis, macOS API deep-dive, framework comparison, AI/ML capabilities
- **Technical Architecture**: `docs/desktop-app-technical-architecture.md` -- Detailed system design, Swift API contracts, data model, performance budgets
- **UX/UI Vision**: `docs/desktop-app-ux-vision.md` -- Screen specifications, interaction design, animations, accessibility, design principles
