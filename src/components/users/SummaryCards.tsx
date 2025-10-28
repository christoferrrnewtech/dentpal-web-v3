import React from "react";
import { Card, CardContent} from "@/components/ui/card";
import { formatCurrency } from "./formatters";

export default function UserSummaryCards ({ totalUsers, activeUsers, totalRevenue, totalOrders}:{ totalUsers: number, activeUsers: number, totalRevenue: number, totalOrders: number }) {
    return (
        <div className ="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card>
                <CardContent>
                    <div>
                        {totalUsers}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <div>
                        {activeUsers}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <div>
                        {formatCurrency(totalRevenue)}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <div>
                        {totalOrders}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}