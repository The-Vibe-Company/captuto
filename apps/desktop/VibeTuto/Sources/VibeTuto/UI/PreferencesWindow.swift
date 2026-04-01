import SwiftUI
import AVFoundation

// MARK: - Settings Section Helper

private struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: DT.Spacing.sm) {
            Text(title.uppercased())
                .font(DT.Typography.sectionLabel)
                .tracking(1.5)
                .foregroundStyle(DT.Colors.textTertiary)

            VStack(alignment: .leading, spacing: 1) {
                content()
            }
            .background(
                RoundedRectangle(cornerRadius: DT.Radius.md, style: .continuous)
                    .fill(DT.Colors.card)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DT.Radius.md, style: .continuous)
                    .strokeBorder(DT.Colors.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: DT.Radius.md, style: .continuous))
        }
    }
}

private struct SettingsRow<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .padding(.horizontal, DT.Spacing.md)
            .padding(.vertical, DT.Spacing.sm)
    }
}

private struct SettingsDivider: View {
    var body: some View {
        Rectangle()
            .fill(DT.Colors.border)
            .frame(height: 1)
            .padding(.leading, DT.Spacing.md)
    }
}

// MARK: - General Tab

struct GeneralPreferencesView: View {
    @AppStorage("apiToken") private var apiToken = ""
    @AppStorage("launchAtLogin") private var launchAtLogin = false
    @AppStorage("showCountdown") private var showCountdown = true
    @AppStorage("countdownDuration") private var countdownDuration = 3
    @AppStorage("autoOpenEditor") private var autoOpenEditor = false
    @AppStorage("captureQuality") private var captureQuality = "standard"

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DT.Spacing.lg) {

                SettingsSection(title: "Startup") {
                    SettingsRow {
                        Toggle("Launch at login", isOn: $launchAtLogin)
                            .tint(DT.Colors.accentRed)
                            .font(DT.Typography.body)
                            .foregroundStyle(DT.Colors.textPrimary)
                    }
                }

                SettingsSection(title: "Recording") {
                    SettingsRow {
                        Toggle("Show countdown", isOn: $showCountdown)
                            .tint(DT.Colors.accentRed)
                            .font(DT.Typography.body)
                            .foregroundStyle(DT.Colors.textPrimary)
                    }
                    if showCountdown {
                        SettingsDivider()
                        SettingsRow {
                            Picker("Duration", selection: $countdownDuration) {
                                Text("3s").tag(3)
                                Text("5s").tag(5)
                            }
                            .pickerStyle(.segmented)
                        }
                    }
                    SettingsDivider()
                    SettingsRow {
                        Toggle("Auto-open editor after upload", isOn: $autoOpenEditor)
                            .tint(DT.Colors.accentRed)
                            .font(DT.Typography.body)
                            .foregroundStyle(DT.Colors.textPrimary)
                    }
                    SettingsDivider()
                    SettingsRow {
                        HStack {
                            Text("Capture quality")
                                .font(DT.Typography.body)
                                .foregroundStyle(DT.Colors.textPrimary)
                            Spacer()
                            Picker("", selection: $captureQuality) {
                                Text("1x").tag("standard")
                                Text("2x Retina").tag("high")
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 140)
                        }
                    }
                }

                SettingsSection(title: "Account") {
                    SettingsRow {
                        VStack(alignment: .leading, spacing: DT.Spacing.sm) {
                            SecureField("API token", text: $apiToken)
                                .textFieldStyle(.plain)
                                .font(DT.Typography.mono)
                                .foregroundStyle(DT.Colors.textPrimary)
                                .padding(.horizontal, DT.Spacing.md)
                                .padding(.vertical, DT.Spacing.sm)
                                .background(
                                    RoundedRectangle(cornerRadius: DT.Radius.sm)
                                        .fill(DT.Colors.elevated)
                                )
                            HStack {
                                if !apiToken.isEmpty {
                                    Label("Saved", systemImage: "checkmark.circle.fill")
                                        .font(DT.Typography.caption)
                                        .foregroundStyle(DT.Colors.accentTeal)
                                }
                                Spacer()
                                Button("Get Token") {
                                    let baseURL = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
                                    if let url = URL(string: "\(baseURL)/settings") {
                                        NSWorkspace.shared.open(url)
                                    }
                                }
                                .buttonStyle(.plain)
                                .font(DT.Typography.caption)
                                .foregroundStyle(DT.Colors.accentBlue)
                            }
                        }
                    }
                }
            }
            .padding(DT.Spacing.lg)
        }
    }
}

// MARK: - Shortcuts Tab

struct ShortcutsPreferencesView: View {
    @AppStorage("shortcutRecord") private var shortcutRecord = "Cmd+Shift+R"
    @AppStorage("shortcutPause") private var shortcutPause = "Cmd+Shift+P"
    @AppStorage("shortcutMarker") private var shortcutMarker = "Cmd+Shift+M"

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DT.Spacing.lg) {

                SettingsSection(title: "Global Keyboard Shortcuts") {
                    shortcutRow(label: "Start/Stop Recording", shortcut: shortcutRecord)
                    SettingsDivider()
                    shortcutRow(label: "Pause/Resume", shortcut: shortcutPause)
                    SettingsDivider()
                    shortcutRow(label: "Add Marker", shortcut: shortcutMarker)
                }

                Text("Click a shortcut to change it. Press Escape to clear.")
                    .font(DT.Typography.caption)
                    .foregroundStyle(DT.Colors.textTertiary)
            }
            .padding(DT.Spacing.lg)
        }
    }

    private func shortcutRow(label: String, shortcut: String) -> some View {
        SettingsRow {
            HStack {
                Text(label)
                    .font(DT.Typography.body)
                    .foregroundStyle(DT.Colors.textPrimary)
                Spacer()
                HStack(spacing: 3) {
                    ForEach(shortcut.components(separatedBy: "+"), id: \.self) { key in
                        Text(key)
                            .font(DT.Typography.monoSmall)
                            .foregroundStyle(DT.Colors.textPrimary)
                            .padding(.horizontal, DT.Spacing.sm)
                            .padding(.vertical, DT.Spacing.xs)
                            .background(
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(DT.Colors.elevated)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .strokeBorder(DT.Colors.border, lineWidth: 1)
                            )
                    }
                }
            }
        }
    }
}

// MARK: - Audio Tab

struct AudioPreferencesView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("noiseReduction") private var noiseReduction = true
    @State private var selectedDevice = "Default"
    @State private var audioLevel: Float = 0.0

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DT.Spacing.lg) {

                SettingsSection(title: "Recording") {
                    SettingsRow {
                        Toggle("Microphone enabled", isOn: $session.micEnabled)
                            .tint(DT.Colors.accentRed)
                            .font(DT.Typography.body)
                            .foregroundStyle(DT.Colors.textPrimary)
                    }
                }

                SettingsSection(title: "Input Device") {
                    SettingsRow {
                        HStack {
                            Text("Microphone")
                                .font(DT.Typography.body)
                                .foregroundStyle(DT.Colors.textPrimary)
                            Spacer()
                            Text("Default")
                                .font(DT.Typography.body)
                                .foregroundStyle(DT.Colors.textSecondary)
                        }
                    }
                }

                SettingsSection(title: "Processing") {
                    SettingsRow {
                        Toggle("Noise reduction", isOn: $noiseReduction)
                            .tint(DT.Colors.accentRed)
                            .font(DT.Typography.body)
                            .foregroundStyle(DT.Colors.textPrimary)
                    }
                }

                SettingsSection(title: "Level Meter") {
                    SettingsRow {
                        VStack(alignment: .leading, spacing: DT.Spacing.sm) {
                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(DT.Colors.elevated)
                                        .frame(height: 8)

                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(
                                            LinearGradient(
                                                colors: [DT.Colors.accentTeal, DT.Colors.accentBlue],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .frame(width: max(0, geometry.size.width * CGFloat(audioLevel)), height: 8)
                                        .animation(.easeOut(duration: 0.1), value: audioLevel)
                                }
                            }
                            .frame(height: 8)

                            Text("Speak to test your microphone level")
                                .font(DT.Typography.caption)
                                .foregroundStyle(DT.Colors.textTertiary)
                        }
                    }
                }
            }
            .padding(DT.Spacing.lg)
        }
    }
}

// MARK: - Advanced Tab

struct AdvancedPreferencesView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("detectionSensitivity") private var sensitivity = 1
    @AppStorage("groupingDelay") private var groupingDelay = 500.0
    @AppStorage("apiBaseURL") private var apiBaseURL = "https://captuto.com"

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: DT.Spacing.lg) {

                SettingsSection(title: "Action Detection") {
                    SettingsRow {
                        Toggle("Action detection", isOn: $session.actionDetectionEnabled)
                            .tint(DT.Colors.accentRed)
                            .font(DT.Typography.body)
                            .foregroundStyle(DT.Colors.textPrimary)
                    }
                    SettingsDivider()
                    SettingsRow {
                        VStack(alignment: .leading, spacing: DT.Spacing.sm) {
                            Text("Sensitivity")
                                .font(DT.Typography.body)
                                .foregroundStyle(DT.Colors.textPrimary)
                            Picker("", selection: $sensitivity) {
                                Text("Low").tag(0)
                                Text("Medium").tag(1)
                                Text("High").tag(2)
                            }
                            .pickerStyle(.segmented)
                        }
                    }
                    SettingsDivider()
                    SettingsRow {
                        VStack(alignment: .leading, spacing: DT.Spacing.xs) {
                            HStack {
                                Text("Grouping delay")
                                    .font(DT.Typography.body)
                                    .foregroundStyle(DT.Colors.textPrimary)
                                Spacer()
                                Text("\(Int(groupingDelay))ms")
                                    .font(DT.Typography.monoSmall)
                                    .foregroundStyle(DT.Colors.textSecondary)
                            }
                            Slider(value: $groupingDelay, in: 200...2000, step: 100)
                                .tint(DT.Colors.accentRed)
                        }
                    }
                }

                SettingsSection(title: "Server") {
                    SettingsRow {
                        TextField("API URL", text: $apiBaseURL)
                            .textFieldStyle(.plain)
                            .font(DT.Typography.mono)
                            .foregroundStyle(DT.Colors.textPrimary)
                            .padding(.horizontal, DT.Spacing.md)
                            .padding(.vertical, DT.Spacing.sm)
                            .background(
                                RoundedRectangle(cornerRadius: DT.Radius.sm)
                                    .fill(DT.Colors.elevated)
                            )
                    }
                }

                SettingsSection(title: "Data") {
                    SettingsRow {
                        Button("Clear Local Cache") {
                            clearCache()
                        }
                        .buttonStyle(GhostButtonStyle())
                    }
                    SettingsDivider()
                    SettingsRow {
                        Button("Reset All Preferences") {
                            resetPreferences()
                        }
                        .font(DT.Typography.caption)
                        .foregroundStyle(DT.Colors.accentRed)
                    }
                }

                // Quit button at the bottom
                Button("Quit CapTuto") {
                    NSApplication.shared.terminate(nil)
                }
                .buttonStyle(GhostButtonStyle())
                .frame(maxWidth: .infinity, alignment: .center)
            }
            .padding(DT.Spacing.lg)
        }
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
