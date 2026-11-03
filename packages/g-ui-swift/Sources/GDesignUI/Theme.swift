import SwiftUI
import CoreText
#if os(iOS)
import UIKit
#else
import AppKit
#endif

/// The g-design look in SwiftUI: token colours, the Inter type scale and font registration.
/// App-specific mappings (a tone to a colour, say) are extensions in the app's own kit.
public enum GTheme {
    // Resolved sRGB aliases from g-design/packages/g-tokens/dist/tokens.css.
    public static let background = adaptive(0x111113, 0xfcfcfd, alpha: false)
    public static let surface = adaptive(0x18191b, 0xf9f9fb, alpha: false)
    public static let fill = adaptive(0xddeaf814, 0x0000330f, alpha: true)
    public static let primary = adaptive(0xedeef0, 0x1c2024, alpha: false)
    public static let secondary = adaptive(0xb0b4ba, 0x60646c, alpha: false)
    public static let border = adaptive(0xd9edff40, 0x00062e32, alpha: true)
    public static let ok = adaptive(0x3dd68c, 0x207952, alpha: false)
    public static let warning = adaptive(0xffca16, 0xa05e04, alpha: false)
    public static let danger = adaptive(0xff9592, 0xc82b30, alpha: false)
    public static let accent = adaptive(0x70b8ff, 0x0d6cc1, alpha: false)
    public static let muted = adaptive(0x696e77, 0x8b8d98, alpha: false)
    public static let chart = [adaptive(0x0090ff, 0x0090ff), adaptive(0x6e56cf, 0x6e56cf), adaptive(0x12a594, 0x12a493), adaptive(0xffc53d, 0xc88515), adaptive(0xe93d82, 0xe93d82), adaptive(0x46a758, 0x45a557)]

    /// One colour per appearance, as `0xRRGGBB`, or `0xRRGGBBAA` when `alpha` is set.
    public static func adaptive(_ dark: UInt32, _ light: UInt32, alpha: Bool = false) -> Color {
        func components(_ value: UInt32) -> (Double, Double, Double, Double) {
            let rgb = alpha ? value >> 8 : value
            return (Double((rgb >> 16) & 255) / 255, Double((rgb >> 8) & 255) / 255,
                    Double(rgb & 255) / 255, alpha ? Double(value & 255) / 255 : 1)
        }
        #if os(iOS)
        return Color(uiColor: UIColor { traits in
            let (r, g, b, a) = components(traits.userInterfaceStyle == .light ? light : dark)
            return UIColor(red: r, green: g, blue: b, alpha: a)
        })
        #else
        // sRGB like the tokens, resolved against the drawing appearance.
        return Color(nsColor: NSColor(name: nil) { appearance in
            let isDark = appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
            let (r, g, b, a) = components(isDark ? dark : light)
            return NSColor(srgbRed: r, green: g, blue: b, alpha: a)
        })
        #endif
    }

    /// Label colour for a `.borderedProminent` button on the accent: the page background,
    /// as G-Command's prominent buttons use it. The inherited text colour fails contrast
    /// on the accent fill in both themes.
    public struct AccentLabel: ViewModifier {
        @Environment(\.isEnabled) private var isEnabled
        public init() {}
        public func body(content: Content) -> some View {
            content.foregroundStyle(isEnabled ? GTheme.background : GTheme.secondary)
        }
    }

    public static let body = Font.custom("InterVariable", size: 16, relativeTo: .body)
    public static let callout = Font.custom("InterVariable", size: 15, relativeTo: .callout)
    public static let caption = Font.custom("InterVariable", size: 13, relativeTo: .caption)
    public static let headline = Font.custom("InterVariable", size: 17, relativeTo: .headline).weight(.semibold)
    public static let sectionTitle = Font.custom("InterVariable", size: 20, relativeTo: .title3).weight(.semibold)
    public static let title = Font.custom("InterVariable", size: 28, relativeTo: .title).weight(.medium)
    // Compact panel typography.
    public static let compactBody = Font.custom("InterVariable", size: 13, relativeTo: .body)
    public static let compactCaption = Font.custom("InterVariable", size: 12, relativeTo: .caption)
    public static let compactTitle = Font.custom("InterVariable", size: 14, relativeTo: .headline).weight(.semibold)

    /// Inter ships in this package, so the app registers it
    /// once at launch instead of listing each file in Info.plist.
    @MainActor public static func registerFonts() {
        guard !fontsRegistered else { return }
        fontsRegistered = true
        // Inter's italic is its own file (InterVariable-Italic.ttf, PostScript
        // name InterVariableItalic): the upright variable font has no slant axis.
        for name in ["InterVariable", "InterVariable-Italic"] {
            guard let url = Bundle.module.url(forResource: name, withExtension: "ttf") else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
    @MainActor private static var fontsRegistered = false
}

public extension View {
    /// Apply after `.buttonStyle(.borderedProminent)` and before `.disabled`.
    func accentLabel() -> some View { modifier(GTheme.AccentLabel()) }
}
