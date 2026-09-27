import Foundation
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
