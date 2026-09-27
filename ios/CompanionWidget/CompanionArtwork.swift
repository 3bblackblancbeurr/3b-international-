import SwiftUI
import WidgetKit

// The same white helmet, black suit, gold trim, blue eyes and 3B medallion
// as the in-app companion, drawn as vectors at the size of each system surface.
struct CompanionArtwork: View {
    var mode: String
    var compact: Bool = false
    @Environment(\.isLuminanceReduced) private var isLuminanceReduced
    @Environment(\.widgetRenderingMode) private var renderingMode

    private var gold: Color {
        renderingMode == .fullColor ? Color(red: 0.91, green: 0.74, blue: 0.39) : .primary
    }
    private var eyeColor: Color {
        renderingMode != .fullColor ? .primary :
            (mode == "secret" ? gold : Color(red: 0.16, green: 0.66, blue: 1.0))
    }
    private var badge: String? {
        ["reward": "gift.fill", "guardian": "shield.fill", "support": "heart.fill",
         "celebrate": "sparkle", "notification": "exclamationmark",
         "secret": "questionmark", "clock": "clock", "wake": "sun.max.fill", "sleep": "zzz"][mode]
    }

    var body: some View {
        let width: CGFloat = compact ? 30 : 88
        let height = width * 1.16
        ZStack {
            // Cape, body, arms and boots keep the silhouette recognizable.
            Path { path in
                path.move(to: CGPoint(x: 73, y: 59))
                path.addQuadCurve(to: CGPoint(x: 94, y: 88), control: CGPoint(x: 91, y: 66))
                path.addLine(to: CGPoint(x: 69, y: 83))
                path.closeSubpath()
            }.fill(Color.black).overlay(
                Path { path in
                    path.move(to: CGPoint(x: 74, y: 60))
                    path.addQuadCurve(to: CGPoint(x: 94, y: 88), control: CGPoint(x: 91, y: 66))
                }.stroke(gold, lineWidth: 1.5)
            )
            RoundedRectangle(cornerRadius: 15).fill(Color(white: 0.04))
                .overlay(RoundedRectangle(cornerRadius: 15).stroke(gold, lineWidth: 1.5))
                .frame(width: 48, height: 43).position(x: 51, y: 80)
            Capsule().fill(.white).frame(width: 11, height: 25)
                .rotationEffect(.degrees(16)).position(x: 25, y: 78)
            Capsule().fill(.white).frame(width: 11, height: 25)
                .rotationEffect(.degrees(-16)).position(x: 77, y: 78)
            ForEach([37.0, 65.0], id: \.self) { x in
                RoundedRectangle(cornerRadius: 4).fill(Color(white: 0.04))
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(.white, lineWidth: 2))
                    .frame(width: 21, height: 11).position(x: x, y: 106)
            }
            Circle().fill(Color.black).overlay(Circle().stroke(gold, lineWidth: 1.5))
                .frame(width: 16, height: 16).position(x: 51, y: 77)
            Text("3B").font(.system(size: 7, weight: .black, design: .rounded))
                .foregroundStyle(gold).position(x: 51, y: 77)

            RoundedRectangle(cornerRadius: 25)
                .fill(LinearGradient(colors: [.white, Color(white: 0.70)], startPoint: .topLeading, endPoint: .bottomTrailing))
                .overlay(RoundedRectangle(cornerRadius: 25).stroke(gold, lineWidth: 1.8))
                .frame(width: 65, height: 52).position(x: 51, y: 39)
            RoundedRectangle(cornerRadius: 21)
                .fill(LinearGradient(colors: [Color(red: 0.11, green: 0.16, blue: 0.22), .black], startPoint: .topLeading, endPoint: .bottomTrailing))
                .frame(width: 53, height: 40).position(x: 51, y: 39)
            ForEach([20.0, 82.0], id: \.self) { x in
                Circle().fill(Color.black).overlay(Circle().stroke(gold, lineWidth: 1.5))
                    .frame(width: 14, height: 14).position(x: x, y: 43)
                Circle().stroke(eyeColor, lineWidth: 1.5)
                    .frame(width: 7, height: 7).position(x: x, y: 43)
            }
            HStack(spacing: 9) {
                Capsule().fill(eyeColor).frame(width: 12, height: mode == "sleep" ? 1.5 : 6)
                Capsule().fill(eyeColor).frame(width: 12, height: mode == "sleep" ? 1.5 : 6)
            }
            .shadow(color: isLuminanceReduced ? .clear : eyeColor.opacity(0.5), radius: 2)
            .position(x: 51, y: 40)
            Ellipse().stroke(gold, lineWidth: 1.8).frame(width: 26, height: 8)
                .rotationEffect(.degrees(-12)).position(x: 62, y: 8)
            if !compact, let badge {
                Image(systemName: badge).font(.system(size: 12, weight: .bold))
                    .foregroundStyle(eyeColor).position(x: 88, y: 18)
            }
        }
        .frame(width: 100, height: 116)
        .scaleEffect(width / 100, anchor: .topLeading)
        .frame(width: width, height: height, alignment: .topLeading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Compagnon 3B")
        .accessibilityValue(CompanionSnapshot.label(for: mode))
    }
}
