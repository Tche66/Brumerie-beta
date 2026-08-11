import React from 'react';
import { Users, ShoppingBag, PackageCheck } from 'lucide-react';

interface SocialProofBarProps {
  vendorCount?: number;
  productCount?: number;
  orderCount?: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR');
}

export function SocialProofBar({
  vendorCount = 150,
  productCount = 2500,
  orderCount = 800,
}: SocialProofBarProps) {
  const stats = [
    { icon: Users, value: vendorCount, label: 'vendeurs actifs' },
    { icon: ShoppingBag, value: productCount, label: 'articles en ligne' },
    { icon: PackageCheck, value: orderCount, label: 'commandes livrées' },
  ];

  return (
    <div className="bg-white border-b border-gray-100 py-3 px-4 flex justify-around items-center">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-1.5">
          <stat.icon size={14} className="text-emerald-600 flex-shrink-0" />
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-emerald-700 text-xs sm:text-sm">
              {formatNumber(stat.value)}
            </span>
            <span className="text-xs text-gray-500 hidden sm:inline">
              {stat.label}
            </span>
            <span className="text-[10px] text-gray-500 sm:hidden">
              {stat.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
