import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  customer: string;
  amount: string;
  status: "pending" | "completed" | "cancelled";
  date: string;
}

const mockOrders: Order[] = [
  { id: "#12345", customer: "John Doe", amount: "$125.00", status: "completed", date: "2 hours ago" },
  { id: "#12346", customer: "Jane Smith", amount: "$89.50", status: "pending", date: "4 hours ago" },
  { id: "#12347", customer: "Mike Johnson", amount: "$210.00", status: "completed", date: "6 hours ago" },
  { id: "#12348", customer: "Sarah Wilson", amount: "$95.00", status: "cancelled", date: "8 hours ago" },
  { id: "#12349", customer: "Tom Brown", amount: "$156.25", status: "pending", date: "1 day ago" },
];

const RecentOrders = () => {
  const getStatusVariant = (status: Order["status"]) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Orders</h3>
        <button className="text-sm text-primary hover:text-primary/80 font-medium">
          View all
        </button>
      </div>

      <div className="space-y-4">
        {mockOrders.map((order) => (
          <div key={order.id} className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">
                  {order.customer.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground">{order.customer}</p>
                <p className="text-sm text-muted-foreground">{order.id}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-semibold text-foreground">{order.amount}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={getStatusVariant(order.status)} className="text-xs">
                  {order.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{order.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentOrders;