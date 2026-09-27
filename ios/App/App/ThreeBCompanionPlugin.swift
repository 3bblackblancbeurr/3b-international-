import Foundation
import Capacitor
import ActivityKit

@objc(ThreeBCompanionPlugin)
public class ThreeBCompanionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ThreeBCompanionPlugin"
    public let jsName = "ThreeBCompanion"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startLiveActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateLiveActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endLiveActivity", returnType: CAPPluginReturnPromise)
    ]

    @objc func getCapabilities(_ call: CAPPluginCall) {
        var enabled = false
        if #available(iOS 16.1, *) {
            enabled = ActivityAuthorizationInfo().areActivitiesEnabled
        }
        call.resolve([
            "platform": "ios",
            "inApp": true,
            "overlay": false,
            "liveWallpaper": false,
            "liveActivity": enabled,
            "lockWidget": true
        ])
    }

    @objc func startLiveActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve(["started": false, "reason": "ios_16_1_required"])
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["started": false, "reason": "live_activities_disabled"])
            return
        }

        let mode = call.getString("mode") ?? "idle"
        let message = call.getString("message") ?? "Toujours avec vous"
        let state = CompanionActivityAttributes.ContentState(
            mode: mode,
            message: message,
            updatedAt: Date()
        )

        do {
            let activity = try Activity<CompanionActivityAttributes>.request(
                attributes: CompanionActivityAttributes(),
                contentState: state,
                pushType: nil
            )
            UserDefaults.standard.set(activity.id, forKey: "threeb_companion_activity_id")
            call.resolve(["started": true, "activityId": activity.id])
        } catch {
            call.reject("Impossible de démarrer la Live Activity 3B", nil, error)
        }
    }

    @objc func updateLiveActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve(["updated": false])
            return
        }
        let mode = call.getString("mode") ?? "idle"
        let message = call.getString("message") ?? "Toujours avec vous"
        let targetId = UserDefaults.standard.string(forKey: "threeb_companion_activity_id")
        guard let activity = Activity<CompanionActivityAttributes>.activities.first(where: { targetId == nil || $0.id == targetId }) else {
            call.resolve(["updated": false, "reason": "no_live_activity"])
            return
        }
        let state = CompanionActivityAttributes.ContentState(mode: mode, message: message, updatedAt: Date())
        Task {
            await activity.update(using: state)
            call.resolve(["updated": true])
        }
    }

    @objc func endLiveActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve(["ended": false])
            return
        }
        let activities = Activity<CompanionActivityAttributes>.activities
        Task {
            for activity in activities {
                let state = CompanionActivityAttributes.ContentState(
                    mode: "sleep",
                    message: "À bientôt",
                    updatedAt: Date()
                )
                await activity.end(using: state, dismissalPolicy: .immediate)
            }
            UserDefaults.standard.removeObject(forKey: "threeb_companion_activity_id")
            call.resolve(["ended": true])
        }
    }
}
