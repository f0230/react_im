import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2, X } from 'lucide-react';

function isVideoUrl(url = '') {
  return /\.(mp4|mov|webm)(\?.*)?$/i.test(url);
}

function MediaThumbnail({ item, index, onRemove, showCarouselBadge }) {
  const id = item.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const displayUrl = item.previewUrl || item.url;
  const isVideo = item.isVideo || isVideoUrl(displayUrl || '');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square rounded-lg overflow-hidden border ${
        item.error ? 'border-rose-500/40 bg-rose-500/10' : 'border-white/[0.08] bg-[#2a2a2a]'
      } ${isDragging ? 'shadow-2xl ring-2 ring-teal-500/40' : ''}`}
    >
      {/* Thumbnail content */}
      {item.uploading ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 size={16} className="animate-spin text-white/30" />
        </div>
      ) : item.compressing ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
          <Loader2 size={14} className="animate-spin text-white/40" />
          <span className="text-[8px] text-white/40">Comp.</span>
        </div>
      ) : item.error ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-1">
          <X size={14} className="text-rose-400" />
          <span className="text-[8px] text-rose-400 text-center">Error</span>
        </div>
      ) : isVideo ? (
        <video
          src={displayUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          onCanPlay={(e) => e.currentTarget.pause()}
          style={{ pointerEvents: 'none' }}
        />
      ) : (
        <img
          src={displayUrl}
          alt={item.name || ''}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      )}

      {/* Carousel position badge */}
      {showCarouselBadge && !item.uploading && !item.compressing && !item.error && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-black/70 text-[9px] font-semibold text-white/90">
          {index + 1}
        </div>
      )}

      {/* Drag handle */}
      {!item.uploading && !item.compressing && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reordenar"
          className="absolute bottom-1 left-1 w-5 h-5 rounded-md bg-black/60 hover:bg-black/85 flex items-center justify-center text-white/80 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical size={11} />
        </button>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white/80 hover:bg-black"
      >
        <X size={9} />
      </button>
    </div>
  );
}

/**
 * Sortable grid of media thumbnails with drag handle.
 * Props:
 *   - items: Array of media items. Each item must have a stable `id` field.
 *   - onReorder: (nextItems: Array) => void
 *   - onRemove: (index: number) => void
 *   - showCarouselBadges: bool — show "1, 2, 3..." position badges (useful for carousels)
 */
export function SortableMediaGrid({ items, onReorder, onRemove, showCarouselBadges = false }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemIds = useMemo(() => items.map((it) => it.id), [items]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itemIds.indexOf(active.id);
    const newIndex = itemIds.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  if (!items.length) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {items.map((item, index) => (
            <MediaThumbnail
              key={item.id}
              item={item}
              index={index}
              onRemove={onRemove}
              showCarouselBadge={showCarouselBadges}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default SortableMediaGrid;
