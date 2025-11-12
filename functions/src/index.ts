import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth, DecodedIdToken} from "firebase-admin/auth";
import {defineString} from "firebase-functions/params";
import axios from "axios";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const auth = getAuth();

// Define parameters for JRS API
const JRS_API_KEY = defineString("JRS_API_KEY");
const JRS_API_URL = defineString("JRS_API_URL", {default: "https://jrs-express.azure-api.net/qa-online-shipping-ship/ShippingRequestFunction"});

const verifyAuthToken = async (authorizationHeader: string | undefined): Promise<DecodedIdToken> => {
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
  } catch (error) {
    logger.error("Token verification failed", { error });
    throw new Error("Invalid or expired authentication token");
  }
};

// Types for JRS API
interface ShipmentItem {
  length: number;
  width: number;
  height: number;
  weight: number;
  declaredValue: number;
}

interface JRSShippingRequest {
  requestType: "shipfromecom";
  apiShippingRequest: {
    express: boolean;
    insurance: boolean;
    valuation: boolean;
    createdByUserEmail: string;
    shipmentItems: ShipmentItem[];
    recipientEmail: string;
    recipientFirstName: string;
    recipientLastName: string;
    recipientMiddleName?: string;
    recipientCountry: string;
    recipientProvince: string;
    recipientMunicipality: string;
    recipientDistrict: string;
    recipientAddressLine1: string;
    recipientPhone: string;
    shipperEmail: string;
    shipperFirstName: string;
    shipperLastName: string;
    shipperMiddleName?: string;
    shipperCountry: string;
    shipperProvince: string;
    shipperMunicipality: string;
    shipperDistrict: string;
    shipperAddressLine1: string;
    shipperPhone: string;
    requestedPickupSchedule: string;
    shipmentDescription: string;
    remarks?: string;
    specialInstruction?: string;
    codAmountToCollect: number;
    shippingReferenceNo: string;
  };
}

// Enhanced payload structure to work with existing Firestore data
interface ShippingRequestPayload {
  orderId: string;
  // Optional - if not provided, will fetch from Firestore
  order?: any;
  seller?: any;
  user?: any;
  // Override options
  recipientInfo?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    country?: string;
    province?: string;
    municipality?: string;
    district?: string;
    addressLine1?: string;
    phone?: string;
  };
  shipperInfo?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    country?: string;
    province?: string;
    municipality?: string;
    district?: string;
    addressLine1?: string;
    phone?: string;
  };
  shipmentItems?: ShipmentItem[];
  shipmentDescription?: string;
  remarks?: string;
  specialInstruction?: string;
  codAmountToCollect?: number;
  requestedPickupSchedule?: string;
  createdByUserEmail?: string;
}

// Helper functions
const fetchOrderData = async (orderId: string) => {
  const collections = ["Order", "orders"];
  
  for (const collectionName of collections) {
    const orderDoc = await db.collection(collectionName).doc(orderId).get();
    if (orderDoc.exists) {
      return {data: orderDoc.data(), collection: collectionName};
    }
  }
  return null;
};

const fetchUserData = async (userId: string) => {
  const userDoc = await db.collection("web_users").doc(userId).get();
  if (userDoc.exists) {
    return userDoc.data();
  }
  return null;
};

const fetchSellerData = async (sellerId: string) => {
  const sellerDoc = await db.collection("Seller").doc(sellerId).get();
  if (sellerDoc.exists) {
    return sellerDoc.data();
  }
  return null;
};

const calculateShipmentItems = (orderItems: any[]): ShipmentItem[] => {
  // Default dimensions if not provided in order items
  const defaultDimensions = {
    length: 20, // cm
    width: 15,  // cm
    height: 10, // cm
    weight: 0.5, // kg
  };

  return orderItems.map((item) => {
    const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
    const length = item.dimensions?.length || defaultDimensions.length;
    const width = item.dimensions?.width || defaultDimensions.width;
    const height = item.dimensions?.height || defaultDimensions.height;
    const unitWeight = item.dimensions?.weight || defaultDimensions.weight;
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

const generateShipmentDescription = (items: any[]): string => {
  const productNames = items.map(item => item.productName || "Dental Supply").join(", ");
  return `Dental Supplies: ${productNames}`.substring(0, 100); // Limit length
};

const parseAddress = (shippingInfo: any) => {
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
export const trackJRSShipment = onRequest({
  cors: true,
}, async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    // Verify authentication token
    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await verifyAuthToken(req.headers.authorization);
      logger.info("Authenticated tracking request", { 
        uid: decodedToken.uid, 
        email: decodedToken.email 
      });
    } catch (authError) {
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
      res.status(400).json({error: "Missing orderId, trackingId, or shippingReferenceNo"});
      return;
    }

    // If orderId is provided, fetch tracking info from order data
    if (orderId) {
      const orderResult = await fetchOrderData(orderId as string);
      if (!orderResult?.data) {
        res.status(404).json({error: "Order not found"});
        return;
      }

      const orderData = orderResult.data;
      
      // Authorization check for tracking - same logic as shipping
      const isOrderOwner = orderData.userId === decodedToken.uid;
      const isAdmin = decodedToken.role === 'admin' || 
                     decodedToken.customClaims?.role === 'admin';
      
      let isSeller = false;
      if (orderData.sellerIds && Array.isArray(orderData.sellerIds)) {
        const sellerPromises = orderData.sellerIds.map((sellerId: string) => 
          db.collection("Seller").doc(sellerId).get()
        );
        const sellerDocs = await Promise.all(sellerPromises);
        isSeller = sellerDocs.some(doc => 
          doc.exists && (doc.data()?.userId === decodedToken.uid || doc.data()?.email === decodedToken.email)
        );
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

      if (orderData.shippingInfo?.jrs) {
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
      } else {
        res.status(404).json({error: "JRS tracking information not found for this order"});
        return;
      }
    }

    // For direct tracking queries, you would implement JRS tracking API call here
    // This would depend on JRS providing a tracking API endpoint
    res.status(501).json({
      error: "Direct tracking not implemented",
      message: "Use orderId to get tracking information from order data",
    });
  } catch (error) {
    logger.error("Error in trackJRSShipment", {error});
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export const createJRSShipping = onRequest({
  cors: true,
}, async (req, res) => {
  try {
    // Check for POST method
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    // Verify authentication token
    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await verifyAuthToken(req.headers.authorization);
      logger.info("Authenticated shipping request", { 
        uid: decodedToken.uid, 
        email: decodedToken.email 
      });
    } catch (authError) {
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

    const payload = req.body as ShippingRequestPayload;

    // Validate required orderId
    if (!payload.orderId) {
      res.status(400).json({error: "Missing orderId"});
      return;
    }

    logger.info("Processing JRS shipping request", {
      orderId: payload.orderId,
      authenticatedUser: decodedToken.uid
    });

    // Fetch order data from Firestore
    const orderResult = await fetchOrderData(payload.orderId);
    if (!orderResult) {
      res.status(404).json({error: "Order not found"});
      return;
    }

    const orderData = orderResult.data;
    if (!orderData) {
      res.status(404).json({error: "Order data not found"});
      return;
    }

    // Authorization check - ensure user can access this order
    // Allow if user is the order owner, a seller involved, or an admin
    const isOrderOwner = orderData.userId === decodedToken.uid;
    const isAdmin = decodedToken.role === 'admin' || 
                   decodedToken.customClaims?.role === 'admin';
    
    let isSeller = false;
    if (orderData.sellerIds && Array.isArray(orderData.sellerIds)) {
      // Check if authenticated user is one of the sellers for this order
      const sellerPromises = orderData.sellerIds.map((sellerId: string) => 
        db.collection("Seller").doc(sellerId).get()
      );
      const sellerDocs = await Promise.all(sellerPromises);
      isSeller = sellerDocs.some(doc => 
        doc.exists && (doc.data()?.userId === decodedToken.uid || doc.data()?.email === decodedToken.email)
      );
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
    if (orderData.shippingInfo?.jrs?.trackingId) {
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
      email: payload.recipientInfo?.email || userData?.email || orderData.shippingInfo?.email || "customer@dentpal.ph",
      firstName: payload.recipientInfo?.firstName || userData?.firstName || orderData.shippingInfo?.fullName?.split(' ')[0] || "Customer",
      lastName: payload.recipientInfo?.lastName || userData?.lastName || orderData.shippingInfo?.fullName?.split(' ').slice(1).join(' ') || "N/A",
      middleName: payload.recipientInfo?.middleName || userData?.middleName || "",
      country: payload.recipientInfo?.country || recipientAddress.country,
      province: payload.recipientInfo?.province || recipientAddress.state,
      municipality: payload.recipientInfo?.municipality || recipientAddress.city,
      district: payload.recipientInfo?.district || recipientAddress.district,
      addressLine1: payload.recipientInfo?.addressLine1 || recipientAddress.addressLine1,
      phone: payload.recipientInfo?.phone || orderData.shippingInfo?.phoneNumber || userData?.contactNumber || "+639123456789",
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
    if (sellerData?.vendor?.company?.address) {
      const sellerAddr = sellerData.vendor.company.address;
      shipperAddress = {
        country: "Philippines",
        province: sellerAddr.province || defaultShipperAddress.province,
        municipality: sellerAddr.city || defaultShipperAddress.municipality,
        district: sellerAddr.line2 || defaultShipperAddress.district,
        addressLine1: sellerAddr.line1 || defaultShipperAddress.addressLine1,
        phone: sellerData.vendor.contacts?.phone || defaultShipperAddress.phone,
      };
    }

    const shipperInfo = {
      email: payload.shipperInfo?.email || sellerData?.email || "support@dentpal.ph",
      firstName: payload.shipperInfo?.firstName || sellerData?.name?.split(' ')[0] || sellerData?.vendor?.company?.storeName || "DentPal",
      lastName: payload.shipperInfo?.lastName || sellerData?.name?.split(' ').slice(1).join(' ') || "Support",
      middleName: payload.shipperInfo?.middleName || "",
      country: payload.shipperInfo?.country || shipperAddress.country,
      province: payload.shipperInfo?.province || shipperAddress.province,
      municipality: payload.shipperInfo?.municipality || shipperAddress.municipality,
      district: payload.shipperInfo?.district || shipperAddress.district,
      addressLine1: payload.shipperInfo?.addressLine1 || shipperAddress.addressLine1,
      phone: payload.shipperInfo?.phone || shipperAddress.phone,
    };

    // Calculate shipment items from order
    const shipmentItems = payload.shipmentItems || calculateShipmentItems(orderData.items || []);

    // Generate shipment description
    const shipmentDescription = payload.shipmentDescription || generateShipmentDescription(orderData.items || []);

    // COD amount - use order total if cash on delivery
    const codAmount = payload.codAmountToCollect || 
      (orderData.paymentInfo?.method === 'cod' ? orderData.summary?.total || 0 : 0);

    // Prepare JRS API request
    const jrsRequest: JRSShippingRequest = {
      requestType: "shipfromecom",
      apiShippingRequest: {
        express: true,
        insurance: true,
        valuation: true,
        createdByUserEmail: payload.createdByUserEmail || sellerData?.email || "admin@dentpal.ph",
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
        remarks: payload.remarks || orderData.shippingInfo?.notes || "",
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
      response = await axios.post(JRS_API_URL.value(), jrsRequest, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Ocp-Apim-Subscription-Key": JRS_API_KEY.value(),
        },
      });
      responseData = response.data;
    } catch (axiosError: any) {
      logger.error("JRS API error", {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        orderId: payload.orderId,
        shippingReferenceNo,
        errorCode: axiosError.response?.data?.ErrorCode || axiosError.code,
        errorMessage: axiosError.response?.data?.ErrorMessage || "Network error",
      });
      
      res.status(400).json({
        error: "JRS API request failed",
        details: axiosError.response?.data || axiosError.message,
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
      trackingId: responseData.ShippingRequestEntityDto?.TrackingId,
      totalShippingAmount: responseData.ShippingRequestEntityDto?.TotalShippingAmount,
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
            trackingId: responseData.ShippingRequestEntityDto?.TrackingId,
            requestedAt: new Date(),
            totalShippingAmount: responseData.ShippingRequestEntityDto?.TotalShippingAmount,
            pickupSchedule: jrsRequest.apiShippingRequest.requestedPickupSchedule,
          }
        },
        fulfillmentStage: FieldValue.delete(),
        status: "shipping",
        statusHistory: [
          ...currentHistory,
          {
            status: "shipping", 
            note: `Order shipped via JRS Express. Reference: ${shippingReferenceNo}, Tracking: ${responseData.ShippingRequestEntityDto?.TrackingId}`,
            timestamp: FieldValue.serverTimestamp(),
          },
        ],
        updatedAt: new Date(),
      };

      await orderRef.update(updateData);

      logger.info("Order updated in Firestore", {
        orderId: payload.orderId,
        collection: orderResult.collection,
        trackingId: responseData.ShippingRequestEntityDto?.TrackingId,
      });
    } catch (firestoreError) {
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
      trackingId: responseData.ShippingRequestEntityDto?.TrackingId,
      totalShippingAmount: responseData.ShippingRequestEntityDto?.TotalShippingAmount,
      jrsResponse: responseData,
      message: "Shipping request created successfully",
      orderData: {
        orderId: payload.orderId,
        recipient: `${recipientInfo.firstName} ${recipientInfo.lastName}`,
        shipper: `${shipperInfo.firstName} ${shipperInfo.lastName}`,
        items: orderData.items?.length || 0,
      },
    });
  } catch (error) {
    logger.error("Error in createJRSShipping", {
      error: error instanceof Error ? error.message : "Unknown error",
      orderId: (req.body as any)?.orderId,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
