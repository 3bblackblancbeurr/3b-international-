import WidgetKit
import SwiftUI

@main
struct CompanionWidgetBundle: WidgetBundle {
    var body: some Widget {
        CompanionLockWidget()
        CompanionLiveActivity()
    }
}
