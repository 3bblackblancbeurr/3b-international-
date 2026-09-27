import WidgetKit
import SwiftUI

struct CompanionEntry: TimelineEntry {
    let date: Date
    let snapshot: CompanionSnapshot
}

struct CompanionProvider: TimelineProvider {
    func placeholder(in context: Context) -> CompanionEntry {
        CompanionEntry(date: Date(), snapshot: CompanionSnapshot(mode: "idle"))
    }

    private func currentSnapshot() -> CompanionSnapshot {
        CompanionSharedStore.read() ?? CompanionSnapshot(mode: "idle", updatedAt: .distantPast)
    }

    func getSnapshot(in context: Context, completion: @escaping (CompanionEntry) -> Void) {
        let now = Date()
        let snapshot = context.isPreview ? CompanionSnapshot(mode: "idle") : currentSnapshot().presentation(at: now)
        completion(CompanionEntry(date: now, snapshot: snapshot))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CompanionEntry>) -> Void) {
        let now = Date()
        let snapshot = currentSnapshot()
        let entries = snapshot.timelineDates(from: now).map {
            CompanionEntry(date: $0, snapshot: snapshot.presentation(at: $0))
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

private struct CompanionWidgetView: View {
    let entry: CompanionEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetRenderingMode) private var renderingMode

    @ViewBuilder private var content: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                CompanionArtwork(mode: entry.snapshot.mode, compact: true)
            }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                CompanionArtwork(mode: entry.snapshot.mode, compact: true).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Compagnon 3B").font(.headline)
                    Text(entry.snapshot.message).font(.caption).lineLimit(2)
                }
            }
        default:
            VStack(spacing: 3) {
                CompanionArtwork(mode: entry.snapshot.mode).accessibilityHidden(true)
                Text("Compagnon 3B").font(.caption.weight(.bold))
                Text(entry.snapshot.message).font(.caption2).lineLimit(2).multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .foregroundStyle(renderingMode == .fullColor ? Color.white : Color.primary)
        }
    }

    var body: some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) {
                Color(red: 0.04, green: 0.06, blue: 0.09)
            }
            .accessibilityElement(children: .combine)
        } else {
            content.padding(family == .systemSmall ? 8 : 0)
                .background(family == .systemSmall ? Color(red: 0.04, green: 0.06, blue: 0.09) : Color.clear)
                .accessibilityElement(children: .combine)
        }
    }
}

struct CompanionLockWidget: Widget {
    let kind = CompanionSharedStore.widgetKind

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CompanionProvider()) { entry in
            CompanionWidgetView(entry: entry)
        }
        .configurationDisplayName("Compagnon 3B")
        .description("Votre petit gardien suit le rythme de la journée et vos moments 3B.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .systemSmall])
    }
}
