import Foundation

/// Converts raw CapturedActions into meaningful tutorial steps by filtering noise,
/// merging related actions, and generating auto-captions.
final class StepDetector: @unchecked Sendable {
    /// Minimum time (seconds) between two actions to be considered separate steps.
    private let minimumStepInterval: TimeInterval = 0.5

    /// Actions below this confidence score are considered noise.
    private let confidenceThreshold: Double = 0.3

    private var lastStepTime: TimeInterval = -1

    /// Process a raw action and determine if it constitutes a meaningful step.
    /// Returns a DetectedStep if the action is significant, nil otherwise.
    func processAction(_ action: CapturedAction, orderIndex: Int) -> DetectedStep? {
        let confidence = calculateConfidence(action)
        guard confidence >= confidenceThreshold else { return nil }

        // Debounce: skip actions that are too close in time to the last step
        guard action.relativeTime - lastStepTime >= minimumStepInterval else { return nil }

        lastStepTime = action.relativeTime

        let caption = generateCaption(for: action)
        let screenshotKey = "step-\(orderIndex).jpg"

        return DetectedStep(
            orderIndex: orderIndex,
            timestamp: action.relativeTime,
            actionType: action.actionType,
            screenshotKey: screenshotKey,
            clickX: action.clickX,
            clickY: action.clickY,
            viewportWidth: action.viewportWidth,
            viewportHeight: action.viewportHeight,
            appBundleID: action.appBundleID,
            appName: action.appName,
            windowTitle: action.windowTitle,
            url: action.url,
            elementInfo: action.elementInfo,
            autoCaption: caption
        )
    }

    /// Reset the detector state for a new recording session.
    func reset() {
        lastStepTime = -1
    }

    // MARK: - Confidence Scoring

    private func calculateConfidence(_ action: CapturedAction) -> Double {
        switch action.actionType {
        case .click:
            // Clicks with element info are high confidence
            if action.elementInfo != nil {
                let role = action.elementInfo?.role ?? ""
                // Buttons, links, menu items are high value
                if isInteractiveRole(role) {
                    return 1.0
                }
                return 0.7
            }
            return 0.5

        case .keyboardShortcut:
            return 0.9

        case .appSwitch:
            return 0.8

        case .type:
            // Pure typing is usually part of a larger step
            return 0.4

        case .manualMarker:
            return 1.0

        case .menuSelection:
            return 0.9

        case .urlNavigation:
            return 0.8

        case .dialogInteraction:
            return 0.7

        case .scroll:
            return 0.1

        case .drag:
            return 0.6

        case .unknown:
            return 0.0
        }
    }

    private func isInteractiveRole(_ role: String) -> Bool {
        let interactiveRoles: Set<String> = [
            "AXButton", "AXLink", "AXMenuItem", "AXMenuBarItem",
            "AXCheckBox", "AXRadioButton", "AXPopUpButton",
            "AXComboBox", "AXTextField", "AXTextArea",
            "AXTab", "AXToolbar", "AXDisclosureTriangle"
        ]
        return interactiveRoles.contains(role)
    }

    // MARK: - Caption Generation

    /// Generate a human-readable auto-caption based on the action type and context.
    func generateCaption(for action: CapturedAction) -> String {
        switch action.actionType {
        case .click:
            return generateClickCaption(action)
        case .keyboardShortcut:
            return generateShortcutCaption(action)
        case .appSwitch:
            return generateAppSwitchCaption(action)
        case .type:
            return generateTypeCaption(action)
        case .manualMarker:
            return "Manual step marker"
        case .menuSelection:
            return generateMenuCaption(action)
        case .urlNavigation:
            return generateURLCaption(action)
        case .dialogInteraction:
            return generateDialogCaption(action)
        case .scroll:
            return "Scroll"
        case .drag:
            return "Drag action"
        case .unknown:
            return "Action performed"
        }
    }

    private func generateClickCaption(_ action: CapturedAction) -> String {
        guard let info = action.elementInfo else {
            if let app = action.appName {
                return "Click in \(app)"
            }
            return "Click"
        }

        let elementType = friendlyRoleName(info.role)

        if let title = info.title, !title.isEmpty {
            return "Click the '\(title)' \(elementType)"
        }

        if let app = action.appName {
            return "Click \(elementType) in \(app)"
        }

        return "Click \(elementType)"
    }

    private func generateShortcutCaption(_ action: CapturedAction) -> String {
        guard let keyCombo = action.keyCombo else {
            return "Keyboard shortcut"
        }

        let known = knownShortcutDescription(keyCombo)
        if let description = known {
            return "\(description) (\(keyCombo))"
        }

        if let app = action.appName {
            return "Press \(keyCombo) in \(app)"
        }
        return "Press \(keyCombo)"
    }

    private func generateAppSwitchCaption(_ action: CapturedAction) -> String {
        if let app = action.appName {
            return "Switch to \(app)"
        }
        return "Switch application"
    }

    private func generateTypeCaption(_ action: CapturedAction) -> String {
        if let text = action.typedText, !text.isEmpty {
            let preview = text.count > 30 ? String(text.prefix(30)) + "..." : text
            return "Type '\(preview)'"
        }
        return "Type text"
    }

    private func generateMenuCaption(_ action: CapturedAction) -> String {
        if let title = action.elementInfo?.title {
            return "Select '\(title)' from menu"
        }
        return "Select menu item"
    }

    private func generateURLCaption(_ action: CapturedAction) -> String {
        if let url = action.url {
            return "Navigate to \(url)"
        }
        return "Navigate to URL"
    }

    private func generateDialogCaption(_ action: CapturedAction) -> String {
        if let title = action.elementInfo?.title {
            return "Interact with '\(title)' dialog"
        }
        return "Interact with dialog"
    }

    // MARK: - Helpers

    private func friendlyRoleName(_ role: String) -> String {
        let map: [String: String] = [
            "AXButton": "button",
            "AXLink": "link",
            "AXMenuItem": "menu item",
            "AXMenuBarItem": "menu bar item",
            "AXCheckBox": "checkbox",
            "AXRadioButton": "radio button",
            "AXPopUpButton": "dropdown",
            "AXComboBox": "combo box",
            "AXTextField": "text field",
            "AXTextArea": "text area",
            "AXTab": "tab",
            "AXToolbar": "toolbar",
            "AXImage": "image",
            "AXStaticText": "text",
            "AXGroup": "area",
            "AXScrollArea": "scroll area",
            "AXTable": "table",
            "AXRow": "row",
            "AXCell": "cell",
            "AXDisclosureTriangle": "disclosure triangle",
        ]
        return map[role] ?? role.replacingOccurrences(of: "AX", with: "").lowercased()
    }

    private func knownShortcutDescription(_ combo: String) -> String? {
        let shortcuts: [String: String] = [
            "Cmd+C": "Copy",
            "Cmd+V": "Paste",
            "Cmd+X": "Cut",
            "Cmd+Z": "Undo",
            "Cmd+Shift+Z": "Redo",
            "Cmd+S": "Save",
            "Cmd+A": "Select All",
            "Cmd+F": "Find",
            "Cmd+N": "New",
            "Cmd+O": "Open",
            "Cmd+W": "Close Window",
            "Cmd+Q": "Quit",
            "Cmd+T": "New Tab",
            "Cmd+P": "Print",
            "Cmd+Shift+S": "Save As",
            "Cmd+Tab": "Switch App",
        ]
        return shortcuts[combo]
    }
}
