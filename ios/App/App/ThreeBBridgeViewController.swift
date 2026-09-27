import Capacitor

final class ThreeBBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(ThreeBCompanionPlugin())
    }
}
