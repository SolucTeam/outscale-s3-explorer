import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, X, CalendarIcon, MapPin, HardDrive, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { OUTSCALE_REGIONS } from '@/data/regions';

export interface BucketFiltersState {
  regions: string[];
  sizeRange: 'all' | 'empty' | 'small' | 'medium' | 'large';
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  securityStatus: {
    versioning: boolean | null;
    objectLock: boolean | null;
    encryption: boolean | null;
    crossAccount: boolean | null;
  };
}

interface BucketFiltersProps {
  filters: BucketFiltersState;
  onFiltersChange: (filters: BucketFiltersState) => void;
  availableRegions: string[];
}

const SIZE_RANGES = [
  { value: 'all', label: 'Toutes tailles' },
  { value: 'empty', label: 'Vide (0 B)' },
  { value: 'small', label: 'Petit (< 1 GB)' },
  { value: 'medium', label: 'Moyen (1-10 GB)' },
  { value: 'large', label: 'Grand (> 10 GB)' },
];

export const getDefaultFilters = (): BucketFiltersState => ({
  regions: [],
  sizeRange: 'all',
  dateFrom: undefined,
  dateTo: undefined,
  securityStatus: {
    versioning: null,
    objectLock: null,
    encryption: null,
    crossAccount: null,
  },
});

export const BucketFilters: React.FC<BucketFiltersProps> = ({
  filters,
  onFiltersChange,
  availableRegions,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFiltersCount = [
    filters.regions.length > 0,
    filters.sizeRange !== 'all',
    filters.dateFrom !== undefined,
    filters.dateTo !== undefined,
    filters.securityStatus.versioning !== null,
    filters.securityStatus.objectLock !== null,
    filters.securityStatus.encryption !== null,
    filters.securityStatus.crossAccount !== null,
  ].filter(Boolean).length;

  const handleRegionToggle = (regionId: string) => {
    const newRegions = filters.regions.includes(regionId)
      ? filters.regions.filter((r) => r !== regionId)
      : [...filters.regions, regionId];
    onFiltersChange({ ...filters, regions: newRegions });
  };

  const handleSecurityToggle = (
    key: keyof BucketFiltersState['securityStatus']
  ) => {
    const currentValue = filters.securityStatus[key];
    // Cycle: null -> true -> false -> null
    const newValue = currentValue === null ? true : currentValue === true ? false : null;
    onFiltersChange({
      ...filters,
      securityStatus: { ...filters.securityStatus, [key]: newValue },
    });
  };

  const clearFilters = () => {
    onFiltersChange(getDefaultFilters());
  };

  const getSecurityButtonVariant = (value: boolean | null) => {
    if (value === null) return 'outline';
    return value ? 'default' : 'secondary';
  };

  const getSecurityButtonLabel = (label: string, value: boolean | null) => {
    if (value === null) return label;
    return value ? `${label} ✓` : `${label} ✗`;
  };

  // Get region display name
  const getRegionDisplayName = (regionId: string) => {
    const region = OUTSCALE_REGIONS.find((r) => r.id === regionId);
    return region?.name || regionId;
  };

  return (
    <div className="space-y-3">
      {/* Toggle button */}
      <div className="flex items-center gap-2">
        <Button
          variant={isExpanded ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtres
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-destructive gap-1"
          >
            <X className="w-3 h-3" />
            Effacer
          </Button>
        )}
      </div>

      {/* Active filters badges */}
      {activeFiltersCount > 0 && !isExpanded && (
        <div className="flex flex-wrap gap-2">
          {filters.regions.map((region) => (
            <Badge key={region} variant="secondary" className="gap-1">
              <MapPin className="w-3 h-3" />
              {region}
              <button
                onClick={() => handleRegionToggle(region)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.sizeRange !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              <HardDrive className="w-3 h-3" />
              {SIZE_RANGES.find((s) => s.value === filters.sizeRange)?.label}
              <button
                onClick={() => onFiltersChange({ ...filters, sizeRange: 'all' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="gap-1">
              <CalendarIcon className="w-3 h-3" />
              {filters.dateFrom && format(filters.dateFrom, 'dd/MM/yy', { locale: fr })}
              {filters.dateFrom && filters.dateTo && ' - '}
              {filters.dateTo && format(filters.dateTo, 'dd/MM/yy', { locale: fr })}
              <button
                onClick={() =>
                  onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })
                }
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Expanded filters */}
      {isExpanded && (
        <div className="p-4 border rounded-lg bg-card space-y-4 animate-fade-in">
          {/* Regions */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4" />
              Régions
            </Label>
            <div className="flex flex-wrap gap-2">
              {availableRegions.map((regionId) => (
                <Button
                  key={regionId}
                  variant={filters.regions.includes(regionId) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRegionToggle(regionId)}
                  className="text-xs"
                >
                  {regionId}
                </Button>
              ))}
              {availableRegions.length === 0 && (
                <span className="text-sm text-muted-foreground">Aucune région disponible</span>
              )}
            </div>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="w-4 h-4" />
              Taille
            </Label>
            <Select
              value={filters.sizeRange}
              onValueChange={(value: BucketFiltersState['sizeRange']) =>
                onFiltersChange({ ...filters, sizeRange: value })
              }
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="w-4 h-4" />
              Date de création
            </Label>
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {filters.dateFrom
                      ? format(filters.dateFrom, 'dd/MM/yyyy', { locale: fr })
                      : 'Date début'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
                    initialFocus
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {filters.dateTo
                      ? format(filters.dateTo, 'dd/MM/yyyy', { locale: fr })
                      : 'Date fin'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
                    initialFocus
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Security status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Shield className="w-4 h-4" />
              Statut de sécurité
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={getSecurityButtonVariant(filters.securityStatus.versioning)}
                size="sm"
                onClick={() => handleSecurityToggle('versioning')}
                className="text-xs"
              >
                {getSecurityButtonLabel('Versioning', filters.securityStatus.versioning)}
              </Button>
              <Button
                variant={getSecurityButtonVariant(filters.securityStatus.objectLock)}
                size="sm"
                onClick={() => handleSecurityToggle('objectLock')}
                className="text-xs"
              >
                {getSecurityButtonLabel('Object Lock', filters.securityStatus.objectLock)}
              </Button>
              <Button
                variant={getSecurityButtonVariant(filters.securityStatus.encryption)}
                size="sm"
                onClick={() => handleSecurityToggle('encryption')}
                className="text-xs"
              >
                {getSecurityButtonLabel('Encryption', filters.securityStatus.encryption)}
              </Button>
              <Button
                variant={getSecurityButtonVariant(filters.securityStatus.crossAccount)}
                size="sm"
                onClick={() => handleSecurityToggle('crossAccount')}
                className="text-xs"
              >
                {getSecurityButtonLabel('Cross-Account', filters.securityStatus.crossAccount)}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cliquez pour filtrer : activé (✓), désactivé (✗), ou tous (neutre)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
