import SwiftUI
#if os(iOS)
import UIKit
#else
import AppKit
#endif

/// View helpers that differ between the phone and the Mac, kept in one place.
public extension View {
    /// A large navigation title on the phone. The Mac window title has one size.
    func largeTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.large)
        #else
        self
        #endif
    }

    func inlineTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }

    func urlEntry() -> some View {
        #if os(iOS)
        textContentType(.URL).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
        #else
        textContentType(.URL).autocorrectionDisabled()
        #endif
    }

    func codeEntry() -> some View {
        #if os(iOS)
        textContentType(.oneTimeCode).textInputAutocapitalization(.never).autocorrectionDisabled()
        #else
        textContentType(.oneTimeCode).autocorrectionDisabled()
        #endif
    }

    func emailEntry() -> some View {
        #if os(iOS)
        textContentType(.username).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
        #else
        textContentType(.username).autocorrectionDisabled()
        #endif
    }
}

/// Opens a web or mail link in the default app. Any other scheme is ignored.
public enum ExternalLink {
    @MainActor public static func open(_ url: URL) {
        guard ["https", "http", "mailto"].contains(url.scheme?.lowercased() ?? "") else { return }
        #if os(iOS)
        UIApplication.shared.open(url)
        #else
        NSWorkspace.shared.open(url)
        #endif
    }
}
