import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Order } from '@/types/order';

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  conversionRate: number;
}

// Firebase Collections Structure:
// - orders/{orderId}
// - users/{userId} 
// - stats/dashboard
// - confirmations/{orderId}

export class DashboardService {
    //TODO:
    // Get dashboard statistics from Firestore
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const statsDoc = await getDoc(doc(db, 'stats', 'dashboard'));
      
      if (statsDoc.exists()) {
        return statsDoc.data() as DashboardStats;
      }
      
      // Fallback: calculate stats from orders collection
      return await this.calculateStatsFromOrders();
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('Failed to load dashboard statistics');
    }
  }

  // Get recent orders from Firestore
  static async getRecentOrders(limitCount: number = 10): Promise<Order[]> {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      throw new Error('Failed to load recent orders');
    }
  }

  // Get orders pending confirmation
  static async getConfirmationOrders(): Promise<Order[]> {
    try {
      const confirmationQuery = query(
        collection(db, 'orders'),
        where('status', '==', 'pending_confirmation'),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(confirmationQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
    } catch (error) {
      console.error('Error fetching confirmation orders:', error);
      throw new Error('Failed to load confirmation orders');
    }
  }

  // Confirm an order
  static async confirmOrder(orderId: string): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error confirming order:', error);
      throw new Error('Failed to confirm order');
    }
  }

  // Reject an order
  static async rejectOrder(orderId: string, reason?: string): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'No reason provided',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error rejecting order:', error);
      throw new Error('Failed to reject order');
    }
  }

  // Helper method to calculate stats from orders
  private static async calculateStatsFromOrders(): Promise<DashboardStats> {
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    const orders = ordersSnapshot.docs.map(doc => doc.data());
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const activeUsers = usersSnapshot.size;
    
    // Simple conversion rate calculation
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    
    return {
      totalRevenue,
      totalOrders,
      activeUsers,
      conversionRate: Number(conversionRate.toFixed(2))
    };
  }
}