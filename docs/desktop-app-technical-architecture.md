# Vibe Tuto Desktop App -- Technical Architecture Document

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack Decision](#2-tech-stack-decision)
3. [Core Recording Engine](#3-core-recording-engine)
4. [Multi-App Awareness System](#4-multi-app-awareness-system)
5. [Automatic Step Detection](#5-automatic-step-detection)
6. [Editor & Post-Processing](#6-editor--post-processing)
7. [Export Pipeline](#7-export-pipeline)
8. [AI Features](#8-ai-features)
9. [Data Model](#9-data-model)
10. [Plugin / Extension System](#10-plugin--extension-system)
11. [Web Platform Integration](#11-web-platform-integration)
12. [System Architecture Diagrams](#12-system-architecture-diagrams)
13. [Performance Budget](#13-performance-budget)
14. [Security & Privacy](#14-security--privacy)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

The Vibe Tuto Desktop App follows a **layered architecture** with a native Swift core for system integration and a web-based UI layer for the editor/viewer, enabling code sharing with the existing Next.js web platform.

```
+------------------------------------------------------------------+
|                        UI Layer (WebView)                         |
|   React/Next.js components (shared with web app)                 |
|   Editor, Viewer, Library, Export Dialog                         |
+------------------------------------------------------------------+
|                     Bridge Layer (Swift <-> JS)                   |
|   WKWebView message handlers, JSON-RPC protocol                 |
+------------------------------------------------------------------+
|                    Application Layer (Swift)                      |
|   Session Manager, Step Detector, AI Coordinator, Export Engine  |
+------------------------------------------------------------------+
|                     Core Services (Swift)                         |
|   Capture Engine, Event Monitor, Accessibility Reader,           |
|   Audio Recorder, Storage Manager, Plugin Host                   |
+------------------------------------------------------------------+
|                     macOS System APIs                             |
|   ScreenCaptureKit, AXUIElement, NSEvent, AVFoundation,         |
|   NSWorkspace, Vision, CoreML, Metal                             |
+------------------------------------------------------------------+
```

### 1.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| App Framework | Native Swift + AppKit | Direct macOS API access, best performance for capture |
| UI Rendering | WKWebView (embedded React) | Share components with web app, familiar for web team |
| Capture Engine | ScreenCaptureKit | Modern, GPU-accelerated, per-window filtering |
| Action Detection | AXUIElement + NSEvent | Semantic understanding of UI elements + input events |
| Local AI | WhisperKit + Vision + MLX | On-device transcription, OCR, and inference |
| Cloud AI | Claude API | Complex narration, tutorial enhancement |
| Storage | SQLite (local) + File system | Fast, offline-first, syncs to Supabase cloud |
| IPC | WKWebView message handlers | Native to JS bridge for UI communication |
| File Format | `.vibetuto` (SQLite + media bundle) | Self-contained, portable, inspectable |

### 1.3 Process Architecture

The app runs as a single macOS process with multiple subsystems on dedicated dispatch queues:

```
Main Thread (AppKit + WKWebView UI)
  |
  +-- captureQueue (QoS: .userInitiated)
  |     Screen capture stream output handling
  |
  +-- eventQueue (QoS: .userInteractive)
  |     NSEvent + AXUIElement processing
  |
  +-- aiQueue (QoS: .utility)
  |     Vision OCR, WhisperKit, CoreML inference
  |
  +-- storageQueue (QoS: .utility)
  |     SQLite writes, file I/O, screenshot saving
  |
  +-- exportQueue (QoS: .userInitiated)
        Video encoding, PDF generation, HTML export
```

---

## 2. Tech Stack Decision

### 2.1 Recommended Stack: Native Swift Core + Embedded Web UI

**Primary framework**: Swift 5.9+ / AppKit / SwiftUI (selective)

**Why not Tauri?**
While Tauri 2.0 was considered (lighter than Electron, Rust performance), the critical gap is deep macOS API integration. ScreenCaptureKit, AXUIElement, and NSEvent global monitoring require native Swift/ObjC code. A Tauri app would need custom Rust-to-Swift bridging for every system API, adding fragility and complexity. Native Swift eliminates this impedance mismatch entirely.

**Why not Electron?**
The 100+ MB bundle, 200-500 MB runtime memory, and FFI overhead for native APIs make it unsuitable for a performance-sensitive recording app that must run simultaneously with the user's actual workflow.

**Why embedded WebView for UI?**
The existing vibe-tuto web app has React components for the editor (AnnotationCanvas, DocEditor, DocHeader), type definitions (Annotation, StepWithSignedUrl, Source), and styling (Tailwind, shadcn). Embedding these in a WKWebView means:
- 80%+ code reuse for the editor/viewer UI
- Web team can contribute without learning Swift
- Consistent UX between desktop and web
- Only recording controls and system integration are native Swift

### 2.2 Project Structure

```
apps/
  desktop/                          # macOS app (new)
    VibeTuto/
      App/
        VibeTutoApp.swift           # @main entry point
        AppDelegate.swift           # NSApplicationDelegate
        MenuBarController.swift     # Menu bar icon + dropdown
      Core/
        Capture/
          CaptureEngine.swift       # ScreenCaptureKit wrapper
          CaptureConfiguration.swift
          FrameProcessor.swift      # Process captured frames
        Events/
          EventMonitor.swift        # NSEvent global/local monitoring
          AccessibilityReader.swift # AXUIElement queries
          AppSwitchTracker.swift    # NSWorkspace notifications
        Audio/
          AudioRecorder.swift       # AVFoundation mic recording
          SystemAudioCapture.swift  # ScreenCaptureKit audio
      Detection/
        StepDetector.swift          # Action to Step conversion
        ActionClassifier.swift      # Meaningful vs noise classification
        ActionBuffer.swift          # Temporal action buffering
        ContextTracker.swift        # Per-app state tracking
      AI/
        AICoordinator.swift         # Orchestrates AI pipeline
        LocalTranscriber.swift      # WhisperKit integration
        OCRProcessor.swift          # Vision framework OCR
        NarrationGenerator.swift    # LLM narration (local + API)
        SmartCropper.swift          # Vision-based smart crop
      Storage/
        TutorialStore.swift         # SQLite database layer
        MediaStore.swift            # Screenshot/audio file management
        SyncManager.swift           # Cloud sync with Supabase
      Export/
        ExportCoordinator.swift     # Orchestrates export pipeline
        VideoExporter.swift         # AVFoundation video encoding
        PDFExporter.swift           # PDFKit generation
        MarkdownExporter.swift      # Markdown + images
        HTMLExporter.swift          # Self-contained HTML
      Bridge/
        WebViewBridge.swift         # WKWebView to Swift IPC
        BridgeProtocol.swift        # JSON-RPC message definitions
        NativeAPIProvider.swift     # Exposes native APIs to JS
      UI/
        Native/
          RecordingToolbar.swift    # Floating pill toolbar (NSPanel)
          RecordingBorder.swift     # Screen border overlay (NSWindow)
          PermissionGuide.swift     # Onboarding permission flow
          PreferencesWindow.swift   # Settings (SwiftUI)
        Web/
          EditorWebView.swift       # WKWebView hosting editor
          ViewerWebView.swift       # WKWebView hosting viewer
      Plugins/
        PluginHost.swift            # Plugin loading and lifecycle
        PluginProtocol.swift        # Plugin interface definition
        Builtin/
          BrowserPlugin.swift       # URL tracking, tab detection
          VSCodePlugin.swift        # File/language detection
          FigmaPlugin.swift         # Design context extraction
          TerminalPlugin.swift      # Command detection
    VibeTutoTests/
    VibeTuto.xcodeproj
  web/                              # Existing Next.js web app
    components/
      editor/                       # Shared editor components
      shared/                       # Components used by both web + desktop
    lib/
      types/
        editor.ts                   # Shared type definitions
```

### 2.3 Swift Package Dependencies

```swift
// Package.swift dependencies
dependencies: [
    // AI
    .package(url: "https://github.com/argmaxinc/WhisperKit", from: "0.9.0"),

    // Database
    .package(url: "https://github.com/groue/GRDB.swift", from: "6.0.0"),

    // Networking (for Supabase sync + Claude API)
    .package(url: "https://github.com/supabase-community/supabase-swift", from: "2.0.0"),

    // Local LLM (optional, for fully offline mode)
    .package(url: "https://github.com/ml-explore/mlx-swift", from: "0.18.0"),
]
```

---

## 3. Core Recording Engine

### 3.1 CaptureEngine

The `CaptureEngine` wraps ScreenCaptureKit to provide a high-level recording API.

```swift
// CaptureEngine.swift -- Simplified interface

protocol CaptureEngineDelegate: AnyObject {
    func captureEngine(_ engine: CaptureEngine, didCaptureFrame frame: CapturedFrame)
    func captureEngine(_ engine: CaptureEngine, didCaptureAudio buffer: AVAudioPCMBuffer)
    func captureEngine(_ engine: CaptureEngine, didEncounterError error: CaptureError)
}

class CaptureEngine {
    // Configuration
    struct Config {
        var mode: CaptureMode           // .fullWorkflow, .singleApp, .region
        var frameRate: Int = 2          // Frames per second (low for tutorials)
        var screenshotOnAction: Bool = true  // High-res capture on detected actions
        var captureAudio: Bool = true   // System audio capture
        var captureResolution: CaptureResolution = .native
        var excludedApps: [String] = [] // Bundle IDs to exclude
    }

    enum CaptureMode {
        case fullWorkflow                           // All displays, all apps
        case singleApp(bundleIdentifier: String)    // One app's windows
        case region(CGRect, displayID: CGDirectDisplayID)  // Screen region
        case selectedWindows([CGWindowID])           // Specific windows
    }

    // Lifecycle
    func prepare(config: Config) async throws    // Enumerate content, build filter
    func start() async throws                     // Begin capture stream
    func pause()                                  // Pause stream
    func resume()                                 // Resume stream
    func stop() async -> RecordingSession         // Stop and return session data

    // Dynamic updates (no stream restart needed)
    func updateFilter(_ filter: SCContentFilter) async throws
    func updateFrameRate(_ fps: Int) async throws

    // On-demand high-res screenshot
    func captureScreenshot(of window: SCWindow?) async throws -> CGImage
}
```

### 3.2 Capture Pipeline

```
ScreenCaptureKit (SCStream)
    |
    +-- Video Frames (CMSampleBuffer, 2fps background + on-demand)
    |   |
    |   +-- FrameProcessor
    |   |   +-- Convert to CGImage (Metal-accelerated)
    |   |   +-- Smart crop to active window region
    |   |   +-- Queue for OCR processing (aiQueue)
    |   |
    |   +-- MediaStore
    |       +-- Save as HEIF/PNG to disk (storageQueue)
    |       +-- Generate thumbnail (Metal-accelerated resize)
    |
    +-- Audio Samples (CMSampleBuffer)
        |
        +-- SystemAudioCapture --> write to temporary .m4a
        +-- AudioRecorder (microphone) --> write to temporary .m4a
```

### 3.3 Frame Capture Strategy

For tutorials, we do NOT need 30/60fps video. The strategy:

1. **Background capture at 2fps**: Low-overhead continuous capture for timeline context
2. **Action-triggered high-res capture**: When EventMonitor detects a click/keystroke, immediately capture a full-resolution screenshot via `SCScreenshotManager`
3. **App switch capture**: When `AppSwitchTracker` detects a focus change, capture both the previous and new app states
4. **Configurable video mode**: For users who want video export, optionally capture at 15-30fps

This approach minimizes CPU/GPU usage during recording while ensuring every action has a crisp screenshot.

### 3.4 Audio Capture

Two independent audio streams:

```swift
class AudioCapture {
    // System audio (app sounds, notification chimes, etc.)
    // Captured via ScreenCaptureKit's audio stream
    var systemAudioStream: SCStream?

    // Microphone narration
    // Captured via AVFoundation's AVAudioEngine
    var microphoneEngine: AVAudioEngine?

    // Output
    var systemAudioWriter: AVAssetWriter?   // Writes system audio track
    var microphoneWriter: AVAssetWriter?     // Writes mic audio track

    // Both tracks are time-synchronized using CMTime
    // and can be mixed during export
}
```

---

## 4. Multi-App Awareness System

### 4.1 AppSwitchTracker

Monitors application focus changes using NSWorkspace notifications.

```swift
class AppSwitchTracker {
    struct AppContext {
        let bundleIdentifier: String
        let localizedName: String
        let icon: NSImage
        let windowTitle: String?
        let windowID: CGWindowID?
        let timestamp: Date
    }

    // Notifications observed:
    // - NSWorkspace.didActivateApplicationNotification
    // - NSWorkspace.didDeactivateApplicationNotification
    // - NSWorkspace.didLaunchApplicationNotification
    // - NSWorkspace.didTerminateApplicationNotification

    // State
    var currentApp: AppContext?
    var appHistory: [(from: AppContext, to: AppContext, timestamp: Date)]

    // Window tracking via CGWindowListCopyWindowInfo
    func getActiveWindowInfo(for app: NSRunningApplication) -> WindowInfo?
    func getAllWindowsForApp(_ bundleID: String) -> [WindowInfo]
}
```

### 4.2 ContextTracker

Maintains per-app state for richer tutorial context.

```swift
class ContextTracker {
    struct AppState {
        let bundleIdentifier: String
        var windowTitle: String?           // e.g., "main.swift -- VibeTuto"
        var documentURL: URL?              // For apps with open documents
        var browserURL: String?            // For browsers: current tab URL
        var browserTabTitle: String?       // For browsers: current tab title
        var additionalContext: [String: Any]  // Plugin-provided context
    }

    // Maintain state per tracked app
    var appStates: [String: AppState]  // keyed by bundleIdentifier

    // Updates come from:
    // - AXUIElement title change notifications
    // - Plugin-specific context (browser URL via accessibility)
    // - Window title parsing heuristics

    func currentContext() -> AppState?
    func contextForApp(_ bundleID: String) -> AppState?
    func enrichWithAccessibility(_ element: AXUIElement) -> AppState
}
```

### 4.3 Browser URL Detection

For browser-based steps, extract the current URL using the Accessibility API:

```swift
// BrowserPlugin.swift
class BrowserPlugin: AppPlugin {
    // Supported browsers
    let supportedBundleIDs = [
        "com.apple.Safari",
        "com.google.Chrome",
        "org.mozilla.firefox",
        "com.microsoft.edgemac",
        "com.brave.Browser",
        "company.thebrowser.Browser"   // Arc
    ]

    func extractURL(from app: NSRunningApplication) -> String? {
        let appElement = AXUIElementCreateApplication(app.processIdentifier)
        // Navigate AX hierarchy: app -> focused window -> toolbar -> URL field
        // This varies by browser but follows similar patterns
        guard let urlField = findURLField(in: appElement) else { return nil }
        var value: CFTypeRef?
        AXUIElementCopyAttributeValue(urlField, kAXValueAttribute as CFString, &value)
        return value as? String
    }
}
```

---

## 5. Automatic Step Detection

### 5.1 EventMonitor

Captures all user input events system-wide.

```swift
class EventMonitor {
    struct InputEvent {
        let id: UUID
        let timestamp: Date
        let type: InputEventType
        let screenLocation: CGPoint      // Global screen coordinates
        let windowLocation: CGPoint?     // Relative to window
        let modifiers: NSEvent.ModifierFlags
        let keyCode: UInt16?             // For keyboard events
        let characters: String?          // For keyboard events
        let clickCount: Int              // 1=single, 2=double, 3=triple
        let appBundleID: String?         // App that received the event
        let windowID: CGWindowID?        // Window that received the event
    }

    enum InputEventType {
        case leftClick, rightClick, otherClick
        case keyDown, keyUp
        case scrollWheel(deltaX: CGFloat, deltaY: CGFloat)
        case drag(phase: DragPhase)      // .began, .changed, .ended
        case gesture(type: GestureType)  // pinch, rotate, swipe
    }

    // Install global + local monitors
    func startMonitoring()
    func stopMonitoring()

    // Events are forwarded to ActionBuffer for classification
}
```

### 5.2 AccessibilityReader

Queries AXUIElement to understand WHAT was interacted with.

```swift
class AccessibilityReader {
    struct UIElementInfo {
        let role: String             // "AXButton", "AXTextField", "AXMenuItem", etc.
        let title: String?           // "Save", "File", "Submit"
        let value: Any?              // Current value (for text fields, sliders, etc.)
        let description: String?     // Accessibility description
        let identifier: String?      // Developer-set identifier
        let frame: CGRect            // Screen-space bounding rect
        let parentChain: [String]    // Role hierarchy: ["AXToolbar", "AXWindow", "AXApplication"]
        let appBundleID: String
        let windowTitle: String?
    }

    // Query element at screen coordinate
    func elementAt(point: CGPoint) -> UIElementInfo?

    // Query focused element
    func focusedElement() -> UIElementInfo?

    // Observe accessibility notifications
    func observeNotifications(for app: NSRunningApplication,
                               notifications: [String],
                               handler: (String, AXUIElement) -> Void)
}
```

### 5.3 ActionBuffer & StepDetector

The `ActionBuffer` collects raw events and the `StepDetector` converts them into meaningful tutorial steps.

```swift
class ActionBuffer {
    // Raw events from EventMonitor + AccessibilityReader + AppSwitchTracker
    struct BufferedAction {
        let inputEvent: EventMonitor.InputEvent
        let uiElement: AccessibilityReader.UIElementInfo?
        let appContext: ContextTracker.AppState?
        let screenshot: CGImage?          // Captured on action
    }

    // Buffer configuration
    var mergeWindow: TimeInterval = 0.5   // Merge actions within 500ms
    var maxBufferSize: Int = 1000         // Max actions before forced flush

    func addAction(_ action: BufferedAction)
    func flush() -> [BufferedAction]
}

class StepDetector {
    struct DetectedStep {
        let id: UUID
        let timestamp: Date
        let actionType: StepActionType
        let screenshot: CGImage
        let clickLocation: CGPoint?       // Relative to screenshot
        let uiElement: AccessibilityReader.UIElementInfo?
        let appContext: ContextTracker.AppState?
        let confidence: Float             // 0-1, how likely this is meaningful
        let rawCaption: String            // Auto-generated basic caption
    }

    enum StepActionType {
        case click(element: String?)       // "Clicked 'Save' button"
        case type(text: String)            // "Typed 'hello world'"
        case keyboardShortcut(keys: String) // "Pressed Cmd+S"
        case appSwitch(from: String, to: String) // "Switched to VS Code"
        case scroll(direction: String)     // "Scrolled down in Settings"
        case drag(description: String)     // "Dragged file to folder"
        case urlNavigation(url: String)    // "Navigated to github.com/..."
        case dialogInteraction(title: String) // "Clicked 'OK' in Save dialog"
        case menuSelection(path: String)   // "Selected File > Export > PDF"
        case manualMarker                  // User pressed marker hotkey
    }

    // Classification logic
    func classify(_ actions: [BufferedAction]) -> [DetectedStep] {
        // 1. Filter noise (mouse movements, empty-space clicks)
        // 2. Merge related actions (click on field + typing = single "type" step)
        // 3. Detect keyboard shortcuts (modifier + key within short window)
        // 4. Detect menu selections (sequence of menu item clicks)
        // 5. Detect drag operations (mouseDown + mouseDragged + mouseUp)
        // 6. Score confidence based on UI element role and context
        // 7. Generate basic caption from action type + element info
    }
}
```

### 5.4 Action Classification Rules

| Input Events | UI Element Context | Step Type | Confidence | Caption Template |
|---|---|---|---|---|
| Left click | AXButton role, title="Save" | `.click` | 0.95 | "Click the 'Save' button" |
| Left click | AXTextField role | `.click` | 0.7 | "Click the text field" |
| Left click | No element / empty space | (filtered) | 0.1 | (discarded) |
| Key sequence | AXTextField focused, value changes | `.type` | 0.9 | "Type '{text}'" |
| Cmd+S | Any | `.keyboardShortcut` | 0.95 | "Press Cmd+S to save" |
| App activation change | Different bundleID | `.appSwitch` | 1.0 | "Switch to {appName}" |
| URL change in browser | AXTextField (URL bar) | `.urlNavigation` | 0.9 | "Navigate to {url}" |
| Click on AXMenuItem | AXMenuBar parent chain | `.menuSelection` | 0.95 | "Select {menuPath}" |
| Mouse down, drag, mouse up | Any | `.drag` | 0.8 | "Drag {source} to {target}" |
| Scroll wheel | Large deltaY, meaningful content | `.scroll` | 0.5 | "Scroll down to {section}" |
| Manual marker hotkey | Any | `.manualMarker` | 1.0 | "Step marked by user" |

---

## 6. Editor & Post-Processing

### 6.1 Architecture: Web UI in WKWebView

The editor is a React application loaded in WKWebView. It shares components with the existing web app.

```swift
class EditorWebView: NSView {
    let webView: WKWebView
    let bridge: WebViewBridge

    func loadEditor(for session: RecordingSession) {
        // Load the bundled React app
        let htmlURL = Bundle.main.url(
            forResource: "editor",
            withExtension: "html",
            subdirectory: "WebUI"
        )!
        webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())

        // Once loaded, send session data via bridge
        bridge.send(.loadSession(session.toJSON()))
    }
}
```

### 6.2 WebView Bridge Protocol

Communication between Swift and JS uses a JSON-RPC-style protocol over WKWebView message handlers.

```swift
// BridgeProtocol.swift

// Messages from Swift to JavaScript
enum NativeToWebMessage: Codable {
    case loadSession(SessionData)
    case updateStep(StepData)
    case aiCaptionResult(stepId: String, caption: String)
    case aiEnhanceResult(results: [StepEnhancement])
    case exportProgress(progress: Float, message: String)
    case permissionStatus(PermissionState)
}

// Messages from JavaScript to Swift
enum WebToNativeMessage: Codable {
    case saveStep(StepData)
    case deleteStep(stepId: String)
    case reorderSteps(stepIds: [String])
    case requestAICaption(stepId: String)
    case requestAIEnhance
    case requestExport(ExportConfig)
    case requestScreenshot(stepId: String)        // Re-capture
    case updateAnnotations(stepId: String, annotations: [AnnotationData])
    case saveProject
    case openPreferences
    case startRecording(RecordingConfig)
}
```

```typescript
// web-bridge.ts (JavaScript side)

interface NativeBridge {
    // Called by Swift via webView.evaluateJavaScript
    onNativeMessage(message: NativeToWebMessage): void;

    // Call native Swift functions
    sendToNative(message: WebToNativeMessage): Promise<any>;
}

// Register message handler
window.webkit.messageHandlers.vibetuto.postMessage(JSON.stringify(message));

// Receive from native
window.vibetutoNative = {
    onMessage: (json: string) => {
        const message = JSON.parse(json);
        store.dispatch(handleNativeMessage(message));
    }
};
```

### 6.3 Editor Features (mapped to UX vision)

The editor UI reuses and extends the existing web app components:

| UX Feature | Web Component | Desktop Extension |
|---|---|---|
| Step list sidebar | New (based on existing step cards) | Drag-reorder via native drag |
| Screenshot preview | `AnnotationCanvas.tsx` (existing) | Same, loaded in WebView |
| Annotation tools | Existing toolbar (circle, arrow, text, blur, highlight, callout) | Same, click indicators from AX data |
| Properties panel | New (caption editor, metadata) | Auto-filled from step detection data |
| Timeline | New | Synchronized with native audio waveform |
| Rich text editing | `DocEditor.tsx` (existing) | Same |
| Export dialog | New shared component | Native file picker integration |

### 6.4 Post-Processing Pipeline

After recording stops, before the editor opens:

```
Recording Session
    |
    +-- 1. Sort and deduplicate actions by timestamp
    |
    +-- 2. Run StepDetector on buffered actions
    |      Produce ordered list of DetectedSteps
    |
    +-- 3. AI caption generation (parallel, async)
    |      For each step: generate caption from action + context
    |      Uses local LLM for speed, optionally enhanced by API
    |
    +-- 4. Smart crop screenshots (parallel, async)
    |      Vision framework detects relevant UI area
    |
    +-- 5. Merge audio tracks
    |      System audio + microphone into single timeline
    |
    +-- 6. WhisperKit transcription (if mic audio exists)
    |      Align transcript segments with steps by timestamp
    |
    +-- 7. Open Editor with processed data
```

---

## 7. Export Pipeline

### 7.1 ExportCoordinator

Manages all export formats through a unified interface.

```swift
protocol Exporter {
    var format: ExportFormat { get }
    var supportedOptions: [ExportOption] { get }
    func export(
        tutorial: Tutorial,
        options: ExportOptions,
        progress: (Float) -> Void
    ) async throws -> URL
}

enum ExportFormat {
    case video(VideoFormat)    // .mp4, .webm, .mov
    case pdf
    case html                  // Self-contained HTML file
    case markdown              // Markdown + image folder
    case notion                // Notion API format
    case confluence            // Confluence storage format
    case webEmbed              // Upload to Vibe Tuto Cloud
    case vibetuto              // Native .vibetuto file
}
```

### 7.2 Video Export

The video exporter creates an animated tutorial video with zoom effects, cursor animation, and optional AI voiceover.

```swift
class VideoExporter: Exporter {
    struct VideoOptions {
        var resolution: CGSize = CGSize(width: 1920, height: 1080)
        var fps: Int = 30
        var codec: AVVideoCodecType = .h264
        var transitionStyle: TransitionStyle = .crossfade
        var stepDuration: TimeInterval = 5.0       // Seconds per step
        var autoZoom: Bool = true                   // Zoom to action area
        var showCursor: Bool = true                 // Animated cursor movement
        var showClickIndicator: Bool = true         // Pulse on click location
        var showCaptions: Bool = true               // Text overlay captions
        var narratorVoice: NarratorVoice? = nil     // AI TTS voice
        var backgroundMusic: URL? = nil             // Optional background track
    }

    // For each step:
    // 1. Render screenshot with annotations (Metal-accelerated)
    // 2. Apply auto-zoom animation to action area
    // 3. Render cursor movement animation
    // 4. Render click indicator pulse
    // 5. Add caption text overlay
    // 6. Apply transition to next step
    // 7. Mix in narration audio (if AI voice enabled)
    // 8. Mix in background music (if selected)
    // Encode frames via AVAssetWriter + VideoToolbox (hardware H.264/H.265)
}
```

### 7.3 PDF Export

```swift
class PDFExporter: Exporter {
    struct PDFOptions {
        var pageSize: CGSize = CGSize(width: 612, height: 792)  // US Letter
        var orientation: PageOrientation = .portrait
        var includeTableOfContents: Bool = true
        var includeCoverPage: Bool = true
        var includePageNumbers: Bool = true
        var theme: PDFTheme = .default
    }

    // Layout per step:
    // - Step number + caption (headline)
    // - Screenshot with annotations rendered (scaled to fit page width)
    // - Description text below screenshot
    // - App context badge (icon + name)
    // - Page break between steps (or flow to next if space allows)
}
```

### 7.4 HTML Export

```swift
class HTMLExporter: Exporter {
    struct HTMLOptions {
        var interactive: Bool = true         // Step-by-step navigation
        var theme: HTMLTheme = .auto         // .light, .dark, .auto
        var imageFormat: ImageFormat = .webp // .png, .webp, .jpeg
        var standalone: Bool = true          // All assets embedded (base64)
        var includeSearch: Bool = true       // Client-side search
    }

    // Generates a single HTML file with:
    // - Embedded CSS (tailwind-based, matches web app theme)
    // - Embedded JS for step navigation, zoom, search
    // - Embedded images (base64 or external folder)
    // - Responsive layout (works on mobile)
    // - Matches the Viewer UX from the UX vision document
}
```

### 7.5 Web Platform Publish

```swift
class WebEmbedExporter: Exporter {
    // Uploads tutorial to Vibe Tuto Cloud (Supabase)
    // Uses the existing web API format:
    // 1. Create tutorial record via /api/tutorials
    // 2. Upload screenshots to Supabase Storage
    // 3. Create step records via /api/steps/batch
    // 4. Returns shareable URL: vibetuto.com/t/{token}

    // This maps directly to the existing data model:
    // Tutorial -> tutorials table
    // Step -> steps table (with source link)
    // Screenshots -> Supabase Storage bucket
}
```

---

## 8. AI Features

### 8.1 AICoordinator

Orchestrates all AI processing with a local-first, cloud-enhanced approach.

```swift
class AICoordinator {
    enum AIMode {
        case localOnly          // Fully offline, local models only
        case cloudEnhanced      // Local for real-time, cloud for polish
        case cloudPrimary       // Prefer cloud (best quality, needs internet)
    }

    var mode: AIMode = .cloudEnhanced

    // Sub-components
    let transcriber: LocalTranscriber       // WhisperKit
    let ocr: OCRProcessor                   // Vision framework
    let narrationGen: NarrationGenerator    // Local LLM + Claude API
    let smartCrop: SmartCropper             // Vision framework
}
```

### 8.2 Auto-Caption Generation

```swift
class NarrationGenerator {
    struct CaptionInput {
        let actionType: StepActionType
        let uiElement: UIElementInfo?
        let appContext: AppState?
        let ocrText: [String]?           // Text visible on screen
        let previousStepCaption: String?  // For narrative continuity
    }

    // Local caption generation (fast, runs during recording)
    func generateLocalCaption(from input: CaptionInput) -> String {
        // Template-based generation using action type + element info
        // Example: click on AXButton "Save" -> "Click the 'Save' button"
        // Example: type in AXTextField -> "Type '{text}' in the input field"
        // Example: appSwitch to "VS Code" -> "Switch to Visual Studio Code"
    }

    // Cloud-enhanced caption (polished, runs in post-processing)
    func enhanceCaption(step: DetectedStep, context: [DetectedStep]) async throws -> String {
        // Send to Claude API with full tutorial context
        // Prompt includes: action type, UI element, app context, surrounding steps
        // Returns natural, instructional language:
        // "Click the 'Save' button in the top-right corner to save your changes"
    }

    // Batch enhance all captions (the "Enhance" button in the editor)
    func enhanceAllCaptions(steps: [DetectedStep]) async throws -> [String] {
        // Single API call with all steps for consistency
        // Ensures consistent tone, terminology, and narrative flow
    }
}
```

### 8.3 Smart Crop & Auto-Annotation

```swift
class SmartCropper {
    struct CropSuggestion {
        let region: CGRect          // Suggested crop region (relative 0-1)
        let confidence: Float       // How confident the suggestion is
        let zoomLevel: Float        // Suggested zoom for viewer (1.0-3.0)
    }

    func suggestCrop(for screenshot: CGImage,
                     clickLocation: CGPoint?,
                     uiElement: UIElementInfo?) -> CropSuggestion {
        // 1. If click location exists, center crop around it
        // 2. Use Vision VNDetectRectanglesRequest to find UI panels/dialogs
        // 3. Use OCR to identify text-heavy regions
        // 4. Calculate optimal crop that includes:
        //    - The click target (with padding)
        //    - Enough context to orient the user
        //    - Not too much empty space
    }

    func suggestAutoAnnotations(for step: DetectedStep) -> [Annotation] {
        // 1. Click indicator at click location
        // 2. If small target: add zoom callout
        // 3. If sensitive content detected (Vision): add blur annotation
        // 4. If important label nearby: add highlight
    }
}
```

### 8.4 Transcription Pipeline

```swift
class LocalTranscriber {
    // WhisperKit-based local transcription
    let whisperKit: WhisperKit

    struct TranscriptSegment {
        let text: String
        let startTime: TimeInterval
        let endTime: TimeInterval
        let confidence: Float
    }

    func transcribe(audioURL: URL,
                    progress: (Float) -> Void) async throws -> [TranscriptSegment] {
        // 1. Load audio file
        // 2. Run WhisperKit inference (on Apple Neural Engine)
        // 3. Return timestamped segments
        // 4. Segments are aligned with tutorial steps by timestamp matching
    }

    // Real-time streaming transcription (during recording)
    func startStreamingTranscription(from audioEngine: AVAudioEngine) async {
        // Provides live captions during recording
        // Lower accuracy than post-processing but gives immediate feedback
    }
}
```

### 8.5 AI TTS for Video Narration

```swift
class VoiceNarrator {
    enum NarratorVoice {
        case system(AVSpeechSynthesisVoice)  // macOS system TTS
        case ai(provider: AIVoiceProvider)    // Cloud TTS (ElevenLabs, OpenAI)
    }

    func generateNarration(for steps: [StepWithCaption],
                           voice: NarratorVoice) async throws -> [AudioSegment] {
        // For each step's caption, generate spoken audio
        // Returns timestamped audio segments for video export
    }
}
```

---

## 9. Data Model

### 9.1 Local Storage: SQLite via GRDB

The local data model extends the existing web app schema with desktop-specific fields.

```sql
-- Tutorial (maps to web app's tutorials table)
CREATE TABLE tutorials (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT,
    status TEXT NOT NULL DEFAULT 'draft',  -- draft, published, archived

    -- Desktop-specific fields
    recording_mode TEXT,          -- fullWorkflow, singleApp, region
    recording_duration REAL,     -- Total recording time in seconds
    audio_narration_url TEXT,    -- Path to mic audio file
    system_audio_url TEXT,       -- Path to system audio file
    transcript TEXT,             -- JSON: [TranscriptSegment]
    ai_mode TEXT DEFAULT 'cloudEnhanced',

    -- Sync
    cloud_id TEXT,               -- Supabase tutorial ID (after sync)
    last_synced_at TEXT,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Source: Raw captured data from recording session
CREATE TABLE sources (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tutorial_id TEXT NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,

    -- Screenshot
    screenshot_path TEXT,         -- Local file path to screenshot
    thumbnail_path TEXT,          -- Local file path to thumbnail

    -- Click/action data
    click_x REAL,                 -- Click X relative to screenshot (0-1)
    click_y REAL,                 -- Click Y relative to screenshot (0-1)
    click_type TEXT,              -- click, type, shortcut, appSwitch, etc.

    -- Window/viewport context
    viewport_width INTEGER,
    viewport_height INTEGER,
    window_id INTEGER,            -- CGWindowID

    -- App context
    app_bundle_id TEXT,
    app_name TEXT,
    window_title TEXT,
    url TEXT,                     -- Browser URL if applicable

    -- Accessibility element info
    element_info TEXT,            -- JSON: UIElementInfo

    -- Timing
    timestamp_start REAL,         -- Recording-relative timestamp (seconds)
    timestamp_end REAL,

    -- AI processing results
    ocr_text TEXT,                -- JSON: extracted text from screenshot
    auto_caption TEXT,            -- AI-generated caption
    crop_suggestion TEXT,         -- JSON: CropSuggestion
    confidence REAL,              -- Step detection confidence (0-1)

    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step: Authored tutorial content (user-edited)
CREATE TABLE steps (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tutorial_id TEXT NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
    source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL,

    -- Content
    step_type TEXT NOT NULL DEFAULT 'image',  -- image, text, heading, divider
    text_content TEXT,            -- Caption / heading text
    description TEXT,             -- Extended description (rich text)

    -- Annotations
    annotations TEXT,             -- JSON: [Annotation] (same format as web app)

    -- Crop/zoom
    crop_region TEXT,             -- JSON: {x, y, width, height} relative 0-1
    zoom_level REAL DEFAULT 1.0,

    -- Sync
    cloud_id TEXT,                -- Supabase step ID (after sync)

    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Recording session metadata
CREATE TABLE recording_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tutorial_id TEXT NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,

    -- Config
    recording_mode TEXT NOT NULL,
    target_app_bundle_id TEXT,    -- For singleApp mode
    target_region TEXT,           -- JSON: CGRect for region mode

    -- Timing
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration REAL,

    -- Environment
    display_count INTEGER,
    primary_display_resolution TEXT,  -- "2560x1600"
    macos_version TEXT,

    -- Stats
    total_events_captured INTEGER,
    total_steps_detected INTEGER,
    total_screenshots INTEGER
);

-- Plugin context snapshots
CREATE TABLE plugin_contexts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    plugin_id TEXT NOT NULL,      -- e.g., "browser", "vscode", "figma"
    context_data TEXT NOT NULL,   -- JSON: plugin-specific context
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tags for organizing tutorials
CREATE TABLE tags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE tutorial_tags (
    tutorial_id TEXT NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (tutorial_id, tag_id)
);

-- Indexes
CREATE INDEX idx_sources_tutorial ON sources(tutorial_id, order_index);
CREATE INDEX idx_steps_tutorial ON steps(tutorial_id, order_index);
CREATE INDEX idx_steps_source ON steps(source_id);
CREATE INDEX idx_plugin_contexts_source ON plugin_contexts(source_id);
CREATE INDEX idx_tutorials_status ON tutorials(status);
CREATE INDEX idx_tutorials_cloud_id ON tutorials(cloud_id);
```

### 9.2 `.vibetuto` File Format

A `.vibetuto` file is a directory bundle (macOS package) containing:

```
MyTutorial.vibetuto/
  tutorial.db              # SQLite database (schema above)
  media/
    screenshots/
      {source_id}.heic     # Full-resolution screenshots
    thumbnails/
      {source_id}_thumb.heic  # 320px thumbnails
    audio/
      narration.m4a        # Microphone recording
      system.m4a           # System audio recording
  metadata.json            # Quick-read metadata (title, step count, created date)
```

Benefits:
- Self-contained and portable (drag to share, backup, move)
- SQLite is inspectable and queryable
- HEIC provides excellent compression for screenshots
- Can be opened by double-clicking (file association)
- Quick Look preview via QLPreviewProvider plugin

### 9.3 Mapping to Web Platform Data Model

The desktop data model is a superset of the web app's existing schema. Sync maps as follows:

| Desktop (Local) | Web (Supabase) | Notes |
|---|---|---|
| `tutorials` | `tutorials` | Core fields match; desktop has extra recording metadata |
| `sources` | `sources` (existing) | Desktop adds `app_bundle_id`, `window_title`, richer `element_info` |
| `steps` | `steps` (existing) | Same structure; annotations use identical JSON format |
| `screenshots/` | Supabase Storage | Uploaded during sync/publish |

The existing web types (`Source`, `StepWithSignedUrl`, `Annotation`, `ElementInfo`) remain the shared interface. The desktop app produces richer `element_info` (with AX role, parent chain) but the web app gracefully ignores unknown fields.

---

## 10. Plugin / Extension System

### 10.1 Plugin Protocol

Plugins add app-specific intelligence to the step detection system.

```swift
protocol AppPlugin {
    /// Unique identifier for this plugin
    var pluginID: String { get }

    /// Display name
    var displayName: String { get }

    /// Bundle identifiers this plugin handles
    var supportedBundleIDs: [String] { get }

    /// Extract app-specific context when this app is active
    func extractContext(from app: NSRunningApplication,
                        accessibility: AXUIElement) -> [String: Any]?

    /// Enhance a detected step with app-specific information
    func enhanceStep(step: inout DetectedStep,
                     context: [String: Any]) -> Bool

    /// Generate a better caption using app-specific knowledge
    func generateCaption(for step: DetectedStep,
                         context: [String: Any]) -> String?

    /// Custom action classification for this app
    func classifyAction(event: InputEvent,
                        element: UIElementInfo?,
                        context: [String: Any]) -> StepActionType?
}
```

### 10.2 Built-in Plugins

**BrowserPlugin** -- Handles Safari, Chrome, Firefox, Edge, Brave, Arc:
- Extracts: current URL, tab title, tab count
- Detects: URL navigation, tab switch, form submission
- Captions: "Navigate to github.com/settings", "Click the 'Pull requests' tab"

**VSCodePlugin** -- Handles VS Code, VSCodium:
- Extracts from window title: filename, language, git branch
- Detects: file open, file save, terminal commands
- Captions: "Open the file 'main.swift'", "Run 'npm install' in the terminal"

**TerminalPlugin** -- Handles Terminal.app, iTerm2, Warp, Alacritty:
- Extracts: current directory (from title bar), recent command (from AX)
- Detects: command execution, directory change
- Captions: "Run the command 'git push origin main'"

**FigmaPlugin** -- Handles Figma Desktop:
- Extracts: file name, page name, selected layer
- Detects: tool changes, layer selection, export actions
- Captions: "Select the 'Header' component in Figma"

### 10.3 Plugin Discovery and Loading

```swift
class PluginHost {
    var builtinPlugins: [AppPlugin] = [
        BrowserPlugin(),
        VSCodePlugin(),
        TerminalPlugin(),
        FigmaPlugin(),
    ]

    // Future: load external plugins from
    // ~/Library/Application Support/VibeTuto/Plugins/
    var externalPlugins: [AppPlugin] = []

    var allPlugins: [AppPlugin] { builtinPlugins + externalPlugins }

    func plugin(for bundleID: String) -> AppPlugin? {
        allPlugins.first { $0.supportedBundleIDs.contains(bundleID) }
    }
}
```

---

## 11. Web Platform Integration

### 11.1 Sync Architecture

The desktop app is offline-first. All data lives locally in SQLite. Cloud sync is optional and happens via the existing Supabase backend.

```
Desktop App (SQLite + Files)
    |
    +-- SyncManager
    |   +-- Auth: Supabase Auth (same account as web app)
    |   +-- Tutorials: Supabase REST API (POST/PUT /api/tutorials)
    |   +-- Steps: Supabase REST API (POST/PUT /api/steps/batch)
    |   +-- Screenshots: Supabase Storage upload
    |   +-- Conflict resolution: last-writer-wins with timestamp
    |
    +-- Triggers:
        +-- Manual: "Publish to Cloud" button in export
        +-- Auto-sync: On save (if enabled in preferences)
        +-- On-demand: Pull latest from cloud for previously synced tutorial
```

### 11.2 Authentication

The desktop app authenticates with Supabase using the same auth system as the web app:

```swift
class AuthManager {
    let supabase: SupabaseClient

    // Sign in options:
    // 1. Email + password (same as web app)
    // 2. OAuth (Google, GitHub) via ASWebAuthenticationSession
    // 3. Magic link via email

    // Session is stored in Keychain
    // Token refresh handled automatically by Supabase Swift SDK

    func signIn(email: String, password: String) async throws -> User
    func signInWithOAuth(provider: OAuthProvider) async throws -> User
    func signOut() async throws
    var currentUser: User? { get }
}
```

### 11.3 API Compatibility

The desktop app communicates with the same API endpoints as the web app:

| Operation | Endpoint | Desktop Usage |
|---|---|---|
| Create tutorial | `POST /api/tutorials` | On first sync/publish |
| Update tutorial | `PUT /api/tutorials/{id}` | On subsequent syncs |
| Upload screenshot | Supabase Storage | Via Supabase Swift SDK |
| Create/update steps | `POST /api/steps/batch` | Batch sync all steps |
| Generate AI tutorial | `POST /api/generate-tutorial` | Optional cloud generation |
| Share tutorial | `POST /api/tutorials/{id}/share` | Generate share link |

---

## 12. System Architecture Diagrams

### 12.1 Recording Flow

```
+----------------+     +----------------+     +----------------+
|  User Action   | --> |  NSEvent       | --> | ActionBuffer   |
|  (click, key)  |     |  Monitor       |     |                |
+----------------+     +----------------+     +-------+--------+
                                                       |
+----------------+     +----------------+              |
|  Screen        | --> |  Capture       |              |
|  Content       |     |  Engine        |              |
+----------------+     +-------+--------+              |
                               |                       |
                        +------v--------+       +------v--------+
                        | Frame         |       | Accessibility |
                        | Processor     |       | Reader        |
                        +------+--------+       +------+--------+
                               |                       |
                        +------v--------+       +------v--------+
                        | Media         |       | Step          |
                        | Store         |       | Detector      |
                        +------+--------+       +------+--------+
                               |                       |
                               +----------+------------+
                                          |
                                   +------v--------+
                                   | Recording     |
                                   | Session       |
                                   | (SQLite)      |
                                   +---------------+
```

### 12.2 Post-Processing Flow

```
+--------------------+
| Recording Session  |
+---------+----------+
          |
          v
+----------------------------------------------------------+
|                   Post-Processor                          |
|                                                          |
|  +-----------+  +-----------+  +-----------+             |
|  | Step      |  | OCR       |  | Whisper   |             |
|  | Detector  |  | Processor |  | Kit       |             |
|  |           |  | (Vision)  |  |           |             |
|  +-----+-----+  +-----+-----+  +-----+-----+            |
|        |              |              |                    |
|        v              v              v                    |
|  +-------------------------------------------+           |
|  |        AI Caption Generator                |           |
|  |   (local template + Claude API)            |           |
|  +---------------------+---------------------+           |
|                        |                                  |
|  +---------------------v---------------------+           |
|  |        Smart Cropper                       |           |
|  |   (Vision + heuristics)                    |           |
|  +---------------------+---------------------+           |
+------------------------|---------------------------------+
                         |
                         v
              +--------------------+
              |  Open Editor UI    |
              |  (WKWebView)       |
              +--------------------+
```

### 12.3 Export Flow

```
+-------------------+
| Editor (WebView)  |
| "Export" clicked   |
+---------+---------+
          | WebToNativeMessage.requestExport(config)
          v
+---------+---------+
| ExportCoordinator |
+---------+---------+
          |
          +--> VideoExporter     --> .mp4/.webm/.mov
          |    (AVAssetWriter, Metal rendering)
          |
          +--> PDFExporter       --> .pdf
          |    (PDFKit)
          |
          +--> HTMLExporter      --> .html
          |    (Template + embedded assets)
          |
          +--> MarkdownExporter  --> .md + images/
          |
          +--> WebEmbedExporter  --> Supabase upload
               (REST API + Storage)
               Returns shareable URL
```

---

## 13. Performance Budget

### 13.1 Recording Performance Targets

| Metric | Target | Approach |
|---|---|---|
| CPU during recording | < 10% | ScreenCaptureKit is GPU-backed; 2fps capture; defer AI to post-processing |
| Memory during recording | < 150 MB | Stream frames to disk, don't buffer in RAM |
| Screenshot capture latency | < 50ms | SCScreenshotManager (hardware-accelerated) |
| Action detection latency | < 100ms | NSEvent is real-time; AXUIElement query < 20ms |
| Battery impact | < 5% per hour | Low frame rate, hardware acceleration, no Chromium |
| Storage per minute of recording | ~5 MB | HEIF screenshots (~200KB each at 2fps) + audio |

### 13.2 Post-Processing Performance Targets

| Metric | Target | Approach |
|---|---|---|
| Step detection | < 1 second | Runs on buffered data, simple classification rules |
| OCR per screenshot | < 200ms | Vision framework on Apple Neural Engine |
| Caption generation (local) | < 500ms per step | Template-based, no LLM needed |
| Caption generation (cloud) | < 3s per step | Claude API, batched for efficiency |
| WhisperKit transcription | ~0.3x real-time | Apple Neural Engine, "base" model |
| Full post-processing (10 steps) | < 10 seconds | Parallel processing across queues |

### 13.3 Export Performance Targets

| Format | 20-step tutorial target | Approach |
|---|---|---|
| PDF | < 5 seconds | PDFKit, parallel image rendering |
| HTML | < 3 seconds | Template concatenation + base64 encoding |
| Markdown | < 2 seconds | String generation + file copy |
| Video (1080p) | < 30 seconds | VideoToolbox hardware encoding |
| Web publish | < 15 seconds | Parallel screenshot upload + API calls |

### 13.4 App Launch Performance

| Metric | Target | Approach |
|---|---|---|
| Cold launch to menu bar ready | < 1 second | Lean native binary, lazy WebView init |
| Time to start recording | < 2 seconds | Pre-enumerate SCShareableContent |
| Editor open (from recording) | < 3 seconds | WebView + post-processing in parallel |
| Library browse | Instant | SQLite queries with indexes |

---

## 14. Security & Privacy

### 14.1 Data Privacy

- **Local-first**: All tutorial data stored locally by default; cloud sync is opt-in
- **No telemetry**: No analytics, no usage tracking, no crash reporting without opt-in
- **API keys**: Stored in macOS Keychain (not in files)
- **Screenshot sensitivity**:
  - Auto-detect PII using Vision framework (email addresses, phone numbers)
  - Suggest blur annotations for detected sensitive content
  - Never send raw screenshots to cloud AI -- only send cropped action regions or text descriptions

### 14.2 Permissions

```swift
class PermissionManager {
    enum Permission {
        case screenRecording    // ScreenCaptureKit
        case accessibility      // AXUIElement, keyboard monitoring
        case microphone         // AVAudioEngine
    }

    func checkPermission(_ permission: Permission) -> PermissionStatus
    func requestPermission(_ permission: Permission) async -> PermissionStatus

    enum PermissionStatus {
        case granted
        case denied
        case notDetermined
        case needsReauthorization  // macOS Sequoia monthly re-auth
    }

    // Graceful degradation matrix:
    // Screen Recording denied = Cannot record (must have)
    // Accessibility denied = Record works, no action detection, no keyboard
    // Microphone denied = Record works, no voice narration
}
```

### 14.3 Code Signing & Distribution

- **Signed with Apple Developer ID** for notarization
- **Hardened runtime** enabled
- **App Sandbox** considerations:
  - If not sandboxed: distribute via direct download + notarization
  - If sandboxed: distribute via Mac App Store (limited AX access)
- **Automatic updates**: Sparkle framework for direct-download distribution

### 14.4 Entitlements Required

```xml
<!-- VibeTuto.entitlements -->
<dict>
    <!-- Screen recording -->
    <key>com.apple.security.screen-capture</key>
    <true/>

    <!-- Accessibility -->
    <key>com.apple.security.accessibility</key>
    <true/>

    <!-- Microphone -->
    <key>com.apple.security.device.audio-input</key>
    <true/>

    <!-- Network (for cloud sync + AI APIs) -->
    <key>com.apple.security.network.client</key>
    <true/>

    <!-- File access (for saving exports) -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>

    <!-- Keychain (for API keys, auth tokens) -->
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)com.thevibecompany.vibetuto</string>
    </array>
</dict>
```

---

## Summary

This architecture delivers on the UX vision's "Record once, teach forever" principle by combining:

1. **Native Swift core** for low-overhead, high-fidelity screen capture and action detection
2. **Embedded WebView UI** for code sharing with the existing web platform
3. **Semantic action detection** via Accessibility API for intelligent step understanding
4. **Local-first AI** for privacy-preserving transcription, OCR, and caption generation
5. **Flexible export pipeline** supporting video, PDF, HTML, Markdown, and web publishing
6. **Plugin architecture** for app-specific intelligence (browsers, IDEs, design tools)
7. **Offline-first data model** with optional Supabase cloud sync

The architecture is designed to be built incrementally: the core recording engine and basic editor can ship as an MVP, with AI features, plugins, and export formats added progressively.
