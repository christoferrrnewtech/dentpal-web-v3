import React from "react";
import NewBookingForm from "../components/booking/NewBookingForm";

const Booking = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-6 py-8">
        <NewBookingForm />
      </div>
    </div>
  );
};

export default Booking;
