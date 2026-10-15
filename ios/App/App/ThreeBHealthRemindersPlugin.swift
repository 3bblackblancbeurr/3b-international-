import Foundation
import Capacitor
import UserNotifications

/// Local reminders only: no APNs, remote service or health value on the Lock Screen.
@objc(ThreeBHealthRemindersPlugin)
public class ThreeBHealthRemindersPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ThreeBHealthRemindersPlugin"
    public let jsName = "ThreeBHealthReminders"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAll", returnType: CAPPluginReturnPromise)
    ]

    private let prefix = "threeb.health.reminder."
    private let center = UNUserNotificationCenter.current()
    @MainActor private var operationTask: Task<Void, Never>?

    // Serialize replacements/cancellation so rapid switches cannot resurrect a
    // reminder after the person has cancelled it.
    @MainActor private func enqueue(_ operation: @escaping @MainActor () async -> Void) {
        let previous = operationTask
        operationTask = Task { @MainActor in
            await previous?.value
            await operation()
        }
    }

    private func permission(_ status: UNAuthorizationStatus) -> String {
        switch status {
        case .authorized, .provisional, .ephemeral: return "granted"
        case .denied: return "denied"
        case .notDetermined: return "prompt"
        @unknown default: return "unknown"
        }
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        Task { @MainActor in
            self.enqueue {
                let settings = await self.center.notificationSettings()
                let requests = await self.center.pendingNotificationRequests()
                let owned = requests.filter { $0.identifier.hasPrefix(self.prefix) }
                let reminders: [[String: String]] = owned.compactMap { request in
                    guard let trigger = request.trigger as? UNCalendarNotificationTrigger,
                          let hour = trigger.dateComponents.hour,
                          let minute = trigger.dateComponents.minute else { return nil }
                    return ["id": String(request.identifier.dropFirst(self.prefix.count)),
                            "time": String(format: "%02d:%02d", hour, minute)]
                }.sorted { ($0["id"] ?? "") < ($1["id"] ?? "") }
                call.resolve([
                    "platform": "ios", "available": true,
                    "permission": self.permission(settings.authorizationStatus),
                    "pendingCount": owned.count, "reminders": reminders
                ])
            }
        }
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        Task { @MainActor in
            self.enqueue {
                do {
                    _ = try await self.center.requestAuthorization(options: [.alert, .sound])
                    let settings = await self.center.notificationSettings()
                    call.resolve(["permission": self.permission(settings.authorizationStatus)])
                } catch {
                    call.reject("Impossible de demander les notifications.", "notification_permission_failed")
                }
            }
        }
    }

    @objc func schedule(_ call: CAPPluginCall) {
        guard let input = call.getArray("reminders", JSObject.self), input.count <= 8 else {
            call.reject("Choisis au maximum 8 rappels.", "invalid_reminders"); return
        }
        var identifiers = Set<String>()
        var requests: [UNNotificationRequest] = []
        for item in input {
            guard let id = item["id"] as? String,
                  id.range(of: "^[A-Za-z0-9_-]{1,40}$", options: .regularExpression) != nil,
                  identifiers.insert(id).inserted,
                  let time = item["time"] as? String,
                  time.range(of: "^([01][0-9]|2[0-3]):[0-5][0-9]$", options: .regularExpression) != nil else {
                call.reject("Identifiant ou heure de rappel invalide.", "invalid_reminder"); return
            }
            let components = time.split(separator: ":")
            guard let hour = Int(components[0]), let minute = Int(components[1]) else {
                call.reject("Heure de rappel invalide.", "invalid_reminder"); return
            }
            let content = UNMutableNotificationContent()
            // Deliberately ignore free-form title/body. A Lock Screen must not
            // expose health measurements, routines, diagnoses or journal text.
            content.title = "Ton moment 3B"
            content.body = "Une pause pour toi. Ouvre 3B quand tu le souhaites."
            content.sound = .default
            content.threadIdentifier = "threeb-health"
            var date = DateComponents()
            date.hour = hour
            date.minute = minute
            // No fixed time zone: use the phone's local wall clock, including
            // future travel/daylight-saving changes, not a 24-hour interval.
            let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
            requests.append(UNNotificationRequest(identifier: prefix + id, content: content, trigger: trigger))
        }
        Task { @MainActor in
            self.enqueue {
                let settings = await self.center.notificationSettings()
                guard requests.isEmpty || self.permission(settings.authorizationStatus) == "granted" else {
                    call.reject("Autorise d’abord les notifications dans les réglages.", "notification_permission_required"); return
                }
                let pending = await self.center.pendingNotificationRequests()
                let previous = pending.filter { $0.identifier.hasPrefix(self.prefix) }
                // Other 3B notifications are never removed or overwritten.
                self.center.removePendingNotificationRequests(withIdentifiers: previous.map(\.identifier))
                do {
                    for request in requests { try await self.center.add(request) }
                    call.resolve(["scheduled": true, "count": requests.count])
                } catch {
                    // Do not leave a partially installed plan behind. Restore
                    // the previous plan when possible, and report failure.
                    self.center.removePendingNotificationRequests(withIdentifiers: requests.map(\.identifier))
                    for request in previous { try? await self.center.add(request) }
                    call.reject("Les rappels n’ont pas pu être enregistrés. Vérifie leur état.", "notification_schedule_failed")
                }
            }
        }
    }

    @objc func cancelAll(_ call: CAPPluginCall) {
        Task { @MainActor in
            self.enqueue {
                let pending = await self.center.pendingNotificationRequests()
                self.center.removePendingNotificationRequests(withIdentifiers:
                    pending.filter { $0.identifier.hasPrefix(self.prefix) }.map(\.identifier))
                let delivered = await self.center.deliveredNotifications()
                self.center.removeDeliveredNotifications(withIdentifiers:
                    delivered.filter { $0.request.identifier.hasPrefix(self.prefix) }.map { $0.request.identifier })
                call.resolve(["cancelled": true])
            }
        }
    }
}
