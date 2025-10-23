import { Timestamp } from 'firebase/firestore';

export type BookingStatus = 'pending' | 'processing' | 'completed';

export interface Address {
  houseNumber: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
}

export interface Party {
  name: string;
  phone: string;
  address: Address;
}

export interface OrderDetails {
  itemDescription: string;
  exclusiveDiscount: string;
  voucher: string;
}

export interface BookingFormInput {
  sender: Party;
  recipient: Party;
  dropPoint: string;
  orderDetails: OrderDetails;
  termsAccepted: boolean;
}

export interface Booking {
  id: string;
  sender: Party;
  recipient: Party;
  dropPoint: string;
  orderDetails: OrderDetails;
  status: BookingStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string | null;
}
