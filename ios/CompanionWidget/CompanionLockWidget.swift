import WidgetKit
import SwiftUI

struct CompanionEntry: TimelineEntry {
    let date: Date
    let mode: String
}

struct CompanionProvider: TimelineProvider {
    func placeholder(in context: Context) -> CompanionEntry {
        CompanionEntry(date: Date(), mode: "idle")
    }

    func getSnapshot(in context: Context, completion: @escaping (CompanionEntry) -> Void) {
        completion(CompanionEntry(date: Date(), mode: mode(for: Date())))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CompanionEntry>) -> Void) {
        let now = Date()
        let entry = CompanionEntry(date: now, mode: mode(for: now))
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now.addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func mode(for date: Date) -> String {
        let hour = Calendar.current.component(.hour, from: date)
        return (hour >= 1 && hour < 6) ? "sleep" : "idle"
    }
}

struct CompanionLockWidget: Widget {
    let kind = "CompanionLockWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CompanionProvider()) { entry in
            ZStack {
                Color.clear
                CompanionArtwork(mode: entry.mode, compact: true)
            }
        }
        .configurationDisplayName("Compagnon 3B")
        .description("Le petit gardien 3B, identique pour toute la communauté.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .systemSmall])
    }
}
