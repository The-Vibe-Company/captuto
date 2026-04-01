import Cocoa
import SwiftUI
import Combine

private final class FloatingPanelWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

final class FloatingPanelController: NSWindowController, NSWindowDelegate {
    private var recordingToolbarController: RecordingToolbarController?
    private var recordingBorderController: RecordingBorderController?
    private var regionSelectorController: RegionSelectorController?
    private var countdownOverlayController: CountdownOverlayController?
    private var cancellables = Set<AnyCancellable>()

    convenience init() {
        let panel = FloatingPanelWindow(
            contentRect: NSRect(
                x: 0,
                y: 0,
                width: DT.Size.floatingPanelWidth,
                height: DT.Size.floatingPanelHeight
            ),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        panel.title = "CapTuto"
        panel.titlebarAppearsTransparent = true
        panel.titleVisibility = .hidden
        panel.level = .floating
        panel.collectionBehavior = [.fullScreenAuxiliary, .moveToActiveSpace]
        panel.isReleasedWhenClosed = false
        panel.hidesOnDeactivate = false
        panel.isMovableByWindowBackground = true
        panel.hasShadow = true
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.center()
        let hostingController = NSHostingController(rootView: FloatingPanelView())
        hostingController.view.wantsLayer = true
        hostingController.view.layer?.backgroundColor = NSColor.clear.cgColor
        panel.contentViewController = hostingController
        panel.contentView?.wantsLayer = true
        panel.contentView?.layer?.backgroundColor = NSColor.clear.cgColor

        self.init(window: panel)
        panel.delegate = self
        observeSessionState()
    }

    override func showWindow(_ sender: Any?) {
        super.showWindow(sender)
        showPanel(makeKey: true)
    }

    func windowWillClose(_ notification: Notification) {
        switch SessionManager.shared.state {
        case .idle, .completed, .error:
            NSApplication.shared.terminate(nil)
        default:
            hidePanel()
        }
    }

    private func observeSessionState() {
        Task { @MainActor in
            SessionManager.shared.$state
                .receive(on: DispatchQueue.main)
                .sink { [weak self] state in
                    self?.handleStateTransition(state)
                }
                .store(in: &cancellables)
        }
    }

    private func handleStateTransition(_ state: RecordingState) {
        switch state {
        case .selectingRegion:
            hidePanel()
            showRegionSelector()

        case .countdown:
            hidePanel()
            focusCaptureTargetIfNeeded()
            showCountdownOverlay()

        case .recording:
            hideCountdownOverlay()
            hidePanel()
            focusCaptureTargetIfNeeded()
            showRecordingToolbar()
            showRecordingBorder()
            NSApp.activate(ignoringOtherApps: false)

        case .paused:
            showRecordingToolbar()
            showRecordingBorder()

        case .stopping, .uploading:
            hidePanel()
            hideRecordingBorder()
            showRecordingToolbar()

        case .completed, .error:
            hideCountdownOverlay()
            hideRecordingBorder()
            showRecordingToolbar()
            showPanel(makeKey: false)

        case .idle:
            hideCountdownOverlay()
            hideRecordingToolbar()
            hideRecordingBorder()
            if regionSelectorController != nil {
                regionSelectorController?.dismiss()
                regionSelectorController = nil
            }
            showPanel(makeKey: false)
        }
    }

    private func showPanel(makeKey: Bool) {
        guard let window else { return }
        if !window.isVisible {
            window.center()
        }
        if makeKey {
            NSApp.activate(ignoringOtherApps: true)
            window.makeKeyAndOrderFront(nil)
        } else {
            window.orderFrontRegardless()
        }
    }

    private func hidePanel() {
        window?.orderOut(nil)
    }

    private func focusCaptureTargetIfNeeded() {
        guard SessionManager.shared.currentMode == .singleApp,
              let bundleID = SessionManager.shared.selectedAppBundleID else { return }
        NSRunningApplication.runningApplications(withBundleIdentifier: bundleID)
            .first?
            .activate()
    }

    private func showRecordingToolbar() {
        if recordingToolbarController == nil {
            recordingToolbarController = RecordingToolbarController()
        }
        recordingToolbarController?.show()
    }

    private func hideRecordingToolbar() {
        recordingToolbarController?.hide()
    }

    private func showRegionSelector() {
        if regionSelectorController == nil {
            regionSelectorController = RegionSelectorController()
        }
        regionSelectorController?.show(
            onSelected: { [weak self] rect in
                Task { @MainActor in
                    SessionManager.shared.regionSelected(rect: rect)
                    self?.regionSelectorController = nil
                }
            },
            onCancelled: { [weak self] in
                Task { @MainActor in
                    SessionManager.shared.reset()
                    self?.regionSelectorController = nil
                    self?.showPanel(makeKey: true)
                }
            }
        )
    }

    private func showRecordingBorder() {
        if recordingBorderController == nil {
            recordingBorderController = RecordingBorderController()
        }
        Task { @MainActor in
            let region = SessionManager.shared.selectedRegion
            recordingBorderController?.show(region: region)
        }
    }

    private func hideRecordingBorder() {
        recordingBorderController?.hide()
        recordingBorderController = nil
    }

    private func showCountdownOverlay() {
        if countdownOverlayController == nil {
            countdownOverlayController = CountdownOverlayController()
        }
        countdownOverlayController?.show()
    }

    private func hideCountdownOverlay() {
        countdownOverlayController?.hide()
        countdownOverlayController = nil
    }
}
