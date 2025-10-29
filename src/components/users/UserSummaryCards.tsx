import React from "react";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle, DollarSign, ShoppingCart } from "lucide-react";

export default function UserSummaryCards({
  totalUsers,
  activeUsers,
  totalRevenue,
  totalOrders,
}: {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalOrders: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="shadow-md flex items-center p-4 space-x-4">
        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100">
          <Users className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Users</p>
          <p className="text-2xl font-bold text-gray-800 leading-tight">
            {totalUsers}
          </p>
        </div>
      </Card>

      <Card className="shadow-md flex items-center p-4 space-x-4">
        <div className="flex-shrink-0 p-3 rounded-full bg-green-100">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Active Users</p>
          <p className="text-2xl font-bold text-gray-800 leading-tight">
            {activeUsers}
          </p>
        </div>
      </Card>

      <Card className="shadow-md flex items-center p-4 space-x-4">
        <div className="flex-shrink-0 p-3 rounded-full bg-yellow-100">
          <DollarSign className="w-6 h-6 text-yellow-600" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-800 leading-tight">
            ₱{totalRevenue.toLocaleString()}
          </p>
        </div>
      </Card>

      <Card className="shadow-md flex items-center p-4 space-x-4">
        <div className="flex-shrink-0 p-3 rounded-full bg-purple-100">
          <ShoppingCart className="w-6 h-6 text-purple-600" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Orders</p>
          <p className="text-2xl font-bold text-gray-800 leading-tight">
            {totalOrders}
          </p>
        </div>
      </Card>
    </div>
  );
}
