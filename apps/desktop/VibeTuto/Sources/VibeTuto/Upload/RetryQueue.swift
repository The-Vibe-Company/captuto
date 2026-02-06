import Foundation

/// Manages failed uploads with exponential backoff retry logic.
final class RetryQueue: @unchecked Sendable {
    struct PendingUpload: Sendable {
        let id: UUID
        let fileURL: URL
        let key: String
        let retryCount: Int
        let lastAttempt: Date
    }

    private var queue: [PendingUpload] = []
    private let lock = NSLock()
    private let maxRetries = 5

    /// Add a failed upload to the retry queue.
    func enqueue(fileURL: URL, key: String) {
        lock.lock()
        defer { lock.unlock() }

        let upload = PendingUpload(
            id: UUID(),
            fileURL: fileURL,
            key: key,
            retryCount: 0,
            lastAttempt: Date()
        )
        queue.append(upload)
    }

    /// Get the next upload ready for retry (respects backoff).
    func dequeue() -> PendingUpload? {
        lock.lock()
        defer { lock.unlock() }

        let now = Date()
        guard let index = queue.firstIndex(where: { upload in
            let backoff = pow(2.0, Double(upload.retryCount))
            return now.timeIntervalSince(upload.lastAttempt) >= backoff
        }) else {
            return nil
        }

        let upload = queue.remove(at: index)
        if upload.retryCount < maxRetries {
            // Re-enqueue with incremented retry count
            let updated = PendingUpload(
                id: upload.id,
                fileURL: upload.fileURL,
                key: upload.key,
                retryCount: upload.retryCount + 1,
                lastAttempt: now
            )
            queue.append(updated)
            return upload
        }

        return nil // Exceeded max retries
    }

    /// Remove a completed upload from the queue.
    func remove(id: UUID) {
        lock.lock()
        defer { lock.unlock() }
        queue.removeAll { $0.id == id }
    }

    var isEmpty: Bool {
        lock.lock()
        defer { lock.unlock() }
        return queue.isEmpty
    }

    var count: Int {
        lock.lock()
        defer { lock.unlock() }
        return queue.count
    }
}
