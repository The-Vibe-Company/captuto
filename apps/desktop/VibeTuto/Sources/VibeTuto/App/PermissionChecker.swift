import Foundation
import AVFoundation
import ScreenCaptureKit

/// Checks and tracks system permission status.
final class PermissionChecker: @unchecked Sendable {
    private(set) var currentPermissions = AppPermissions.unknown

    /// Check all permissions and update status.
    func checkAll() async {
        let screen = checkScreenRecordingSilent()
        let accessibility = checkAccessibility()
        let microphone = await checkMicrophone()

        currentPermissions = AppPermissions(
            screenRecording: screen,
            accessibility: accessibility,
            microphone: microphone
        )
    }

    /// Check screen recording permission WITHOUT triggering the system dialog.
    /// Uses CGPreflightScreenCaptureAccess which is silent and instant.
    /// Works reliably when the app is signed with a stable designated requirement
    /// (TeamID + BundleID match, not CDHash).
    func checkScreenRecordingSilent() -> PermissionStatus {
        if CGPreflightScreenCaptureAccess() {
            return .granted
        }
        return .denied
    }

    /// Check screen recording permission via ScreenCaptureKit (may trigger dialog).
    /// Only call this when the user explicitly requests permission.
    func checkScreenRecording() async -> PermissionStatus {
        await CaptureEngine.checkPermission()
    }

    /// Request screen recording permission (triggers system dialog).
    func requestScreenRecording() {
        CGRequestScreenCaptureAccess()
    }

    /// Check accessibility permission by testing AXIsProcessTrusted.
    func checkAccessibility() -> PermissionStatus {
        let trusted = AXIsProcessTrusted()
        return trusted ? .granted : .denied
    }

    /// Check microphone permission.
    func checkMicrophone() async -> PermissionStatus {
        let status = AVCaptureDevice.authorizationStatus(for: .audio)
        switch status {
        case .authorized:
            return .granted
        case .denied, .restricted:
            return .denied
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .audio)
            return granted ? .granted : .denied
        @unknown default:
            return .notDetermined
        }
    }

    /// Prompt accessibility permission by opening System Settings.
    func promptAccessibility() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue(): true] as CFDictionary
        AXIsProcessTrustedWithOptions(options)
    }
}
