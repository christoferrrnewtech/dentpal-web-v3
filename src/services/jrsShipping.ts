// Note: Using direct HTTP calls instead of Firebase Functions SDK for v2 compatibility
const FIREBASE_FUNCTION_URL = 'https://us-central1-dentpal-161e5.cloudfunctions.net/createJRSShipping';

// Types for JRS shipping request
export interface ShipmentItem {
  length: number;
  width: number;
  height: number;
  weight: number;
  declaredValue: number;
}

export interface RecipientInfo {
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  country: string;
  province: string;
  municipality: string;
  district: string;
  addressLine1: string;
  phone: string;
}

export interface ShipperInfo {
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  country: string;
  province: string;
  municipality: string;
  district: string;
  addressLine1: string;
  phone: string;
}

export interface JRSShippingRequest {
  orderId: string;
  recipientInfo: RecipientInfo;
  shipperInfo: ShipperInfo;
  shipmentItems: ShipmentItem[];
  shipmentDescription: string;
  remarks?: string;
  specialInstruction?: string;
  codAmountToCollect?: number;
  requestedPickupSchedule?: string;
  createdByUserEmail: string;
}

export interface JRSShippingResponse {
  success: boolean;
  shippingReferenceNo: string;
  jrsResponse: any;
  message: string;
  error?: string;
  details?: any;
}

class JRSShippingService {
  /**
   * Create a shipping request with JRS Express
   */
  async createShippingRequest(request: JRSShippingRequest): Promise<JRSShippingResponse> {
    try {
      const response = await fetch(FIREBASE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: JRSShippingResponse = await response.json();
      return result;
    } catch (error) {
      console.error('JRS Shipping API error:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to create shipping request'
      );
    }
  }

  /**
   * Extract shipping info from order for JRS API
   */
  extractShippingInfoFromOrder(order: any, userEmail: string, shipperInfo: ShipperInfo): JRSShippingRequest {
    // Extract recipient info from order's shipping info
    const recipientInfo: RecipientInfo = {
      email: order.customer?.email || order.customer?.contact || 'customer@example.com',
      firstName: order.customer?.name?.split(' ')[0] || 'Customer',
      lastName: order.customer?.name?.split(' ').slice(1).join(' ') || 'Name',
      middleName: '',
      country: order.region?.country || order.shippingInfo?.country || 'Philippines',
      province: order.region?.province || order.shippingInfo?.province || '',
      municipality: order.region?.municipality || order.shippingInfo?.municipality || '',
      district: order.region?.barangay || order.shippingInfo?.barangay || order.shippingInfo?.district || '',
      addressLine1: order.shippingInfo?.addressLine1 || order.shippingInfo?.address || '',
      phone: order.customer?.contact || order.shippingInfo?.phoneNumber || '',
    };

    // Create shipment items based on order items
    const shipmentItems: ShipmentItem[] = Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((item: any) => ({
          length: 10, // Default dimensions - you may want to get these from product data
          width: 10,
          height: 5,
          weight: 0.5, // Default weight - you may want to get this from product data
          declaredValue: item.price || 100,
        }))
      : [{
          length: 15,
          width: 15,
          height: 10,
          weight: 1,
          declaredValue: order.total || 500,
        }];

    // Create shipment description
    const shipmentDescription = order.itemsBrief || 
      (Array.isArray(order.items) 
        ? order.items.map((item: any) => `${item.name} x ${item.quantity}`).join(', ')
        : `Order items for ${order.id}`);

    return {
      orderId: order.id,
      recipientInfo,
      shipperInfo,
      shipmentItems,
      shipmentDescription,
      remarks: `DentPal Order #${order.id}`,
      specialInstruction: 'Handle with care - medical/dental supplies',
      codAmountToCollect: order.paymentType === 'cod' ? (order.total || 0) : 0,
      requestedPickupSchedule: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      createdByUserEmail: userEmail,
    };
  }

  /**
   * Get default shipper information
   * You can customize this or make it configurable per seller
   */
  getDefaultShipperInfo(): ShipperInfo {
    return {
      email: 'support@dentpal.ph',
      firstName: 'DentPal',
      lastName: 'Support',
      middleName: '',
      country: 'Philippines',
      province: 'Metro Manila',
      municipality: 'Quezon City',
      district: 'Barangay Kamuning',
      addressLine1: '123 DentPal Street',
      phone: '+639123456789',
    };
  }
}

export default new JRSShippingService();
