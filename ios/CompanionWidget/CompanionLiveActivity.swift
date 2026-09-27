import ActivityKit
import WidgetKit
import SwiftUI

struct CompanionLiveActivity: Widget {
    private func mode(_ context: ActivityViewContext<CompanionActivityAttributes>) -> String {
        context.isStale ? "idle" : CompanionSnapshot(mode: context.state.mode).mode
    }

    private func message(_ context: ActivityViewContext<CompanionActivityAttributes>) -> String {
        context.isStale ? "Ouvrez 3B pour actualiser" : CompanionSnapshot.label(for: mode(context))
    }

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CompanionActivityAttributes.self) { context in
            HStack(spacing: 12) {
                CompanionArtwork(mode: mode(context), compact: true).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 3) {
                    Text("COMPAGNON 3B")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color(red: 0.91, green: 0.74, blue: 0.39))
                    Text(message(context))
                        .font(.callout)
                        .foregroundStyle(.white)
                        .lineLimit(2)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .accessibilityElement(children: .combine)
            .activityBackgroundTint(Color.black.opacity(0.92))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    CompanionArtwork(mode: mode(context), compact: true)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("3B")
                        .font(.headline.bold())
                        .foregroundStyle(Color(red: 0.91, green: 0.74, blue: 0.39))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(message(context))
                        .font(.callout)
                        .lineLimit(2)
                        .padding(.bottom, 4)
                }
            } compactLeading: {
                CompanionArtwork(mode: mode(context), compact: true)
            } compactTrailing: {
                Text("3B")
                    .font(.caption2.bold())
                    .foregroundStyle(Color(red: 0.91, green: 0.74, blue: 0.39))
            } minimal: {
                CompanionArtwork(mode: mode(context), compact: true)
            }
            .keylineTint(Color(red: 0.16, green: 0.66, blue: 1.0))
        }
    }
}
