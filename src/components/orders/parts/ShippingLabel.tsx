import React from 'react';

interface ShippingLabelProps {
  orderId?: string;
  buyerName?: string;
  buyerAddress?: string;
  buyerContact?: string;
  sellerName?: string;
  sellerAddress?: string;
  sellerContact?: string;
  items?: Array<{
    name: string;
    variation?: string;
    sku?: string;
    qty: number;
  }>;
}

const ShippingLabel: React.FC<ShippingLabelProps> = ({
  orderId = "251029BM7FKDB7",
  buyerName = "Rose Dramavo",
  buyerAddress = "44 Old Sauyo Road, Sauyo, Quezon City, Metro Manila, 1116",
  sellerName = "CURAPROX Philippines",
  sellerAddress = "Unit 1207, 12/F Cityland Herrera Tower, Rufino St. cor. Valero St., Brgy. Bel-Air, Makati City, Metro Manila, 1227",
  items = [
    {
      name: "Curaprox Travel Set Compact CS 5460 Toothbrush BE YOU Toothpaste and Interdental Brush Dental Kit",
      variation: "Yellow",
      sku: "PH2542962439906",
      qty: 1,
    },
    {
      name: "Curaprox Be You Gentle Teeth Whitening Toothpaste with Fluoride 10ml Travel Size Set Refill",
      variation: "Watermelon (Pink)",
      sku: "-",
      qty: 1,
    },
  ],
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto bg-white text-black border border-black font-mono text-[10px] leading-tight p-3">
      {/* Header Section */}
      <div className="flex justify-between items-start border-b border-black pb-2 mb-2">
        <div className="flex-1">
          <div className="text-3xl font-bold leading-none">B-302</div>
          <div className="text-xs font-semibold">EQC-06</div>
          <div className="text-xs font-semibold">D-16-SAUYO-LR [H]</div>
          <div className="text-xs mt-1">Order ID: <span className="font-bold">{orderId}</span></div>
        </div>

        {/* QR Placeholder */}
        <div className="w-20 h-20 border border-black flex items-center justify-center text-[7px]">
          QR CODE
        </div>
      </div>

      {/* Buyer / Seller Section */}
      <div className="border border-black mb-2">
        {/* Buyer */}
        <div className="flex border-b border-black">
          <div className="w-10 border-r border-black font-bold text-center py-1">BUYER</div>
          <div className="flex-1 px-2 py-1">
            <div className="font-bold">{buyerName}</div>
            <div>{buyerAddress}</div>
          </div>
        </div>

        {/* Seller */}
        <div className="flex">
          <div className="w-10 border-r border-black font-bold text-center py-1">SELLER</div>
          <div className="flex-1 px-2 py-1">
            <div className="font-bold">{sellerName}</div>
            <div>{sellerAddress}</div>
          </div>
        </div>
      </div>

      {/* Barcode Section */}
      <div className="border border-black text-center mb-2">
        <div className="font-bold text-[11px] border-b border-black py-1">PH2542962439906</div>
        <div className="flex items-center justify-center h-12">
          <div className="text-[8px]">BARCODE AREA</div>
        </div>
      </div>

      {/* Packing List */}
      <div className="border border-black">
        <div className="bg-gray-100 border-b border-black px-2 py-1 font-bold">
          Packing List
        </div>
        <div className="p-2">
          <div className="text-[9px] mb-1 font-semibold">Order ID: {orderId}</div>
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="border-b border-black font-bold">
                <th className="text-left py-1 w-[45%]">Product Name</th>
                <th className="text-left py-1 w-[25%]">Variation</th>
                <th className="text-left py-1 w-[20%]">SKU</th>
                <th className="text-right py-1 w-[10%]">Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-300 last:border-0 align-top">
                  <td className="py-1">{item.name}</td>
                  <td className="py-1">{item.variation || "-"}</td>
                  <td className="py-1">{item.sku || "-"}</td>
                  <td className="text-right py-1">{item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShippingLabel;
