package app.vercel.threebinternational;

import android.app.Activity;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "ThreeBStore")
public class ThreeBStorePlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billing;
    private PluginCall pendingCall;
    private String pendingProductId;

    @Override public void load() {
        billing = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
    }

    @PluginMethod public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        String accountId = call.getString("accountId");
        if (productId == null || !productId.matches("[A-Za-z0-9._-]{3,180}")) {
            call.reject("Identifiant Google Play invalide.", "invalid_product");
            return;
        }
        if (accountId == null || !accountId.matches("[0-9a-f]{64}")) {
            call.reject("Compte 3B invalide.", "invalid_account");
            return;
        }
        if (pendingCall != null) {
            call.reject("Un achat est déjà en cours.", "purchase_in_progress");
            return;
        }
        ensureConnected(call, () -> queryProduct(productId, details -> {
            Activity activity = getActivity();
            if (activity == null || activity.isFinishing()) {
                call.reject("L’application doit être visible pour acheter.", "foreground_required");
                return;
            }
            BillingFlowParams.ProductDetailsParams.Builder productParams =
                BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details);
            ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
            if (offer != null && offer.getOfferToken() != null && !offer.getOfferToken().isEmpty()) {
                productParams.setOfferToken(offer.getOfferToken());
            }
            BillingFlowParams params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(productParams.build()))
                .setObfuscatedAccountId(accountId)
                .build();
            pendingCall = call;
            pendingProductId = productId;
            BillingResult result = billing.launchBillingFlow(activity, params);
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                clearPending();
                call.reject("Google Play n’a pas pu ouvrir le paiement.", "billing_launch_" + result.getResponseCode());
            }
        }));
    }

    private interface ProductCallback { void run(ProductDetails details); }

    private void queryProduct(String productId, ProductCallback callback) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();
        billing.queryProductDetailsAsync(params, (result, detailsResult) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                PluginCall call = pendingCall;
                if (call != null) clearPending();
                if (call != null) call.reject("Produit Google Play indisponible.", "product_query_" + result.getResponseCode());
                return;
            }
            List<ProductDetails> products = detailsResult.getProductDetailsList();
            ProductDetails found = null;
            for (ProductDetails candidate : products) {
                if (productId.equals(candidate.getProductId())) { found = candidate; break; }
            }
            if (found == null) {
                PluginCall call = pendingCall;
                if (call != null) clearPending();
                if (call != null) call.reject("Produit Google Play introuvable.", "product_not_found");
                return;
            }
            callback.run(found);
        });
    }

    private void ensureConnected(PluginCall call, Runnable ready) {
        if (billing != null && billing.isReady()) { ready.run(); return; }
        if (billing == null) load();
        billing.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) ready.run();
                else call.reject("Google Play Billing indisponible.", "billing_setup_" + result.getResponseCode());
            }
            @Override public void onBillingServiceDisconnected() {
                if (pendingCall == call) {
                    clearPending();
                    call.reject("Connexion Google Play interrompue.", "billing_disconnected");
                }
            }
        });
    }

    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingCall;
        if (call == null) return;
        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            JSObject out = new JSObject(); out.put("state", "cancelled"); call.resolve(out); clearPending(); return;
        }
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) {
            call.reject("Paiement Google Play non confirmé.", "billing_result_" + result.getResponseCode());
            clearPending(); return;
        }
        for (Purchase purchase : purchases) {
            if (!purchase.getProducts().contains(pendingProductId)) continue;
            JSObject out = new JSObject();
            out.put("provider", "google_play");
            out.put("productId", pendingProductId);
            out.put("purchaseToken", purchase.getPurchaseToken());
            out.put("orderId", purchase.getOrderId());
            out.put("purchaseTime", purchase.getPurchaseTime());
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) out.put("state", "purchased");
            else if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) out.put("state", "pending");
            else out.put("state", "unknown");
            call.resolve(out); clearPending(); return;
        }
        call.reject("Le reçu Google Play ne correspond pas au produit demandé.", "product_mismatch");
        clearPending();
    }

    private void clearPending() {
        pendingCall = null;
        pendingProductId = null;
    }
}
