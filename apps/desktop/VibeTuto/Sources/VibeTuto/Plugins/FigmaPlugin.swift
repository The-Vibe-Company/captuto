import Foundation

/// Extracts design context from Figma application.
final class FigmaPlugin: AppPlugin, @unchecked Sendable {
    let supportedBundleIDs: Set<String> = [
        "com.figma.Desktop",
    ]

    func extractContext(bundleID: String, windowTitle: String?) -> AppPluginContext? {
        guard supportedBundleIDs.contains(bundleID),
              let title = windowTitle else {
            return nil
        }

        var info: [String: String] = [:]

        // Figma title format: "File Name - Figma" or "Page/Frame - File Name - Figma"
        let parts = title.components(separatedBy: " - ")
        if parts.count >= 2 {
            info["figma_file"] = parts[0].trimmingCharacters(in: .whitespaces)
        }
        if parts.count >= 3 {
            info["figma_page"] = parts[0].trimmingCharacters(in: .whitespaces)
            info["figma_file"] = parts[1].trimmingCharacters(in: .whitespaces)
        }

        return AppPluginContext(url: nil, additionalInfo: info)
    }
}
