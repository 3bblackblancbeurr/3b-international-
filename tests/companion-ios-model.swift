import Foundation

@main
struct CompanionModelChecks {
    static func main() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Paris")!
        let formatter = ISO8601DateFormatter()
        func date(_ value: String) -> Date { formatter.date(from: value)! }
        let now = date("2026-09-27T12:00:00+02:00")

        precondition(CompanionSnapshot(mode: nil).mode == "idle")
        precondition(CompanionSnapshot(mode: "admin<secret>").mode == "idle")
        precondition(CompanionSnapshot(mode: "SLEEP").mode == "idle")
        for mode in CompanionSnapshot.modes {
            precondition(CompanionSnapshot(mode: mode).mode == mode)
            precondition(!CompanionSnapshot.label(for: mode).isEmpty)
        }

        let reward = CompanionSnapshot(mode: "reward", updatedAt: now)
        precondition(reward.presentation(at: now.addingTimeInterval(299), calendar: calendar).mode == "reward")
        precondition(reward.presentation(at: now.addingTimeInterval(300), calendar: calendar).mode == "idle")
        // Clock rollback or forged future storage must not pin an old event indefinitely.
        precondition(reward.presentation(at: now.addingTimeInterval(-120), calendar: calendar).mode != "reward")
        let paused = CompanionSnapshot(mode: "secret", enabled: false, updatedAt: now)
        let pausedTomorrow = paused.presentation(at: now.addingTimeInterval(86400), calendar: calendar)
        precondition(pausedTomorrow.mode == "sleep" && !pausedTomorrow.enabled)
        precondition(pausedTomorrow.message == "Compagnon en pause")

        let clockCases = [
            ("2026-09-27T00:59:00+02:00", "clock"),
            ("2026-09-27T01:00:00+02:00", "sleep"),
            ("2026-09-27T05:59:00+02:00", "sleep"),
            ("2026-09-27T06:00:00+02:00", "wake"),
            ("2026-09-27T06:19:00+02:00", "wake"),
            ("2026-09-27T06:20:00+02:00", "idle"),
            ("2026-09-27T12:02:00+02:00", "clock"),
            ("2026-09-27T12:03:00+02:00", "idle"),
            ("2026-09-27T12:58:00+02:00", "clock")
        ]
        for (value, expected) in clockCases {
            precondition(CompanionSnapshot.timeMode(at: date(value), calendar: calendar) == expected, value)
        }

        let encoded = try JSONEncoder().encode(reward)
        let object = try JSONSerialization.jsonObject(with: encoded) as! [String: Any]
        precondition(Set(object.keys) == ["mode", "enabled", "updatedAt"])
        precondition(!String(data: encoded, encoding: .utf8)!.contains("message"))
        let decoded = try JSONDecoder().decode(CompanionSnapshot.self, from: encoded)
        precondition(decoded == reward)

        // DST changes must never produce duplicate/non-progressing widget entries.
        for start in [now, date("2026-10-25T00:45:00+02:00"), date("2026-03-29T00:45:00+01:00")] {
            let snapshot = CompanionSnapshot(mode: "celebrate", updatedAt: start)
            let dates = snapshot.timelineDates(from: start, calendar: calendar)
            precondition(dates.first == start && dates.count < 40)
            precondition(dates.contains(start.addingTimeInterval(300)))
            for pair in zip(dates, dates.dropFirst()) { precondition(pair.0 < pair.1) }
            precondition(dates.last! <= start.addingTimeInterval(25200))
        }
        print("Companion iOS model: normalization, privacy, expiry, pause, calendar and DST checks passed.")
    }
}
