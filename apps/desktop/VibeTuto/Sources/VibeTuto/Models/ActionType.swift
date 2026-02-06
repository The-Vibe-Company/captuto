import Foundation

/// All recognized action types for tutorial step detection.
enum ActionType: String, Codable, Sendable {
    case click
    case type
    case keyboardShortcut
    case appSwitch
    case urlNavigation
    case menuSelection
    case drag
    case scroll
    case dialogInteraction
    case manualMarker
    case unknown
}
