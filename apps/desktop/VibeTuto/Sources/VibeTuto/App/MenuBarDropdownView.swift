import SwiftUI

struct FloatingPanelView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("lastRecordingMode") private var lastMode = RecordingMode.fullScreen.rawValue

    private let permissionChecker = PermissionChecker()
    private let modes: [(RecordingMode, String, String)] = [
        (.fullScreen, "Screen", "rectangle.on.rectangle"),
        (.singleApp, "App", "app"),
        (.region, "Area", "selection.pin.in.out"),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            header

            Divider()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    stateContent

                    if lastMode == RecordingMode.singleApp.rawValue, canConfigure {
                        AppPickerView()
                            .frame(maxHeight: 132)
                    }

                    permissionNotice
                    recentRecordings
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxHeight: 272)

            Divider()
            footer
        }
        .padding(16)
        .frame(width: DT.Size.mainPanelWidth, alignment: .top)
        .frame(minHeight: 320, idealHeight: 360, alignment: .top)
        .background(.regularMaterial)
        .onChange(of: lastMode) { _, newMode in
            if newMode != RecordingMode.singleApp.rawValue {
                session.selectedAppBundleID = nil
            }
            if newMode != RecordingMode.region.rawValue {
                session.selectedRegion = nil
            }
        }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Image(systemName: statusIcon)
                .foregroundStyle(statusTint)
            Text("CapTuto")
                .font(.headline)
            Spacer()
            Text(statusLabel)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private var stateContent: some View {
        switch session.state {
        case .idle:
            idleControls
        case .completed:
            completedControls
        case .error(let message):
            errorControls(message)
        case .recording:
            liveControls(title: "Recording", primaryTitle: "Pause", primaryIcon: "pause.fill", primaryAction: session.pauseRecording)
        case .paused:
            liveControls(title: "Paused", primaryTitle: "Resume", primaryIcon: "play.fill", primaryAction: session.resumeRecording)
        case .countdown(let remaining):
            inlineStatus(icon: "timer", title: "Starting in \(remaining)", detail: "The recorder will hide before capture starts.")
        case .selectingRegion:
            inlineStatus(icon: "viewfinder", title: "Select an area", detail: "Drag on screen. Press Escape to cancel.")
        case .stopping:
            inlineStatus(icon: "square.and.arrow.down", title: "Saving", detail: "Finishing the recording.")
        case .uploading(let progress):
            uploadProgress(progress)
        }
    }

    private var completedControls: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Upload complete", systemImage: "checkmark.circle.fill")
                .font(.headline)
                .foregroundStyle(.green)

            HStack {
                Button("Open in Editor") {
                    if let url = session.tutorialEditorURL {
                        NSWorkspace.shared.open(url)
                    }
                    session.reset()
                }
                .buttonStyle(.borderedProminent)

                Button("Dismiss") {
                    session.reset()
                }
            }
            .controlSize(.small)
        }
    }

    private func errorControls(_ message: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Upload failed", systemImage: "exclamationmark.triangle.fill")
                .font(.headline)
                .foregroundStyle(.orange)

            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            HStack {
                Button("Retry") {
                    session.retryUpload()
                }
                .buttonStyle(.borderedProminent)

                Button("Save Locally") {
                    session.reset()
                }
            }
            .controlSize(.small)
        }
    }

    private var idleControls: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: startRecording) {
                Label(primaryActionLabel, systemImage: "record.circle.fill")
            }
            .buttonStyle(RecordButtonStyle())
            .disabled(lastMode == RecordingMode.singleApp.rawValue && session.selectedAppBundleID == nil)

            Picker("Mode", selection: $lastMode) {
                ForEach(modes, id: \.0) { mode, label, icon in
                    Label(label, systemImage: icon).tag(mode.rawValue)
                }
            }
            .pickerStyle(.segmented)

            Toggle("Record microphone", isOn: $session.micEnabled)
                .toggleStyle(.checkbox)
                .font(DT.Typography.body)
        }
    }

    private func liveControls(
        title: String,
        primaryTitle: String,
        primaryIcon: String,
        primaryAction: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                    Text("\(formattedElapsedTime) · \(session.stepCount) steps")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button(action: session.stopRecording) {
                    Label("Stop", systemImage: "stop.fill")
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
            }

            HStack {
                Button(action: primaryAction) {
                    Label(primaryTitle, systemImage: primaryIcon)
                }
                Button(action: session.addMarker) {
                    Label("Marker", systemImage: "flag")
                }
                .disabled(session.state != .recording)
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
    }

    private func inlineStatus(icon: String, title: String, detail: String) -> some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        } icon: {
            Image(systemName: icon)
        }
        .padding(.vertical, 4)
    }

    private func uploadProgress(_ progress: Double) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Uploading")
                    .font(.headline)
                Spacer()
                Text("\(Int(progress * 100))%")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            ProgressView(value: progress)
        }
    }

    @ViewBuilder
    private var permissionNotice: some View {
        let screenGranted = permissionChecker.checkScreenRecordingSilent() == .granted
        let accessibilityGranted = permissionChecker.checkAccessibility() == .granted

        if canConfigure && (!screenGranted || !accessibilityGranted || !session.actionDetectionEnabled) {
            VStack(alignment: .leading, spacing: 8) {
                if !screenGranted {
                    permissionRow("Screen Recording", icon: "rectangle.dashed.badge.record") {
                        permissionChecker.requestScreenRecording()
                    }
                }
                if !accessibilityGranted {
                    permissionRow("Accessibility", icon: "hand.point.up.left") {
                        permissionChecker.promptAccessibility()
                    }
                }
                if !session.actionDetectionEnabled {
                    Toggle("Detect actions", isOn: $session.actionDetectionEnabled)
                        .toggleStyle(.checkbox)
                        .font(.caption)
                }
            }
            .padding(10)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color(nsColor: .controlBackgroundColor))
            )
        }
    }

    private func permissionRow(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        HStack {
            Label(title, systemImage: icon)
                .font(.caption)
            Spacer()
            Button("Allow", action: action)
                .controlSize(.small)
        }
    }

    @ViewBuilder
    private var recentRecordings: some View {
        let recordings = UserDefaults.standard.array(forKey: "recentRecordings") as? [[String: String]] ?? []
        if canConfigure && !recordings.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                Text("Recent")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                ForEach(Array(recordings.prefix(3).enumerated()), id: \.offset) { _, recording in
                    Button {
                        openRecentRecording(recording)
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(recording["title"] ?? "Desktop Recording")
                                    .lineLimit(1)
                                Text(relativeDate(recording["created_at"]))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var footer: some View {
        HStack {
            SettingsLink {
                Text("Preferences...")
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)

            Spacer()

            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
        .font(.caption)
    }

    private var canConfigure: Bool {
        switch session.state {
        case .idle:
            return true
        default:
            return false
        }
    }

    private var statusIcon: String {
        switch session.state {
        case .recording: return "record.circle.fill"
        case .paused: return "pause.circle.fill"
        case .uploading: return "arrow.up.circle"
        case .completed: return "checkmark.circle.fill"
        case .error: return "exclamationmark.triangle.fill"
        default: return "record.circle"
        }
    }

    private var statusTint: Color {
        switch session.state {
        case .recording, .error: return .red
        case .paused: return .orange
        case .completed: return .green
        default: return .secondary
        }
    }

    private var statusLabel: String {
        switch session.state {
        case .idle: return "Ready"
        case .recording: return "Live"
        case .paused: return "Paused"
        case .uploading: return "Uploading"
        case .completed: return "Done"
        case .error: return "Error"
        case .selectingRegion: return "Area"
        case .countdown: return "Starting"
        case .stopping: return "Saving"
        }
    }

    private var primaryActionLabel: String {
        switch RecordingMode(rawValue: lastMode) ?? .fullScreen {
        case .fullScreen: return "Record Screen"
        case .singleApp: return "Record App"
        case .region: return "Select Area"
        }
    }

    private var formattedElapsedTime: String {
        let totalSeconds = Int(session.elapsedTime)
        return String(format: "%02d:%02d", totalSeconds / 60, totalSeconds % 60)
    }

    private func startRecording() {
        session.currentMode = RecordingMode(rawValue: lastMode) ?? .fullScreen
        let hasCountdownPreference = UserDefaults.standard.object(forKey: "showCountdown") != nil
        let showCountdown = hasCountdownPreference ? UserDefaults.standard.bool(forKey: "showCountdown") : true
        let duration = UserDefaults.standard.integer(forKey: "countdownDuration")
        session.startRecording(countdown: showCountdown ? (duration == 0 ? 3 : duration) : 0)
    }

    private func openRecentRecording(_ recording: [String: String]) {
        guard let id = recording["id"] else { return }
        let baseURL = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
        if let url = URL(string: "\(baseURL)/editor/\(id)?source=desktop") {
            NSWorkspace.shared.open(url)
        }
    }

    private func relativeDate(_ isoString: String?) -> String {
        guard let isoString, let date = ISO8601DateFormatter().date(from: isoString) else {
            return "recently"
        }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
