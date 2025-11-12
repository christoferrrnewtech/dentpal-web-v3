"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJRSShipping = exports.trackJRSShipment = void 0;
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
        return ({
            length: ((_a = item.dimensions) === null || _a === void 0 ? void 0 : _a.length) || defaultDimensions.length,
            width: ((_b = item.dimensions) === null || _b === void 0 ? void 0 : _b.width) || defaultDimensions.width,
            height: ((_c = item.dimensions) === null || _c === void 0 ? void 0 : _c.height) || defaultDimensions.height,
            weight: ((_d = item.dimensions) === null || _d === void 0 ? void 0 : _d.weight) || defaultDimensions.weight,
            declaredValue: item.price || 100,
        });
    });
};
const generateShipmentDescription = (items) => {
    const productNames = items.map(item => item.productName || "Dental Supply").join(", ");
    return `Dental Supplies: ${productNames}`.substring(0, 100); // Limit length
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
        state: shippingInfo.state || "Metro Manila",
        country: shippingInfo.country || "Philippines",
        postalCode: shippingInfo.postalCode || "",
    };
};
// JRS Tracking function
exports.trackJRSShipment = (0, https_1.onRequest)({
    cors: true,
}, async (req, res) => {
    var _a, _b;
    try {
        if (req.method !== "GET" && req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        // Verify authentication token
        let decodedToken;
        try {
            decodedToken = await verifyAuthToken(req.headers.authorization);
            logger.info("Authenticated tracking request", {
                uid: decodedToken.uid,
                email: decodedToken.email
            });
        }
        catch (authError) {
            logger.warn("Unauthenticated tracking request attempt", {
                ip: req.ip,
                userAgent: req.headers["user-agent"]
            });
            res.status(401).json({
                error: "Authentication required",
                message: authError instanceof Error ? authError.message : "Invalid authentication"
            });
            return;
        }
        const { orderId, trackingId, shippingReferenceNo } = req.method === "GET" ? req.query : req.body;
        if (!orderId && !trackingId && !shippingReferenceNo) {
            res.status(400).json({ error: "Missing orderId, trackingId, or shippingReferenceNo" });
            return;
        }
        // If orderId is provided, fetch tracking info from order data
        if (orderId) {
            const orderResult = await fetchOrderData(orderId);
            if (!(orderResult === null || orderResult === void 0 ? void 0 : orderResult.data)) {
                res.status(404).json({ error: "Order not found" });
                return;
            }
            const orderData = orderResult.data;
            // Authorization check for tracking - same logic as shipping
            const isOrderOwner = orderData.userId === decodedToken.uid;
            const isAdmin = decodedToken.role === 'admin' ||
                ((_a = decodedToken.customClaims) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
            let isSeller = false;
            if (orderData.sellerIds && Array.isArray(orderData.sellerIds)) {
                const sellerPromises = orderData.sellerIds.map((sellerId) => db.collection("Seller").doc(sellerId).get());
                const sellerDocs = await Promise.all(sellerPromises);
                isSeller = sellerDocs.some(doc => { var _a, _b; return doc.exists && (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.userId) === decodedToken.uid || ((_b = doc.data()) === null || _b === void 0 ? void 0 : _b.email) === decodedToken.email); });
            }
            if (!isOrderOwner && !isAdmin && !isSeller) {
                logger.warn("Unauthorized tracking request", {
                    orderId: orderId,
                    authenticatedUser: decodedToken.uid,
                    orderOwner: orderData.userId
                });
                res.status(403).json({
                    error: "Access denied",
                    message: "You are not authorized to view tracking for this order"
                });
                return;
            }
            if ((_b = orderData.shippingInfo) === null || _b === void 0 ? void 0 : _b.jrs) {
                const jrsData = orderData.shippingInfo.jrs;
                res.status(200).json({
                    success: true,
                    orderId: orderId,
                    trackingId: jrsData.trackingId,
                    shippingReferenceNo: jrsData.shippingReferenceNo,
                    totalShippingAmount: jrsData.totalShippingAmount,
                    requestedAt: jrsData.requestedAt,
                    pickupSchedule: jrsData.pickupSchedule,
                    jrsResponse: jrsData.response,
                });
                return;
            }
            else {
                res.status(404).json({ error: "JRS tracking information not found for this order" });
                return;
            }
        }
        // For direct tracking queries, you would implement JRS tracking API call here
        // This would depend on JRS providing a tracking API endpoint
        res.status(501).json({
            error: "Direct tracking not implemented",
            message: "Use orderId to get tracking information from order data",
        });
    }
    catch (error) {
        logger.error("Error in trackJRSShipment", { error });
        res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.createJRSShipping = (0, https_1.onRequest)({
    cors: true,
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31;
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
        const allowedStatuses = ['confirmed', 'paid', 'processing', 'ready_to_ship'];
        if (orderData.status && !allowedStatuses.includes(orderData.status)) {
            res.status(400).json({
                error: "Invalid order status",
                message: `Cannot create shipping for order with status: ${orderData.status}`,
                currentStatus: orderData.status
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
        const shippingReferenceNo = `DPAL-${payload.orderId}-${Date.now()}`;
        // Parse recipient address
        const recipientAddress = parseAddress(orderData.shippingInfo || {});
        // Prepare recipient info (buyer/user)
        const recipientInfo = {
            email: ((_d = payload.recipientInfo) === null || _d === void 0 ? void 0 : _d.email) || (userData === null || userData === void 0 ? void 0 : userData.email) || ((_e = orderData.shippingInfo) === null || _e === void 0 ? void 0 : _e.email) || "customer@dentpal.ph",
            firstName: ((_f = payload.recipientInfo) === null || _f === void 0 ? void 0 : _f.firstName) || (userData === null || userData === void 0 ? void 0 : userData.firstName) || ((_h = (_g = orderData.shippingInfo) === null || _g === void 0 ? void 0 : _g.fullName) === null || _h === void 0 ? void 0 : _h.split(' ')[0]) || "Customer",
            lastName: ((_j = payload.recipientInfo) === null || _j === void 0 ? void 0 : _j.lastName) || (userData === null || userData === void 0 ? void 0 : userData.lastName) || ((_l = (_k = orderData.shippingInfo) === null || _k === void 0 ? void 0 : _k.fullName) === null || _l === void 0 ? void 0 : _l.split(' ').slice(1).join(' ')) || "N/A",
            middleName: ((_m = payload.recipientInfo) === null || _m === void 0 ? void 0 : _m.middleName) || (userData === null || userData === void 0 ? void 0 : userData.middleName) || "",
            country: ((_o = payload.recipientInfo) === null || _o === void 0 ? void 0 : _o.country) || recipientAddress.country,
            province: ((_p = payload.recipientInfo) === null || _p === void 0 ? void 0 : _p.province) || recipientAddress.state,
            municipality: ((_q = payload.recipientInfo) === null || _q === void 0 ? void 0 : _q.municipality) || recipientAddress.city,
            district: ((_r = payload.recipientInfo) === null || _r === void 0 ? void 0 : _r.district) || recipientAddress.district,
            addressLine1: ((_s = payload.recipientInfo) === null || _s === void 0 ? void 0 : _s.addressLine1) || recipientAddress.addressLine1,
            phone: ((_t = payload.recipientInfo) === null || _t === void 0 ? void 0 : _t.phone) || ((_u = orderData.shippingInfo) === null || _u === void 0 ? void 0 : _u.phoneNumber) || (userData === null || userData === void 0 ? void 0 : userData.contactNumber) || "+639123456789",
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
        if ((_w = (_v = sellerData === null || sellerData === void 0 ? void 0 : sellerData.vendor) === null || _v === void 0 ? void 0 : _v.company) === null || _w === void 0 ? void 0 : _w.address) {
            const sellerAddr = sellerData.vendor.company.address;
            shipperAddress = {
                country: "Philippines",
                province: sellerAddr.province || defaultShipperAddress.province,
                municipality: sellerAddr.city || defaultShipperAddress.municipality,
                district: sellerAddr.line2 || defaultShipperAddress.district,
                addressLine1: sellerAddr.line1 || defaultShipperAddress.addressLine1,
                phone: ((_x = sellerData.vendor.contacts) === null || _x === void 0 ? void 0 : _x.phone) || defaultShipperAddress.phone,
            };
        }
        const shipperInfo = {
            email: ((_y = payload.shipperInfo) === null || _y === void 0 ? void 0 : _y.email) || (sellerData === null || sellerData === void 0 ? void 0 : sellerData.email) || "support@dentpal.ph",
            firstName: ((_z = payload.shipperInfo) === null || _z === void 0 ? void 0 : _z.firstName) || ((_0 = sellerData === null || sellerData === void 0 ? void 0 : sellerData.name) === null || _0 === void 0 ? void 0 : _0.split(' ')[0]) || ((_2 = (_1 = sellerData === null || sellerData === void 0 ? void 0 : sellerData.vendor) === null || _1 === void 0 ? void 0 : _1.company) === null || _2 === void 0 ? void 0 : _2.storeName) || "DentPal",
            lastName: ((_3 = payload.shipperInfo) === null || _3 === void 0 ? void 0 : _3.lastName) || ((_4 = sellerData === null || sellerData === void 0 ? void 0 : sellerData.name) === null || _4 === void 0 ? void 0 : _4.split(' ').slice(1).join(' ')) || "Support",
            middleName: ((_5 = payload.shipperInfo) === null || _5 === void 0 ? void 0 : _5.middleName) || "",
            country: ((_6 = payload.shipperInfo) === null || _6 === void 0 ? void 0 : _6.country) || shipperAddress.country,
            province: ((_7 = payload.shipperInfo) === null || _7 === void 0 ? void 0 : _7.province) || shipperAddress.province,
            municipality: ((_8 = payload.shipperInfo) === null || _8 === void 0 ? void 0 : _8.municipality) || shipperAddress.municipality,
            district: ((_9 = payload.shipperInfo) === null || _9 === void 0 ? void 0 : _9.district) || shipperAddress.district,
            addressLine1: ((_10 = payload.shipperInfo) === null || _10 === void 0 ? void 0 : _10.addressLine1) || shipperAddress.addressLine1,
            phone: ((_11 = payload.shipperInfo) === null || _11 === void 0 ? void 0 : _11.phone) || shipperAddress.phone,
        };
        // Calculate shipment items from order
        const shipmentItems = payload.shipmentItems || calculateShipmentItems(orderData.items || []);
        // Generate shipment description
        const shipmentDescription = payload.shipmentDescription || generateShipmentDescription(orderData.items || []);
        // COD amount - use order total if cash on delivery
        const codAmount = payload.codAmountToCollect ||
            (((_12 = orderData.paymentInfo) === null || _12 === void 0 ? void 0 : _12.method) === 'cod' ? ((_13 = orderData.summary) === null || _13 === void 0 ? void 0 : _13.total) || 0 : 0);
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
                remarks: payload.remarks || ((_14 = orderData.shippingInfo) === null || _14 === void 0 ? void 0 : _14.notes) || "",
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
                status: (_15 = axiosError.response) === null || _15 === void 0 ? void 0 : _15.status,
                statusText: (_16 = axiosError.response) === null || _16 === void 0 ? void 0 : _16.statusText,
                orderId: payload.orderId,
                shippingReferenceNo,
                errorCode: ((_18 = (_17 = axiosError.response) === null || _17 === void 0 ? void 0 : _17.data) === null || _18 === void 0 ? void 0 : _18.ErrorCode) || axiosError.code,
                errorMessage: ((_20 = (_19 = axiosError.response) === null || _19 === void 0 ? void 0 : _19.data) === null || _20 === void 0 ? void 0 : _20.ErrorMessage) || "Network error",
            });
            res.status(400).json({
                error: "JRS API request failed",
                details: ((_21 = axiosError.response) === null || _21 === void 0 ? void 0 : _21.data) || axiosError.message,
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
        logger.info("JRS API success", {
            orderId: payload.orderId,
            shippingReferenceNo,
            trackingId: (_22 = responseData.ShippingRequestEntityDto) === null || _22 === void 0 ? void 0 : _22.TrackingId,
            totalShippingAmount: (_23 = responseData.ShippingRequestEntityDto) === null || _23 === void 0 ? void 0 : _23.TotalShippingAmount,
        });
        // Update order in Firestore with JRS response
        try {
            const orderRef = db.collection(orderResult.collection).doc(payload.orderId);
            const currentHistory = Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [];
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
                    }
                },
                fulfillmentStage: firestore_1.FieldValue.delete(),
                status: "shipping",
                statusHistory: [
                    ...currentHistory,
                    {
                        status: "shipping",
                        note: `Order shipped via JRS Express. Reference: ${shippingReferenceNo}, Tracking: ${(_26 = responseData.ShippingRequestEntityDto) === null || _26 === void 0 ? void 0 : _26.TrackingId}`,
                        timestamp: firestore_1.FieldValue.serverTimestamp(),
                    },
                ],
                updatedAt: new Date(),
            };
            await orderRef.update(updateData);
            logger.info("Order updated in Firestore", {
                orderId: payload.orderId,
                collection: orderResult.collection,
                trackingId: (_27 = responseData.ShippingRequestEntityDto) === null || _27 === void 0 ? void 0 : _27.TrackingId,
            });
        }
        catch (firestoreError) {
            logger.error("Failed to update order in Firestore", {
                orderId: payload.orderId,
                error: firestoreError,
            });
            // Don't fail the entire request if Firestore update fails
        }
        // Return success response
        res.status(200).json({
            success: true,
            shippingReferenceNo,
            trackingId: (_28 = responseData.ShippingRequestEntityDto) === null || _28 === void 0 ? void 0 : _28.TrackingId,
            totalShippingAmount: (_29 = responseData.ShippingRequestEntityDto) === null || _29 === void 0 ? void 0 : _29.TotalShippingAmount,
            jrsResponse: responseData,
            message: "Shipping request created successfully",
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
//# sourceMappingURL=index.js.map