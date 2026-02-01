import { useCallback } from 'react';
import JSZip from 'jszip';
import { useImageContext } from '../context/ImageContext';

export function BatchControls({ onConvertAll }) {
    const { state, actions } = useImageContext();
    const { files, processing } = state;

    const convertedFiles = files.filter(f => f.isConverted);
    const hasFiles = files.length > 0;
    const hasConverted = convertedFiles.length > 0;

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getTotalStats = useCallback(() => {
        const originalTotal = files.reduce((sum, f) => sum + f.originalSize, 0);
        const convertedTotal = convertedFiles.reduce((sum, f) => sum + (f.convertedSize || 0), 0);
        const savings = originalTotal > 0 ? Math.round((1 - convertedTotal / originalTotal) * 100) : 0;
        return { originalTotal, convertedTotal, savings };
    }, [files, convertedFiles]);

    const stats = getTotalStats();

    const downloadFile = (file) => {
        const pattern = state.settings.filenamePattern || '{name}';
        const baseName = file.originalName.replace(/\.[^/.]+$/, '');
        const date = new Date().toISOString().split('T')[0];
        const outputExt = state.settings.outputFormat;
        const filename = pattern.replace('{name}', baseName).replace('{date}', date).replace('{format}', outputExt) + '.' + outputExt;
        const link = document.createElement('a');
        link.href = file.webpUrl;
        link.download = filename;
        link.click();
    };

    const downloadAll = () => convertedFiles.forEach((file, i) => setTimeout(() => downloadFile(file), i * 200));

    const downloadAsZip = async () => {
        const zip = new JSZip();
        for (const file of convertedFiles) {
            const pattern = state.settings.filenamePattern || '{name}';
            const baseName = file.originalName.replace(/\.[^/.]+$/, '');
            const date = new Date().toISOString().split('T')[0];
            const outputExt = state.settings.outputFormat;
            const filename = pattern.replace('{name}', baseName).replace('{date}', date).replace('{format}', outputExt) + '.' + outputExt;
            zip.file(filename, file.convertedBlob);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `comprangel_${new Date().toISOString().split('T')[0]}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const clearAll = () => {
        files.forEach(f => {
            URL.revokeObjectURL(f.previewUrl);
            if (f.webpUrl) URL.revokeObjectURL(f.webpUrl);
        });
        actions.clearFiles();
    };

    return (
        <div className="bg-surface block-border p-5">
            {hasConverted && (
                <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-block-border">
                    <div className="flex items-center gap-4 text-sm">
                        <div>
                            <span className="text-text-muted block text-xs">BEFORE</span>
                            <span className="pixel-text text-lg text-text">{formatFileSize(stats.originalTotal)}</span>
                        </div>
                        <span className="pixel-text text-xl text-text-muted">→</span>
                        <div>
                            <span className="text-text-muted block text-xs">AFTER</span>
                            <span className="pixel-text text-lg text-text">{formatFileSize(stats.convertedTotal)}</span>
                        </div>
                    </div>
                    <div className={`px-3 py-2 pixel-text text-xl ${stats.savings > 0 ? 'bg-secondary/20 text-secondary-light' : 'bg-primary/20 text-primary'
                        }`}>
                        {stats.savings > 0 ? `−${stats.savings}%` : `+${Math.abs(stats.savings)}%`}
                    </div>
                </div>
            )}

            {processing.isProcessing && (
                <div className="pb-4 mb-4 border-b-2 border-block-border">
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-text-muted">PROCESSING...</span>
                        <span className="pixel-text text-text">{Math.round(processing.progress * 100)}%</span>
                    </div>
                    <div className="h-4 bg-surface-light block-inset">
                        <div
                            className="h-full bg-primary transition-all duration-200"
                            style={{ width: `${processing.progress * 100}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={onConvertAll}
                    disabled={!hasFiles || processing.isProcessing}
                    className={`py-4 px-4 pixel-text text-lg tracking-wider ${hasFiles && !processing.isProcessing
                            ? 'bg-secondary text-text block-btn'
                            : 'bg-surface-light text-text-muted cursor-not-allowed block-border-sm'
                        }`}
                >
                    ⟳ CONVERT
                </button>

                <button
                    onClick={downloadAll}
                    disabled={!hasConverted}
                    className={`py-4 px-4 pixel-text text-lg tracking-wider ${hasConverted
                            ? 'bg-primary text-text block-btn'
                            : 'bg-surface-light text-text-muted cursor-not-allowed block-border-sm'
                        }`}
                >
                    ↓ DOWNLOAD ({convertedFiles.length})
                </button>
            </div>

            <div className="flex gap-2 mt-3">
                <button
                    onClick={downloadAsZip}
                    disabled={!hasConverted}
                    className={`flex-1 py-2 px-3 text-sm ${hasConverted
                            ? 'bg-surface-light text-primary block-border-sm hover:bg-primary hover:text-text'
                            : 'bg-surface-light text-text-muted/40 cursor-not-allowed block-border-sm'
                        }`}
                >
                    📦 ZIP
                </button>
                <button
                    onClick={clearAll}
                    disabled={!hasFiles}
                    className={`py-2 px-3 text-sm ${hasFiles
                            ? 'bg-surface-light text-text-muted block-border-sm hover:bg-primary hover:text-text'
                            : 'bg-surface-light text-text-muted/40 cursor-not-allowed block-border-sm'
                        }`}
                >
                    ✕ CLEAR
                </button>
            </div>
        </div>
    );
}
