import { useState, useCallback, useRef, useEffect } from 'react';
import { useImageContext } from '../context/ImageContext';

const ACCEPTED_FORMATS = {
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/gif': ['.gif'],
    'image/bmp': ['.bmp'],
    'image/tiff': ['.tiff', '.tif'],
    'image/svg+xml': ['.svg'],
    'image/webp': ['.webp']
};

const ACCEPT_STRING = Object.entries(ACCEPTED_FORMATS).map(([mime, exts]) => [mime, ...exts]).flat().join(',');

export function DropZone() {
    const { actions } = useImageContext();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const processFiles = useCallback(async (fileList) => {
        const validFiles = Array.from(fileList).filter(file =>
            Object.keys(ACCEPTED_FORMATS).includes(file.type) || file.name.endsWith('.svg')
        );
        if (validFiles.length === 0) return;

        const newFiles = await Promise.all(validFiles.map(async (file) => {
            const url = URL.createObjectURL(file);
            const dimensions = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ width: img.width, height: img.height });
                img.onerror = () => resolve({ width: 0, height: 0 });
                img.src = url;
            });

            return {
                id: crypto.randomUUID(),
                originalFile: file,
                originalName: file.name,
                originalSize: file.size,
                originalFormat: file.type.split('/')[1] || 'unknown',
                previewUrl: url,
                width: dimensions.width,
                height: dimensions.height,
                isConverting: false,
                isConverted: false,
                convertedBlob: null,
                convertedSize: null,
                webpUrl: null,
                error: null
            };
        }));

        actions.addFiles(newFiles);
    }, [actions]);

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); processFiles(e.dataTransfer.files); };
    const handleFileInput = (e) => { processFiles(e.target.files); e.target.value = ''; };
    const handleClick = () => { fileInputRef.current?.click(); };

    useEffect(() => {
        const handlePasteEvent = (e) => { if (e.detail?.file) processFiles([e.detail.file]); };
        window.addEventListener('pasteImage', handlePasteEvent);
        return () => window.removeEventListener('pasteImage', handlePasteEvent);
    }, [processFiles]);

    return (
        <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
        relative cursor-pointer p-8 md:p-12 text-center
        bg-surface block-border block-hover
        transition-all duration-200
        ${isDragging ? 'bg-primary/10 border-primary' : ''}
      `}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_STRING}
                multiple
                onChange={handleFileInput}
                className="hidden"
            />

            <div className="pointer-events-none">
                <div className={`
          mx-auto mb-6 w-20 h-20 flex items-center justify-center
          ${isDragging ? 'bg-primary animate-block-bounce' : 'bg-surface-light block-border-sm'}
        `}>
                    <svg
                        className={`h-10 w-10 ${isDragging ? 'text-text' : 'text-text-muted'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="square" strokeLinejoin="miter" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                </div>

                <p className="pixel-text text-2xl text-text mb-2 tracking-wider">
                    {isDragging ? '[ DROP HERE ]' : '[ DROP IMAGES ]'}
                </p>
                <p className="text-text-muted text-sm">
                    Click to browse • Ctrl+V to paste
                </p>

                <div className="mt-6 inline-flex items-center gap-2 px-3 py-2 bg-secondary/20 text-sm">
                    <span className="w-2 h-2 bg-secondary"></span>
                    <span className="text-secondary-light">Files never leave your device</span>
                </div>
            </div>
        </div>
    );
}
