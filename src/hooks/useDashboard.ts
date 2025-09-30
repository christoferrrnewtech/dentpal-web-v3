import {useState, useEffect} from "react";
import { DashboardService, DashboardStats } from "@/services/dashboardService";
import { Order } from "@/types/order";
import { set } from "date-fns";

export interface DashboardState {
    activeTab: string;
    stats: DashboardStats;
    recentOrders: Order[];
    confirmationsOrders: Order[];
}

export function useDashboard() {
    const [state, setState] = useState<DashboardState>({
        activeTab: 'stats',
        stats: {
            totalRevenue: 0,
            totalOrders: 0,
            activeUsers: 0,
            conversionRate: 0,
        },
        recentOrders: [],
        confirmationsOrders: [],
    });

    const [loading, setLoading] = useState (false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);
    
    const loadDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsData, ordersData, confirmationsOrders] = await Promise.all([
                DashboardService.getDashboardStats(),
                DashboardService.getRecentOrders(10),
                DashboardService.getConfirmationOrders(),
            ]);
            setState(prev => ({
                ...prev,
                stats: statsData,
                recentOrders: ordersData,
                confirmationsOrders: confirmationsOrders,
            }));
        } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const setActiveTab = (tab: string) => {
        setState(prev => ({...prev, activeTab: tab}));
    };

    const handleConfirmOrder = async (orderId: string) => {
        setLoading(true);
        setError(null);
        try {
            await DashboardService.confirmOrder(orderId);

            setState(prev => ({
                ...prev,
                confirmationsOrders: prev.confirmationsOrders.filter(order => order.id !== orderId),
            }));
        } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm order');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectOrder = async (orderId: string, reason?: string) => {
        setLoading(true);
        setError(null);

        try {
            await DashboardService.rejectOrder(orderId, reason);
            
            setState(prev => ({
                ...prev,
                confirmationsOrders: prev.confirmationsOrders.filter(order => order.id !== orderId),
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reject order');
        } finally {
            setLoading(false);
        }
    };

    const refreshDashboardData = () => loadDashboardData();

    return {
        state,
        loading,
        error,
        setError,
        actions: {
            setActiveTab,
            handleConfirmOrder,
            handleRejectOrder,
            refreshDashboardData
        },
    };
}