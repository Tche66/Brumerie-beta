import { useState, useEffect } from 'react';
import { Users, ShoppingBag, PackageCheck } from 'lucide-react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/config/firebase';

function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR');
}

export function SocialProofBar() {
  const [vendorCount, setVendorCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [sellers, products, orders] = await Promise.all([
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'seller'))),
          getCountFromServer(query(collection(db, 'products'), where('status', '==', 'active'))),
          getCountFromServer(query(collection(db, 'orders'), where('status', '==', 'delivered'))),
        ]);
        setVendorCount(sellers.data().count);
        setProductCount(products.data().count);
        setOrderCount(orders.data().count);
      } catch {
        // Fallback silencieux — les compteurs restent à 0
      }
    };
    fetchCounts();
  }, []);

  if (vendorCount === 0 && productCount === 0 && orderCount === 0) return null;

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
