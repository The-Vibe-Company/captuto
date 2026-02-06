import SwiftUI

/// SwiftUI view for the floating recording toolbar capsule.
struct RecordingToolbarView: View {
    @ObservedObject private var session = SessionManager.shared
    @State private var isExpanded = true
    @State private var isHovering = false
    @State private var stepPulse = false
    @State private var collapseTask: Task<Void, Never>?

    var body: some View {
        Group {
            switch session.state {
            case .recording, .paused:
                recordingToolbar
            case .stopping:
                stoppingView
            case .uploading(let progress):
                UploadPanelView(progress: progress)
            case .completed:
                CompletionPanelView()
            case .error(let message):
                ErrorPanelView(message: message)
            default:
                EmptyView()
            }
        }
        .onHover { hovering in
            isHovering = hovering
            if hovering {
                withAnimation(.spring(response: 0.2, dampingFraction: 0.8)) {
                    isExpanded = true
                }
                collapseTask?.cancel()
            } else {
                scheduleCollapse()
            }
        }
        .onChange(of: session.stepCount) { _, _ in
            // Pulse the step counter on new step
            withAnimation(.easeOut(duration: 0.15)) {
                stepPulse = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                withAnimation(.easeIn(duration: 0.15)) {
                    stepPulse = false
                }
            }
        }
        .onAppear {
            scheduleCollapse()
        }
    }

    private var recordingToolbar: some View {
        HStack(spacing: isExpanded ? 8 : 4) {
            // Recording dot
            Circle()
                .fill(session.state.isPaused ? Color.yellow : Color.red)
                .frame(width: 6, height: 6)
                .opacity(session.state.isPaused ? 1.0 : pulsingOpacity)

            // Timer
            Text(formattedTime)
                .font(.system(.caption, design: .monospaced))
                .monospacedDigit()

            if isExpanded {
                // Divider
                Rectangle()
                    .fill(Color.primary.opacity(0.2))
                    .frame(width: 0.5, height: 16)

                // Step counter
                Text("\(session.stepCount) steps")
                    .font(.caption)
                    .scaleEffect(stepPulse ? 1.15 : 1.0)

                // Divider
                Rectangle()
                    .fill(Color.primary.opacity(0.2))
                    .frame(width: 0.5, height: 16)

                // Pause/Resume
                Button(action: togglePause) {
                    Image(systemName: session.state.isPaused ? "play.circle" : "pause.circle")
                        .font(.system(size: 16))
                }
                .buttonStyle(.plain)
                .help(session.state.isPaused ? "Resume recording" : "Pause recording")

                // Add Marker
                Button(action: { session.addMarker() }) {
                    Image(systemName: "flag.fill")
                        .font(.system(size: 14))
                }
                .buttonStyle(.plain)
                .help("Add step marker")

                // Stop
                Button(action: { session.stopRecording() }) {
                    Image(systemName: "stop.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(.red)
                }
                .buttonStyle(.plain)
                .help("Stop recording")
            }
        }
        .padding(.horizontal, isExpanded ? 16 : 10)
        .padding(.vertical, 8)
        .frame(width: isExpanded ? 260 : 100, height: isExpanded ? 40 : 32)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 2)
        .animation(.spring(response: 0.25, dampingFraction: 0.8), value: isExpanded)
    }

    private var stoppingView: some View {
        HStack(spacing: 8) {
            ProgressView()
                .controlSize(.small)
            Text("Saving...")
                .font(.caption)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .frame(width: 120, height: 40)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 2)
    }

    private var pulsingOpacity: Double {
        // Pulsing effect for recording dot
        1.0
    }

    private var formattedTime: String {
        let minutes = Int(session.elapsedTime) / 60
        let seconds = Int(session.elapsedTime) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    private func togglePause() {
        if case .paused = session.state {
            session.resumeRecording()
        } else {
            session.pauseRecording()
        }
    }

    private func scheduleCollapse() {
        collapseTask?.cancel()
        collapseTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 4_000_000_000) // 4 seconds
            guard !Task.isCancelled, !isHovering else { return }
            withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
                isExpanded = false
            }
        }
    }
}

// MARK: - State helpers

extension RecordingState {
    var isPaused: Bool {
        if case .paused = self { return true }
        return false
    }
}

// MARK: - NSPanel Controller

/// Manages the floating NSPanel that hosts the recording toolbar.
final class RecordingToolbarController {
    private var panel: NSPanel?

    func show() {
        if panel == nil {
            let hostingView = NSHostingView(rootView: RecordingToolbarView())
            hostingView.frame = NSRect(x: 0, y: 0, width: 300, height: 180)

            let newPanel = NSPanel(
                contentRect: NSRect(x: 0, y: 0, width: 300, height: 180),
                styleMask: [.nonactivatingPanel, .borderless],
                backing: .buffered,
                defer: false
            )
            newPanel.isFloatingPanel = true
            newPanel.level = .floating
            newPanel.backgroundColor = .clear
            newPanel.isOpaque = false
            newPanel.hasShadow = false
            newPanel.isMovableByWindowBackground = true
            newPanel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            newPanel.contentView = hostingView

            // Position at bottom center of main screen
            if let screen = NSScreen.main {
                let screenFrame = screen.visibleFrame
                let x = screenFrame.midX - 150
                let y = screenFrame.minY + 32
                newPanel.setFrameOrigin(NSPoint(x: x, y: y))
            }

            self.panel = newPanel
        }
        panel?.orderFrontRegardless()
    }

    func hide() {
        panel?.orderOut(nil)
    }
}
