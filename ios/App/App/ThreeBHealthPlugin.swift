import Foundation
import CoreFoundation
import Capacitor
import HealthKit
import UIKit

/// A read-only, on-demand bridge. HealthKit never reveals read authorization.
@objc(ThreeBHealthPlugin)
public class ThreeBHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ThreeBHealthPlugin"
    public let jsName = "ThreeBHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestStepsPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readSteps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise)
    ]

    private lazy var store = HKHealthStore()
    private let enabledKey = "threeb_health_read_enabled"
    // The main queue owns all mutable state. Only the integration preference is
    // retained; no health samples, totals or permission decisions are persisted.
    private var generation = 0
    private var authorizationPending = false
    private var reads: [UUID: (query: HKStatisticsCollectionQuery, call: CAPPluginCall)] = [:]

    private var stepsType: HKQuantityType? { HKQuantityType.quantityType(forIdentifier: .stepCount) }

    private func unavailableReason() -> String? {
        #if targetEnvironment(simulator)
        return "simulator"
        #else
        guard HKHealthStore.isHealthDataAvailable(), stepsType != nil else { return "health_unavailable" }
        guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSHealthShareUsageDescription") as? String,
              !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return "health_configuration" }
        return nil
        #endif
    }

    /// This does not prompt and is not a check of read permission. It lets a
    /// missing capability / inaccessible store fail through HealthKit's NSError.
    private func preflight(_ completion: @escaping (String?) -> Void) {
        if let reason = unavailableReason() { completion(reason); return }
        guard let type = stepsType else { completion("health_unavailable"); return }
        store.getRequestStatusForAuthorization(toShare: [], read: [type]) { _, error in
            DispatchQueue.main.async { completion(error == nil ? nil : "health_configuration_or_unavailable") }
        }
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.preflight { reason in
                var result: [String: Any] = [
                    "platform": "ios", "available": reason == nil,
                    "status": reason == nil ? "available" : "unavailable",
                    "permission": "unknown", "source": "apple-health"
                ]
                if let reason { result["reason"] = reason }
                call.resolve(result)
            }
        }
    }

    @objc func requestStepsPermission(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard !self.authorizationPending else {
                call.reject("Une demande est déjà en cours.", "health_busy"); return
            }
            guard UIApplication.shared.applicationState == .active else {
                call.reject("Ouvre 3B pour choisir l’accès à Apple Santé.", "foreground_required"); return
            }
            self.authorizationPending = true
            let generation = self.generation
            self.preflight { reason in
                guard generation == self.generation else {
                    self.authorizationPending = false
                    call.reject("Connexion annulée.", "health_cancelled"); return
                }
                guard reason == nil, let type = self.stepsType else {
                    self.authorizationPending = false
                    call.reject("Apple Santé n’est pas disponible dans cette installation.", reason ?? "health_unavailable"); return
                }
                self.store.requestAuthorization(toShare: [], read: [type]) { completed, error in
                    DispatchQueue.main.async {
                        self.authorizationPending = false
                        guard generation == self.generation else {
                            call.reject("Connexion annulée.", "health_cancelled"); return
                        }
                        guard completed, error == nil else {
                            call.reject("La demande Apple Santé n’a pas pu être terminée.", "health_authorization_failed"); return
                        }
                        // Success means only that the permission sheet completed.
                        // Denied read access looks exactly like an empty store.
                        UserDefaults.standard.set(true, forKey: self.enabledKey)
                        call.resolve(["permission": "unknown"])
                    }
                }
            }
        }
    }

    @objc func readSteps(_ call: CAPPluginCall) {
        guard let number = call.getValue("days") as? NSNumber,
              CFGetTypeID(number) != CFBooleanGetTypeID(),
              number.doubleValue.isFinite,
              number.doubleValue.rounded() == number.doubleValue,
              (1.0...30.0).contains(number.doubleValue) else {
            call.reject("Choisis entre 1 et 30 jours.", "invalid_days"); return
        }
        let dayCount = number.intValue
        DispatchQueue.main.async {
            guard UserDefaults.standard.bool(forKey: self.enabledKey) else {
                call.reject("Choisis d’abord de connecter Apple Santé.", "health_not_connected"); return
            }
            let generation = self.generation
            self.preflight { reason in
                guard generation == self.generation,
                      UserDefaults.standard.bool(forKey: self.enabledKey) else {
                    call.reject("Connexion annulée.", "health_cancelled"); return
                }
                guard reason == nil, let type = self.stepsType else {
                    call.reject("Apple Santé n’est pas disponible dans cette installation.", reason ?? "health_unavailable"); return
                }
                var calendar = Calendar(identifier: .gregorian)
                calendar.timeZone = .current
                let now = Date()
                let today = calendar.startOfDay(for: now)
                guard let start = calendar.date(byAdding: .day, value: 1 - dayCount, to: today) else {
                    call.reject("Période invalide.", "invalid_date_range"); return
                }
                // Let HealthKit aggregate and deduplicate sources. Never add
                // iPhone and Watch sample totals, or use separateBySource here.
                let predicate = HKQuery.predicateForSamples(withStart: start, end: now, options: [])
                let query = HKStatisticsCollectionQuery(
                    quantityType: type, quantitySamplePredicate: predicate,
                    options: .cumulativeSum, anchorDate: today,
                    intervalComponents: DateComponents(day: 1)
                )
                let id = UUID()
                self.reads[id] = (query, call)
                query.initialResultsHandler = { [weak self] completedQuery, collection, error in
                    guard let self else { return }
                    DispatchQueue.main.async {
                        guard self.reads.removeValue(forKey: id) != nil else { return }
                        completedQuery.initialResultsHandler = nil
                        self.store.stop(completedQuery)
                        guard generation == self.generation else {
                            call.reject("Connexion annulée.", "health_cancelled"); return
                        }
                        guard error == nil else {
                            call.reject("Impossible de lire Apple Santé pour le moment.", "health_read_failed"); return
                        }
                        let formatter = DateFormatter()
                        formatter.calendar = calendar
                        formatter.locale = Locale(identifier: "en_US_POSIX")
                        formatter.timeZone = calendar.timeZone
                        formatter.dateFormat = "yyyy-MM-dd"
                        var days: [[String: Any]] = []
                        for offset in 0..<dayCount {
                            guard let day = calendar.date(byAdding: .day, value: offset, to: start) else { continue }
                            var row: [String: Any] = ["date": formatter.string(from: day), "steps": NSNull()]
                            if let quantity = collection?.statistics(for: day)?.sumQuantity() {
                                let value = quantity.doubleValue(for: .count())
                                if value.isFinite, value >= 0, value < Double(Int.max) {
                                    row["steps"] = value.rounded()
                                }
                            }
                            // No samples / denied / limited access stays null,
                            // never an invented zero or a claim of permission.
                            days.append(row)
                        }
                        call.resolve([
                            "source": "apple-health", "syncedAt": ISO8601DateFormatter().string(from: Date()),
                            "days": days
                        ])
                    }
                }
                self.store.execute(query)
                DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
                    guard let pending = self.reads.removeValue(forKey: id) else { return }
                    pending.query.initialResultsHandler = nil
                    self.store.stop(pending.query)
                    pending.call.reject("Apple Santé met trop de temps à répondre. Réessaie.", "health_timeout")
                }
            }
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.resolve(["opened": false]); return
            }
            UIApplication.shared.open(url, options: [:]) { opened in
                call.resolve(["opened": opened, "destination": "app-settings"])
            }
        }
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.generation += 1
            UserDefaults.standard.removeObject(forKey: self.enabledKey)
            let pendingReads = self.reads
            self.reads.removeAll()
            for (_, pending) in pendingReads {
                pending.query.initialResultsHandler = nil
                self.store.stop(pending.query)
                pending.call.reject("Connexion annulée.", "health_cancelled")
            }
            // Only the person can revoke HealthKit access in Health / Settings.
            call.resolve(["disconnected": true, "revoked": false])
        }
    }
}
