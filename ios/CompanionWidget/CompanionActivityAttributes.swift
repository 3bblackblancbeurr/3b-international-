import Foundation
import ActivityKit

struct CompanionActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var mode: String
        var message: String
        var updatedAt: Date
    }

    var companionId: String = "3b-universal"
}
