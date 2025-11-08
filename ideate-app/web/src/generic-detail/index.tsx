import { useState, Suspense } from "react";
import "../index.css";
import { createRoot } from "react-dom/client";
import { IdeaDetailSkeleton } from "../components/skeletons";
import {
  useToolOutput,
  useToolResponseMetadata,
  useDisplayMode,
  useMaxHeight,
  useTheme,
} from "../use-openai-global";
import { useWidgetState } from "../use-widget-state";
import { formatDate, formatRelativeTime } from "../utils";
import type {
  GenericDetailToolOutput,
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
} from "../generic-types";
import {
  ArrowLeft,
  Edit3,
  Heart,
  Archive,
  Share,
  MoreVertical,
  Trash2,
} from "lucide-react";

interface FieldRowProps {
  field: FieldConfig;
  value: any;
}

function FieldRow({ field, value }: FieldRowProps) {
  const displayValue = formatFieldValue(value, field);

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="text-xs text-gray-500 mb-1">{field.label}</div>
      <div className="text-sm text-gray-900">{displayValue}</div>
      {field.helpText && (
        <div className="text-xs text-gray-400 mt-1">{field.helpText}</div>
      )}
    </div>
  );
}

function GenericDetailApp() {
  const toolOutput = useToolOutput() as GenericDetailToolOutput | null;
  const metadata = useToolResponseMetadata() as GenericToolMetadata | null;
  const item = toolOutput?.item;
  const config = metadata?.config;
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const theme = useTheme();
  const isDark = theme === "dark";
  const isFullscreen = displayMode === "fullscreen";
  const finiteMaxHeight = Number.isFinite(maxHeight)
    ? (maxHeight as number)
    : 800;

  const [widgetState, setWidgetState] = useWidgetState<GenericWidgetState>({
    favorites: [],
    viewMode: "detail",
  });
  const [showMenu, setShowMenu] = useState(false);
  const favorites = widgetState?.favorites || [];

  if (!item || !config) {
    return (
      <div className="w-full mx-auto bg-white p-8">
        <div className="text-center">
          <span className="text-5xl mb-4 block">📄</span>
          <p className="text-gray-500">No item selected</p>
        </div>
      </div>
    );
  }

  const isFavorite = favorites.includes(item.id);

  // Get detail fields
  const detailFields = getFieldsForView(config, 'detail');

  // Find priority/urgency field
  const priorityField = detailFields.find(f =>
    ['priority', 'urgency', 'importance'].includes(f.key.toLowerCase())
  );
  const priorityValue = priorityField ? getFieldValue(item, priorityField) : null;
  const priorityInfo = priorityValue ? getPriorityInfo(Number(priorityValue)) : null;

  // Get main title field (first showInList field or first string field)
  const titleField = config.fields.find(f => f.showInList && f.type === 'string') ||
    config.fields.find(f => f.type === 'string');
  const title = titleField ? String(getFieldValue(item, titleField)) : item.id;

  // Get description field (first text field)
  const descField = config.fields.find(f => f.type === 'text');
  const description = descField ? String(getFieldValue(item, descField) || '') : '';

  // Other fields to display (excluding title, description, priority, system fields)
  const systemFields = ['id', 'archived', 'created_date', 'updated_date'];
  const excludedKeys = [
    ...(titleField ? [titleField.key] : []),
    ...(descField ? [descField.key] : []),
    ...(priorityField ? [priorityField.key] : []),
    ...systemFields,
  ];
  const otherFields = detailFields.filter(f => !excludedKeys.includes(f.key));

  const handleToggleFavorite = () => {
    const newFavorites = isFavorite
      ? favorites.filter((id: string) => id !== item.id)
      : [...favorites, item.id];

    setWidgetState((prev: any) => ({ ...prev, favorites: newFavorites }));
  };

  const handleBackToList = () => {
    setWidgetState((prev: any) => ({
      ...prev,
      viewMode: "list",
      selectedItem: undefined,
    }));

    if (window.openai) {
      const sendFollowup =
        (window.openai as any).sendFollowupMessage ||
        (window.openai as any).sendFollowUpMessage;
      sendFollowup?.({ prompt: `Show me my ${config.labelPlural.toLowerCase()}` });
    }
  };

  const handleEditItem = () => {
    setShowMenu(false);
    if (window.openai) {
      const sendFollowup =
        (window.openai as any).sendFollowupMessage ||
        (window.openai as any).sendFollowUpMessage;
      sendFollowup?.({ prompt: `Edit the ${config.label.toLowerCase()} "${title}"` });
    }
  };

  const handleDeleteItem = () => {
    setShowMenu(false);
    if (
      window.openai &&
      window.confirm(`Are you sure you want to delete this ${config.label.toLowerCase()}?`)
    ) {
      window.openai.callTool(`delete_${config.domain}`, {
        [`${config.domain}_id`]: item.id,
      });
    }
  };

  const handleArchiveItem = () => {
    setShowMenu(false);
    if (window.openai && config.features?.archive) {
      const action = item.archived ? 'restore' : 'archive';
      window.openai.callTool(`${action}_${config.domain}`, {
        [`${config.domain}_id`]: item.id,
      });
    }
  };

  const handleShare = () => {
    setShowMenu(false);
    if (navigator.share) {
      navigator.share({
        title: title,
        text: description,
      });
    } else if (window.openai) {
      const sendFollowup =
        (window.openai as any).sendFollowupMessage ||
        (window.openai as any).sendFollowUpMessage;
      sendFollowup?.({
        prompt: `Help me share this ${config.label.toLowerCase()}: "${title}"`,
      });
    }
  };

  const primaryColor = config.branding?.primaryColor || "#3B82F6";

  return (
    <div className={`w-full mx-auto overflow-hidden ${isDark ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      {/* Header */}
      <div className={`px-6 py-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBackToList}
            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-700'}`} />
          </button>
          <div className="flex-1">
            <h1 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h1>
          </div>
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
          >
            <Heart
              className={`w-5 h-5 ${isFavorite ? "text-red-500 fill-red-500" : isDark ? "text-gray-400" : "text-gray-400"
                }`}
            />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            >
              <MoreVertical className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-700'}`} />
            </button>
            {showMenu && (
              <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg border py-1 z-10 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                {config.features?.update !== false && (
                  <button
                    onClick={handleEditItem}
                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {config.features?.archive && (
                  <button
                    onClick={handleArchiveItem}
                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <Archive className="w-4 h-4" />
                    {item.archived ? "Unarchive" : "Archive"}
                  </button>
                )}
                <button
                  onClick={handleShare}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 ${isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <Share className="w-4 h-4" />
                  Share
                </button>
                {config.features?.delete !== false && (
                  <>
                    <div className={`h-px my-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                    <button
                      onClick={handleDeleteItem}
                      className={`w-full px-4 py-2.5 text-left text-sm text-red-600 flex items-center gap-3 ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {description && (
          <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {priorityInfo && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${priorityInfo.color}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
              <span className={priorityInfo.textColor}>{priorityInfo.label}</span>
            </span>
          )}
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Created {formatDate(item.created_date)}
          </span>
          {item.updated_date !== item.created_date && (
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Updated {formatRelativeTime(item.updated_date)}
            </span>
          )}
        </div>
      </div>

      {/* Details Section */}
      <div
        className="px-6 py-5"
        style={{
          maxHeight: isFullscreen
            ? "none"
            : Math.max(400, finiteMaxHeight - 200),
          overflowY: "auto",
        }}
      >
        {otherFields.length > 0 ? (
          <div className="space-y-0">
            <h2 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Details
            </h2>
            {otherFields.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                value={getFieldValue(item, field)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <span className="text-5xl mb-4 block">{config.icon}</span>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No additional details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Mount the component with Suspense
const container = document.getElementById("generic-detail-root");
if (container) {
  const root = createRoot(container);
  root.render(
    <Suspense fallback={<IdeaDetailSkeleton />}>
      <GenericDetailApp />
    </Suspense>
  );
}

