import SwiftUI
import AVFoundation

/// SwiftUI view for the Preferences window with 4 tabs.
struct PreferencesView: View {
    var body: some View {
        TabView {
            GeneralPreferencesView()
                .tabItem {
                    Label("General", systemImage: "gearshape")
                }

            ShortcutsPreferencesView()
                .tabItem {
                    Label("Shortcuts", systemImage: "keyboard")
                }

            AudioPreferencesView()
                .tabItem {
                    Label("Audio", systemImage: "mic")
                }

            AdvancedPreferencesView()
                .tabItem {
                    Label("Advanced", systemImage: "wrench.and.screwdriver")
                }
        }
        .padding(20)
    }
}

// MARK: - General Tab

struct GeneralPreferencesView: View {
    @AppStorage("apiToken") private var apiToken = ""
    @AppStorage("launchAtLogin") private var launchAtLogin = false
    @AppStorage("showDockIcon") private var showDockIcon = false
    @AppStorage("showCountdown") private var showCountdown = true
    @AppStorage("countdownDuration") private var countdownDuration = 3
    @AppStorage("autoOpenEditor") private var autoOpenEditor = false
    @AppStorage("captureQuality") private var captureQuality = "standard"

    var body: some View {
        Form {
            Section("Startup") {
                Toggle("Launch at login", isOn: $launchAtLogin)
                Toggle("Show Dock icon", isOn: $showDockIcon)
            }

            Section("Recording") {
                Toggle("Show countdown before recording", isOn: $showCountdown)
                if showCountdown {
                    Picker("Countdown duration", selection: $countdownDuration) {
                        Text("3 seconds").tag(3)
                        Text("5 seconds").tag(5)
                    }
                }
                Toggle("Auto-open editor after upload", isOn: $autoOpenEditor)
                Picker("Capture quality", selection: $captureQuality) {
                    Text("Standard (1x)").tag("standard")
                    Text("High (2x Retina)").tag("high")
                }
            }

            Section("Account") {
                VStack(alignment: .leading, spacing: 8) {
                    Text("API Token")
                        .font(.body)
                    SecureField("Paste your API token here", text: $apiToken)
                        .textFieldStyle(.roundedBorder)
                    HStack {
                        if !apiToken.isEmpty {
                            Label("Token saved", systemImage: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundStyle(.green)
                        }
                        Spacer()
                        Button("Get Token") {
                            let baseURL = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
                            if let url = URL(string: "\(baseURL)/settings") {
                                NSWorkspace.shared.open(url)
                            }
                        }
                        .font(.caption)
                    }
                }
            }
        }
        .formStyle(.grouped)
    }
}

// MARK: - Shortcuts Tab

struct ShortcutsPreferencesView: View {
    @AppStorage("shortcutRecord") private var shortcutRecord = "Cmd+Shift+R"
    @AppStorage("shortcutPause") private var shortcutPause = "Cmd+Shift+P"
    @AppStorage("shortcutMarker") private var shortcutMarker = "Cmd+Shift+M"

    var body: some View {
        Form {
            Section("Global Keyboard Shortcuts") {
                HStack {
                    Text("Start/Stop Recording")
                    Spacer()
                    Text(shortcutRecord)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.primary.opacity(0.05))
                        )
                        .font(.system(.body, design: .monospaced))
                }

                HStack {
                    Text("Pause/Resume")
                    Spacer()
                    Text(shortcutPause)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.primary.opacity(0.05))
                        )
                        .font(.system(.body, design: .monospaced))
                }

                HStack {
                    Text("Add Marker")
                    Spacer()
                    Text(shortcutMarker)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.primary.opacity(0.05))
                        )
                        .font(.system(.body, design: .monospaced))
                }
            }

            Text("Click a shortcut to change it. Press Escape to clear.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .formStyle(.grouped)
    }
}

// MARK: - Audio Tab

struct AudioPreferencesView: View {
    @AppStorage("noiseReduction") private var noiseReduction = true
    @State private var selectedDevice = "Default"
    @State private var audioLevel: Float = 0.0

    var body: some View {
        Form {
            Section("Input Device") {
                Picker("Microphone", selection: $selectedDevice) {
                    Text("Default").tag("Default")
                    // Audio devices would be populated dynamically
                }
            }

            Section("Processing") {
                Toggle("Noise reduction", isOn: $noiseReduction)
            }

            Section("Level Meter") {
                ProgressView(value: Double(audioLevel))
                    .progressViewStyle(.linear)
                Text("Speak to test your microphone level")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
    }
}

// MARK: - Advanced Tab

struct AdvancedPreferencesView: View {
    @AppStorage("detectionSensitivity") private var sensitivity = 1 // 0=Low, 1=Medium, 2=High
    @AppStorage("groupingDelay") private var groupingDelay = 500.0
    @AppStorage("apiBaseURL") private var apiBaseURL = "https://captuto.com"

    var body: some View {
        Form {
            Section("Action Detection") {
                Picker("Sensitivity", selection: $sensitivity) {
                    Text("Low").tag(0)
                    Text("Medium").tag(1)
                    Text("High").tag(2)
                }
                .pickerStyle(.segmented)

                VStack(alignment: .leading) {
                    Text("Step grouping delay: \(Int(groupingDelay))ms")
                    Slider(value: $groupingDelay, in: 200...2000, step: 100)
                }
            }

            Section("Server") {
                TextField("API URL", text: $apiBaseURL)
                    .textFieldStyle(.roundedBorder)
            }

            Section("Data") {
                Button("Clear Local Cache") {
                    clearCache()
                }
                Button("Reset All Preferences") {
                    resetPreferences()
                }
                .foregroundStyle(.red)
            }
        }
        .formStyle(.grouped)
    }

    private func clearCache() {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("VibeTuto", isDirectory: true)
        try? FileManager.default.removeItem(at: tempDir)
    }

    private func resetPreferences() {
        let domain = Bundle.main.bundleIdentifier ?? "com.vibetuto.recorder"
        UserDefaults.standard.removePersistentDomain(forName: domain)
    }
}
