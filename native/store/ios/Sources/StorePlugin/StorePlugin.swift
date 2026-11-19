import Foundation
import Capacitor
import StoreKit

/// In-app purchases for toowl, straight on StoreKit 2: Apple signs every
/// transaction and StoreKit verifies it on the device, so there is no server
/// and no third-party SDK. The web side is src/lib/premium.ts.
///
/// JS name: `ToowlStore`
///   products({ ids })   -> { products: [{ id, title, description, price }] }
///   purchase({ id })    -> { status: "purchased" | "pending" | "cancelled", productIds }
///   entitlements()      -> { productIds }   products the user owns right now
///   restore()           -> { productIds }   AppStore.sync() first ("Restore Purchases")
///   event "entitlements" { productIds }     fired when a renewal, refund or
///                                           Ask to Buy approval arrives
@objc(StorePlugin)
public class StorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StorePlugin"
    public let jsName = "ToowlStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "entitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]

    private var updates: Task<Void, Never>?

    override public func load() {
        // Transactions that finish outside a purchase() call (renewals,
        // refunds, Ask to Buy, purchases from the App Store page).
        updates = Task.detached { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let transaction) = result { await transaction.finish() }
                guard let self = self else { return }
                let owned = await StorePlugin.owned()
                self.notifyListeners("entitlements", data: ["productIds": owned])
            }
        }
    }

    deinit { updates?.cancel() }

    @objc func products(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do {
                let found = try await Product.products(for: ids)
                call.resolve(["products": found.map { [
                    "id": $0.id,
                    "title": $0.displayName,
                    "description": $0.description,
                    "price": $0.displayPrice
                ] }])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { return call.reject("Missing product id") }
        Task {
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    return call.reject("Unknown product \(id)")
                }
                switch try await product.purchase() {
                case .success(let result):
                    guard case .verified(let transaction) = result else {
                        return call.reject("The App Store could not verify this purchase")
                    }
                    await transaction.finish()
                    call.resolve(["status": "purchased", "productIds": await StorePlugin.owned()])
                case .pending:
                    call.resolve(["status": "pending", "productIds": await StorePlugin.owned()])
                case .userCancelled:
                    call.resolve(["status": "cancelled", "productIds": await StorePlugin.owned()])
                @unknown default:
                    call.resolve(["status": "cancelled", "productIds": await StorePlugin.owned()])
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func entitlements(_ call: CAPPluginCall) {
        Task { call.resolve(["productIds": await StorePlugin.owned()]) }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                call.resolve(["productIds": await StorePlugin.owned()])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    /// Verified, unrevoked products the user owns now (non-consumables and active subscriptions).
    private static func owned() async -> [String] {
        var ids: [String] = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.revocationDate == nil {
                ids.append(transaction.productID)
            }
        }
        return ids
    }
}
