import Foundation

/// The capture mode for a recording session.
enum RecordingMode: String, Codable, Sendable {
    case fullScreen
    case singleApp
    case region
}
