import Foundation
import CoreGraphics

/// A raw captured user action before step detection processing.
struct CapturedAction: Sendable {
    let id: UUID
    let timestamp: Date
    let relativeTime: TimeInterval
    let actionType: ActionType
    let clickX: CGFloat?
    let clickY: CGFloat?
    let viewportWidth: Int
    let viewportHeight: Int
    let appBundleID: String?
    let appName: String?
    let windowTitle: String?
    let url: String?
    let elementInfo: ElementInfo?
    let keyCombo: String?
    let typedText: String?

    init(
        timestamp: Date = Date(),
        relativeTime: TimeInterval,
        actionType: ActionType,
        clickX: CGFloat? = nil,
        clickY: CGFloat? = nil,
        viewportWidth: Int = 0,
        viewportHeight: Int = 0,
        appBundleID: String? = nil,
        appName: String? = nil,
        windowTitle: String? = nil,
        url: String? = nil,
        elementInfo: ElementInfo? = nil,
        keyCombo: String? = nil,
        typedText: String? = nil
    ) {
        self.id = UUID()
        self.timestamp = timestamp
        self.relativeTime = relativeTime
        self.actionType = actionType
        self.clickX = clickX
        self.clickY = clickY
        self.viewportWidth = viewportWidth
        self.viewportHeight = viewportHeight
        self.appBundleID = appBundleID
        self.appName = appName
        self.windowTitle = windowTitle
        self.url = url
        self.elementInfo = elementInfo
        self.keyCombo = keyCombo
        self.typedText = typedText
    }
}
