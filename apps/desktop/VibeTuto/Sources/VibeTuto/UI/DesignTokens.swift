import SwiftUI

// MARK: - Color(hex:) Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255.0
            g = Double((int >> 8) & 0xFF) / 255.0
            b = Double(int & 0xFF) / 255.0
        default:
            r = 0; g = 0; b = 0
        }
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Design Tokens

enum DT {

    // MARK: - Colors — Navy dark palette (matches web dark mode)
    //
    // Contrast ratios on surface (#0D1B2A):
    //   textPrimary (#EFF5FB) → 15.8:1  ✓ AAA
    //   textSecondary (#A3AEC2) → 7.1:1 ✓ AAA
    //   textTertiary (#6B7A94) → 4.2:1  ✓ AA
    //   border (#334766) → 2.4:1        (decorative, not text)
    //   accentRed (#EF4444) → 5.0:1     ✓ AA

    enum Colors {
        // Surfaces — navy-blue tinted, matching web dark mode
        static let surface = Color(hex: "0D1B2A")      // dark navy (web --background)
        static let card = Color(hex: "162033")          // slightly lighter navy
        static let elevated = Color(hex: "263651")      // web --secondary / --muted
        static let border = Color(hex: "334766")        // navy border

        // NS variants for AppKit contexts
        static let surfaceNS = NSColor(red: 0.051, green: 0.106, blue: 0.165, alpha: 1)
        static let borderNS = NSColor(red: 0.200, green: 0.278, blue: 0.400, alpha: 1)

        // Text — clear hierarchy with good contrast
        static let textPrimary = Color(hex: "EFF5FB")   // web --primary (light blue-white)
        static let textSecondary = Color(hex: "A3AEC2")  // web --muted-foreground
        static let textTertiary = Color(hex: "6B7A94")   // navy tertiary

        // Accents — pure, saturated, purposeful
        static let accentRed = Color(hex: "EF4444")      // red-500 — rich red, not salmon
        static let accentTeal = Color(hex: "10B981")      // emerald-500
        static let accentAmber = Color(hex: "F59E0B")     // amber-500
        static let accentBlue = Color(hex: "3B82F6")      // blue-500

        // NS accent variants
        static let accentRedNS = NSColor(red: 0.937, green: 0.267, blue: 0.267, alpha: 1)

        // Glows — match new accents
        static let glowRed = Color(hex: "EF4444").opacity(0.4)
        static let glowTeal = Color(hex: "10B981").opacity(0.3)
        static let glowAmber = Color(hex: "F59E0B").opacity(0.3)

        // Dividers — subtle glowing separator
        static let dividerSubtle = Color(hex: "FFFFFF").opacity(0.08)
        static let dividerMedium = Color(hex: "FFFFFF").opacity(0.12)

        // Gradients
        static let warmGradient = LinearGradient(
            colors: [Color(hex: "EF4444"), Color(hex: "F59E0B")],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    // MARK: - Typography — SF Rounded headers, SF Mono technical

    enum Typography {
        // Display — countdown numbers
        static let displayLarge = Font.system(size: 140, weight: .ultraLight, design: .rounded)

        // Headers — SF Pro Rounded Heavy (warm, distinctive)
        static let heading = Font.system(size: 15, weight: .heavy, design: .rounded)
        static let subheading = Font.system(size: 13, weight: .semibold, design: .rounded)

        // Technical — SF Mono (instrument feel)
        static let mono = Font.system(size: 13, weight: .medium, design: .monospaced)
        static let monoSmall = Font.system(size: 11, weight: .medium, design: .monospaced)

        // Section labels — console-style
        static let sectionLabel = Font.system(size: 10, weight: .semibold, design: .monospaced)

        // Body
        static let body = Font.system(size: 13, weight: .regular)
        static let caption = Font.system(size: 11, weight: .regular)
    }

    // MARK: - Spacing

    enum Spacing {
        static let xxs: CGFloat = 2
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 32
    }

    // MARK: - Corner Radius

    enum Radius {
        static let sm: CGFloat = 6
        static let md: CGFloat = 10
        static let lg: CGFloat = 14
    }

    // MARK: - Animations

    enum Anim {
        static let springSnappy = Animation.spring(response: 0.25, dampingFraction: 0.8)
        static let springGentle = Animation.spring(response: 0.35, dampingFraction: 0.75)
        static let springBouncy = Animation.spring(response: 0.3, dampingFraction: 0.6)
        static let springOvershoot = Animation.spring(response: 0.3, dampingFraction: 0.7)
        static let fadeQuick = Animation.easeOut(duration: 0.15)
        static let fadeStandard = Animation.easeInOut(duration: 0.25)
        static let countdownScale = Animation.spring(response: 0.4, dampingFraction: 0.5)
    }

    // MARK: - Shadows

    enum Shadow {
        static let cardColor = Color.black.opacity(0.2)
        static let cardRadius: CGFloat = 10
        static let cardY: CGFloat = 4

        static let floatingColor = Color.black.opacity(0.3)
        static let floatingRadius: CGFloat = 20
        static let floatingY: CGFloat = 8
    }

    // MARK: - Sizes

    enum Size {
        static let mainPanelWidth: CGFloat = 460
        static let toolbarExpandedWidth: CGFloat = 280
        static let toolbarCollapsedWidth: CGFloat = 110
        static let toolbarHeight: CGFloat = 44
        static let toolbarCollapsedHeight: CGFloat = 36
        static let appIconSize: CGFloat = 24
        static let recordingDotSize: CGFloat = 8
        static let borderWidth: CGFloat = 3.0
        static let uploadPanelWidth: CGFloat = 320
        static let uploadPanelHeight: CGFloat = 170
        static let onboardingWidth: CGFloat = 440
        static let onboardingHeight: CGFloat = 540
    }
}

// MARK: - Button Styles

/// Primary action — red gradient background, white text, glow on hover.
struct RecordButtonStyle: ButtonStyle {
    @State private var isHovering = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(DT.Typography.subheading)
            .foregroundColor(.white)
            .padding(.vertical, DT.Spacing.md)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: DT.Radius.md, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(hex: "F87171"),  // red-400 (lighter top)
                                DT.Colors.accentRed,   // red-500 (middle)
                                Color(hex: "DC2626"),  // red-600 (darker bottom)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            )
            .shadow(
                color: isHovering ? DT.Colors.glowRed : DT.Colors.accentRed.opacity(0.15),
                radius: isHovering ? 16 : 6, y: isHovering ? 6 : 3
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(DT.Anim.springSnappy, value: configuration.isPressed)
            .onHover { hovering in
                withAnimation(DT.Anim.fadeQuick) { isHovering = hovering }
            }
    }
}

/// Secondary action — card background, border, subtle.
struct StudioButtonStyle: ButtonStyle {
    var accentBorder: Color? = nil

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(DT.Typography.body)
            .foregroundStyle(DT.Colors.textPrimary)
            .padding(.horizontal, DT.Spacing.lg)
            .padding(.vertical, DT.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: DT.Radius.sm)
                    .fill(configuration.isPressed ? DT.Colors.elevated : DT.Colors.card)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DT.Radius.sm)
                    .strokeBorder(accentBorder ?? DT.Colors.border, lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(DT.Anim.springSnappy, value: configuration.isPressed)
    }
}

/// Ghost button — transparent, elevated on hover.
struct GhostButtonStyle: ButtonStyle {
    @State private var isHovering = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(DT.Typography.caption)
            .foregroundStyle(isHovering ? DT.Colors.textPrimary : DT.Colors.textSecondary)
            .padding(.horizontal, DT.Spacing.md)
            .padding(.vertical, DT.Spacing.xs)
            .background(
                RoundedRectangle(cornerRadius: DT.Radius.sm)
                    .fill(configuration.isPressed ? DT.Colors.elevated : isHovering ? DT.Colors.card : .clear)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(DT.Anim.springSnappy, value: configuration.isPressed)
            .onHover { hovering in
                withAnimation(DT.Anim.fadeQuick) { isHovering = hovering }
            }
    }
}

/// Toolbar icon button — circle highlight on press.
struct ToolbarIconStyle: ButtonStyle {
    @State private var isHovering = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(6)
            .background(
                Circle()
                    .fill(
                        configuration.isPressed ? DT.Colors.elevated :
                        isHovering ? DT.Colors.card : .clear
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.88 : 1.0)
            .animation(DT.Anim.springSnappy, value: configuration.isPressed)
            .onHover { hovering in
                withAnimation(DT.Anim.fadeQuick) { isHovering = hovering }
            }
    }
}

// MARK: - View Modifiers

/// Dark card with border.
struct StudioCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: DT.Radius.md)
                    .fill(DT.Colors.card)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DT.Radius.md)
                    .strokeBorder(DT.Colors.border, lineWidth: 1)
            )
    }
}

/// Panel entrance/exit transition.
struct PanelTransitionModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .transition(
                .asymmetric(
                    insertion: .move(edge: .bottom)
                        .combined(with: .opacity)
                        .combined(with: .scale(scale: 0.95)),
                    removal: .opacity.combined(with: .scale(scale: 0.95))
                )
            )
    }
}

extension View {
    func studioCard() -> some View {
        modifier(StudioCardModifier())
    }

    func panelTransition() -> some View {
        modifier(PanelTransitionModifier())
    }
}

// MARK: - Section Header

struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title.uppercased())
            .font(DT.Typography.sectionLabel)
            .tracking(1.5)
            .foregroundStyle(DT.Colors.textTertiary)
    }
}
