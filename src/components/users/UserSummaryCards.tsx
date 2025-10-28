import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from './formatters';

export default function UserSummaryCards({ totalUsers, activeUsers, totalRevenue, totalOrders }:{ totalUsers:number; activeUsers:number; totalRevenue:number; totalOrders:number }){
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card><CardContent className="p-6"><div className="text-sm text-muted-foreground">Total Users</div><div className="text-2xl font-bold">{totalUsers}</div></CardContent></Card>
      <Card><CardContent className="p-6"><div className="text-sm text-muted-foreground">Active Users</div><div className="text-2xl font-bold">{activeUsers}</div></CardContent></Card>
      <Card><CardContent className="p-6"><div className="text-sm text-muted-foreground">Total Revenue</div><div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div></CardContent></Card>
      <Card><CardContent className="p-6"><div className="text-sm text-muted-foreground">Total Orders</div><div className="text-2xl font-bold">{totalOrders}</div></CardContent></Card>
    </div>
  );
}
