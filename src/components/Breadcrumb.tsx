
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useS3Store } from '../hooks/useS3Store';
import { BreadcrumbItem } from '../types/s3';
import { ChevronRight, Home, Folder } from 'lucide-react';

export const Breadcrumb = () => {
  const { currentBucket, currentPath, setCurrentBucket, setCurrentPath } = useS3Store();
  const navigate = useNavigate();

  if (!currentBucket) return null;

  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : [];
  
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: 'Buckets', path: '' },
    { name: currentBucket, path: currentBucket }
  ];

  // Ajouter les parties du chemin
  let currentFullPath = currentBucket;
  pathParts.forEach((part) => {
    currentFullPath += `/${part}`;
    breadcrumbItems.push({
      name: part,
      path: currentFullPath
    });
  });

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    if (item.path === '') {
      // Retour à la liste des buckets
      navigate('/dashboard');
    } else if (item.path === currentBucket) {
      // Retour à la racine du bucket
      navigate(`/bucket/${encodeURIComponent(currentBucket)}`);
    } else {
      // Navigation vers un dossier spécifique
      const newPath = item.path.replace(`${currentBucket}/`, '');
      const encodedPath = encodeURIComponent(newPath);
      navigate(`/bucket/${encodeURIComponent(currentBucket)}/folder/${encodedPath}`);
    }
  };

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
      {breadcrumbItems.map((item, index) => (
        <div key={`${item.path}-${index}`} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mr-2" />}
          <Button
            variant="ghost"
            size="sm"
            className={`h-auto p-1 font-medium hover:text-blue-600 ${
              index === breadcrumbItems.length - 1 
                ? 'text-blue-600 cursor-default' 
                : 'text-gray-600 hover:bg-white'
            }`}
            onClick={() => index !== breadcrumbItems.length - 1 && handleBreadcrumbClick(item)}
            disabled={index === breadcrumbItems.length - 1}
          >
            {index === 0 ? (
              <Home className="w-4 h-4 mr-1" />
            ) : index === 1 ? (
              <Folder className="w-4 h-4 mr-1" />
            ) : null}
            {item.name}
          </Button>
        </div>
      ))}
    </nav>
  );
};
