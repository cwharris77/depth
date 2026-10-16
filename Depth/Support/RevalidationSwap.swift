import Foundation

/// Swaps a background-revalidated value into a screen that was served the cached copy.
///
/// `watch` waits once for the revalidate and applies the result only when it differs from what
/// the screen shows, so an unchanged revalidate causes no state write and no re-render. While
/// `isHeld` (the user is mid-interaction) a changed value is kept back and applied when the
/// hold lifts, so content never moves under a finger. `cancel` drops any waiting value; a
/// user-initiated refresh calls it because its own result supersedes the revalidate.
@MainActor
final class RevalidationSwap<Value: Equatable & Sendable> {
    private var current: @MainActor () -> Value? = { nil }
    private var apply: @MainActor (Value) -> Void = { _ in }
    private var pending: Value?
    private var task: Task<Void, Never>?

    private(set) var isHeld = false

    /// `current` reads what the screen shows now; `apply` writes the swapped-in value.
    func watch(
        current: @escaping @MainActor () -> Value?,
        apply: @escaping @MainActor (Value) -> Void,
        revalidated: @escaping @Sendable () async -> Value?
    ) {
        cancel()
        self.current = current
        self.apply = apply
        task = Task { [weak self] in
            guard let value = await revalidated(), !Task.isCancelled else { return }
            self?.offer(value)
        }
    }

    func hold(_ held: Bool) {
        isHeld = held
        guard !held, let value = pending else { return }
        pending = nil
        offer(value)
    }

    func cancel() {
        task?.cancel()
        task = nil
        pending = nil
    }

    /// Resolves once the watched revalidate has been applied, held back, or dropped.
    func settled() async {
        await task?.value
    }

    private func offer(_ value: Value) {
        guard value != current() else {
            pending = nil
            return
        }
        if isHeld {
            pending = value
        } else {
            pending = nil
            apply(value)
        }
    }
}
