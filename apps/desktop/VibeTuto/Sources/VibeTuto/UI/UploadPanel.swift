import SwiftUI

struct UploadPanelView: View {
    let progress: Double
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Uploading")
                    .font(.headline)
                Spacer()
                Text("\(Int(progress * 100))%")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            ProgressView(value: progress)

            HStack {
                Text("\(formattedDuration) · \(session.stepCount) screens")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("Keep CapTuto open")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(width: DT.Size.uploadPanelWidth)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
    }

    private var formattedDuration: String {
        let minutes = Int(session.elapsedTime) / 60
        let seconds = Int(session.elapsedTime) % 60
        return "\(minutes):\(String(format: "%02d", seconds))"
    }
}

struct CompletionPanelView: View {
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Upload complete", systemImage: "checkmark.circle.fill")
                .font(.headline)
                .foregroundStyle(.green)

            Text("Choose your recorded screens in the editor, then edit or generate your guide.")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack {
                Button("Open in Editor", action: openInEditor)
                    .buttonStyle(.borderedProminent)

                Button("Dismiss") {
                    session.reset()
                }
            }
            .controlSize(.small)
        }
        .padding(16)
        .frame(width: DT.Size.uploadPanelWidth, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
    }

    private func openInEditor() {
        if let url = session.tutorialEditorURL {
            NSWorkspace.shared.open(url)
        }
        session.reset()
    }
}

struct ErrorPanelView: View {
    let message: String
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Recording needs attention", systemImage: "exclamationmark.triangle.fill")
                .font(.headline)
                .foregroundStyle(.orange)

            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            if session.hasSavedRecording {
                Text("Your recording is saved on this Mac. You can retry the upload later.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack {
                Button("Retry upload") {
                    session.retryUpload()
                }
                .buttonStyle(.borderedProminent)
                .disabled(!session.canRetryUpload)

                Button("Dismiss") {
                    session.reset()
                }
            }
            .controlSize(.small)
        }
        .padding(16)
        .frame(width: DT.Size.uploadPanelWidth, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
    }
}
