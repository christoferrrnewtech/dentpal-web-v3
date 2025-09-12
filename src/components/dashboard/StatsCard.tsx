import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
}

const StatsCard = ({ title, value, change, trend, icon: Icon }: StatsCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-soft hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
          <div className="flex items-center mt-2">
            <span className={`text-sm font-medium ${
              trend === "up" ? "text-success" : "text-destructive"
            }`}>
              {change}
            </span>
            <span className="text-xs text-muted-foreground ml-1">vs last month</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          trend === "up" 
            ? "bg-success/10 text-success" 
            : "bg-destructive/10 text-destructive"
        }`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;