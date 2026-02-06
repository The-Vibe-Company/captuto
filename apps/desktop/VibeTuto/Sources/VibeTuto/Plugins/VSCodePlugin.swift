import Foundation

/// Extracts file and branch context from VS Code window titles.
final class VSCodePlugin: AppPlugin, @unchecked Sendable {
    let supportedBundleIDs: Set<String> = [
        "com.microsoft.VSCode",
        "com.microsoft.VSCodeInsiders",
        "com.vscodium",
    ]

    func extractContext(bundleID: String, windowTitle: String?) -> AppPluginContext? {
        guard supportedBundleIDs.contains(bundleID),
              let title = windowTitle else {
            return nil
        }

        var info: [String: String] = [:]

        // VS Code title format: "filename - folder - Visual Studio Code"
        // or: "filename - folder (workspace) - Visual Studio Code"
        let parts = title.components(separatedBy: " - ")
        if parts.count >= 2 {
            info["file"] = parts[0].trimmingCharacters(in: .whitespaces)
        }
        if parts.count >= 3 {
            let folderPart = parts[1].trimmingCharacters(in: .whitespaces)
            // Check for git branch in parentheses
            if let branchRange = folderPart.range(of: #"\(([^)]+)\)"#, options: .regularExpression) {
                let branchMatch = folderPart[branchRange]
                let branch = branchMatch.dropFirst().dropLast() // Remove parentheses
                info["branch"] = String(branch)
            }
            info["project"] = folderPart.components(separatedBy: " (").first ?? folderPart
        }

        return AppPluginContext(url: nil, additionalInfo: info)
    }
}
