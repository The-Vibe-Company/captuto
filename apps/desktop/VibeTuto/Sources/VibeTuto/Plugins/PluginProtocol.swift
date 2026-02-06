import Foundation

/// Protocol for app-specific intelligence plugins that extract richer context.
protocol AppPlugin: AnyObject, Sendable {
    /// The bundle identifiers this plugin handles.
    var supportedBundleIDs: Set<String> { get }

    /// Extract additional context from the current state of the target app.
    /// Called after an action is detected in one of the supported apps.
    func extractContext(bundleID: String, windowTitle: String?) -> AppPluginContext?
}

/// Additional context provided by an app plugin.
struct AppPluginContext: Sendable {
    let url: String?
    let additionalInfo: [String: String]
}
