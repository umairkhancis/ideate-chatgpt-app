import React, { useState, Suspense, useMemo } from "react";
import "../index.css";
import { createRoot } from "react-dom/client";
import { IdeasListSkeleton } from "../components/skeletons";
import {
  useToolOutput,
  useToolResponseMetadata,
  useTheme,
  useDisplayMode,
  useMaxHeight,
} from "../use-openai-global";
import { useWidgetState } from "../use-widget-state";
import { formatDate, formatRelativeTime, truncateText } from "../utils";
import type {
  GenericListToolOutput,
  GenericToolMetadata,
  GenericEntity,
  GenericWidgetState,
  DomainConfig,
  FieldConfig,
} from "../generic-types";
import {
  getFieldsForView,
  getFieldValue,
  formatFieldValue,
  getPriorityInfo,
  sortEntities,
} from "../generic-types";
import {
  Lightbulb,
  Calendar,
  Clock,
  ChevronRight,
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  Heart,
  MoreHorizontal,
} from "lucide-react";

interface EntityCardProps {
  entity: GenericEntity;
  config: DomainConfig;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: (id: string) => void;
}

function EntityCard({
  entity,
  config,
  isFavorite,
  onToggleFavorite,
  onClick,
}: EntityCardProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  // Get fields to display in list
  const listFields = getFieldsForView(config, 'list');

  // Find priority/urgency field if exists
  const priorityField = listFields.find(f =>
    ['priority', 'urgency', 'importance'].includes(f.key.toLowerCase())
  );
  const priorityValue = priorityField ? getFieldValue(entity, priorityField) : null;
  const priorityInfo = priorityValue ? getPriorityInfo(Number(priorityValue)) : null;

  // Get main display fields (first 2 non-priority fields)
  const displayFields = listFields.filter(f => f !== priorityField).slice(0, 2);
  const mainField = displayFields[0];
  const mainValue = mainField ? getFieldValue(entity, mainField) : '';
  const secondField = displayFields[1];
  const secondValue = secondField ? getFieldValue(entity, secondField) : '';

  const handleCardClick = () => {
    onClick(entity.id);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(entity.id);
  };

  const iconColor = config.branding?.primaryColor || "#3B82F6";

  return (
    <div
      className={`
        px-3 -mx-2 rounded-2xl cursor-pointer transition-colors
        ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}
      `}
      onClick={handleCardClick}
    >
      <div className="flex w-full items-center gap-3 py-3 border-b border-black/5 last:border-b-0">
        <div className="flex-shrink-0">
          <div
            className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${priorityInfo?.color || 'bg-gray-100'}
          `}
            style={{ backgroundColor: priorityInfo ? undefined : `${iconColor}20` }}
          >
            <span style={{ color: priorityInfo ? undefined : iconColor }} className="text-xl">
              {config.icon || '📄'}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className={`
                font-medium text-sm sm:text-base truncate
                ${isDark ? "text-white" : "text-black"}
              `}
              >
                {String(mainValue)}
              </h3>
              {secondValue && (
                <p
                  className={`
                  text-xs sm:text-sm mt-1 truncate-2-lines
                  ${isDark ? "text-white/70" : "text-black/70"}
                `}
                >
                  {truncateText(String(secondValue), 100)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleFavoriteClick}
                className={`
                  p-1 rounded-full transition-colors
                  ${isFavorite
                    ? "text-red-500 hover:text-red-600"
                    : isDark
                      ? "text-white/40 hover:text-white/60"
                      : "text-black/40 hover:text-black/60"
                  }
                `}
              >
                <Heart
                  className="w-4 h-4"
                  fill={isFavorite ? "currentColor" : "none"}
                />
              </button>
              <ChevronRight
                className={`
                w-4 h-4 
                ${isDark ? "text-white/40" : "text-black/40"}
              `}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            {priorityInfo && (
              <div className="flex items-center gap-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full ${priorityInfo.color}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`}
                  />
                  <span className={priorityInfo.textColor}>
                    {priorityInfo.label}
                  </span>
                </span>
              </div>
            )}

            <div
              className={`
              flex items-center gap-1 text-xs
              ${isDark ? "text-white/50" : "text-black/50"}
            `}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatDate(entity.created_date)}</span>
            </div>

            {entity.updated_date !== entity.created_date && (
              <div
                className={`
                flex items-center gap-1 text-xs
                ${isDark ? "text-white/50" : "text-black/50"}
              `}
              >
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(entity.updated_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericListApp() {
  const toolOutput = useToolOutput() as GenericListToolOutput | null;
  const metadata = useToolResponseMetadata() as GenericToolMetadata | null;
  const theme = useTheme();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isDark = theme === "dark";
  const isFullscreen = displayMode === "fullscreen";

  const config = metadata?.config;
  const items = toolOutput?.items || [];
  const totalCount = toolOutput?.count || items.length;

  const [widgetState, setWidgetState] = useWidgetState<GenericWidgetState>({
    favorites: [],
    sortBy: "updated_date",
    sortOrder: "desc",
    viewMode: "list",
  });

  const [showFilters, setShowFilters] = useState(false);

  const favorites = widgetState?.favorites || [];

  // Determine sort field (default to created_date)
  const sortBy = widgetState?.sortBy || "created_date";

  // Sort items
  const sortedItems = useMemo(() => {
    return sortEntities(
      items,
      sortBy,
      widgetState?.sortOrder || "desc"
    );
  }, [items, sortBy, widgetState?.sortOrder]);

  const handleToggleFavorite = (itemId: string) => {
    const newFavorites = favorites.includes(itemId)
      ? favorites.filter((id) => id !== itemId)
      : [...favorites, itemId];

    setWidgetState((prev) => ({ ...prev, favorites: newFavorites }));
  };

  const handleItemClick = (itemId: string) => {
    setWidgetState((prev) => ({
      ...prev,
      selectedItem: itemId,
      viewMode: "detail",
    }));

    if (window.openai) {
      const item = items.find((i) => i.id === itemId);
      const mainField = config?.fields.find(f => f.showInList);
      const itemName = mainField ? item?.[mainField.key] : itemId;

      window.openai.sendFollowUpMessage({
        prompt: `Show me the details for ${config?.label || 'item'} "${itemName}"`,
      });
    }
  };

  const handleSort = (sortField: string) => {
    const newSortOrder =
      widgetState?.sortBy === sortField && widgetState?.sortOrder === "desc"
        ? "asc"
        : "desc";

    setWidgetState((prev) => ({
      ...prev,
      sortBy: sortField,
      sortOrder: newSortOrder,
    }));
  };

  const handleAddItem = () => {
    if (window.openai) {
      window.openai.sendFollowUpMessage({
        prompt: `I want to add a new ${config?.label || 'item'}`,
      });
    }
  };

  const handleRequestFullscreen = () => {
    if (window.openai) {
      window.openai.requestDisplayMode({ mode: "fullscreen" });
    }
  };

  // Default config if not provided
  const displayConfig = config || {
    domain: 'items',
    label: 'Item',
    labelPlural: 'Items',
    icon: '📄',
    branding: { primaryColor: '#3B82F6' },
    fields: [],
  };

  const primaryColor = displayConfig.branding?.primaryColor || "#3B82F6";

  return (
    <div
      className={`
      antialiased w-full text-black px-4 pb-2 overflow-hidden
      ${isDark ? "bg-gray-900 text-white" : "bg-white"}
    `}
    >
      <div className="max-w-full">
        {/* Header */}
        <div className="flex flex-row items-center gap-4 sm:gap-4 border-b border-black/5 py-4">
          <div
            className="sm:w-18 w-16 aspect-square rounded-xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${primaryColor}` }}
          >
            <span className="text-white">{displayConfig.icon}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={`
              text-base sm:text-xl font-medium
              ${isDark ? "text-white" : "text-black"}
            `}
            >
              {displayConfig.labelPlural}
            </div>
            <div
              className={`
              text-sm
              ${isDark ? "text-white/60" : "text-black/60"}
            `}
            >
              {totalCount} {totalCount !== 1 ? displayConfig.labelPlural.toLowerCase() : displayConfig.label.toLowerCase()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFullscreen && (
              <button
                onClick={handleRequestFullscreen}
                className={`
                  p-2 rounded-full transition-colors
                  ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}
                `}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleAddItem}
              className="cursor-pointer inline-flex items-center rounded-full text-white px-4 py-1.5 sm:text-md text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add {displayConfig.label}
            </button>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center justify-between py-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors
                ${showFilters
                  ? `text-white`
                  : isDark
                    ? "hover:bg-white/10 text-white/70"
                    : "hover:bg-black/5 text-black/70"
                }
              `}
              style={showFilters ? { backgroundColor: primaryColor } : undefined}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          <div className="flex items-center gap-1">
            {['created_date', 'updated_date', 'priority'].map((field) => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={`
                  flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors
                  ${widgetState?.sortBy === field
                    ? `text-white`
                    : isDark
                      ? "hover:bg-white/10 text-white/70"
                      : "hover:bg-black/5 text-black/70"
                  }
                `}
                style={widgetState?.sortBy === field ? { backgroundColor: primaryColor } : undefined}
              >
                {field === 'created_date' ? 'Created' : field === 'updated_date' ? 'Updated' : 'Priority'}
                {widgetState?.sortBy === field &&
                  (widgetState.sortOrder === "desc" ? (
                    <SortDesc className="w-4 h-4" />
                  ) : (
                    <SortAsc className="w-4 h-4" />
                  ))}
              </button>
            ))}
          </div>
        </div>

        {/* Items List */}
        <div
          className="min-w-full text-sm flex flex-col"
          style={{
            maxHeight: isFullscreen
              ? "none"
              : isFinite(maxHeight)
                ? Math.max(300, maxHeight - 200)
                : "70vh",
          }}
        >
          {sortedItems.length > 0 ? (
            sortedItems.map((item) => (
              <EntityCard
                key={item.id}
                entity={item}
                config={displayConfig}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={handleToggleFavorite}
                onClick={handleItemClick}
              />
            ))
          ) : (
            <div
              className={`
              py-12 text-center
              ${isDark ? "text-white/60" : "text-black/60"}
            `}
            >
              <span className="text-5xl mb-4 block">{displayConfig.icon}</span>
              <p className="text-lg font-medium mb-2">No {displayConfig.labelPlural.toLowerCase()} yet</p>
              <p className="text-sm">Start adding your {displayConfig.labelPlural.toLowerCase()}!</p>
              <button
                onClick={handleAddItem}
                className="mt-4 inline-flex items-center rounded-full text-white px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add your first {displayConfig.label.toLowerCase()}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Add Button */}
        <div className="sm:hidden px-0 pt-2 pb-2">
          <button
            onClick={handleAddItem}
            className="w-full cursor-pointer inline-flex items-center justify-center rounded-full text-white px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New {displayConfig.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// Mount the component with Suspense
const container = document.getElementById("generic-list-root");
if (container) {
  const root = createRoot(container);
  root.render(
    <Suspense fallback={<IdeasListSkeleton />}>
      <GenericListApp />
    </Suspense>
  );
}

