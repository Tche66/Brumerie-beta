import React from 'react';
import {
  ChevronLeft,
  Search,
  ShieldCheck,
  Package,
  Camera,
  MapPin,
  Wallet,
  Lock,
  UserCheck,
  MessageCircle,
  Truck,
} from 'lucide-react';

interface HowItWorksPageProps {
  onBack?: () => void;
}

export function HowItWorksPage({ onBack }: HowItWorksPageProps) {
  return (
    <div className="min-h-screen bg-white pb-12">
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-1 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
        )}
        <h1 className="text-lg font-bold text-gray-900">Comment ça marche ?</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Comment ça marche ?
          </h2>
          <p className="text-gray-600 text-base md:text-lg">
            Acheter et vendre près de chez toi en 3 étapes
          </p>
        </div>

        {/* Section Acheteurs */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center md:text-left">
            Pour les Acheteurs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              step={1}
              icon={<Search className="w-7 h-7 text-emerald-600" />}
              title="Explore"
              description="Parcours les articles de ton quartier par catégorie"
            />
            <StepCard
              step={2}
              icon={<ShieldCheck className="w-7 h-7 text-emerald-600" />}
              title="Achète en confiance"
              description="Paiement sécurisé avec escrow — ton argent est protégé"
            />
            <StepCard
              step={3}
              icon={<Package className="w-7 h-7 text-emerald-600" />}
              title="Reçois chez toi"
              description="Livraison locale rapide par nos livreurs vérifiés"
            />
          </div>
        </section>

        {/* Section Vendeurs */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center md:text-left">
            Pour les Vendeurs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              step={1}
              icon={<Camera className="w-7 h-7 text-emerald-600" />}
              title="Publie en 30 secondes"
              description="Photo, prix, description — et c'est en ligne"
            />
            <StepCard
              step={2}
              icon={<MapPin className="w-7 h-7 text-emerald-600" />}
              title="Vends localement"
              description="Les acheteurs de ton quartier te trouvent facilement"
            />
            <StepCard
              step={3}
              icon={<Wallet className="w-7 h-7 text-emerald-600" />}
              title="Reçois ton argent"
              description="Paiement viré dès la confirmation de livraison"
            />
          </div>
        </section>

        {/* Section confiance */}
        <section className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
            Pourquoi nous faire confiance ?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TrustBadge icon={<Lock className="w-5 h-5 text-emerald-600" />} label="Escrow sécurisé" />
            <TrustBadge icon={<UserCheck className="w-5 h-5 text-emerald-600" />} label="Vendeurs vérifiés" />
            <TrustBadge icon={<MessageCircle className="w-5 h-5 text-emerald-600" />} label="Chat intégré" />
            <TrustBadge icon={<Truck className="w-5 h-5 text-emerald-600" />} label="Livraison locale" />
          </div>
        </section>
      </div>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col items-center text-center gap-3">
      <div className="flex items-center justify-center w-8 h-8 bg-emerald-600 text-white text-sm font-bold rounded-full">
        {step}
      </div>
      {icon}
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </div>
  );
}
