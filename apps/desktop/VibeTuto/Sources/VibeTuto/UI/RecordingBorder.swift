import Cocoa

/// Draws a thin colored border around the recording area.
final class RecordingBorderController {
    private var window: NSWindow?

    func show() {
        if window == nil, let screen = NSScreen.main {
            let borderWindow = NSWindow(
                contentRect: screen.frame,
                styleMask: .borderless,
                backing: .buffered,
                defer: false
            )
            borderWindow.level = .statusBar
            borderWindow.backgroundColor = .clear
            borderWindow.isOpaque = false
            borderWindow.ignoresMouseEvents = true
            borderWindow.hasShadow = false
            borderWindow.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

            let borderView = RecordingBorderView(frame: screen.frame)
            borderWindow.contentView = borderView

            self.window = borderWindow
        }
        window?.orderFrontRegardless()
    }

    func hide() {
        window?.orderOut(nil)
    }
}

/// Custom NSView that draws a border around the screen edges.
final class RecordingBorderView: NSView {
    private let borderWidth: CGFloat = 2.0
    private let borderColor = NSColor(red: 0.6, green: 0.3, blue: 1.0, alpha: 0.8) // Brand purple

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)

        guard let context = NSGraphicsContext.current?.cgContext else { return }

        let useHighContrast = NSWorkspace.shared.accessibilityDisplayShouldIncreaseContrast
        let width = useHighContrast ? 3.0 : borderWidth

        context.setStrokeColor(borderColor.cgColor)
        context.setLineWidth(width)

        let inset = width / 2
        let rect = bounds.insetBy(dx: inset, dy: inset)
        context.stroke(rect)
    }
}
