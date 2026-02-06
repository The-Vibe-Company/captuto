import Foundation

/// Status of a system permission required by the app.
enum PermissionStatus: Sendable {
    case granted
    case denied
    case notDetermined
    case restricted
}

/// All permissions required by the app.
struct AppPermissions: Sendable {
    var screenRecording: PermissionStatus
    var accessibility: PermissionStatus
    var microphone: PermissionStatus

    var canRecord: Bool {
        screenRecording == .granted
    }

    var canDetectActions: Bool {
        accessibility == .granted
    }

    var canCaptureAudio: Bool {
        microphone == .granted
    }

    static let unknown = AppPermissions(
        screenRecording: .notDetermined,
        accessibility: .notDetermined,
        microphone: .notDetermined
    )
}
