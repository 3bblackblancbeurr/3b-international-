import ActivityKit
import WidgetKit
import SwiftUI

struct CompanionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CompanionActivityAttributes.self) { context in
            HStack(spacing: 12) {
                CompanionArtwork(mode: context.state.mode, compact: true)
                VStack(alignment: .leading, spacing: 2) {
                    Text("3B COMPANION")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color(red: 0.91, green: 0.74, blue: 0.39))
                    Text(context.state.message)
                        .font(.caption)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .activityBackgroundTint(Color.black.opacity(0.92))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    CompanionArtwork(mode: context.state.mode, compact: true)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.message)
                        .font(.caption.weight(.semibold))
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("3B")
                        .font(.caption.bold())
                        .foregroundStyle(Color(red: 0.91, green: 0.74, blue: 0.39))
                }
            } compactLeading: {
                CompanionArtwork(mode: context.state.mode, compact: true)
            } compactTrailing: {
                Text("3B")
                    .font(.caption2.bold())
                    .foregroundStyle(Color(red: 0.91, green: 0.74, blue: 0.39))
            } minimal: {
                CompanionArtwork(mode: context.state.mode, compact: true)
            }
            .keylineTint(Color(red: 0.16, green: 0.66, blue: 1.0))
        }
    }
}
