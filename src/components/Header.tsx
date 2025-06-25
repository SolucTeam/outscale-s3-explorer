import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useS3Store } from '../hooks/useS3Store';
import { OUTSCALE_REGIONS } from '../data/regions';
import { LogOut, Cloud, Globe } from 'lucide-react';
export const Header = () => {
  const {
    credentials,
    logout
  } = useS3Store();
  const currentRegion = OUTSCALE_REGIONS.find(r => r.id === credentials?.region);
  return <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                <Cloud className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NumS3 Console</h1>
                <p className="text-sm text-gray-500">Gestion de vos buckets et fichiers</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {currentRegion?.name || credentials?.region}
              </span>
            </div>
            
            <div className="text-sm text-gray-600">
              <span className="font-medium">{credentials?.accessKey}</span>
            </div>
            
            <Button variant="outline" size="sm" onClick={logout} className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </header>;
};