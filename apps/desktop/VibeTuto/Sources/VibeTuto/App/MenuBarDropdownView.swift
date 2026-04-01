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

                // Thin divider with subtle glow
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [
                                .clear,
                                DT.Colors.dividerSubtle,
                                DT.Colors.dividerMedium,
                                DT.Colors.dividerSubtle,
                                .clear,
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 1)

                selectedTabContent
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
        }
        .frame(width: DT.Size.mainPanelWidth, height: 520)
        .preferredColorScheme(.dark)
    }

    // MARK: - Tab Bar

    private var tabBar: some View {
        GeometryReader { geometry in
            let tabWidth = (geometry.size.width - DT.Spacing.sm * 2) / CGFloat(PanelTab.allCases.count)

            ZStack(alignment: .bottomLeading) {
                // Tab buttons
                HStack(spacing: 0) {
                    ForEach(PanelTab.allCases, id: \.self) { tab in
                        Button {
                            withAnimation(DT.Anim.springGentle) {
                                selectedTab = tab
                            }
                        } label: {
                            VStack(spacing: 5) {
                                ZStack {
                                    // Subtle glow behind active icon
                                    if selectedTab == tab {
                                        Circle()
                                            .fill(DT.Colors.accentRed.opacity(0.12))
                                            .frame(width: 28, height: 28)
                                            .blur(radius: 6)
                                    }

                                    Image(systemName: selectedTab == tab ? tab.icon + ".fill" : tab.icon)
                                        .font(.system(size: 14, weight: selectedTab == tab ? .semibold : .regular))
                                        .foregroundStyle(selectedTab == tab ? DT.Colors.accentRed : DT.Colors.textTertiary)
                                }

                                Text(tab.label)
                                    .font(.system(size: 9, weight: selectedTab == tab ? .bold : .medium))
                                    .foregroundStyle(selectedTab == tab ? DT.Colors.textPrimary : DT.Colors.textTertiary)
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, DT.Spacing.xs)

                // Sliding indicator line
                RoundedRectangle(cornerRadius: 1)
                    .fill(DT.Colors.accentRed)
                    .frame(width: tabWidth * 0.5, height: 2)
                    .shadow(color: DT.Colors.accentRed.opacity(0.5), radius: 4, y: 0)
                    .offset(x: DT.Spacing.xs + tabWidth * CGFloat(PanelTab.allCases.firstIndex(of: selectedTab) ?? 0) + tabWidth * 0.25)
            }
        }
        .frame(height: 54)
        .background(DT.Colors.card)
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
            VStack(alignment: .leading, spacing: DT.Spacing.lg) {
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
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(statusDescription)
                    .font(DT.Typography.caption)
                    .foregroundStyle(DT.Colors.textSecondary)
                    .lineLimit(2)
            }
            Spacer()
            statusBadgeView
        }
    }

    private var statusBadgeView: some View {
        HStack(spacing: 5) {
            // Live indicator dot
            if session.state == .recording {
                Circle()
                    .fill(DT.Colors.accentRed)
                    .frame(width: 5, height: 5)
                    .modifier(PulseModifier())
            }

            Text(statusBadge)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .tracking(0.5)
                .foregroundStyle(statusTint)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(
            Capsule(style: .continuous)
                .fill(statusTint.opacity(0.08))
        )
        .overlay(
            Capsule(style: .continuous)
                .strokeBorder(statusTint.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: DT.Spacing.sm) {
            statCard(label: "DURATION", value: formattedElapsedTime, icon: "clock")
            statCard(label: "STEPS", value: "\(session.stepCount)", icon: "list.number")
        }
    }

    private func statCard(label: String, value: String, icon: String) -> some View {
        HStack(spacing: DT.Spacing.sm) {
            // Accent bar — visible in all states
            RoundedRectangle(cornerRadius: 1.5)
                .fill(session.state == .recording ? DT.Colors.accentRed : DT.Colors.textTertiary)
                .frame(width: 3)

            VStack(alignment: .leading, spacing: DT.Spacing.xxs) {
                Text(value)
                    .font(.system(size: 18, weight: .semibold, design: .monospaced))
                    .foregroundStyle(DT.Colors.textPrimary)
                    .monospacedDigit()
                Text(label)
                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(DT.Colors.textSecondary)
            }

            Spacer()
        }
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
                        .font(.system(size: 16))
                    Text(primaryActionLabel)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(RecordButtonStyle())
            .disabled(lastMode == RecordingMode.singleApp.rawValue && session.selectedAppBundleID == nil)

        case .recording:
            HStack(spacing: DT.Spacing.sm) {
                Button {
                    session.pauseRecording()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "pause.fill")
                            .font(.system(size: 10))
                        Text("Pause")
                    }
                }
                .buttonStyle(StudioButtonStyle())

                Button {
                    session.stopRecording()
                } label: {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(.white)
                            .frame(width: 8, height: 8)
                        Text("Stop")
                    }
                }
                .buttonStyle(StudioButtonStyle(accentBorder: DT.Colors.accentRed))
            }

        case .paused:
            HStack(spacing: DT.Spacing.sm) {
                Button {
                    session.resumeRecording()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "play.fill")
                            .font(.system(size: 10))
                        Text("Resume")
                    }
                }
                .buttonStyle(RecordButtonStyle())

                Button {
                    session.stopRecording()
                } label: {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(.white)
                            .frame(width: 8, height: 8)
                        Text("Stop")
                    }
                }
                .buttonStyle(StudioButtonStyle(accentBorder: DT.Colors.accentRed))
            }

        case .countdown(let remaining):
            inlineNotice(
                icon: "film",
                title: "Starting in \(remaining)",
                text: "CapTuto hides while the capture begins.",
                tint: DT.Colors.accentRed
            )

        case .selectingRegion:
            inlineNotice(
                icon: "viewfinder",
                title: "Choose area",
                text: "Drag on screen. Press Escape to cancel.",
                tint: DT.Colors.accentBlue
            )

        case .stopping:
            inlineNotice(
                icon: "arrow.down.doc",
                title: "Finishing",
                text: "Saving the recording.",
                tint: DT.Colors.textSecondary
            )

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

                // Custom progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(DT.Colors.elevated)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(DT.Colors.warmGradient)
                            .frame(width: geo.size.width * progress)
                            .shadow(color: DT.Colors.accentRed.opacity(0.3), radius: 6, x: 0, y: 0)
                    }
                }
                .frame(height: 6)
                .animation(DT.Anim.springGentle, value: progress)
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
                    let isSelected = lastMode == item.mode.rawValue

                    Button {
                        lastMode = item.mode.rawValue
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: item.icon)
                                .font(.system(size: 11, weight: .semibold))
                            Text(item.label)
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundStyle(isSelected ? DT.Colors.surface : DT.Colors.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: DT.Radius.sm, style: .continuous)
                                .fill(isSelected ? DT.Colors.textPrimary : DT.Colors.card)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: DT.Radius.sm, style: .continuous)
                                .strokeBorder(isSelected ? .clear : DT.Colors.border, lineWidth: 1)
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

    private func inlineNotice(icon: String, title: String, text: String, tint: Color) -> some View {
        HStack(spacing: DT.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(tint)
                .frame(width: 32, height: 32)
                .background(
                    RoundedRectangle(cornerRadius: DT.Radius.sm, style: .continuous)
                        .fill(tint.opacity(0.08))
                )

            VStack(alignment: .leading, spacing: DT.Spacing.xxs) {
                Text(title)
                    .font(DT.Typography.subheading)
                    .foregroundStyle(DT.Colors.textPrimary)
                Text(text)
                    .font(DT.Typography.caption)
                    .foregroundStyle(DT.Colors.textSecondary)
            }
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
        case .idle: return "IDLE"
        case .selectingRegion: return "SELECT"
        case .countdown: return "READY"
        case .recording: return "LIVE"
        case .paused: return "PAUSED"
        case .stopping: return "SAVING"
        case .uploading: return "UPLOAD"
        case .completed: return "DONE"
        case .error: return "ERROR"
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

// MARK: - Pulse Animation Modifier

private struct PulseModifier: ViewModifier {
    @State private var isPulsing = false

    func body(content: Content) -> some View {
        content
            .opacity(isPulsing ? 0.4 : 1.0)
            .animation(
                .easeInOut(duration: 0.8).repeatForever(autoreverses: true),
                value: isPulsing
            )
            .onAppear { isPulsing = true }
    }
}

// MARK: - Solid Dark Background

private struct NativePanelBackground: View {
    var body: some View {
        DT.Colors.surface
    }
}
