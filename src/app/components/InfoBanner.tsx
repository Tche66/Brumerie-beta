import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from './ui/button';

export function InfoBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-indigo-50 border-b border-indigo-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <p className="text-sm text-indigo-900">
              <span className="font-semibold">Prototype MVP :</span> Cette version utilise LocalStorage. 
              Les données sont sauvegardées localement dans votre navigateur.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 h-8 w-8 text-indigo-600 hover:bg-indigo-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
