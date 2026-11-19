// swift-tools-version: 5.9
import PackageDescription

// Local Capacitor plugin (see package.json): `npx cap sync ios` adds it to
// ios/App/CapApp-SPM and registers StorePlugin, so the Xcode project itself
// never has to list this file.
let package = Package(
    name: "ToowlStore",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "ToowlStore", targets: ["StorePlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "StorePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/StorePlugin")
    ]
)
