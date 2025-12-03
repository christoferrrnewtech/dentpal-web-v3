"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPaymongoTransactions = exports.getPaymongoTransaction = exports.getWalletTransactions = exports.checkWithdrawalStatus = exports.processWithdrawal = exports.createJRSShipping = exports.processSellerPayoutAdjustments = exports.getSellerPayoutAdjustments = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const params_1 = require("firebase-functions/params");
const axios_1 = require("axios");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
// Define parameters for JRS API
const JRS_API_KEY = (0, params_1.defineString)("JRS_API_KEY");
const JRS_API_URL = (0, params_1.defineString)("JRS_API_URL", { default: "https://jrs-express.azure-api.net/qa-online-shipping-ship/ShippingRequestFunction" });
// Define parameters for PayMongo API
const PAYMONGO_SECRET_KEY = (0, params_1.defineSecret)("PAYMONGO_SECRET_KEY");
const PAYMONGO_WALLET_ID = (0, params_1.defineString)("PAYMONGO_WALLET_ID");
const PAYMONGO_API_URL = (0, params_1.defineString)("PAYMONGO_API_URL", { default: "https://api.paymongo.com/v1" });
const verifyAuthToken = async (authorizationHeader) => {
    if (!authorizationHeader) {
        throw new Error("Missing Authorization header");
    }
    const token = authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.substring(7)
        : authorizationHeader;
    if (!token) {
        throw new Error("Invalid Authorization header format");
    }
    try {
        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken;
    }
    catch (error) {
        logger.error("Token verification failed", { error });
        throw new Error("Invalid or expired authentication token");
    }
};
/**
 * Custom error class for admin access verification failures
 */
class AdminAccessError extends Error {
    constructor(message) {
        super(message);
        this.name = "AdminAccessError";
    }
}
/**
 * Verify that the authenticated user has admin role
 * @param adminUid - The UID of the authenticated user (from decodedToken.uid)
 * @param actionDescription - Description of the action being attempted (for logging)
 * @throws AdminAccessError if user is not an admin
 */
const verifyAdminAccess = async (adminUid, actionDescription) => {
    var _a, _b;
    const adminDoc = await db.collection("Seller").doc(adminUid).get();
    if (!adminDoc.exists || ((_a = adminDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        logger.warn(`Non-admin user attempted to ${actionDescription}`, {
            adminUid,
            role: ((_b = adminDoc.data()) === null || _b === void 0 ? void 0 : _b.role) || "unknown",
        });
        throw new AdminAccessError("Unauthorized. Admin access required.");
    }
};
// Helper functions
const fetchOrderData = async (orderId) => {
    const collections = ["Order", "orders"];
    for (const collectionName of collections) {
        const orderDoc = await db.collection(collectionName).doc(orderId).get();
        if (orderDoc.exists) {
            return { data: orderDoc.data(), collection: collectionName };
        }
    }
    return null;
};
const fetchUserData = async (userId) => {
    const userDoc = await db.collection("web_users").doc(userId).get();
    if (userDoc.exists) {
        return userDoc.data();
    }
    return null;
};
const fetchSellerData = async (sellerId) => {
    const sellerDoc = await db.collection("Seller").doc(sellerId).get();
    if (sellerDoc.exists) {
        return sellerDoc.data();
    }
    return null;
};
const calculateShipmentItems = (orderItems) => {
    // Default dimensions if not provided in order items
    const defaultDimensions = {
        length: 20,
        width: 15,
        height: 10,
        weight: 0.5, // kg
    };
    return orderItems.map((item) => {
        var _a, _b, _c, _d;
        const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
        const length = ((_a = item.dimensions) === null || _a === void 0 ? void 0 : _a.length) || defaultDimensions.length;
        const width = ((_b = item.dimensions) === null || _b === void 0 ? void 0 : _b.width) || defaultDimensions.width;
        const height = ((_c = item.dimensions) === null || _c === void 0 ? void 0 : _c.height) || defaultDimensions.height;
        const unitWeight = ((_d = item.dimensions) === null || _d === void 0 ? void 0 : _d.weight) || defaultDimensions.weight;
        const unitDeclaredValue = item.price || 100;
        return {
            length,
            width,
            height,
            weight: unitWeight * quantity,
            declaredValue: unitDeclaredValue * quantity,
        };
    });
};
const generateShipmentDescription = (items) => {
    const productNames = items.map(item => item.name || item.productName || "Dental Supply").join(", ");
    return `Dental Supplies: ${productNames}`.substring(0, 100); // Limit length
};
// Function to create seller payout adjustment for shipping charges
const createSellerPayoutAdjustment = async (params) => {
    try {
        const adjustmentData = {
            orderId: params.orderId,
            sellerId: params.sellerId,
            type: 'shipping_charge',
            amount: -params.shippingCharge,
            description: `Shipping charge deduction for order ${params.orderId}`,
            shippingReference: params.shippingReferenceNo,
            trackingId: params.trackingId || null,
            status: 'pending_deduction',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            metadata: {
                originalShippingCharge: params.shippingCharge,
                appliedAt: new Date().toISOString(),
                reason: 'seller_portion_shipping_fee',
            }
        };
        // Create adjustment record in SellerPayoutAdjustments collection
        const adjustmentRef = await db.collection('SellerPayoutAdjustments').add(adjustmentData);
        logger.info("Created seller payout adjustment", {
            adjustmentId: adjustmentRef.id,
            orderId: params.orderId,
            sellerId: params.sellerId,
            shippingCharge: params.shippingCharge,
            trackingId: params.trackingId,
        });
        // Update seller's total adjustments
        const sellerRef = db.collection('Seller').doc(params.sellerId);
        await sellerRef.update({
            payoutAdjustments: {
                totalShippingCharges: firestore_1.FieldValue.increment(params.shippingCharge),
                pendingDeductions: firestore_1.FieldValue.increment(params.shippingCharge),
                lastUpdated: firestore_1.FieldValue.serverTimestamp(),
            }
        });
        return adjustmentRef.id;
    }
    catch (error) {
        logger.error("Failed to create seller payout adjustment", {
            orderId: params.orderId,
            sellerId: params.sellerId,
            shippingCharge: params.shippingCharge,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};
const parseAddress = (shippingInfo) => {
    // Extract district/barangay from addressLine1 if it contains "Brgy." or "Barangay"
    let district = "N/A";
    let addressLine1 = shippingInfo.addressLine1 || "";
    const brggyMatch = addressLine1.match(/(?:Brgy\.?\s+|Barangay\s+)([^,]+)/i);
    if (brggyMatch) {
        district = brggyMatch[1].trim();
        // Remove the barangay part from address line
        addressLine1 = addressLine1.replace(/,?\s*(?:Brgy\.?\s+|Barangay\s+)[^,]+/i, '').trim();
    }
    return {
        addressLine1: addressLine1 || shippingInfo.addressLine1 || "N/A",
        district: district,
        city: shippingInfo.city || "N/A",
        state: shippingInfo.state || shippingInfo.province || "Metro Manila",
        country: shippingInfo.country || "Philippines",
        postalCode: shippingInfo.postalCode || "",
    };
};
// Function to process seller payout adjustments (can be called manually or on schedule)
// Function to get seller payout adjustments (for sellers to view their charges)
exports.getSellerPayoutAdjustments = (0, https_1.onRequest)({
    cors: true,
    region: "asia-southeast1",
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        // Verify authentication
        let decodedToken;
        try {
            decodedToken = await verifyAuthToken(req.headers.authorization);
        }
        catch (authError) {
            res.status(401).json({
                error: "Authentication required",
                message: authError instanceof Error ? authError.message : "Invalid authentication"
            });
            return;
        }
        const { sellerId } = req.query;
        let targetSellerId = sellerId;
        // If no sellerId provided, try to find seller record for authenticated user
        if (!targetSellerId) {
            const sellerQuery = await db.collection('Seller')
                .where('userId', '==', decodedToken.uid)
                .limit(1)
                .get();
            if (sellerQuery.empty) {
                res.status(404).json({
                    error: "Seller not found",
                    message: "No seller record found for authenticated user"
                });
                return;
            }
            targetSellerId = sellerQuery.docs[0].id;
        }
        // Verify authorization - user must be the seller owner or admin
        const sellerDoc = await db.collection('Seller').doc(targetSellerId).get();
        if (!sellerDoc.exists) {
            res.status(404).json({ error: "Seller not found" });
            return;
        }
        const sellerData = sellerDoc.data();
        const isSellerOwner = (sellerData === null || sellerData === void 0 ? void 0 : sellerData.userId) === decodedToken.uid || (sellerData === null || sellerData === void 0 ? void 0 : sellerData.email) === decodedToken.email;
        const isAdmin = decodedToken.role === 'admin' || ((_a = decodedToken.customClaims) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
        if (!isSellerOwner && !isAdmin) {
            res.status(403).json({
                error: "Access denied",
                message: "You can only view your own payout adjustments"
            });
            return;
        }
        // Get payout adjustments for seller
        const adjustmentsQuery = await db.collection('SellerPayoutAdjustments')
            .where('sellerId', '==', targetSellerId)
            .where('type', '==', 'shipping_charge')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        const adjustments = adjustmentsQuery.docs.map(doc => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return ({
                id: doc.id,
                ...doc.data(),
                createdAt: ((_c = (_b = (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || doc.data().createdAt,
                updatedAt: ((_f = (_e = (_d = doc.data().updatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || doc.data().updatedAt,
                processedAt: ((_j = (_h = (_g = doc.data().processedAt) === null || _g === void 0 ? void 0 : _g.toDate) === null || _h === void 0 ? void 0 : _h.call(_g)) === null || _j === void 0 ? void 0 : _j.toISOString()) || doc.data().processedAt,
            });
        });
        // Get seller summary
        const sellerSummary = (sellerData === null || sellerData === void 0 ? void 0 : sellerData.payoutAdjustments) || {};
        res.status(200).json({
            success: true,
            sellerId: targetSellerId,
            adjustments,
            summary: {
                totalShippingCharges: sellerSummary.totalShippingCharges || 0,
                pendingDeductions: sellerSummary.pendingDeductions || 0,
                processedDeductions: sellerSummary.processedDeductions || 0,
                lastUpdated: ((_d = (_c = (_b = sellerSummary.lastUpdated) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) === null || _d === void 0 ? void 0 : _d.toISOString()) || sellerSummary.lastUpdated,
                lastProcessed: ((_g = (_f = (_e = sellerSummary.lastProcessed) === null || _e === void 0 ? void 0 : _e.toDate) === null || _f === void 0 ? void 0 : _f.call(_e)) === null || _g === void 0 ? void 0 : _g.toISOString()) || sellerSummary.lastProcessed,
            },
            count: adjustments.length,
        });
    }
    catch (error) {
        logger.error("Error in getSellerPayoutAdjustments", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.processSellerPayoutAdjustments = (0, https_1.onRequest)({
    cors: true,
    region: "asia-southeast1",
}, async (req, res) => {
    var _a;
    try {
        // Verify authentication
        let decodedToken;
        try {
            decodedToken = await verifyAuthToken(req.headers.authorization);
            // Only allow admin users to process payouts
            const isAdmin = decodedToken.role === 'admin' ||
                ((_a = decodedToken.customClaims) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
            if (!isAdmin) {
                res.status(403).json({
                    error: "Access denied",
                    message: "Only administrators can process seller payout adjustments"
                });
                return;
            }
        }
        catch (authError) {
            res.status(401).json({
                error: "Authentication required",
                message: authError instanceof Error ? authError.message : "Invalid authentication"
            });
            return;
        }
        // Query pending shipping charge adjustments
        const pendingAdjustments = await db.collection('SellerPayoutAdjustments')
            .where('type', '==', 'shipping_charge')
            .where('status', '==', 'pending_deduction')
            .get();
        const processed = [];
        const errors = [];
        for (const doc of pendingAdjustments.docs) {
            try {
                await db.runTransaction(async (transaction) => {
                    var _a;
                    const adjustmentSnap = await transaction.get(doc.ref);
                    if (!adjustmentSnap.exists) {
                        throw new Error("Adjustment document does not exist");
                    }
                    const adjustment = adjustmentSnap.data();
                    if (!adjustment) {
                        throw new Error("Adjustment data is undefined");
                    }
                    // Prevent double-processing
                    if (adjustment.status === 'processed') {
                        logger.warn("Adjustment already processed, skipping", {
                            adjustmentId: doc.id,
                            sellerId: adjustment.sellerId,
                            orderId: adjustment.orderId,
                        });
                        return;
                    }
                    // Compute delta as positive magnitude for decrementing pendingDeductions
                    const originalShipping = (_a = adjustment.metadata) === null || _a === void 0 ? void 0 : _a.originalShippingCharge;
                    const delta = typeof originalShipping === 'number'
                        ? originalShipping
                        : Math.abs(adjustment.amount);
                    // Update adjustment status
                    transaction.update(doc.ref, {
                        status: 'processed',
                        processedAt: firestore_1.FieldValue.serverTimestamp(),
                        processedBy: decodedToken.uid,
                    });
                    // Update seller's payout adjustments
                    const sellerRef = db.collection('Seller').doc(adjustment.sellerId);
                    transaction.update(sellerRef, {
                        'payoutAdjustments.pendingDeductions': firestore_1.FieldValue.increment(-delta),
                        'payoutAdjustments.processedDeductions': firestore_1.FieldValue.increment(delta),
                        'payoutAdjustments.lastProcessed': firestore_1.FieldValue.serverTimestamp(),
                    });
                });
                processed.push({
                    adjustmentId: doc.id,
                    orderId: doc.data().orderId,
                    sellerId: doc.data().sellerId,
                    amount: doc.data().amount,
                });
                logger.info("Processed seller payout adjustment (transaction)", {
                    adjustmentId: doc.id,
                    sellerId: doc.data().sellerId,
                    orderId: doc.data().orderId,
                    amount: doc.data().amount,
                });
            }
            catch (error) {
                logger.error("Failed to process adjustment (transaction)", {
                    adjustmentId: doc.id,
                    sellerId: doc.data().sellerId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                errors.push({
                    adjustmentId: doc.id,
                    sellerId: doc.data().sellerId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        res.status(200).json({
            success: true,
            message: `Processed ${processed.length} shipping charge adjustments`,
            processed,
            errors,
            summary: {
                totalProcessed: processed.length,
                totalErrors: errors.length,
                totalAmount: processed.reduce((sum, item) => sum + Math.abs(item.amount), 0),
            },
        });
    }
    catch (error) {
        logger.error("Error in processSellerPayoutAdjustments", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.createJRSShipping = (0, https_1.onRequest)({
    cors: true,
    region: "asia-southeast1",
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31;
    // Add explicit CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '86400');
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    try {
        // Check for POST method
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        // Verify authentication token
        let decodedToken;
        try {
            decodedToken = await verifyAuthToken(req.headers.authorization);
            logger.info("Authenticated shipping request", {
                uid: decodedToken.uid,
                email: decodedToken.email
            });
        }
        catch (authError) {
            logger.warn("Unauthenticated shipping request attempt", {
                ip: req.ip,
                userAgent: req.headers["user-agent"]
            });
            res.status(401).json({
                error: "Authentication required",
                message: authError instanceof Error ? authError.message : "Invalid authentication"
            });
            return;
        }
        const payload = req.body;
        // Validate required orderId
        if (!payload.orderId) {
            res.status(400).json({ error: "Missing orderId" });
            return;
        }
        logger.info("Processing JRS shipping request", {
            orderId: payload.orderId,
            authenticatedUser: decodedToken.uid
        });
        // Fetch order data from Firestore
        const orderResult = await fetchOrderData(payload.orderId);
        if (!orderResult) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        const orderData = orderResult.data;
        if (!orderData) {
            res.status(404).json({ error: "Order data not found" });
            return;
        }
        // Authorization check - ensure user can access this order
        // Allow if user is the order owner, a seller involved, or an admin
        const isOrderOwner = orderData.userId === decodedToken.uid;
        const isAdmin = decodedToken.role === 'admin' ||
            ((_a = decodedToken.customClaims) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
        let isSeller = false;
        if (orderData.sellerIds && Array.isArray(orderData.sellerIds)) {
            // Check if authenticated user is one of the sellers for this order
            const sellerPromises = orderData.sellerIds.map((sellerId) => db.collection("Seller").doc(sellerId).get());
            const sellerDocs = await Promise.all(sellerPromises);
            isSeller = sellerDocs.some(doc => { var _a, _b; return doc.exists && (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.userId) === decodedToken.uid || ((_b = doc.data()) === null || _b === void 0 ? void 0 : _b.email) === decodedToken.email); });
        }
        if (!isOrderOwner && !isAdmin && !isSeller) {
            logger.warn("Unauthorized shipping request", {
                orderId: payload.orderId,
                authenticatedUser: decodedToken.uid,
                orderOwner: orderData.userId,
                sellerIds: orderData.sellerIds
            });
            res.status(403).json({
                error: "Access denied",
                message: "You are not authorized to create shipping for this order"
            });
            return;
        }
        // Prevent duplicate shipping requests
        if ((_c = (_b = orderData.shippingInfo) === null || _b === void 0 ? void 0 : _b.jrs) === null || _c === void 0 ? void 0 : _c.trackingId) {
            logger.warn("Duplicate shipping request attempted", {
                orderId: payload.orderId,
                existingTrackingId: orderData.shippingInfo.jrs.trackingId,
                authenticatedUser: decodedToken.uid
            });
            res.status(409).json({
                error: "Order already shipped",
                message: `This order has already been shipped with tracking ID: ${orderData.shippingInfo.jrs.trackingId}`,
                existingTrackingId: orderData.shippingInfo.jrs.trackingId
            });
            return;
        }
        // Validate order status - only allow shipping for confirmed/paid orders
        const allowedStatuses = ['confirmed', 'paid', 'processing', 'ready_to_ship', 'to_ship'];
        const orderStatus = String(orderData.status || '').toLowerCase().trim();
        const isValidStatus = orderStatus && allowedStatuses.some(status => status.toLowerCase() === orderStatus);
        if (!isValidStatus) {
            logger.warn("Invalid order status for shipping", {
                orderId: payload.orderId,
                currentStatus: orderData.status,
                currentStatusType: typeof orderData.status,
                normalizedStatus: orderStatus,
                allowedStatuses: allowedStatuses
            });
            res.status(400).json({
                error: "Invalid order status",
                message: `Cannot create shipping for order with status: "${orderData.status}" (normalized: "${orderStatus}"). Allowed statuses: ${allowedStatuses.join(', ')}`,
                currentStatus: orderData.status,
                currentStatusType: typeof orderData.status,
                normalizedStatus: orderStatus,
                allowedStatuses: allowedStatuses
            });
            return;
        }
        // Fetch user (recipient) data
        let userData = null;
        if (orderData.userId) {
            userData = await fetchUserData(orderData.userId);
        }
        // Fetch seller (shipper) data - use first seller from sellerIds
        let sellerData = null;
        if (orderData.sellerIds && orderData.sellerIds.length > 0) {
            sellerData = await fetchSellerData(orderData.sellerIds[0]);
        }
        // Generate shipping reference number
        const shippingReferenceNo = `DPAL-${payload.orderId}`;
        // Parse recipient address
        const recipientAddress = parseAddress(orderData.shippingInfo || {});
        // Prepare recipient info (buyer/user)
        const recipientInfo = {
            email: ((_d = payload.recipientInfo) === null || _d === void 0 ? void 0 : _d.email) || (userData === null || userData === void 0 ? void 0 : userData.email) || ((_e = orderData.shippingInfo) === null || _e === void 0 ? void 0 : _e.email) || "customer@dentpal.ph",
            firstName: ((_f = payload.recipientInfo) === null || _f === void 0 ? void 0 : _f.firstName) || (userData === null || userData === void 0 ? void 0 : userData.firstName) ||
                ((_g = orderData.shippingInfo) === null || _g === void 0 ? void 0 : _g.fullName) || "Customer",
            lastName: ((_h = payload.recipientInfo) === null || _h === void 0 ? void 0 : _h.lastName) || (userData === null || userData === void 0 ? void 0 : userData.lastName) || "N/A",
            middleName: ((_j = payload.recipientInfo) === null || _j === void 0 ? void 0 : _j.middleName) || (userData === null || userData === void 0 ? void 0 : userData.middleName) || "",
            country: ((_k = payload.recipientInfo) === null || _k === void 0 ? void 0 : _k.country) || recipientAddress.country,
            province: ((_l = payload.recipientInfo) === null || _l === void 0 ? void 0 : _l.province) || recipientAddress.state,
            municipality: ((_m = payload.recipientInfo) === null || _m === void 0 ? void 0 : _m.municipality) || recipientAddress.city,
            district: ((_o = payload.recipientInfo) === null || _o === void 0 ? void 0 : _o.district) || recipientAddress.district,
            addressLine1: ((_p = payload.recipientInfo) === null || _p === void 0 ? void 0 : _p.addressLine1) || recipientAddress.addressLine1,
            phone: ((_q = payload.recipientInfo) === null || _q === void 0 ? void 0 : _q.phone) || ((_r = orderData.shippingInfo) === null || _r === void 0 ? void 0 : _r.phoneNumber) || (userData === null || userData === void 0 ? void 0 : userData.contactNumber),
        };
        // Prepare shipper info (seller)
        const defaultShipperAddress = {
            country: "Philippines",
            province: "Metro Manila",
            municipality: "Quezon City",
            district: "Barangay Kamuning",
            addressLine1: "123 DentPal Street",
            phone: "+639123456789",
        };
        let shipperAddress = defaultShipperAddress;
        if ((_t = (_s = sellerData === null || sellerData === void 0 ? void 0 : sellerData.vendor) === null || _s === void 0 ? void 0 : _s.company) === null || _t === void 0 ? void 0 : _t.address) {
            const sellerAddr = sellerData.vendor.company.address;
            shipperAddress = {
                country: "Philippines",
                province: sellerAddr.province || defaultShipperAddress.province,
                municipality: sellerAddr.city || defaultShipperAddress.municipality,
                district: sellerAddr.line2 || defaultShipperAddress.district,
                addressLine1: sellerAddr.line1 || defaultShipperAddress.addressLine1,
                phone: ((_u = sellerData.vendor.contacts) === null || _u === void 0 ? void 0 : _u.phone) || defaultShipperAddress.phone,
            };
        }
        const shipperInfo = {
            email: ((_v = payload.shipperInfo) === null || _v === void 0 ? void 0 : _v.email) || (sellerData === null || sellerData === void 0 ? void 0 : sellerData.email) || "support@dentpal.ph",
            firstName: ((_w = payload.shipperInfo) === null || _w === void 0 ? void 0 : _w.firstName) || ((_x = sellerData === null || sellerData === void 0 ? void 0 : sellerData.name) === null || _x === void 0 ? void 0 : _x.split(' ')[0]) || ((_z = (_y = sellerData === null || sellerData === void 0 ? void 0 : sellerData.vendor) === null || _y === void 0 ? void 0 : _y.company) === null || _z === void 0 ? void 0 : _z.storeName) || "DentPal",
            lastName: ((_0 = payload.shipperInfo) === null || _0 === void 0 ? void 0 : _0.lastName) || ((_1 = sellerData === null || sellerData === void 0 ? void 0 : sellerData.name) === null || _1 === void 0 ? void 0 : _1.split(' ').slice(1).join(' ')) || "Support",
            middleName: ((_2 = payload.shipperInfo) === null || _2 === void 0 ? void 0 : _2.middleName) || "",
            country: ((_3 = payload.shipperInfo) === null || _3 === void 0 ? void 0 : _3.country) || shipperAddress.country,
            province: ((_4 = payload.shipperInfo) === null || _4 === void 0 ? void 0 : _4.province) || shipperAddress.province,
            municipality: ((_5 = payload.shipperInfo) === null || _5 === void 0 ? void 0 : _5.municipality) || shipperAddress.municipality,
            district: ((_6 = payload.shipperInfo) === null || _6 === void 0 ? void 0 : _6.district) || shipperAddress.district,
            addressLine1: ((_7 = payload.shipperInfo) === null || _7 === void 0 ? void 0 : _7.addressLine1) || shipperAddress.addressLine1,
            phone: ((_8 = payload.shipperInfo) === null || _8 === void 0 ? void 0 : _8.phone) || shipperAddress.phone,
        };
        // Calculate shipment items from order
        const shipmentItems = payload.shipmentItems || calculateShipmentItems(orderData.items || []);
        // Generate shipment description
        const shipmentDescription = payload.shipmentDescription || generateShipmentDescription(orderData.items || []);
        // COD amount - use order total if cash on delivery
        const codAmount = payload.codAmountToCollect ||
            (((_9 = orderData.paymentInfo) === null || _9 === void 0 ? void 0 : _9.method) === 'cod' ? ((_10 = orderData.summary) === null || _10 === void 0 ? void 0 : _10.total) || 0 : 0);
        // Prepare JRS API request
        const jrsRequest = {
            requestType: "shipfromecom",
            apiShippingRequest: {
                express: true,
                insurance: true,
                valuation: true,
                createdByUserEmail: payload.createdByUserEmail || (sellerData === null || sellerData === void 0 ? void 0 : sellerData.email) || "admin@dentpal.ph",
                shipmentItems: shipmentItems,
                recipientEmail: recipientInfo.email,
                recipientFirstName: recipientInfo.firstName,
                recipientLastName: recipientInfo.lastName,
                recipientMiddleName: recipientInfo.middleName,
                recipientCountry: recipientInfo.country,
                recipientProvince: recipientInfo.province,
                recipientMunicipality: recipientInfo.municipality,
                recipientDistrict: recipientInfo.district,
                recipientAddressLine1: recipientInfo.addressLine1,
                recipientPhone: recipientInfo.phone,
                shipperEmail: shipperInfo.email,
                shipperFirstName: shipperInfo.firstName,
                shipperLastName: shipperInfo.lastName,
                shipperMiddleName: shipperInfo.middleName,
                shipperCountry: shipperInfo.country,
                shipperProvince: shipperInfo.province,
                shipperMunicipality: shipperInfo.municipality,
                shipperDistrict: shipperInfo.district,
                shipperAddressLine1: shipperInfo.addressLine1,
                shipperPhone: shipperInfo.phone,
                requestedPickupSchedule: payload.requestedPickupSchedule || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                shipmentDescription: shipmentDescription,
                remarks: payload.remarks || ((_11 = orderData.shippingInfo) === null || _11 === void 0 ? void 0 : _11.notes) || "",
                specialInstruction: payload.specialInstruction || "",
                codAmountToCollect: codAmount,
                shippingReferenceNo: shippingReferenceNo,
            },
        };
        logger.info("Making JRS API request", {
            orderId: payload.orderId,
            shippingReferenceNo,
            itemCount: shipmentItems.length,
            codAmount: codAmount > 0,
            hasPickupSchedule: !!payload.requestedPickupSchedule,
        });
        // Make API call to JRS
        let response;
        let responseData;
        try {
            response = await axios_1.default.post(JRS_API_URL.value(), jrsRequest, {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                    "Ocp-Apim-Subscription-Key": JRS_API_KEY.value(),
                },
            });
            responseData = response.data;
        }
        catch (axiosError) {
            logger.error("JRS API error", {
                status: (_12 = axiosError.response) === null || _12 === void 0 ? void 0 : _12.status,
                statusText: (_13 = axiosError.response) === null || _13 === void 0 ? void 0 : _13.statusText,
                orderId: payload.orderId,
                shippingReferenceNo,
                errorCode: ((_15 = (_14 = axiosError.response) === null || _14 === void 0 ? void 0 : _14.data) === null || _15 === void 0 ? void 0 : _15.ErrorCode) || axiosError.code,
                errorMessage: ((_17 = (_16 = axiosError.response) === null || _16 === void 0 ? void 0 : _16.data) === null || _17 === void 0 ? void 0 : _17.ErrorMessage) || "Network error",
            });
            res.status(400).json({
                error: "JRS API request failed",
                details: ((_18 = axiosError.response) === null || _18 === void 0 ? void 0 : _18.data) || axiosError.message,
                shippingReferenceNo,
            });
            return;
        }
        // Axios throws errors for non-2xx status codes, so if we reach here, the request was successful
        // But we can still check for JRS-specific error indicators in the response
        if (!responseData.Success && responseData.Success !== undefined) {
            logger.error("JRS API business logic error", {
                orderId: payload.orderId,
                shippingReferenceNo,
                success: responseData.Success,
                errorMessage: responseData.ErrorMessage,
                errorCode: responseData.ErrorCode,
            });
            res.status(400).json({
                error: "JRS API request failed",
                details: responseData,
                shippingReferenceNo,
            });
            return;
        }
        // Extract and validate shipping charge allocation from order summary
        const orderSummary = orderData.summary || {};
        const sellerShippingCharge = Math.max(0, orderSummary.sellerShippingCharge || 0);
        const buyerShippingCharge = Math.max(0, orderSummary.buyerShippingCharge || 0);
        const totalShippingCost = Math.max(0, orderSummary.shippingCost || 0);
        // Validate shipping charge allocation
        const calculatedTotal = sellerShippingCharge + buyerShippingCharge;
        if (totalShippingCost > 0 && Math.abs(calculatedTotal - totalShippingCost) > 0.01) {
            logger.warn("Shipping charge allocation mismatch", {
                orderId: payload.orderId,
                totalShippingCost,
                sellerShippingCharge,
                buyerShippingCharge,
                calculatedTotal,
                difference: Math.abs(calculatedTotal - totalShippingCost),
            });
        }
        logger.info("JRS API success with shipping charges", {
            orderId: payload.orderId,
            shippingReferenceNo,
            trackingId: (_19 = responseData.ShippingRequestEntityDto) === null || _19 === void 0 ? void 0 : _19.TrackingId,
            totalShippingAmount: (_20 = responseData.ShippingRequestEntityDto) === null || _20 === void 0 ? void 0 : _20.TotalShippingAmount,
            sellerShippingCharge,
            buyerShippingCharge,
            totalShippingCost,
        });
        // Update order in Firestore with JRS response and handle seller shipping charges
        try {
            const orderRef = db.collection(orderResult.collection).doc(payload.orderId);
            // Create seller payout adjustment if seller has shipping charges
            let payoutAdjustmentId = null;
            if (sellerShippingCharge > 0 && orderData.sellerIds && orderData.sellerIds.length > 0) {
                try {
                    payoutAdjustmentId = await createSellerPayoutAdjustment({
                        orderId: payload.orderId,
                        sellerId: orderData.sellerIds[0],
                        shippingCharge: sellerShippingCharge,
                        shippingReferenceNo,
                        trackingId: (_21 = responseData.ShippingRequestEntityDto) === null || _21 === void 0 ? void 0 : _21.TrackingId,
                    });
                    logger.info("Successfully created seller payout adjustment", {
                        orderId: payload.orderId,
                        sellerId: orderData.sellerIds[0],
                        adjustmentId: payoutAdjustmentId,
                        shippingCharge: sellerShippingCharge,
                    });
                }
                catch (adjustmentError) {
                    logger.error("Failed to create seller payout adjustment, but continuing with shipping", {
                        orderId: payload.orderId,
                        sellerId: orderData.sellerIds[0],
                        shippingCharge: sellerShippingCharge,
                        error: adjustmentError instanceof Error ? adjustmentError.message : 'Unknown error',
                    });
                    // Don't fail the entire shipping process if payout adjustment fails
                }
            }
            const shippingNote = sellerShippingCharge > 0
                ? `Order shipped via JRS Express. Reference: ${shippingReferenceNo}, Tracking: ${(_22 = responseData.ShippingRequestEntityDto) === null || _22 === void 0 ? void 0 : _22.TrackingId}. Seller shipping charge: ₱${sellerShippingCharge.toFixed(2)}`
                : `Order shipped via JRS Express. Reference: ${shippingReferenceNo}, Tracking: ${(_23 = responseData.ShippingRequestEntityDto) === null || _23 === void 0 ? void 0 : _23.TrackingId}`;
            const newHistoryEntry = {
                status: "shipping",
                note: shippingNote,
                timestamp: new Date(),
            };
            const updateData = {
                shippingInfo: {
                    ...(orderData.shippingInfo || {}),
                    jrs: {
                        response: responseData,
                        shippingReferenceNo: shippingReferenceNo,
                        trackingId: (_24 = responseData.ShippingRequestEntityDto) === null || _24 === void 0 ? void 0 : _24.TrackingId,
                        requestedAt: new Date(),
                        totalShippingAmount: (_25 = responseData.ShippingRequestEntityDto) === null || _25 === void 0 ? void 0 : _25.TotalShippingAmount,
                        pickupSchedule: jrsRequest.apiShippingRequest.requestedPickupSchedule,
                        // Include shipping charge allocation info
                        shippingCharges: {
                            sellerCharge: sellerShippingCharge,
                            buyerCharge: buyerShippingCharge,
                            totalCharge: totalShippingCost,
                            chargeApplied: sellerShippingCharge > 0,
                            chargeAppliedAt: sellerShippingCharge > 0 ? new Date() : null,
                            payoutAdjustmentId: payoutAdjustmentId,
                        }
                    }
                },
                status: "shipping",
                statusHistory: firestore_1.FieldValue.arrayUnion(newHistoryEntry),
                updatedAt: new Date(),
            };
            // Remove fulfillmentStage field if it exists
            if (orderData.fulfillmentStage !== undefined) {
                updateData.fulfillmentStage = firestore_1.FieldValue.delete();
            }
            logger.info("Attempting to update order in Firestore", {
                orderId: payload.orderId,
                collection: orderResult.collection,
                updateData: JSON.stringify(updateData, null, 2)
            });
            await orderRef.update(updateData);
            logger.info("Order updated successfully in Firestore", {
                orderId: payload.orderId,
                collection: orderResult.collection,
                trackingId: (_26 = responseData.ShippingRequestEntityDto) === null || _26 === void 0 ? void 0 : _26.TrackingId,
            });
        }
        catch (firestoreError) {
            logger.error("Failed to update order in Firestore", {
                orderId: payload.orderId,
                collection: orderResult.collection,
                error: firestoreError,
                errorMessage: firestoreError instanceof Error ? firestoreError.message : 'Unknown error',
                errorStack: firestoreError instanceof Error ? firestoreError.stack : undefined
            });
            // Fail the request if Firestore update fails
            res.status(500).json({
                error: "Order shipping succeeded but failed to update order status",
                message: "JRS shipping request was successful, but we couldn't update the order in our database. Please contact support.",
                shippingReferenceNo,
                trackingId: (_27 = responseData.ShippingRequestEntityDto) === null || _27 === void 0 ? void 0 : _27.TrackingId,
                firestoreError: firestoreError instanceof Error ? firestoreError.message : 'Unknown error'
            });
            return;
        }
        // Return success response with shipping charge details
        res.status(200).json({
            success: true,
            shippingReferenceNo,
            trackingId: (_28 = responseData.ShippingRequestEntityDto) === null || _28 === void 0 ? void 0 : _28.TrackingId,
            totalShippingAmount: (_29 = responseData.ShippingRequestEntityDto) === null || _29 === void 0 ? void 0 : _29.TotalShippingAmount,
            shippingCharges: {
                sellerCharge: sellerShippingCharge,
                buyerCharge: buyerShippingCharge,
                totalCharge: totalShippingCost,
                sellerChargeApplied: sellerShippingCharge > 0,
            },
            jrsResponse: responseData,
            message: sellerShippingCharge > 0
                ? `Shipping request created successfully. Seller shipping charge of ₱${sellerShippingCharge.toFixed(2)} will be deducted from payout.`
                : "Shipping request created successfully",
            orderData: {
                orderId: payload.orderId,
                recipient: `${recipientInfo.firstName} ${recipientInfo.lastName}`,
                shipper: `${shipperInfo.firstName} ${shipperInfo.lastName}`,
                items: ((_30 = orderData.items) === null || _30 === void 0 ? void 0 : _30.length) || 0,
            },
        });
    }
    catch (error) {
        logger.error("Error in createJRSShipping", {
            error: error instanceof Error ? error.message : "Unknown error",
            orderId: (_31 = req.body) === null || _31 === void 0 ? void 0 : _31.orderId,
            stack: error instanceof Error ? error.stack : undefined,
        });
        res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * Process a withdrawal by creating a PayMongo wallet transaction
 * Called by admin when approving a withdrawal request
 */
exports.processWithdrawal = (0, https_1.onRequest)({
    cors: true,
    region: "asia-southeast1",
    secrets: [PAYMONGO_SECRET_KEY],
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    // Only allow POST
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Verify authentication
        const decodedToken = await verifyAuthToken(req.headers.authorization);
        const adminUid = decodedToken.uid;
        // Verify admin role
        await verifyAdminAccess(adminUid, "process withdrawal");
        const { withdrawalId } = req.body;
        if (!withdrawalId) {
            res.status(400).json({ error: "Missing withdrawalId" });
            return;
        }
        // Get the withdrawal request from Firestore
        const withdrawalRef = db.collection("Withdrawal").doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        if (!withdrawalDoc.exists) {
            res.status(404).json({ error: "Withdrawal request not found" });
            return;
        }
        const withdrawalData = withdrawalDoc.data();
        // Check if withdrawal is in a valid state for processing
        if (withdrawalData.status !== "approved") {
            res.status(400).json({
                error: "Invalid withdrawal status",
                message: `Withdrawal must be approved before processing. Current status: ${withdrawalData.status}`
            });
            return;
        }
        // Update status to processing
        await withdrawalRef.update({
            status: "processing",
            processedBy: adminUid,
            processedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        // Prepare PayMongo request
        const walletId = PAYMONGO_WALLET_ID.value();
        const apiUrl = PAYMONGO_API_URL.value();
        const secretKey = PAYMONGO_SECRET_KEY.value();
        // Amount in PayMongo is in centavos (smallest currency unit)
        const amountInCentavos = Math.round(withdrawalData.amount * 100);
        const paymongoRequest = {
            data: {
                attributes: {
                    amount: amountInCentavos,
                    currency: "PHP",
                    description: withdrawalData.description || `Withdrawal payout - ${withdrawalData.referenceNumber}`,
                    receiver: {
                        bank_account_name: withdrawalData.receiver.bankAccountName,
                        bank_account_number: withdrawalData.receiver.bankAccountNumber,
                        bank_code: withdrawalData.receiver.bankCode,
                        bank_id: withdrawalData.receiver.bankId || undefined,
                        bank_name: withdrawalData.receiver.bankName,
                    },
                    reference_number: withdrawalData.referenceNumber,
                },
            },
        };
        logger.info("Creating PayMongo wallet transaction", {
            withdrawalId,
            amount: withdrawalData.amount,
            amountInCentavos,
            receiver: withdrawalData.receiver.bankAccountName,
            referenceNumber: withdrawalData.referenceNumber,
        });
        // Make PayMongo API request
        const paymongoResponse = await axios_1.default.post(`${apiUrl}/wallets/${walletId}/transactions`, paymongoRequest, {
            headers: {
                "Authorization": `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
                "Content-Type": "application/json",
            },
        });
        const transactionData = paymongoResponse.data.data;
        logger.info("PayMongo wallet transaction created", {
            withdrawalId,
            transactionId: transactionData.id,
            status: transactionData.attributes.status,
        });
        // Update withdrawal with PayMongo response
        await withdrawalRef.update({
            paymongoTransactionId: transactionData.id,
            paymongoTransferId: transactionData.attributes.transfer_id,
            paymongoStatus: transactionData.attributes.status,
            paymongoProvider: transactionData.attributes.provider,
            paymongoNetAmount: transactionData.attributes.net_amount / 100,
            paymongoBatchId: transactionData.attributes.batch_transaction_id,
            paymongoCreatedAt: transactionData.attributes.created_at,
            updatedAt: new Date().toISOString(),
            // If PayMongo immediately completes, update status
            ...(transactionData.attributes.status === "completed" && {
                status: "completed",
                completedAt: new Date().toISOString(),
            }),
        });
        res.status(200).json({
            success: true,
            message: "Withdrawal transaction initiated successfully",
            withdrawalId,
            transaction: {
                id: transactionData.id,
                status: transactionData.attributes.status,
                provider: transactionData.attributes.provider,
                amount: transactionData.attributes.amount / 100,
                netAmount: transactionData.attributes.net_amount / 100,
                referenceNumber: transactionData.attributes.reference_number,
            },
        });
    }
    catch (error) {
        // Handle admin access errors with 403
        if (error instanceof AdminAccessError) {
            res.status(403).json({ error: error.message });
            return;
        }
        logger.error("Error processing withdrawal", {
            error: error.message,
            response: (_a = error.response) === null || _a === void 0 ? void 0 : _a.data,
            stack: error.stack,
        });
        // If PayMongo returned an error, update the withdrawal status
        if ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) {
            const withdrawalId = (_c = req.body) === null || _c === void 0 ? void 0 : _c.withdrawalId;
            if (withdrawalId) {
                try {
                    await db.collection("Withdrawal").doc(withdrawalId).update({
                        status: "failed",
                        providerError: ((_e = (_d = error.response.data.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.detail) || error.message,
                        providerErrorCode: ((_g = (_f = error.response.data.errors) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.code) || "unknown",
                        updatedAt: new Date().toISOString(),
                    });
                }
                catch (updateError) {
                    logger.error("Failed to update withdrawal status after error", { updateError });
                }
            }
        }
        res.status(((_h = error.response) === null || _h === void 0 ? void 0 : _h.status) || 500).json({
            error: "Failed to process withdrawal",
            message: ((_m = (_l = (_k = (_j = error.response) === null || _j === void 0 ? void 0 : _j.data) === null || _k === void 0 ? void 0 : _k.errors) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.detail) || error.message,
            code: (_r = (_q = (_p = (_o = error.response) === null || _o === void 0 ? void 0 : _o.data) === null || _p === void 0 ? void 0 : _p.errors) === null || _q === void 0 ? void 0 : _q[0]) === null || _r === void 0 ? void 0 : _r.code,
        });
    }
});
/**
 * Check the status of a withdrawal transaction from PayMongo
 */
exports.checkWithdrawalStatus = (0, https_1.onRequest)({
    cors: true,
    region: "asia-southeast1",
    secrets: [PAYMONGO_SECRET_KEY],
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    // Allow GET or POST
    if (req.method !== "GET" && req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Verify authentication
        const decodedToken = await verifyAuthToken(req.headers.authorization);
        const adminUid = decodedToken.uid;
        // Verify admin role
        await verifyAdminAccess(adminUid, "check withdrawal status");
        const withdrawalId = req.method === "GET" ? req.query.withdrawalId : req.body.withdrawalId;
        if (!withdrawalId) {
            res.status(400).json({ error: "Missing withdrawalId" });
            return;
        }
        // Get the withdrawal request from Firestore
        const withdrawalRef = db.collection("Withdrawal").doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        if (!withdrawalDoc.exists) {
            res.status(404).json({ error: "Withdrawal request not found" });
            return;
        }
        const withdrawalData = withdrawalDoc.data();
        if (!withdrawalData.paymongoTransactionId) {
            res.status(400).json({
                error: "No PayMongo transaction found",
                message: "This withdrawal has not been processed yet"
            });
            return;
        }
        // Fetch transaction status from PayMongo
        const walletId = PAYMONGO_WALLET_ID.value();
        const apiUrl = PAYMONGO_API_URL.value();
        const secretKey = PAYMONGO_SECRET_KEY.value();
        const paymongoResponse = await axios_1.default.get(`${apiUrl}/wallets/${walletId}/transactions/${withdrawalData.paymongoTransactionId}`, {
            headers: {
                "Authorization": `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
            },
        });
        const transactionData = paymongoResponse.data.data;
        logger.info("PayMongo transaction status retrieved", {
            withdrawalId,
            transactionId: transactionData.id,
            status: transactionData.attributes.status,
        });
        // Update withdrawal status if changed
        const updateData = {
            paymongoStatus: transactionData.attributes.status,
            updatedAt: new Date().toISOString(),
        };
        if (transactionData.attributes.status === "completed" && withdrawalData.status !== "completed") {
            updateData.status = "completed";
            updateData.completedAt = new Date().toISOString();
        }
        else if (transactionData.attributes.status === "failed" && withdrawalData.status !== "failed") {
            updateData.status = "failed";
            updateData.providerError = transactionData.attributes.provider_error;
            updateData.providerErrorCode = transactionData.attributes.provider_error_code;
        }
        await withdrawalRef.update(updateData);
        res.status(200).json({
            success: true,
            withdrawalId,
            withdrawalStatus: updateData.status || withdrawalData.status,
            transaction: {
                id: transactionData.id,
                status: transactionData.attributes.status,
                provider: transactionData.attributes.provider,
                providerError: transactionData.attributes.provider_error,
                amount: transactionData.attributes.amount / 100,
                netAmount: transactionData.attributes.net_amount / 100,
                referenceNumber: transactionData.attributes.reference_number,
                createdAt: transactionData.attributes.created_at,
                updatedAt: transactionData.attributes.updated_at,
            },
        });
    }
    catch (error) {
        // Handle admin access errors with 403
        if (error instanceof AdminAccessError) {
            res.status(403).json({ error: error.message });
            return;
        }
        logger.error("Error checking withdrawal status", {
            error: error.message,
            response: (_a = error.response) === null || _a === void 0 ? void 0 : _a.data,
        });
        res.status(((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || 500).json({
            error: "Failed to check withdrawal status",
            message: ((_f = (_e = (_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.errors) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.detail) || error.message,
        });
    }
});
/**
 * Get all wallet transactions from PayMongo (admin only)
 */
exports.getWalletTransactions = (0, https_1.onRequest)({
    cors: true,
    region: "asia-southeast1",
    secrets: [PAYMONGO_SECRET_KEY],
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Verify authentication
        const decodedToken = await verifyAuthToken(req.headers.authorization);
        const adminUid = decodedToken.uid;
        // Verify admin role
        await verifyAdminAccess(adminUid, "get wallet transactions");
        const limit = parseInt(req.query.limit) || 10;
        const startingAfter = req.query.starting_after;
        const walletId = PAYMONGO_WALLET_ID.value();
        const apiUrl = PAYMONGO_API_URL.value();
        const secretKey = PAYMONGO_SECRET_KEY.value();
        let url = `${apiUrl}/wallets/${walletId}/transactions?limit=${limit}`;
        if (startingAfter) {
            url += `&starting_after=${startingAfter}`;
        }
        const paymongoResponse = await axios_1.default.get(url, {
            headers: {
                "Authorization": `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
            },
        });
        res.status(200).json({
            success: true,
            data: paymongoResponse.data.data,
            hasMore: paymongoResponse.data.has_more,
        });
    }
    catch (error) {
        // Handle admin access errors with 403
        if (error instanceof AdminAccessError) {
            res.status(403).json({ error: error.message });
            return;
        }
        logger.error("Error fetching wallet transactions", {
            error: error.message,
            response: (_a = error.response) === null || _a === void 0 ? void 0 : _a.data,
        });
        res.status(((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || 500).json({
            error: "Failed to fetch wallet transactions",
            message: ((_f = (_e = (_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.errors) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.detail) || error.message,
        });
    }
});
/**
 * Get a specific wallet transaction from PayMongo
 * Proxies the read operation securely without exposing the secret key to the frontend
 * Admin-only access required
 */
exports.getPaymongoTransaction = (0, https_1.onRequest)({
    cors: true,
    region: "asia-southeast1",
    secrets: [PAYMONGO_SECRET_KEY],
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Verify authentication
        const decodedToken = await verifyAuthToken(req.headers.authorization);
        const adminUid = decodedToken.uid;
        // Verify admin role
        await verifyAdminAccess(adminUid, "access PayMongo transaction");
        const transactionId = req.query.transactionId;
        if (!transactionId) {
            res.status(400).json({ error: "Missing transactionId parameter" });
            return;
        }
        const walletId = PAYMONGO_WALLET_ID.value();
        const apiUrl = PAYMONGO_API_URL.value();
        const secretKey = PAYMONGO_SECRET_KEY.value();
        const response = await axios_1.default.get(`${apiUrl}/wallets/${walletId}/transactions/${transactionId}`, {
            headers: {
                "Authorization": `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
                "Accept": "application/json",
            },
        });
        res.status(200).json({ success: true, data: response.data });
    }
    catch (error) {
        // Handle admin access errors with 403
        if (error instanceof AdminAccessError) {
            res.status(403).json({ error: error.message });
            return;
        }
        logger.error("Error retrieving PayMongo transaction", {
            error: error.message,
            response: (_a = error.response) === null || _a === void 0 ? void 0 : _a.data,
        });
        const errorMessage = ((_e = (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.detail) ||
            error.message ||
            "Failed to retrieve transaction";
        res.status(((_f = error.response) === null || _f === void 0 ? void 0 : _f.status) || 500).json({
            success: false,
            error: errorMessage
        });
    }
});
/**
 * List wallet transactions from PayMongo
 * Proxies the read operation securely without exposing the secret key to the frontend
 * Admin-only access required
 */
exports.listPaymongoTransactions = (0, https_1.onRequest)({
    cors: true,
    region: "asia-southeast1",
    secrets: [PAYMONGO_SECRET_KEY],
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Verify authentication
        const decodedToken = await verifyAuthToken(req.headers.authorization);
        const adminUid = decodedToken.uid;
        // Verify admin role
        await verifyAdminAccess(adminUid, "list PayMongo transactions");
        const limit = parseInt(req.query.limit) || 10;
        const walletId = PAYMONGO_WALLET_ID.value();
        const apiUrl = PAYMONGO_API_URL.value();
        const secretKey = PAYMONGO_SECRET_KEY.value();
        const response = await axios_1.default.get(`${apiUrl}/wallets/${walletId}/transactions?limit=${limit}`, {
            headers: {
                "Authorization": `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
                "Accept": "application/json",
            },
        });
        res.status(200).json({ success: true, data: response.data.data || [] });
    }
    catch (error) {
        // Handle admin access errors with 403
        if (error instanceof AdminAccessError) {
            res.status(403).json({ error: error.message });
            return;
        }
        logger.error("Error listing PayMongo transactions", {
            error: error.message,
            response: (_a = error.response) === null || _a === void 0 ? void 0 : _a.data,
        });
        const errorMessage = ((_e = (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.detail) ||
            error.message ||
            "Failed to list transactions";
        res.status(((_f = error.response) === null || _f === void 0 ? void 0 : _f.status) || 500).json({
            success: false,
            error: errorMessage
        });
    }
});
//# sourceMappingURL=index.js.map