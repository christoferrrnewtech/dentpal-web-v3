import React from "react";
import { BookingProps } from "../types/order.ts";
import NewBookingForm from "../components/booking/NewBookingForm";

const Booking = ({}: BookingProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Management</h1>
              <p className="text-gray-600">Create and manage your delivery bookings</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <NewBookingForm />
      </div>
    </div>
  );
};

export default Booking;
