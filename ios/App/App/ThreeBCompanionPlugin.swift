import Foundation
import Capacitor
import ActivityKit
import WidgetKit
import UIKit

@objc(ThreeBCompanionPlugin)
public class ThreeBCompanionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ThreeBCompanionPlugin"
    public let jsName = "ThreeBCompanion"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startLiveActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateLiveActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endLiveActivity", returnType: CAPPluginReturnPromise)
    ]

    // ActivityKit operations suspend. Chain them so a fast start / stop sequence
    // cannot create a new activity after the user has asked to stop it.
    @MainActor private var operationTask: Task<Void, Never>?
    private let activityIDKey = "threeb_companion_activity_id"

    @MainActor private func enqueue(_ operation: @escaping @MainActor () async -> Void) {
        let previous = operationTask
        operationTask = Task { @MainActor in
            await previous?.value
            await operation()
        }
    }

    @objc func getCapabilities(_ call: CAPPluginCall) {
        Task { @MainActor in
            self.enqueue {
                var enabled = false
                var activityID: String?
                if #available(iOS 16.1, *) {
                    enabled = ActivityAuthorizationInfo().areActivitiesEnabled
                    activityID = self.currentActivity()?.id
                }
                var result: [String: Any] = [
                    "platform": "ios", "inApp": true, "overlay": false,
                    "liveWallpaper": false, "liveActivity": enabled,
                    "liveActivityActive": activityID != nil,
                    "lowPower": ProcessInfo.processInfo.isLowPowerModeEnabled,
                    "reducedMotion": UIAccessibility.isReduceMotionEnabled,
                    "lockWidget": false,
                    "widgetSync": CompanionSharedStore.isAvailable
                ]
                if #available(iOS 16.1, *) { result["lockWidget"] = true }
                if let activityID { result["liveActivityId"] = activityID }
                call.resolve(result)
            }
        }
    }

    @objc func syncWidget(_ call: CAPPluginCall) {
        // Only approved local labels leave the app. Never persist event payloads,
        // identity, reward amounts or free text on a publicly visible Lock Screen.
        let snapshot = CompanionSnapshot(
            mode: call.getString("mode"), enabled: call.getBool("enabled") ?? true
        )
        Task { @MainActor in
            self.enqueue {
                let result = CompanionSharedStore.save(snapshot)
                if result.changed { WidgetCenter.shared.reloadTimelines(ofKind: CompanionSharedStore.widgetKind) }
                call.resolve(["updated": result.available, "changed": result.changed])
            }
        }
    }

    @objc func startLiveActivity(_ call: CAPPluginCall) {
        let snapshot = CompanionSnapshot(mode: call.getString("mode"))
        Task { @MainActor in
            self.enqueue {
                guard #available(iOS 16.1, *) else {
                    call.resolve(["started": false, "reason": "ios_16_1_required"])
                    return
                }
                guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                    call.resolve(["started": false, "reason": "live_activities_disabled"])
                    return
                }
                guard UIApplication.shared.applicationState == .active else {
                    call.resolve(["started": false, "reason": "foreground_required"])
                    return
                }
                let state = self.contentState(snapshot)
                if let activity = self.currentActivity() {
                    // Also clean up duplicates left by older app versions.
                    for other in self.runningActivities() where other.id != activity.id {
                        await self.finish(other)
                    }
                    await self.update(activity, state: state)
                    call.resolve(["started": true, "reused": true, "activityId": activity.id])
                    return
                }
                do {
                    let activity: Activity<CompanionActivityAttributes>
                    if #available(iOS 16.2, *) {
                        activity = try Activity.request(
                            attributes: CompanionActivityAttributes(),
                            content: ActivityContent(state: state, staleDate: state.updatedAt.addingTimeInterval(300)),
                            pushType: nil
                        )
                    } else {
                        activity = try Activity.request(
                            attributes: CompanionActivityAttributes(), contentState: state, pushType: nil
                        )
                    }
                    UserDefaults.standard.set(activity.id, forKey: self.activityIDKey)
                    call.resolve(["started": true, "reused": false, "activityId": activity.id])
                } catch {
                    call.reject("Impossible de démarrer la Live Activity 3B", "live_activity_start_failed", error)
                }
            }
        }
    }

    @objc func updateLiveActivity(_ call: CAPPluginCall) {
        let snapshot = CompanionSnapshot(mode: call.getString("mode"))
        Task { @MainActor in
            self.enqueue {
                guard #available(iOS 16.1, *), let activity = self.currentActivity() else {
                    call.resolve(["updated": false, "reason": "no_live_activity"])
                    return
                }
                await self.update(activity, state: self.contentState(snapshot))
                call.resolve(["updated": true, "activityId": activity.id])
            }
        }
    }

    @objc func endLiveActivity(_ call: CAPPluginCall) {
        Task { @MainActor in
            self.enqueue {
                guard #available(iOS 16.1, *) else {
                    call.resolve(["ended": false, "reason": "ios_16_1_required"])
                    return
                }
                // Include ended activities still on the Lock Screen to dismiss them.
                for activity in Activity<CompanionActivityAttributes>.activities {
                    await self.finish(activity)
                }
                UserDefaults.standard.removeObject(forKey: self.activityIDKey)
                call.resolve(["ended": true])
            }
        }
    }

    @available(iOS 16.1, *)
    @MainActor private func runningActivities() -> [Activity<CompanionActivityAttributes>] {
        Activity<CompanionActivityAttributes>.activities.filter {
            if $0.activityState == .active { return true }
            if #available(iOS 16.2, *) { return $0.activityState == .stale }
            return false
        }.sorted { $0.id < $1.id }
    }

    @available(iOS 16.1, *)
    @MainActor private func currentActivity() -> Activity<CompanionActivityAttributes>? {
        let activities = runningActivities()
        let savedID = UserDefaults.standard.string(forKey: activityIDKey)
        let activity = activities.first(where: { $0.id == savedID }) ?? activities.first
        if let activity {
            UserDefaults.standard.set(activity.id, forKey: activityIDKey)
        } else {
            UserDefaults.standard.removeObject(forKey: activityIDKey)
        }
        return activity
    }

    @available(iOS 16.1, *)
    private func contentState(_ snapshot: CompanionSnapshot) -> CompanionActivityAttributes.ContentState {
        .init(mode: snapshot.mode, message: snapshot.message, updatedAt: Date())
    }

    @available(iOS 16.1, *)
    @MainActor private func update(_ activity: Activity<CompanionActivityAttributes>, state: CompanionActivityAttributes.ContentState) async {
        let previous: CompanionActivityAttributes.ContentState
        if #available(iOS 16.2, *) { previous = activity.content.state }
        else { previous = activity.contentState }
        // Do not consume an update for identical content while it is still fresh.
        guard previous.mode != state.mode || previous.message != state.message ||
                state.updatedAt.timeIntervalSince(previous.updatedAt) >= 240 else { return }
        if #available(iOS 16.2, *) {
            await activity.update(ActivityContent(state: state, staleDate: state.updatedAt.addingTimeInterval(300)))
        } else {
            await activity.update(using: state)
        }
    }

    @available(iOS 16.1, *)
    @MainActor private func finish(_ activity: Activity<CompanionActivityAttributes>) async {
        let state = CompanionActivityAttributes.ContentState(mode: "sleep", message: "À bientôt", updatedAt: Date())
        if #available(iOS 16.2, *) {
            await activity.end(ActivityContent(state: state, staleDate: nil), dismissalPolicy: .immediate)
        } else {
            await activity.end(using: state, dismissalPolicy: .immediate)
        }
    }
}
