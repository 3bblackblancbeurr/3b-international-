import Foundation
#if canImport(ActivityKit) && os(iOS)
import ActivityKit

@available(iOS 16.1, *)
struct CompanionActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var mode: String
        var message: String
        var updatedAt: Date
    }

    var companionId: String = "3b-universal"
}
#endif

// Compiled into both targets. This contains no member identity or event payload.
struct CompanionSnapshot: Codable, Equatable {
    let mode: String
    let enabled: Bool
    let updatedAt: Date

    static let modes: Set<String> = [
        "idle", "walk", "sit", "sleep", "wake", "clock", "notification",
        "celebrate", "secret", "reward", "guardian", "support"
    ]
    static let freshness: TimeInterval = 300

    init(mode: String?, enabled: Bool = true, updatedAt: Date = Date()) {
        let candidate = mode ?? "idle"
        self.mode = Self.modes.contains(candidate) ? candidate : "idle"
        self.enabled = enabled
        self.updatedAt = updatedAt
    }

    var message: String { enabled ? Self.label(for: mode) : "Compagnon en pause" }

    func presentation(at date: Date, calendar: Calendar = .current) -> CompanionSnapshot {
        guard enabled else { return CompanionSnapshot(mode: "sleep", enabled: false, updatedAt: date) }
        let age = date.timeIntervalSince(updatedAt)
        guard age >= -60 && age < Self.freshness else {
            return CompanionSnapshot(mode: Self.timeMode(at: date, calendar: calendar), updatedAt: date)
        }
        return CompanionSnapshot(mode: mode, updatedAt: updatedAt)
    }

    static func timeMode(at date: Date, calendar: Calendar = .current) -> String {
        let hour = calendar.component(.hour, from: date)
        let minute = calendar.component(.minute, from: date)
        if hour >= 1 && hour < 6 { return "sleep" }
        if hour == 6 && minute < 20 { return "wake" }
        if minute >= 58 || minute <= 2 { return "clock" }
        return "idle"
    }

    static func label(for mode: String) -> String {
        [
            "idle": "Toujours là", "walk": "Je me promène", "sit": "Petite pause",
            "sleep": "Mode sommeil", "wake": "Bonjour", "clock": "Je garde l’heure",
            "notification": "Quelque chose arrive", "celebrate": "Bien joué",
            "secret": "Le Secret 3B approche", "reward": "Récompense obtenue",
            "guardian": "Je veille sur ton 3B", "support": "Toujours avec toi"
        ][mode] ?? "Toujours là"
    }

    // Predictable changes are pre-rendered in a single timeline, including expiry
    // of a transient app reaction. No recurring animation or minute polling.
    func timelineDates(from now: Date, calendar: Calendar = .current) -> [Date] {
        let end = calendar.date(byAdding: .hour, value: 6, to: now) ?? now.addingTimeInterval(21600)
        var dates: Set<Date> = [now, end]
        let expiry = updatedAt.addingTimeInterval(Self.freshness)
        if expiry > now && expiry < end { dates.insert(expiry) }
        for minute in [0, 3, 20, 58] {
            var cursor = now
            while let next = calendar.nextDate(after: cursor, matching: DateComponents(minute: minute), matchingPolicy: .nextTime), next < end {
                dates.insert(next)
                cursor = next
            }
        }
        return dates.sorted()
    }
}

enum CompanionSharedStore {
    static let appGroup = "group.app.vercel.threebinternational.companion"
    static let widgetKind = "CompanionLockWidget"
    private static let snapshotKey = "threeb_companion_snapshot_v1"

    static var isAvailable: Bool {
        #if os(iOS)
        return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) != nil
        #else
        return false
        #endif
    }

    private static var defaults: UserDefaults? {
        isAvailable ? UserDefaults(suiteName: appGroup) : nil
    }

    static func read() -> CompanionSnapshot? {
        guard let data = defaults?.data(forKey: snapshotKey),
              let decoded = try? JSONDecoder().decode(CompanionSnapshot.self, from: data) else { return nil }
        return CompanionSnapshot(mode: decoded.mode, enabled: decoded.enabled, updatedAt: decoded.updatedAt)
    }

    static func save(_ snapshot: CompanionSnapshot) -> (available: Bool, changed: Bool) {
        guard let defaults else { return (false, false) }
        if let previous = read(), previous.mode == snapshot.mode, previous.enabled == snapshot.enabled,
           snapshot.updatedAt.timeIntervalSince(previous.updatedAt) >= 0,
           snapshot.updatedAt.timeIntervalSince(previous.updatedAt) < 240 {
            return (true, false)
        }
        guard let data = try? JSONEncoder().encode(snapshot) else { return (true, false) }
        defaults.set(data, forKey: snapshotKey)
        return (true, true)
    }
}
