"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJRSShipping = exports.trackJRSShipment = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// Define parameters for JRS API
const JRS_API_KEY = (0, params_1.defineString)("JRS_API_KEY");
const JRS_API_URL = (0, params_1.defineString)("JRS_API_URL", { default: "https://jrs-express.azure-api.net/qa-online-shipping-ship/ShippingRequestFunction" });
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
        const { orderId, trackingId, shippingReferenceNo } = req.method === "GET" ? req.query : req.body;
        if (!orderId && !trackingId && !shippingReferenceNo) {
            res.status(400).json({ error: "Missing orderId, trackingId, or shippingReferenceNo" });
            return;
        }
        // If orderId is provided, fetch tracking info from order data
        if (orderId) {
            const orderResult = await fetchOrderData(orderId);
            if ((_b = (_a = orderResult === null || orderResult === void 0 ? void 0 : orderResult.data) === null || _a === void 0 ? void 0 : _a.shippingInfo) === null || _b === void 0 ? void 0 : _b.jrs) {
                const jrsData = orderResult.data.shippingInfo.jrs;
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21;
    try {
        // Check for POST method
        if (req.method !== "POST") {
            res.status(405).json({ error: "Method not allowed" });
            return;
        }
        const payload = req.body;
        // Validate required orderId
        if (!payload.orderId) {
            res.status(400).json({ error: "Missing orderId" });
            return;
        }
        logger.info("Processing JRS shipping request", { orderId: payload.orderId });
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
            email: ((_a = payload.recipientInfo) === null || _a === void 0 ? void 0 : _a.email) || (userData === null || userData === void 0 ? void 0 : userData.email) || ((_b = orderData.shippingInfo) === null || _b === void 0 ? void 0 : _b.email) || "customer@dentpal.ph",
            firstName: ((_c = payload.recipientInfo) === null || _c === void 0 ? void 0 : _c.firstName) || (userData === null || userData === void 0 ? void 0 : userData.firstName) || ((_e = (_d = orderData.shippingInfo) === null || _d === void 0 ? void 0 : _d.fullName) === null || _e === void 0 ? void 0 : _e.split(' ')[0]) || "Customer",
            lastName: ((_f = payload.recipientInfo) === null || _f === void 0 ? void 0 : _f.lastName) || (userData === null || userData === void 0 ? void 0 : userData.lastName) || ((_h = (_g = orderData.shippingInfo) === null || _g === void 0 ? void 0 : _g.fullName) === null || _h === void 0 ? void 0 : _h.split(' ').slice(1).join(' ')) || "N/A",
            middleName: ((_j = payload.recipientInfo) === null || _j === void 0 ? void 0 : _j.middleName) || (userData === null || userData === void 0 ? void 0 : userData.middleName) || "",
            country: ((_k = payload.recipientInfo) === null || _k === void 0 ? void 0 : _k.country) || recipientAddress.country,
            province: ((_l = payload.recipientInfo) === null || _l === void 0 ? void 0 : _l.province) || recipientAddress.state,
            municipality: ((_m = payload.recipientInfo) === null || _m === void 0 ? void 0 : _m.municipality) || recipientAddress.city,
            district: ((_o = payload.recipientInfo) === null || _o === void 0 ? void 0 : _o.district) || recipientAddress.district,
            addressLine1: ((_p = payload.recipientInfo) === null || _p === void 0 ? void 0 : _p.addressLine1) || recipientAddress.addressLine1,
            phone: ((_q = payload.recipientInfo) === null || _q === void 0 ? void 0 : _q.phone) || ((_r = orderData.shippingInfo) === null || _r === void 0 ? void 0 : _r.phoneNumber) || (userData === null || userData === void 0 ? void 0 : userData.contactNumber) || "+639123456789",
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
            recipientInfo: {
                name: `${recipientInfo.firstName} ${recipientInfo.lastName}`,
                address: `${recipientInfo.addressLine1}, ${recipientInfo.district}, ${recipientInfo.municipality}`,
            },
            shipperInfo: {
                name: `${shipperInfo.firstName} ${shipperInfo.lastName}`,
                address: `${shipperInfo.addressLine1}, ${shipperInfo.district}, ${shipperInfo.municipality}`,
            },
        });
        // Make API call to JRS
        const response = await fetch(JRS_API_URL.value(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                "Ocp-Apim-Subscription-Key": JRS_API_KEY.value(),
            },
            body: JSON.stringify(jrsRequest),
        });
        const responseData = await response.json();
        if (!response.ok) {
            logger.error("JRS API error", {
                status: response.status,
                statusText: response.statusText,
                responseData,
                orderId: payload.orderId,
                jrsRequest: jrsRequest, // Log the request for debugging
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
            trackingId: (_12 = responseData.ShippingRequestEntityDto) === null || _12 === void 0 ? void 0 : _12.TrackingId,
            totalShippingAmount: (_13 = responseData.ShippingRequestEntityDto) === null || _13 === void 0 ? void 0 : _13.TotalShippingAmount,
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
                        trackingId: (_14 = responseData.ShippingRequestEntityDto) === null || _14 === void 0 ? void 0 : _14.TrackingId,
                        requestedAt: new Date(),
                        totalShippingAmount: (_15 = responseData.ShippingRequestEntityDto) === null || _15 === void 0 ? void 0 : _15.TotalShippingAmount,
                        pickupSchedule: jrsRequest.apiShippingRequest.requestedPickupSchedule,
                    }
                },
                fulfillmentStage: firestore_1.FieldValue.delete(),
                status: "shipping",
                statusHistory: [
                    ...currentHistory,
                    {
                        status: "shipping",
                        note: `Order shipped via JRS Express. Reference: ${shippingReferenceNo}, Tracking: ${(_16 = responseData.ShippingRequestEntityDto) === null || _16 === void 0 ? void 0 : _16.TrackingId}`,
                        timestamp: new Date(),
                    },
                ],
                updatedAt: new Date(),
            };
            await orderRef.update(updateData);
            logger.info("Order updated in Firestore", {
                orderId: payload.orderId,
                collection: orderResult.collection,
                trackingId: (_17 = responseData.ShippingRequestEntityDto) === null || _17 === void 0 ? void 0 : _17.TrackingId,
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
            trackingId: (_18 = responseData.ShippingRequestEntityDto) === null || _18 === void 0 ? void 0 : _18.TrackingId,
            totalShippingAmount: (_19 = responseData.ShippingRequestEntityDto) === null || _19 === void 0 ? void 0 : _19.TotalShippingAmount,
            jrsResponse: responseData,
            message: "Shipping request created successfully",
            orderData: {
                orderId: payload.orderId,
                recipient: `${recipientInfo.firstName} ${recipientInfo.lastName}`,
                shipper: `${shipperInfo.firstName} ${shipperInfo.lastName}`,
                items: ((_20 = orderData.items) === null || _20 === void 0 ? void 0 : _20.length) || 0,
            },
        });
    }
    catch (error) {
        logger.error("Error in createJRSShipping", {
            error: error instanceof Error ? error.message : "Unknown error",
            orderId: (_21 = req.body) === null || _21 === void 0 ? void 0 : _21.orderId,
            stack: error instanceof Error ? error.stack : undefined,
        });
        res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
//# sourceMappingURL=index.js.map