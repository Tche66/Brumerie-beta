import { Shield, BadgeCheck, Truck, Lock } from 'lucide-react';

export function TrustBanner() {
  const items = [
    { icon: Lock, label: 'Paiement sécurisé' },
    { icon: BadgeCheck, label: 'Vendeurs vérifiés' },
    { icon: Truck, label: 'Livraison locale' },
    { icon: Shield, label: 'Escrow protégé' },
  ];

  return (
    <div className="w-full bg-gray-50 border-b border-gray-100">
      <div className="flex items-center gap-4 px-4 py-2 overflow-x-auto scrollbar-none">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 flex-shrink-0">
            <Icon size={14} className="text-emerald-600" strokeWidth={2.5} />
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
