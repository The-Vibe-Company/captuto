import SwiftUI

struct FloatingPanelView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("lastRecordingMode") private var lastMode: String = RecordingMode.fullScreen.rawValue

    private let modes: [(mode: RecordingMode, label: String, icon: String)] = [
        (.fullScreen, "Screen", "rectangle.on.rectangle"),
        (.singleApp, "App", "app"),
        (.region, "Area", "selection.pin.in.out"),
    ]

    var body: some View {
        ZStack {
            NativePanelBackground()
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.08, green: 0.11, blue: 0.14).opacity(0.96),
                            Color(red: 0.08, green: 0.18, blue: 0.24).opacity(0.94)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.08), lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 12) {
                captureCard
                modeSelector
                if lastMode == RecordingMode.singleApp.rawValue {
                    AppPickerView()
                }
                quickOptions
                footer
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
            .padding(.top, 42)
        }
        .frame(width: DT.Size.floatingPanelWidth, height: DT.Size.floatingPanelHeight)
        .preferredColorScheme(.dark)
    }

    private var captureCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                HStack(alignment: .top, spacing: 12) {
                    Image(nsImage: NSApp.applicationIconImage)
                        .resizable()
                        .frame(width: 34, height: 34)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                    VStack(alignment: .leading, spacing: 3) {
                        Text("CapTuto")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(.white)
                        Text(statusDescription)
                            .font(.system(size: 11))
                            .foregroundStyle(Color.white.opacity(0.72))
                            .lineLimit(2)
                    }
                }

                Spacer()

                Text(statusBadge)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(statusTint)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        Capsule(style: .continuous)
                            .fill(Color.white.opacity(0.08))
                    )
            }

            HStack(spacing: 10) {
                compactInfo(label: "Duration", value: formattedElapsedTime)
                compactInfo(label: "Steps", value: "\(session.stepCount)")
            }

            controls
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Color.white.opacity(0.09), Color.white.opacity(0.03)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
    }

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
            .buttonStyle(PrimaryCaptureButtonStyle())
            .disabled(lastMode == RecordingMode.singleApp.rawValue && session.selectedAppBundleID == nil)

        case .recording:
            HStack(spacing: 10) {
                Button("Pause", action: session.pauseRecording)
                    .buttonStyle(SecondaryCaptureButtonStyle())
                Button("Stop", action: session.stopRecording)
                    .buttonStyle(SecondaryCaptureButtonStyle())
            }

        case .paused:
            HStack(spacing: 10) {
                Button("Resume", action: session.resumeRecording)
                    .buttonStyle(PrimaryCaptureButtonStyle())
                Button("Stop", action: session.stopRecording)
                    .buttonStyle(SecondaryCaptureButtonStyle())
            }

        case .countdown(let remaining):
            inlineNotice(title: "Starting in \(remaining)", text: "CapTuto hides while the capture begins.")

        case .selectingRegion:
            inlineNotice(title: "Choose area", text: "Drag on screen. Press Escape to cancel.")

        case .stopping:
            inlineNotice(title: "Finishing", text: "Saving the recording.")

        case .uploading(let progress):
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Uploading")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.white)
                    Spacer()
                    Text("\(Int(progress * 100))%")
                        .font(.system(size: 12, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color(nsColor: .secondaryLabelColor))
                }
                ProgressView(value: progress)
                    .progressViewStyle(.linear)
                    .tint(.white)
            }
        }
    }

    private var modeSelector: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("Capture Mode")

            HStack(spacing: 8) {
                ForEach(modes, id: \.mode) { item in
                    Button {
                        lastMode = item.mode.rawValue
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: item.icon)
                                .font(.system(size: 11, weight: .semibold))
                            Text(item.label)
                                .font(.system(size: 13, weight: .medium))
                        }
                        .foregroundStyle(lastMode == item.mode.rawValue ? .black : .white.opacity(0.85))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(lastMode == item.mode.rawValue ? Color.white : Color.white.opacity(0.05))
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
                    .font(.system(size: 10))
                    .foregroundStyle(Color(nsColor: .secondaryLabelColor))
            }
        }
    }

    private var quickOptions: some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionLabel("Quick Options")

            compactToggle(title: "Microphone", isOn: $session.micEnabled)
            compactToggle(title: "Action detection", isOn: $session.actionDetectionEnabled)
        }
    }

    private var footer: some View {
        HStack {
            Button("Preferences", action: showPreferences)
                .buttonStyle(FooterLinkButtonStyle())
            Spacer()
            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
                .buttonStyle(FooterLinkButtonStyle())
        }
    }

    private func compactInfo(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(Color.white.opacity(0.65))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white.opacity(0.06))
        )
    }

    private func inlineNotice(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white)
            Text(text)
                .font(.system(size: 11))
                .foregroundStyle(Color(nsColor: .secondaryLabelColor))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white.opacity(0.05))
        )
    }

    private func compactToggle(title: String, isOn: Binding<Bool>) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white)
            Spacer()
            Toggle("", isOn: isOn)
                .labelsHidden()
                .toggleStyle(.switch)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white.opacity(0.05))
        )
    }

    private func sectionLabel(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(Color(nsColor: .secondaryLabelColor))
    }

    private var statusDescription: String {
        switch session.state {
        case .idle:
            return "Record the screen, one app, or a selected area."
        case .selectingRegion:
            return "Draw the exact area you want to capture."
        case .countdown:
            return "Getting out of the way before recording starts."
        case .recording:
            return "Use the floating controls to pause or stop."
        case .paused:
            return "Resume when you are ready."
        case .stopping:
            return "Wrapping up the capture."
        case .uploading:
            return "Sending the recording to your workspace."
        case .completed:
            return "Your recording finished successfully."
        case .error:
            return "The recording flow was interrupted."
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
        case .recording: return .red
        case .paused: return .yellow
        case .completed: return .green
        case .error: return .orange
        default: return Color(nsColor: .secondaryLabelColor)
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

    private func showPreferences() {
        NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
    }
}

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

private struct PrimaryCaptureButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(.black)
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white)
            )
            .opacity(configuration.isPressed ? 0.88 : 1)
            .scaleEffect(configuration.isPressed ? 0.99 : 1)
    }
}

private struct SecondaryCaptureButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 11)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white.opacity(0.08))
            )
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

private struct FooterLinkButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(Color(nsColor: .secondaryLabelColor))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}
