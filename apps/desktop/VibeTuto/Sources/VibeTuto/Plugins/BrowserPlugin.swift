import Foundation
import Cocoa
import ApplicationServices

/// Extracts URL information from browser applications using Accessibility API.
final class BrowserPlugin: AppPlugin, @unchecked Sendable {
    let supportedBundleIDs: Set<String> = [
        "com.google.Chrome",
        "com.apple.Safari",
        "org.mozilla.firefox",
        "com.microsoft.edgemac",
        "company.thebrowser.Browser",  // Arc
        "com.brave.Browser",
    ]

    func extractContext(bundleID: String, windowTitle: String?) -> AppPluginContext? {
        guard supportedBundleIDs.contains(bundleID) else { return nil }

        let url = extractURL(bundleID: bundleID)
        return AppPluginContext(url: url, additionalInfo: [:])
    }

    /// Try to read the current URL from the browser's address bar via Accessibility.
    private func extractURL(bundleID: String) -> String? {
        guard let app = NSWorkspace.shared.runningApplications.first(where: {
            $0.bundleIdentifier == bundleID
        }) else {
            return nil
        }

        let appElement = AXUIElementCreateApplication(app.processIdentifier)

        // Get the focused window
        var windowValue: AnyObject?
        guard AXUIElementCopyAttributeValue(appElement, kAXFocusedWindowAttribute as CFString, &windowValue) == .success else {
            return nil
        }

        // Search for a text field with role "AXTextField" that looks like a URL bar
        let window = windowValue as! AXUIElement
        return findURLField(in: window)
    }

    /// Recursively search for the URL text field in the accessibility tree.
    private func findURLField(in element: AXUIElement, depth: Int = 0) -> String? {
        guard depth < 10 else { return nil }

        var roleValue: AnyObject?
        AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &roleValue)
        let role = roleValue as? String

        // Look for text fields that contain URL-like values
        if role == "AXTextField" || role == "AXComboBox" {
            var valueObj: AnyObject?
            AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &valueObj)
            if let value = valueObj as? String, looksLikeURL(value) {
                return value
            }
        }

        // Check for "AXURLField" role description (used by some browsers)
        var descValue: AnyObject?
        AXUIElementCopyAttributeValue(element, kAXRoleDescriptionAttribute as CFString, &descValue)
        if let desc = descValue as? String, desc.lowercased().contains("url") || desc.lowercased().contains("address") {
            var valueObj: AnyObject?
            AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &valueObj)
            if let value = valueObj as? String {
                return value
            }
        }

        // Recurse into children
        var childrenValue: AnyObject?
        guard AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &childrenValue) == .success,
              let children = childrenValue as? [AXUIElement] else {
            return nil
        }

        for child in children {
            if let url = findURLField(in: child, depth: depth + 1) {
                return url
            }
        }

        return nil
    }

    private func looksLikeURL(_ string: String) -> Bool {
        string.contains("://") || string.contains("www.") || string.contains(".com") || string.contains(".org") || string.contains("localhost")
    }
}
