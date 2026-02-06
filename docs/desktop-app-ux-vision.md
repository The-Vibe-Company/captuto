# Vibe Tuto Desktop Recorder -- UX/UI Vision Document

## Executive Summary

Vibe Tuto Desktop is a **lightweight native macOS companion app** that records multi-application tutorials and uploads them to the Vibe Tuto web platform for editing, annotation, AI processing, and sharing. Think of it as the Loom desktop recorder meets Scribe's auto-step-detection -- a minimal, always-ready tool that lives in your menu bar, captures everything you do across any application, and hands it off to the web app where the real magic happens.

The app does **one thing exceptionally well: capture.** All editing, annotation, export, and collaboration happen in the existing Vibe Tuto web app.

**Guiding design principle: "Hit record, do your thing, done."**

---

## 1. User Personas

### 1.1 "Alex" -- The Developer Advocate
- **Role**: DevRel at a SaaS company
- **Goals**: Create onboarding tutorials spanning terminal + IDE + browser
- **Pain points**: Current tools (Scribe, Tango) only work in browsers. Recording desktop apps requires manual screenshots
- **Key need from the recorder**: One-click recording across ALL apps, auto-detection of steps, seamless upload to the web editor

### 1.2 "Maya" -- The Content Creator
- **Role**: Tech YouTuber creating software tutorials
- **Goals**: Produce written tutorial companions alongside video content
- **Pain points**: Separate tools for video and written guides. No auto-step-detection for desktop apps
- **Key need from the recorder**: Record with audio narration, capture every click as a potential step, upload fast so editing can begin in the browser

### 1.3 "Jordan" -- The Support Team Lead
- **Role**: Manages a team writing help center articles
- **Goals**: Keep documentation current as the product evolves
- **Pain points**: Re-recording flows is tedious. Screenshots break with every UI update
- **Key need from the recorder**: Quick re-record of specific workflows, minimal friction to start/stop, team can share recordings via the web platform

### 1.4 "Dr. Chen" -- The Educator
- **Role**: CS professor creating courseware
- **Goals**: Create step-by-step walkthroughs of development environments
- **Pain points**: Existing tools don't capture IDE + terminal workflows well
- **Key need from the recorder**: Reliable multi-app capture, automatic step boundaries at meaningful actions

### 1.5 "Sam" -- The Knowledge Worker
- **Role**: Operations manager documenting internal processes
- **Goals**: Document multi-app workflows (Salesforce + Excel + Slack) for onboarding
- **Pain points**: Existing tools are browser-only or require manual effort
- **Key need from the recorder**: Zero configuration. Hit record, do the workflow, stop. The web app handles the rest

---

## 2. App Architecture (UX Perspective)

### What the Desktop App Does
1. Lives in the macOS menu bar (no Dock icon by default)
2. Records screen content (full screen, single app, or region)
3. Captures audio narration (microphone)
4. Detects user actions in real-time (clicks, keystrokes, app switches, URL changes)
5. Takes screenshots at each detected action for step generation
6. Packages recording data (screenshots, action metadata, audio) and uploads to Vibe Tuto web
7. Opens the web editor in the user's browser when upload completes

### What the Desktop App Does NOT Do
- No editing, annotation, or timeline
- No export (PDF, video, etc.)
- No library or tutorial management
- No viewer or playback
- No AI processing (transcription, caption generation)

All of the above happen in the **existing Vibe Tuto web app** (`apps/web`).

---

## 3. Core User Journey

There is essentially **one journey** for the desktop app:

```
Menu Bar  -->  Configure  -->  Countdown  -->  Record  -->  Stop  -->  Upload  -->  Open Web Editor
```

### 3.1 Idle State (Menu Bar)

The app lives quietly in the menu bar. No Dock icon, no window -- just a small status item.

**Menu Bar Icon**: SF Symbol `record.circle` in the system's monochrome style (gray when idle).

**Clicking the menu bar icon** reveals a compact dropdown panel (~280 x ~320 pt):

```
+--------------------------------------+
|  Vibe Tuto Recorder                  |
|                                      |
|  [Record Full Screen]  (primary btn) |
|                                      |
|  Record Mode:                        |
|  ( ) Full Screen                     |
|  ( ) Single App  [select app v]      |
|  ( ) Screen Region                   |
|                                      |
|  Options:                            |
|  [x] Audio narration (mic)           |
|  [ ] System audio                    |
|  [x] Detect actions (Accessibility)  |
|                                      |
|  ---                                 |
|  Recent Recordings:                  |
|    Setup Guide  -  2 min ago  [->]   |
|    API Demo     -  1 hour ago [->]   |
|  ---                                 |
|  Preferences...     Quit             |
+--------------------------------------+
```

**Key interactions:**
- The primary "Record" button is large and prominent (accent color, capsule shape)
- Recording mode is remembered from last session
- "Recent Recordings" shows the last 3-5 uploads with links to open them in the web editor (`[->]` icon opens browser)
- The panel uses NSVisualEffectView with `.popover` material for native vibrancy
- Keyboard shortcut hint shown next to the Record button (e.g., "Cmd+Shift+R")

### 3.2 Pre-Recording Configuration

Most users will use the defaults and just hit "Record." For power users:

- **Single App mode**: A dropdown lists running applications (with their icons). Selecting one will only capture that app's window(s)
- **Region mode**: Clicking "Record" in this mode shows a crosshair cursor to select a screen region (similar to macOS screenshot region selection)
- **Audio toggle**: Shows the active mic input. Click to change input device
- **Action detection toggle**: On by default. When on, uses Accessibility API to detect clicks/keystrokes. Can be disabled if the user only wants manual markers

### 3.3 Countdown & Recording Start

1. User clicks "Record" (or presses global hotkey)
2. The menu bar panel closes
3. A **3-2-1 countdown** appears as a centered, translucent overlay on the recorded screen/region (large numbers, fade-in/fade-out, ~0.8s per number). Can be disabled in Preferences
4. Recording begins

**Visual indicators that recording is active:**
- Menu bar icon changes to a **red pulsing dot** (SF Symbol `record.circle` with red fill, gentle pulse animation)
- A thin **2px colored border** (brand purple) appears around the recording region
- The **floating toolbar** appears

### 3.4 Floating Recording Toolbar

The primary UI during recording. Designed to be as unobtrusive as possible.

**Default state** (expanded):
```
+---------------------------------------------------+
|  * 01:23  |  12 steps  |  [||]  [+]  [Stop]      |
+---------------------------------------------------+
```

- Shape: Horizontal pill, ~260 x 40 pt
- Background: Translucent with vibrancy (`NSVisualEffectView`, `.popover` material)
- Corner radius: Full capsule (20 pt)
- Position: Bottom-center of the recorded screen, 32 pt from the bottom edge. Draggable to any screen edge
- Always-on-top (NSWindow.Level.floating)

**Elements (left to right):**
- **Recording dot**: Small red pulsing circle (6 pt diameter)
- **Timer**: "01:23" format, Caption 1 weight, updates every second
- **Divider**: Thin vertical line (0.5 pt, 50% opacity)
- **Step counter**: "12 steps" -- updates live as actions are detected
- **Divider**
- **Pause/Resume button**: SF Symbol `pause.circle` / `play.circle` (Mini size, 24 pt tap target)
- **Add Marker button**: SF Symbol `flag.fill` -- manually marks the current moment as a step
- **Stop button**: SF Symbol `stop.circle.fill` with red accent color, slightly larger (28 pt)

**Auto-collapse behavior:**
- After 4 seconds of no mouse proximity, the toolbar collapses to a minimal indicator:
  ```
  +-------------+
  |  * 01:23    |
  +-------------+
  ```
- Hovering near the toolbar expands it back (spring animation, 0.25s)
- The toolbar never fully hides -- users always see the timer as confirmation that recording is active

**Step detection feedback:**
- When a new step is detected, the step counter briefly pulses and increments
- A subtle haptic-like visual flash on the toolbar (brief brightness increase, 0.15s)
- No disruptive notifications or sounds

### 3.5 During Recording

The user simply performs their workflow normally. The app runs silently in the background:

- **Click detected**: Screenshot captured, click coordinates recorded, target element info captured (via Accessibility API)
- **Keystroke sequence**: Grouped into a single action (e.g., typing a URL). Screenshot captured on Enter/Tab/click-away
- **App switch**: Detected via NSWorkspace notifications. New app window captured
- **URL change** (browsers): Detected via Accessibility API reading the address bar. Screenshot captured
- **Scroll**: Not captured as individual steps (too noisy), but tracked for context

The user can also:
- **Pause**: Pauses all capture. The timer stops, the recording dot turns yellow. Useful for taking a break, handling interruptions, or skipping irrelevant parts
- **Add marker**: Forces a step capture at the current moment, regardless of detected actions
- **Use any global hotkey**: All actions (pause, marker, stop) available via configurable keyboard shortcuts

### 3.6 Stop Recording

User clicks Stop (or presses the global hotkey). Recording ends immediately.

The floating toolbar transforms into an **upload panel**:

```
+---------------------------------------------------+
|                                                   |
|  Recording complete!                              |
|  2:47 duration  -  18 steps  -  Audio captured    |
|                                                   |
|  [=======>          ] Uploading... 34%            |
|  Uploading step 6 of 18                           |
|                                                   |
|  [Cancel]                                         |
|                                                   |
+---------------------------------------------------+
```

**Upload panel details:**
- Same floating window position and style as the toolbar, but expanded (~300 x 160 pt)
- Spring animation from toolbar to upload panel (0.3s)
- Shows: duration, step count, whether audio was captured
- Progress bar: Animated gradient fill (brand purple), shows percentage
- Detail text: "Uploading step X of Y" or "Uploading audio..."
- Cancel button: Stops upload, keeps local recording data (can retry later from Recent Recordings)

**Upload process:**
1. Screenshots are compressed and uploaded in parallel (up to 4 concurrent uploads)
2. Audio file uploaded as a single stream
3. Action metadata (click coordinates, timestamps, app names, URLs, element info) uploaded as JSON
4. A new tutorial is created in the web app's database

### 3.7 Upload Complete & Handoff to Web

When upload finishes, the panel transforms one final time:

```
+---------------------------------------------------+
|                                                   |
|  Upload complete!                                 |
|                                                   |
|  [Open in Editor]           [Dismiss]             |
|                                                   |
+---------------------------------------------------+
```

- **"Open in Editor"** (primary button, accent color): Opens the user's default browser to the tutorial editor page (`/editor/[id]`). The web app takes over from here for AI processing, editing, annotation, and export
- **"Dismiss"**: Closes the panel. The recording appears in "Recent Recordings" in the menu bar dropdown
- **Auto-open option**: In Preferences, users can enable "Automatically open editor after upload" to skip this step
- A **macOS notification** is also sent: "Tutorial uploaded! Click to open in editor." (useful if the user has moved on to other work)

### 3.8 Preferences

A standard macOS Preferences window (NSWindow, ~480 x 400 pt, tab-based):

**General tab:**
- Launch at login (checkbox)
- Show Dock icon (checkbox, off by default)
- Countdown before recording (checkbox, on by default)
- Auto-open editor after upload (checkbox, off by default)
- Recording quality: Standard (1x) / High (2x Retina) -- affects screenshot size
- Vibe Tuto account: Shows logged-in user, sign out button

**Shortcuts tab:**
- Start/Stop Recording: default Cmd+Shift+R
- Pause/Resume: default Cmd+Shift+P
- Add Marker: default Cmd+Shift+M
- All configurable with standard shortcut recorder control

**Audio tab:**
- Input device selector
- Noise reduction toggle
- Audio level meter (live preview)

**Advanced tab:**
- Action detection sensitivity: Low / Medium / High
- Step grouping delay: How long to wait before grouping rapid actions (default: 500ms)
- Upload destination: Web app URL (default: production, configurable for self-hosted)
- Clear local cache
- Reset all preferences

---

## 4. UI Concepts -- Detailed Screen Specifications

### 4.1 Menu Bar Icon States

| State | Icon | Color | Animation |
|---|---|---|---|
| Idle | `record.circle` | System monochrome (gray) | None |
| Recording | `record.circle.fill` | Red | Gentle pulse (0.8s cycle) |
| Paused | `pause.circle.fill` | Yellow/amber | None |
| Uploading | `arrow.up.circle` | System accent | Spinning |
| Upload complete | `checkmark.circle.fill` | Green | None (reverts to idle after 5s) |
| Error | `exclamationmark.triangle.fill` | Yellow | None |

### 4.2 Menu Bar Dropdown Panel

- **Size**: ~280 x 320 pt (dynamic height based on content)
- **Style**: NSPopover with `.popover` material, rounded corners (12 pt)
- **Appearance**: Adapts to system light/dark mode automatically
- **Sections** (top to bottom):
  1. App name + account avatar (tiny, 16 pt)
  2. Primary Record button
  3. Recording mode selector (radio group)
  4. Options toggles
  5. Separator
  6. Recent Recordings list (0-5 items, scrollable if needed)
  7. Separator
  8. Preferences... / Quit links

### 4.3 Floating Recording Toolbar -- Detailed Spec

**Dimensions:**
- Expanded: 260 x 40 pt (capsule)
- Collapsed: 100 x 32 pt (capsule)
- Corner radius: Half of height (full capsule)

**Behavior:**
- Initial position: Centered horizontally, 32 pt from the bottom of the recorded screen
- Draggable to any position. Snaps to screen edges with 16 pt margin
- Remembers position between recordings
- Z-order: NSWindow.Level.floating (above all other windows)
- Click-through: Only the toolbar itself captures clicks. The rest of the screen passes through to applications beneath

**Visual treatment:**
- NSVisualEffectView with `.popover` material
- 1 pt border in `NSColor.separatorColor` (subtle edge definition)
- Drop shadow: 0 pt x-offset, 2 pt y-offset, 8 pt blur, 10% black opacity

**Transitions:**
- Idle to recording: Toolbar springs out from menu bar icon position (0.3s spring animation)
- Expanded to collapsed: Smooth width reduction, non-essential elements fade out (0.25s)
- Collapsed to expanded: Reverse of above (0.2s, slightly faster for responsiveness)
- Recording to upload panel: Crossfade + size expansion (0.3s spring)
- Upload to complete: Content crossfade (0.2s)

### 4.4 Upload Progress Panel

**Dimensions**: ~300 x 160 pt (rounded rect, 16 pt corners)
**Position**: Same position as the recording toolbar was (maintains spatial continuity)

**Progress bar:**
- Height: 6 pt, full-width with 16 pt side margins
- Corner radius: 3 pt
- Background: `NSColor.separatorColor`
- Fill: Animated gradient (brand purple to lighter purple, moving left to right)
- On completion: Fills to 100%, gradient stops, color transitions to green (0.3s)

**States:**
1. **Uploading**: Progress bar animating, step counter incrementing, Cancel button visible
2. **Complete**: Progress bar full (green), "Open in Editor" + "Dismiss" buttons replace Cancel
3. **Error**: Progress bar turns red, error message shown ("Upload failed. Check your connection."), "Retry" + "Save Locally" buttons

### 4.5 First Launch & Onboarding

A lightweight onboarding flow (3 screens in an NSWindow, ~400 x 500 pt):

**Screen 1: Welcome**
```
+----------------------------------------+
|                                        |
|        [App Icon - 64pt]               |
|                                        |
|     Welcome to Vibe Tuto Recorder      |
|                                        |
|   Record any workflow on your Mac.     |
|   We'll turn it into a tutorial.       |
|                                        |
|          [Get Started]                 |
|                                        |
+----------------------------------------+
```

**Screen 2: Permissions**
```
+----------------------------------------+
|                                        |
|   We need two permissions to work:     |
|                                        |
|   [icon] Screen Recording              |
|   To capture what's on your screen     |
|   [Grant Permission]                   |
|                                        |
|   [icon] Accessibility                 |
|   To detect your clicks and actions    |
|   [Grant Permission]                   |
|                                        |
|   Why do we need these?  [link]        |
|                                        |
|   [Continue]  (disabled until granted) |
|                                        |
+----------------------------------------+
```

- Each permission shows a clear one-line explanation of WHY
- "Why do we need these?" links to a help article
- The Continue button is disabled (grayed) until both permissions are granted
- If the user grants permissions in System Settings, the buttons update in real-time

**Screen 3: Sign In**
```
+----------------------------------------+
|                                        |
|   Sign in to your Vibe Tuto account    |
|                                        |
|   [Sign in with browser]              |
|                                        |
|   This will open your browser to       |
|   sign in securely.                    |
|                                        |
|   Don't have an account? [Sign up]     |
|                                        |
+----------------------------------------+
```

- Uses OAuth/browser-based authentication (no password fields in the app)
- After sign-in, a callback URL brings focus back to the app
- "You're signed in as [name]!" confirmation, then the onboarding closes and the menu bar icon appears

### 4.6 Preferences Window

Standard macOS preferences layout (NSTabView or SwiftUI TabView):
- **Size**: ~480 x 400 pt
- **Tabs**: General, Shortcuts, Audio, Advanced
- **Style**: Native macOS settings appearance (labels on the left, controls on the right, grouped in visual sections)
- Follows the same patterns as System Settings on macOS 13+

---

## 5. macOS Design Language

### 5.1 Apple Human Interface Guidelines Adherence

The recorder is a **menu bar app** (NSStatusItem) with minimal windowing. This is the most appropriate pattern for a single-purpose utility.

**Key HIG patterns used:**
- NSStatusItem for menu bar presence
- NSPopover for the configuration dropdown
- NSPanel (floating, non-activating) for the recording toolbar
- NSWindow for preferences (standard, restorable)
- NSUserNotification for upload completion
- Standard macOS alert sheets for errors and confirmations

### 5.2 SF Symbols Used

A deliberately small set -- the app is minimal:

| Context | Symbol | Usage |
|---|---|---|
| Menu bar (idle) | `record.circle` | Status item icon |
| Menu bar (recording) | `record.circle.fill` | Active recording indicator |
| Menu bar (uploading) | `arrow.up.circle` | Upload in progress |
| Menu bar (complete) | `checkmark.circle.fill` | Upload successful |
| Menu bar (error) | `exclamationmark.triangle.fill` | Upload failed |
| Toolbar: Pause | `pause.circle` | Pause recording |
| Toolbar: Resume | `play.circle` | Resume recording |
| Toolbar: Marker | `flag.fill` | Add manual step marker |
| Toolbar: Stop | `stop.circle.fill` | Stop recording |
| Dropdown: Record | `record.circle` | Primary record button |
| Dropdown: Open in editor | `arrow.up.forward.square` | Open web editor link |
| Preferences: General | `gearshape` | General settings tab |
| Preferences: Shortcuts | `keyboard` | Keyboard shortcuts tab |
| Preferences: Audio | `mic` | Audio settings tab |
| Preferences: Advanced | `wrench.and.screwdriver` | Advanced settings tab |
| Onboarding: Screen | `rectangle.dashed.badge.record` | Screen recording permission |
| Onboarding: Accessibility | `hand.point.up.left` | Accessibility permission |

### 5.3 System Integration

- **Login Items**: Register as a login item (launchd) so the app starts with the system
- **Notifications**: NSUserNotificationCenter for upload completion and errors
- **Global Hotkeys**: Registered via CGEvent tap or MASShortcut for system-wide recording control
- **Open URL handler**: Custom URL scheme (`vibetuto://`) for OAuth callback and "open recording" deep links
- **Accessibility API**: AXUIElement for detecting UI interactions across all applications
- **ScreenCaptureKit**: For screen capture (per-window or per-display)
- **AVFoundation**: For microphone audio capture
- **Automatic Updates**: Sparkle framework for auto-updates outside the App Store (or TestFlight for App Store builds)

### 5.4 Dark Mode & Vibrancy

- Menu bar icon uses template image (automatically adapts to light/dark)
- Dropdown panel and floating toolbar use NSVisualEffectView (automatically adapts)
- All custom colors use semantic NSColor values (textColor, secondaryLabelColor, controlAccentColor)
- The thin recording border uses a fixed brand color (works on both light/dark wallpapers due to contrast)
- No custom theming -- the app inherits the system appearance entirely

### 5.5 Typography

Minimal type scale (the app has very little text):

| Style | Usage | Spec |
|---|---|---|
| Headline | "Recording complete!" | SF Pro, 15pt, semibold |
| Body | Description text, options | SF Pro, 13pt, regular |
| Caption 1 | Timer, step count, metadata | SF Pro, 11pt, regular |
| Caption 2 | Keyboard shortcut hints | SF Pro, 10pt, regular, secondary color |

All text uses SF Pro (system font). No custom fonts.

---

## 6. What Makes It "Superbe"

### 6.1 Micro-Animations (Focused Set)

Since the app surface area is small, every animation matters more:

- **Recording start**: Toolbar springs out from the menu bar icon with elastic overshoot (damping: 0.7, stiffness: 300, 0.3s)
- **Step detected**: Step counter increments with a brief scale-up pulse (1.0 -> 1.15 -> 1.0, 0.2s)
- **Toolbar collapse/expand**: Smooth width animation with content fade (0.25s ease-out)
- **Upload progress**: Gradient shimmer moves across the progress bar fill (creates a sense of motion even at slow speeds)
- **Upload complete**: Progress bar fill color transitions from purple to green (0.3s), checkmark icon morphs from upload arrow (SF Symbol variable value animation)
- **Menu bar icon transitions**: Crossfade between icon states (0.15s)

### 6.2 Smart Defaults

- **Remembers everything**: Last recording mode, toolbar position, audio device, even the last app you were recording -- all persisted between sessions
- **Smart start**: If you used Single App mode last time, the same app is pre-selected (if running)
- **Intelligent grouping**: Rapid clicks within 500ms on the same UI element are grouped into one step. Typing sequences are combined. Scroll events are filtered out
- **Auto-crop per step**: Each step's screenshot is captured as the full screen but metadata includes the active window bounds, so the web app can auto-crop during editing
- **Background upload**: Upload begins the moment recording stops. No waiting on a "upload" button
- **Retry on failure**: If upload fails (network issue), data is preserved locally and retried automatically when connectivity returns

### 6.3 Invisible Until Needed

- No Dock icon by default (reduces visual clutter)
- The toolbar collapses to near-invisibility during recording
- No disruptive sounds or notifications during recording
- Step detection feedback is a subtle counter increment, not a popup
- The app never steals focus from the application being recorded
- Panel auto-dismisses after successful upload + browser open

### 6.4 Delightful Details

- **Countdown**: Numbers animate with a spring physics drop + fade (like digits falling into place)
- **Recording border**: Corners have a subtle animated shimmer that travels around the border perimeter (very slow, barely perceptible -- a "breathing" effect that confirms recording is active without being distracting)
- **Upload stats**: After upload, briefly shows "18 steps captured in 2:47" -- gives users a satisfying sense of what they accomplished
- **First recording celebration**: After the very first successful upload, a brief confetti-style animation in the completion panel (only once, ever)

---

## 7. Accessibility

### 7.1 VoiceOver Support

- Menu bar icon is labeled: "Vibe Tuto Recorder, idle" / "Vibe Tuto Recorder, recording"
- All dropdown controls have proper accessibility labels and roles
- Recording toolbar buttons are labeled: "Pause recording", "Add step marker", "Stop recording"
- Upload progress is announced: "Uploading, 34 percent complete, step 6 of 18"
- Completion is announced: "Upload complete. Press Enter to open in editor"

### 7.2 Keyboard Navigation

- Full keyboard navigation in the dropdown panel and preferences
- Global hotkeys work without the app being focused (critical for the recording workflow)
- Tab order in the dropdown: Record button -> Mode selector -> Options -> Recent recordings -> Preferences/Quit
- Escape closes the dropdown panel or dismisses the upload panel

### 7.3 Reduced Motion

- Respects `NSWorkspace.shared.accessibilityDisplayShouldReduceMotion`
- When enabled:
  - Countdown uses simple fade instead of spring drop
  - Toolbar collapse/expand is instant (no animation)
  - No pulsing on the recording dot (static red)
  - No shimmer on the recording border (static line)
  - No gradient animation on the progress bar (static fill)
  - No confetti on first upload

### 7.4 High Contrast

- Respects system high contrast setting
- Recording border increases to 3px in high contrast mode
- All interactive elements have visible focus rings
- Menu bar icon uses high-contrast variant

---

## 8. Handoff to Web App

The critical UX moment is the transition from desktop recorder to web editor. This must feel seamless:

### 8.1 What Gets Uploaded

For each recording, the desktop app uploads:
- **Screenshots**: One per detected step, full resolution, PNG format (compressed)
- **Action metadata** (JSON): For each step -- timestamp, action type (click/type/navigate/app_switch), click coordinates (x, y), viewport dimensions, active application name, active window title, URL (for browsers), element accessibility info (role, label, value)
- **Audio file**: WAV or AAC, if narration was enabled
- **Recording metadata**: Total duration, start/end timestamps, macOS version, screen resolution, list of applications used

### 8.2 Web App Receives & Processes

Once uploaded, the web app (which already has the editor, AI processing, and export pipeline) does:
1. Creates a new tutorial with all screenshots as sources
2. AI processes the action metadata to generate step captions
3. AI transcribes the audio narration (if present)
4. Auto-generates click indicator annotations from click coordinates
5. Opens the editor where the user can refine, annotate, reorder, and export

### 8.3 Deep Link

The desktop app opens: `https://captuto.com/editor/[tutorial-id]?source=desktop`

The `?source=desktop` parameter lets the web app:
- Show a "Recorded from your Mac" badge
- Display a contextual onboarding tooltip ("Your recording has been processed! Review the auto-generated steps below")
- Track analytics on desktop vs. browser extension recordings

---

## 9. Competitive Differentiation

| Feature | Vibe Tuto Recorder | Loom Desktop | CleanShot X | Tango/Scribe |
|---|---|---|---|---|
| Multi-app recording | Yes (any desktop app) | Yes (video only) | Yes (screenshot only) | Browser only |
| Auto step detection | Yes (Accessibility API) | No | No | Yes (browser only) |
| Click coordinate capture | Yes | No | No | Yes (browser only) |
| Audio narration | Yes | Yes | No | No |
| Structured step output | Yes (screenshots + metadata) | No (flat video) | No (flat image) | Yes (browser only) |
| Lightweight (menu bar) | Yes | No (full window) | Yes | No (browser ext.) |
| Uploads to web editor | Yes | Yes (Loom web) | No (local only) | Yes (web dashboard) |
| Native macOS | Yes (Swift) | Yes (Electron) | Yes (Swift) | No |
| Works across all apps | Yes | Yes (video only) | Yes (capture only) | No |

**The unique value**: Vibe Tuto Recorder is the only tool that combines native multi-app step detection (not just video or screenshots) with structured metadata upload to a full-featured web editor. It bridges the gap between Scribe/Tango's auto-step-detection (browser-only) and CleanShot/Loom's desktop capture (no structured steps).

---

## 10. Design Principles Summary

1. **Invisible**: The app should be forgettable during recording. Users focus on their workflow, not the tool
2. **Instant**: Start recording in one click or one hotkey. Stop and upload with zero configuration
3. **Reliable**: Never lose a recording. Auto-retry uploads. Persist data locally until confirmed uploaded
4. **Native**: Indistinguishable from a first-party Apple utility. No Electron jank, no custom chrome, no web views
5. **Complementary**: The desktop app does capture. The web app does everything else. Clean separation of concerns -- each tool excels at what it does best

---

*This document defines the UX/UI vision for the Vibe Tuto Desktop Recorder companion app. It is intentionally minimal in scope -- the recorder captures and uploads; the existing Vibe Tuto web application handles editing, AI processing, annotation, export, and sharing.*
