import SwiftUI

/// Upload progress panel that replaces the recording toolbar after stopping.
struct UploadPanelView: View {
    let progress: Double
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(spacing: 12) {
            Text("Recording complete!")
                .font(.headline)

            HStack(spacing: 8) {
                Text(formattedDuration)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("--")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                Text("\(session.stepCount) steps")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Progress bar
            VStack(spacing: 4) {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.primary.opacity(0.1))
                            .frame(height: 6)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(
                                LinearGradient(
                                    colors: [.purple, .purple.opacity(0.7)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: max(0, geometry.size.width * progress), height: 6)
                            .animation(.easeInOut(duration: 0.3), value: progress)
                    }
                }
                .frame(height: 6)

                Text("Uploading... \(Int(progress * 100))%")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Button("Cancel") {
                session.reset()
            }
            .buttonStyle(.plain)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(20)
        .frame(width: 300, height: 160)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 2)
    }

    private var formattedDuration: String {
        let minutes = Int(session.elapsedTime) / 60
        let seconds = Int(session.elapsedTime) % 60
        return "\(minutes):\(String(format: "%02d", seconds)) duration"
    }
}

/// Panel shown when upload completes successfully.
struct CompletionPanelView: View {
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 32))
                .foregroundStyle(.green)

            Text("Upload complete!")
                .font(.headline)

            HStack(spacing: 12) {
                Button(action: openInEditor) {
                    Text("Open in Editor")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.regular)

                Button("Dismiss") {
                    session.reset()
                }
                .buttonStyle(.bordered)
                .controlSize(.regular)
            }
        }
        .padding(20)
        .frame(width: 300, height: 160)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 2)
    }

    private func openInEditor() {
        if let url = session.tutorialEditorURL {
            NSWorkspace.shared.open(url)
        }
        session.reset()
    }
}

/// Panel shown when upload fails.
struct ErrorPanelView: View {
    let message: String
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 28))
                .foregroundStyle(.yellow)

            Text("Upload failed")
                .font(.headline)

            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)

            HStack(spacing: 12) {
                Button("Retry") {
                    // Re-trigger upload
                    session.stopRecording()
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.regular)

                Button("Save Locally") {
                    // Save to local store for later retry
                    session.reset()
                }
                .buttonStyle(.bordered)
                .controlSize(.regular)
            }
        }
        .padding(20)
        .frame(width: 300, height: 180)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 2)
    }
}
