import { useState, useRef } from 'react';
import { useImageContext } from '../context/ImageContext';
import { FileCard } from './FileCard';

export function FileList({ onEdit, onDownload, onRemove }) {
    const { state, actions } = useImageContext();
    const { files } = state;
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const dragNodeRef = useRef(null);

    if (files.length === 0) return null;

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        dragNodeRef.current = e.target;
        e.target.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        setDragOverIndex(index);
    };

    const handleDrop = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        actions.reorderFiles(draggedIndex, index);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">
                    {files.length} file{files.length !== 1 ? 's' : ''}
                </span>
                <span className="text-text-muted text-xs">
                    Drag to reorder
                </span>
            </div>

            {files.map((file, index) => (
                <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`
            transition-all duration-200 cursor-grab active:cursor-grabbing
            ${dragOverIndex === index && draggedIndex !== null && draggedIndex !== index
                            ? 'transform translate-y-2 opacity-70'
                            : ''
                        }
          `}
                >
                    <FileCard
                        file={file}
                        onEdit={onEdit}
                        onDownload={onDownload}
                        onRemove={onRemove}
                    />
                </div>
            ))}
        </div>
    );
}
