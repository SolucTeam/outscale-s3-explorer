import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useS3Store } from '../hooks/useS3Store';
import { BreadcrumbItem } from '../types/s3';
import { ChevronRight, Home, Folder } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Raccourcit un segment de chemin trop long
 */
const truncateSegment = (segment: string, maxLength: number = 20): string => {
  if (segment.length <= maxLength) return segment;
  
  // Pour les hashes (SHA256, etc.), garder début et fin
  if (/^[a-f0-9]{40,}$/i.test(segment)) {
    return `${segment.slice(0, 8)}...${segment.slice(-8)}`;
  }
  
  // Pour les noms normaux, garder le début et l'extension
  const parts = segment.split('.');
  if (parts.length > 1) {
    const extension = parts.pop();
    const name = parts.join('.');
    if (name.length > maxLength - extension!.length - 4) {
      return `${name.slice(0, maxLength - extension!.length - 7)}...${extension}`;
    }
  }
  
  // Sinon, couper au milieu
  return `${segment.slice(0, maxLength - 3)}...`;
};

export const Breadcrumb = () => {
  const { currentBucket, currentPath, setCurrentPath } = useS3Store();
  const navigate = useNavigate();

  if (!currentBucket) return null;

  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : [];
  
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: 'Buckets', path: '' },
    { name: currentBucket, path: '' } // Path vide = racine du bucket
  ];

  // 🔧 FIX: Construire le chemin de manière incrémentale
  // Chaque item.path contient UNIQUEMENT le chemin relatif au bucket
  pathParts.forEach((part, index) => {
    const pathUpToHere = pathParts.slice(0, index + 1).join('/');
    breadcrumbItems.push({
      name: part,
      path: pathUpToHere // Chemin relatif (sans le bucket)
    });
  });

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    console.log('🔍 Breadcrumb click:', {
      item,
      currentBucket,
      currentPath
    });

    if (item.path === '' && item.name === 'Buckets') {
      // Retour à la liste des buckets
      setCurrentPath('');
      navigate('/dashboard');
    } else if (item.path === '' && item.name === currentBucket) {
      // Retour à la racine du bucket
      setCurrentPath('');
      navigate(`/bucket/${encodeURIComponent(currentBucket)}`);
    } else {
      // Navigation vers un dossier spécifique
      setCurrentPath(item.path);
      
      // Encoder chaque segment du chemin séparément
      const encodedPath = item.path
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
      
      navigate(`/bucket/${encodeURIComponent(currentBucket)}/folder/${encodedPath}`);
      
      console.log('✅ Navigating to:', {
        newPath: item.path,
        encodedPath,
        fullUrl: `/bucket/${encodeURIComponent(currentBucket)}/folder/${encodedPath}`
      });
    }
  };

  // Fonction pour afficher un élément de breadcrumb avec tooltip si tronqué
  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number, totalItems: number) => {
    const isLast = index === totalItems - 1;
    const isTruncated = item.name.length > 20;
    const displayName = truncateSegment(item.name);
    
    const buttonContent = (
      <Button
        variant="ghost"
        size="sm"
        className={`h-auto px-2 py-1 font-medium hover:text-blue-600 transition-colors ${
          isLast 
            ? 'text-blue-600 cursor-default' 
            : 'text-gray-600 hover:bg-white'
        }`}
        onClick={() => !isLast && handleBreadcrumbClick(item)}
        disabled={isLast}
      >
        {index === 0 ? (
          <Home className="w-4 h-4 mr-1" />
        ) : index === 1 ? (
          <Folder className="w-4 h-4 mr-1" />
        ) : null}
        <span className="max-w-[200px] truncate">{displayName}</span>
      </Button>
    );

    // Si le nom est tronqué, afficher un tooltip avec le nom complet
    if (isTruncated) {
      return (
        <TooltipProvider key={`breadcrumb-${index}-${item.path}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent 
              side="bottom" 
              className="max-w-md break-all bg-gray-900 text-white text-xs"
            >
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <React.Fragment key={`breadcrumb-${index}-${item.path}`}>
        {buttonContent}
      </React.Fragment>
    );
  };

  const totalBreadcrumbItems = breadcrumbItems.length;

  // Gérer l'affichage avec ellipsis si trop de segments
  const renderBreadcrumbs = () => {
    // Si moins de 6 segments, afficher tout
    if (totalBreadcrumbItems <= 6) {
      return breadcrumbItems.map((item, index) => (
        <div key={`container-${index}-${item.path}`} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />}
          {renderBreadcrumbItem(item, index, totalBreadcrumbItems)}
        </div>
      ));
    }

    // Si plus de 6 segments, afficher : Home / Bucket / ... / Avant-avant-dernier / Avant-dernier / Dernier
    const result: React.ReactNode[] = [];
    
    // Toujours afficher les 2 premiers (Home + Bucket)
    for (let i = 0; i < 2; i++) {
      result.push(
        <div key={`container-start-${i}`} className="flex items-center">
          {i > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />}
          {renderBreadcrumbItem(breadcrumbItems[i], i, totalBreadcrumbItems)}
        </div>
      );
    }

    // Segments cachés (du milieu)
    const hiddenItems = breadcrumbItems.slice(2, -3);
    
    // Ellipsis cliquable pour les segments du milieu
    if (hiddenItems.length > 0) {
      result.push(
        <div key="ellipsis" className="flex items-center">
          <ChevronRight className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-gray-400 hover:text-gray-600"
                  >
                    <span>...</span>
                  </Button>
                  {/* Menu déroulant au survol */}
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px] hidden group-hover:block">
                    {hiddenItems.map((item, idx) => {
                      return (
                        <Button
                          key={`hidden-${idx}-${item.path}`}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-auto px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                          onClick={() => handleBreadcrumbClick(item)}
                        >
                          <Folder className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{truncateSegment(item.name, 30)}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="max-w-md bg-gray-900 text-white text-xs"
              >
                <p>Cliquez ou survolez pour voir les {hiddenItems.length} dossiers masqués</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    }

    // Afficher les 3 derniers segments (pour éviter le problème de navigation)
    const lastThree = breadcrumbItems.slice(-3);
    lastThree.forEach((item, idx) => {
      const originalIndex = totalBreadcrumbItems - 3 + idx;
      result.push(
        <div key={`container-end-${originalIndex}-${item.path}`} className="flex items-center">
          <ChevronRight className="w-4 h-4 text-gray-400 mx-1 flex-shrink-0" />
          {renderBreadcrumbItem(item, originalIndex, totalBreadcrumbItems)}
        </div>
      );
    });

    return result;
  };

  return (
    <nav className="flex items-center text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg overflow-x-auto">
      <div className="flex items-center min-w-0 flex-nowrap">
        {renderBreadcrumbs()}
      </div>
    </nav>
  );
};