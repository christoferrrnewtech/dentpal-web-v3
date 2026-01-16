/**
 * ItemsTab - Main Items tab component for sellers
 * 
 * This component serves as the entry point for the Items section
 * in the seller dashboard. It wraps the AddProduct functionality
 * for adding new products to the inventory.
 */

import React from 'react';
import AddProduct from '@/pages/AddProduct';

const ItemsTab: React.FC = () => {
  return <AddProduct />;
};

export default ItemsTab;
