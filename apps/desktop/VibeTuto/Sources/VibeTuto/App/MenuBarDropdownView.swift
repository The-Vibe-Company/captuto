import SwiftUI

// MARK: - Tab Enum

enum PanelTab: String, CaseIterable {
    case capture, audio, shortcuts, general, advanced

    var icon: String {
        switch self {
        case .capture: return "record.circle"
        case .audio: return "mic"
        case .shortcuts: return "keyboard"
        case .general: return "gearshape"
        case .advanced: return "wrench.and.screwdriver"
        }
    }

    var label: String {
        switch self {
        case .capture: return "Capture"
        case .audio: return "Audio"
        case .shortcuts: return "Shortcuts"
        case .general: return "General"
        case .advanced: return "Advanced"
        }
    }
}

// MARK: - Main Panel View

struct FloatingPanelView: View {
    @State private var selectedTab: PanelTab = .capture

    var body: some View {
        ZStack {
            NativePanelBackground()

            VStack(spacing: 0) {
                tabBar
                Divider()
                    .overlay(Color.white.opacity(0.08))

                selectedTabContent
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
        }
        .frame(width: DT.Size.mainPanelWidth, height: 520)
        .preferredColorScheme(.dark)
    }

    // MARK: - Tab Bar

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(PanelTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(DT.Anim.fadeStandard) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: selectedTab == tab ? tab.icon + ".fill" : tab.icon)
                            .font(.system(size: 14))
                            .foregroundStyle(selectedTab == tab ? DT.Colors.accentRed : DT.Colors.textTertiary)

                        Text(tab.label)
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(selectedTab == tab ? DT.Colors.textPrimary : DT.Colors.textTertiary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .frame(height: 52)
        .padding(.horizontal, DT.Spacing.xs)
        .background(Color.white.opacity(0.03))
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var selectedTabContent: some View {
        switch selectedTab {
        case .capture:
            CaptureTabView()
        case .audio:
            AudioPreferencesView()
        case .shortcuts:
            ShortcutsPreferencesView()
        case .general:
            GeneralPreferencesView()
        case .advanced:
            AdvancedPreferencesView()
        }
    }
}

// MARK: - Capture Tab

struct CaptureTabView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("lastRecordingMode") private var lastMode: String = RecordingMode.fullScreen.rawValue

    private let modes: [(mode: RecordingMode, label: String, icon: String)] = [
        (.fullScreen, "Screen", "rectangle.on.rectangle"),
        (.singleApp, "App", "app"),
        (.region, "Area", "selection.pin.in.out"),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DT.Spacing.md) {
                statusHeader
                statsRow
                controls
                modeSelector
                if lastMode == RecordingMode.singleApp.rawValue {
                    AppPickerView()
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .padding(DT.Spacing.lg)
            .animation(.easeInOut(duration: 0.25), value: lastMode)
        }
    }

    // MARK: - Status Header

    private var statusHeader: some View {
        HStack {
            Text(statusDescription)
                .font(DT.Typography.caption)
                .foregroundStyle(DT.Colors.textSecondary)
                .lineLimit(2)
            Spacer()
            Text(statusBadge)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(statusTint)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    Capsule(style: .continuous)
                        .fill(DT.Colors.elevated)
                )
        }
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: DT.Spacing.sm) {
            statCard(label: "Duration", value: formattedElapsedTime)
            statCard(label: "Steps", value: "\(session.stepCount)")
        }
    }

    private func statCard(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: DT.Spacing.xs) {
            Text(value)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundStyle(DT.Colors.textPrimary)
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(DT.Colors.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, DT.Spacing.md)
        .padding(.vertical, DT.Spacing.sm)
        .background(
            RoundedRectangle(cornerRadius: DT.Radius.md, style: .continuous)
                .fill(DT.Colors.card)
        )
        .overlay(
            RoundedRectangle(cornerRadius: DT.Radius.md, style: .continuous)
                .strokeBorder(DT.Colors.border, lineWidth: 1)
        )
    }

    // MARK: - Controls

    @ViewBuilder
    private var controls: some View {
        switch session.state {
        case .idle, .completed, .error:
            Button(action: startRecording) {
                HStack(spacing: 10) {
                    Image(systemName: "record.circle.fill")
                    Text(primaryActionLabel)
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(RecordButtonStyle())
            .disabled(lastMode == RecordingMode.singleApp.rawValue && session.selectedAppBundleID == nil)

        case .recording:
            HStack(spacing: DT.Spacing.sm) {
                Button("Pause", action: session.pauseRecording)
                    .buttonStyle(StudioButtonStyle())
                Button("Stop", action: session.stopRecording)
                    .buttonStyle(StudioButtonStyle(accentBorder: DT.Colors.accentRed))
            }

        case .paused:
            HStack(spacing: DT.Spacing.sm) {
                Button("Resume", action: session.resumeRecording)
                    .buttonStyle(RecordButtonStyle())
                Button("Stop", action: session.stopRecording)
                    .buttonStyle(StudioButtonStyle(accentBorder: DT.Colors.accentRed))
            }

        case .countdown(let remaining):
            inlineNotice(title: "Starting in \(remaining)", text: "CapTuto hides while the capture begins.")

        case .selectingRegion:
            inlineNotice(title: "Choose area", text: "Drag on screen. Press Escape to cancel.")

        case .stopping:
            inlineNotice(title: "Finishing", text: "Saving the recording.")

        case .uploading(let progress):
            VStack(alignment: .leading, spacing: DT.Spacing.sm) {
                HStack {
                    Text("Uploading")
                        .font(DT.Typography.body)
                        .foregroundStyle(DT.Colors.textPrimary)
                    Spacer()
                    Text("\(Int(progress * 100))%")
                        .font(DT.Typography.monoSmall)
                        .foregroundStyle(DT.Colors.textSecondary)
                }
                ProgressView(value: progress)
                    .progressViewStyle(.linear)
                    .tint(DT.Colors.accentRed)
            }
        }
    }

    // MARK: - Mode Selector

    private var modeSelector: some View {
        VStack(alignment: .leading, spacing: DT.Spacing.sm) {
            Text("CAPTURE MODE")
                .font(DT.Typography.sectionLabel)
                .tracking(1.5)
                .foregroundStyle(DT.Colors.textTertiary)

            HStack(spacing: DT.Spacing.sm) {
                ForEach(modes, id: \.mode) { item in
                    Button {
                        lastMode = item.mode.rawValue
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: item.icon)
                                .font(.system(size: 11, weight: .semibold))
                            Text(item.label)
                                .font(DT.Typography.body)
                        }
                        .foregroundStyle(lastMode == item.mode.rawValue ? DT.Colors.surface : DT.Colors.textPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background(
                            RoundedRectangle(cornerRadius: DT.Radius.sm, style: .continuous)
                                .fill(lastMode == item.mode.rawValue ? DT.Colors.textPrimary : DT.Colors.card)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: DT.Radius.sm, style: .continuous)
                                .strokeBorder(
                                    lastMode == item.mode.rawValue ? .clear : DT.Colors.border,
                                    lineWidth: 1
                                )
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .onChange(of: lastMode) { _, newMode in
                if newMode != RecordingMode.singleApp.rawValue {
                    session.selectedAppBundleID = nil
                }
                if newMode != RecordingMode.region.rawValue {
                    session.selectedRegion = nil
                }
            }

            if lastMode == RecordingMode.region.rawValue {
                Text("The app hides itself so you can draw the capture area.")
                    .font(DT.Typography.caption)
                    .foregroundStyle(DT.Colors.textTertiary)
            }
        }
    }

    // MARK: - Helpers

    private func inlineNotice(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: DT.Spacing.xs) {
            Text(title)
                .font(DT.Typography.subheading)
                .foregroundStyle(DT.Colors.textPrimary)
            Text(text)
                .font(DT.Typography.caption)
                .foregroundStyle(DT.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(DT.Spacing.md)
        .studioCard()
    }

    private var statusDescription: String {
        switch session.state {
        case .idle: return "Record the screen, one app, or a selected area."
        case .selectingRegion: return "Draw the exact area you want to capture."
        case .countdown: return "Getting out of the way before recording starts."
        case .recording: return "Use the floating controls to pause or stop."
        case .paused: return "Resume when you are ready."
        case .stopping: return "Wrapping up the capture."
        case .uploading: return "Sending the recording to your workspace."
        case .completed: return "Your recording finished successfully."
        case .error: return "The recording flow was interrupted."
        }
    }

    private var statusBadge: String {
        switch session.state {
        case .idle: return "Idle"
        case .selectingRegion: return "Select"
        case .countdown: return "Countdown"
        case .recording: return "Live"
        case .paused: return "Paused"
        case .stopping: return "Saving"
        case .uploading: return "Upload"
        case .completed: return "Done"
        case .error: return "Error"
        }
    }

    private var statusTint: Color {
        switch session.state {
        case .recording: return DT.Colors.accentRed
        case .paused: return DT.Colors.accentAmber
        case .completed: return DT.Colors.accentTeal
        case .error: return .orange
        default: return DT.Colors.textSecondary
        }
    }

    private var formattedElapsedTime: String {
        let totalSeconds = Int(session.elapsedTime)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    private var primaryActionLabel: String {
        switch RecordingMode(rawValue: lastMode) ?? .fullScreen {
        case .fullScreen: return "Record Screen"
        case .singleApp: return "Record App"
        case .region: return "Select Area"
        }
    }

    private func startRecording() {
        session.currentMode = RecordingMode(rawValue: lastMode) ?? .fullScreen
        session.startRecording()
    }
}

// MARK: - Native Vibrancy Background

private struct NativePanelBackground: NSViewRepresentable {
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = .hudWindow
        view.state = .active
        view.blendingMode = .behindWindow
        return view
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {}
}
