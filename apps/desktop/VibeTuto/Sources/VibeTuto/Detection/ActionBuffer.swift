import Foundation

/// Temporal buffer that collects raw actions and feeds them to the StepDetector.
/// Handles debouncing and action merging before step detection.
final class ActionBuffer: @unchecked Sendable {
    private var pendingActions: [CapturedAction] = []
    private let stepDetector: StepDetector
    private let lock = NSLock()
    private var stepCount = 0

    /// Callback when a new step is detected.
    var onStepDetected: ((DetectedStep) -> Void)?

    init(stepDetector: StepDetector) {
        self.stepDetector = stepDetector
    }

    /// Add a raw action to the buffer for processing.
    func addAction(_ action: CapturedAction) {
        lock.lock()
        defer { lock.unlock() }

        pendingActions.append(action)

        // Try to detect a step from this action
        if let step = stepDetector.processAction(action, orderIndex: stepCount) {
            stepCount += 1
            onStepDetected?(step)
        }
    }

    /// Get the current step count.
    var currentStepCount: Int {
        lock.lock()
        defer { lock.unlock() }
        return stepCount
    }

    /// Reset the buffer for a new recording session.
    func reset() {
        lock.lock()
        defer { lock.unlock() }
        pendingActions.removeAll()
        stepCount = 0
        stepDetector.reset()
    }
}
