import Foundation

/// Extracts command context from terminal application window titles.
final class TerminalPlugin: AppPlugin, @unchecked Sendable {
    let supportedBundleIDs: Set<String> = [
        "com.apple.Terminal",
        "com.googlecode.iterm2",
        "dev.warp.Warp-Stable",
        "io.alacritty",
        "com.mitchellh.ghostty",
    ]

    func extractContext(bundleID: String, windowTitle: String?) -> AppPluginContext? {
        guard supportedBundleIDs.contains(bundleID),
              let title = windowTitle else {
            return nil
        }

        var info: [String: String] = [:]

        // Terminal titles often show: "user@host: ~/path" or "command -- user@host"
        if title.contains(":") {
            let parts = title.components(separatedBy: ":")
            if parts.count >= 2 {
                info["path"] = parts.last?.trimmingCharacters(in: .whitespaces) ?? ""
            }
        }

        // Detect common commands in title
        let commands = ["git", "npm", "yarn", "docker", "ssh", "python", "node", "cargo", "make", "brew"]
        for cmd in commands {
            if title.lowercased().contains(cmd) {
                info["detected_command"] = cmd
                break
            }
        }

        return AppPluginContext(url: nil, additionalInfo: info)
    }
}
