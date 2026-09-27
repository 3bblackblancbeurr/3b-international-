import SwiftUI

struct CompanionArtwork: View {
    var mode: String
    var compact: Bool = false

    private var eyeColor: Color {
        mode == "secret" ? Color(red: 0.96, green: 0.78, blue: 0.37) : Color(red: 0.16, green: 0.66, blue: 1.0)
    }

    var body: some View {
        ZStack {
            Ellipse()
                .fill(Color.black.opacity(0.35))
                .frame(width: compact ? 28 : 56, height: compact ? 7 : 13)
                .offset(y: compact ? 16 : 34)

            Circle()
                .stroke(
                    LinearGradient(
                        colors: [.white.opacity(0.95), Color(red: 0.91, green: 0.74, blue: 0.39), .white.opacity(0.6)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: compact ? 2 : 3
                )
                .frame(width: compact ? 34 : 68, height: compact ? 34 : 68)

            RoundedRectangle(cornerRadius: compact ? 12 : 24)
                .fill(
                    RadialGradient(
                        colors: [Color(red: 0.11, green: 0.16, blue: 0.22), .black],
                        center: .topLeading,
                        startRadius: 1,
                        endRadius: compact ? 22 : 44
                    )
                )
                .frame(width: compact ? 28 : 56, height: compact ? 23 : 46)

            HStack(spacing: compact ? 4 : 7) {
                Capsule().fill(eyeColor).frame(width: compact ? 6 : 12, height: mode == "sleep" ? 1 : (compact ? 4 : 7))
                Capsule().fill(eyeColor).frame(width: compact ? 6 : 12, height: mode == "sleep" ? 1 : (compact ? 4 : 7))
            }
            .shadow(color: eyeColor.opacity(0.7), radius: compact ? 2 : 5)

            if !compact {
                Text("3B")
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 0.91, green: 0.74, blue: 0.39))
                    .offset(y: 24)
            }
        }
        .accessibilityLabel("Compagnon 3B")
    }
}
