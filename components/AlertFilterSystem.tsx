'use client';

import { useState, useCallback } from 'react';
import { Filter, X, Search } from 'lucide-react';

export interface AlertFilters {
  type: string[];
  distance: [number, number]; // [min, max] in km
  severity: string[];
  searchQuery: string;
}

interface AlertFilterSystemProps {
  onFiltersChange: (filters: AlertFilters) => void;
  activeAlertCount?: number;
  filteredCount?: number;
}

const ALERT_TYPES = [
  { id: 'SOS', label: '🚨 SOS', color: 'red' },
  { id: 'video', label: '📹 Video', color: 'blue' },
  { id: 'Go Live', label: '📡 Go Live', color: 'purple' },
];

const SEVERITY_LEVELS = [
  { id: 'critical', label: '🔴 Critical', color: 'red' },
  { id: 'high', label: '🟠 High', color: 'orange' },
  { id: 'medium', label: '🟡 Medium', color: 'yellow' },
];

const DISTANCE_RANGES = [
  { id: '0-500m', label: '0 - 500m', min: 0, max: 0.5 },
  { id: '500m-1km', label: '500m - 1km', min: 0.5, max: 1 },
  { id: '1km+', label: '1km+', min: 1, max: 100 },
];

export default function AlertFilterSystem({
  onFiltersChange,
  activeAlertCount = 0,
  filteredCount = 0,
}: AlertFilterSystemProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AlertFilters>({
    type: [],
    distance: [0, 100],
    severity: [],
    searchQuery: '',
  });

  const handleTypeToggle = useCallback(
    (typeId: string) => {
      const newTypes = filters.type.includes(typeId)
        ? filters.type.filter((t) => t !== typeId)
        : [...filters.type, typeId];

      const newFilters: AlertFilters = { ...filters, type: newTypes };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const handleSeverityToggle = useCallback(
    (severityId: string) => {
      const newSeverity = filters.severity.includes(severityId)
        ? filters.severity.filter((s) => s !== severityId)
        : [...filters.severity, severityId];

      const newFilters: AlertFilters = { ...filters, severity: newSeverity };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const handleDistanceRangeSelect = useCallback(
    (min: number, max: number) => {
      const newFilters: AlertFilters = { ...filters, distance: [min, max] };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      const newFilters: AlertFilters = { ...filters, searchQuery: query };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const handleResetFilters = useCallback(() => {
    const resetFilters: AlertFilters = {
      type: [],
      distance: [0, 100],
      severity: [],
      searchQuery: '',
    };
    setFilters(resetFilters);
    onFiltersChange(resetFilters);
  }, [onFiltersChange]);

  const activeFilterCount =
    filters.type.length + filters.severity.length + (filters.searchQuery ? 1 : 0);
  const hasCustomDistance = filters.distance[0] !== 0 || filters.distance[1] !== 100;

  return (
    <div className="space-y-4">
      {/* Header with filter toggle */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <div>
            <p className="font-semibold text-gray-900">Emergency Alerts</p>
            <p className="text-sm text-gray-500">
              {filteredCount} of {activeAlertCount} alerts
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
            activeFilterCount > 0
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters {activeFilterCount > 0 && <span className="ml-1">({activeFilterCount})</span>}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Search Box */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or location..."
                value={filters.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Alert Type Filter */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Alert Type</label>
            <div className="space-y-2">
              {ALERT_TYPES.map((type) => (
                <label key={type.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.type.includes(type.id)}
                    onChange={() => handleTypeToggle(type.id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Severity Filter */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Severity Level</label>
            <div className="space-y-2">
              {SEVERITY_LEVELS.map((severity) => (
                <label key={severity.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.severity.includes(severity.id)}
                    onChange={() => handleSeverityToggle(severity.id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{severity.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Distance Range Filter */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">Distance Range</label>
            <div className="space-y-2">
              {DISTANCE_RANGES.map((range) => (
                <label key={range.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="distance"
                    checked={
                      filters.distance[0] === range.min && filters.distance[1] === range.max
                    }
                    onChange={() => handleDistanceRangeSelect(range.min, range.max)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{range.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
