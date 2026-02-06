import Foundation
import CoreGraphics

/// A processed tutorial step ready for upload.
struct DetectedStep: Codable, Sendable {
    let orderIndex: Int
    let timestamp: TimeInterval
    let actionType: ActionType
    let screenshotKey: String
    let clickX: CGFloat?
    let clickY: CGFloat?
    let viewportWidth: Int
    let viewportHeight: Int
    let appBundleID: String?
    let appName: String?
    let windowTitle: String?
    let url: String?
    let elementInfo: ElementInfo?
    let autoCaption: String

    enum CodingKeys: String, CodingKey {
        case orderIndex = "order_index"
        case timestamp
        case actionType = "action_type"
        case screenshotKey = "screenshot_key"
        case clickX = "click_x"
        case clickY = "click_y"
        case viewportWidth = "viewport_width"
        case viewportHeight = "viewport_height"
        case appBundleID = "app_bundle_id"
        case appName = "app_name"
        case windowTitle = "window_title"
        case url
        case elementInfo = "element_info"
        case autoCaption = "auto_caption"
    }
}
