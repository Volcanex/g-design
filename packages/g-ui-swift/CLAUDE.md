# g-ui-swift

The g-design look for native SwiftUI apps. Swift 6 package (tools 6.0, iOS 18,
macOS 15), library product `GDesignUI`, no dependencies.

Lifted from Studio's `GStudioUI` (g-studio-apple) in 2026-11, so Studio's look is
the reference. Studio's `GStudioUI` depends on it by relative path and re-exports it
(`@_exported import GDesignUI`). G-Command may import it too. Dependencies point one
way: this package imports neither app and knows no app model.

## What is here

- `Theme.swift`: `GTheme`. The colour aliases resolved to sRGB from
  `packages/g-tokens/dist/tokens.css` (dark first, light alias), the `adaptive`
  helper, the six chart colours, the Inter type scale (`body` to `compactTitle`),
  `registerFonts()` and `AccentLabel` with `.accentLabel()` for text on a
  `.borderedProminent` accent button.
- `Platform.swift`: view helpers that differ between phone and Mac
  (`largeTitle`, `inlineTitle`, `urlEntry`, `codeEntry`, `emailEntry`) and
  `ExternalLink.open`, which opens only http, https and mailto.
- `Layout.swift`: `gList`, `gForm`, `gRow`, `gCard` (the surface card, radius 20,
  token border) and the `EqualColumns` and `FlowLayout` layouts.
- `Resources/Fonts/`: InterVariable.ttf, InterVariable-Italic.ttf and `OFL.txt`
  (SIL OFL 1.1, listed in the repo's THIRD_PARTY_NOTICES). The app calls
  `GTheme.registerFonts()` once at launch.

## Rules

- Nothing app-specific: anything that needs an app's model (a tone, an error, a
  route) is an extension in that app's kit, for example `GTheme.color(_ tone:)`
  in GStudioUI.
- The colour values are copied by hand from the built tokens. When the tokens
  change, update them here and check both themes in each app's screenshots.
- No build output on h. Consumers build it on the Mac through their own
  `Scripts/mac_build.py`, which rsyncs this folder to
  `~/dev/g-design/packages/g-ui-swift/` so `../../g-design/packages/g-ui-swift`
  resolves from their `Kit/`. A change here is only checked when a consumer runs
  its build and screenshots.

AGENTS.md is a symlink to this file.
