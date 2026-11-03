// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "g-ui-swift",
    platforms: [.iOS(.v18), .macOS(.v15)],
    products: [
        .library(name: "GDesignUI", targets: ["GDesignUI"])
    ],
    targets: [
        .target(name: "GDesignUI", resources: [.process("Resources")])
    ]
)
