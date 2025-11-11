import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {defineString} from "firebase-functions/params";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Define parameters for JRS API
const JRS_API_KEY = defineString("JRS_API_KEY");
const JRS_API_URL = defineString("JRS_API_URL", {default: "https://jrs-express.azure-api.net/qa-online-shipping-ship/ShippingRequestFunction"});

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

  return orderItems.map((item) => ({
    length: item.dimensions?.length || defaultDimensions.length,
    width: item.dimensions?.width || defaultDimensions.width,
    height: item.dimensions?.height || defaultDimensions.height,
    weight: item.dimensions?.weight || defaultDimensions.weight,
    declaredValue: item.price || 100,
  }));
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

    const { orderId, trackingId, shippingReferenceNo } = req.method === "GET" ? req.query : req.body;

    if (!orderId && !trackingId && !shippingReferenceNo) {
      res.status(400).json({error: "Missing orderId, trackingId, or shippingReferenceNo"});
      return;
    }

    // If orderId is provided, fetch tracking info from order data
    if (orderId) {
      const orderResult = await fetchOrderData(orderId as string);
      if (orderResult?.data?.shippingInfo?.jrs) {
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

    const payload = req.body as ShippingRequestPayload;

    // Validate required orderId
    if (!payload.orderId) {
      res.status(400).json({error: "Missing orderId"});
      return;
    }

    logger.info("Processing JRS shipping request", {orderId: payload.orderId});

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
            timestamp: new Date(),
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
