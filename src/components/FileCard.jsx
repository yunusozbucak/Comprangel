export function FileCard({ file, onEdit, onDownload, onRemove }) {
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const savings = file.isConverted ? Math.round((1 - file.convertedSize / file.originalSize) * 100) : null;
    
    // Determine if format fallback occurred
    const originalFormat = file.originalFormat?.toLowerCase();
    const outputFormat = file.outputFormat?.toLowerCase();
    const isFormatFallback = file.isConverted && originalFormat && outputFormat && originalFormat !== outputFormat;
    
    // Determine if aggressive compression was used
    const isAggressiveCompression = file.isConverted && savings && savings < 10 && savings > 0;
    const isSizeIncrease = savings && savings < 0;

    return (
        <div className="bg-surface block-border-sm p-4 block-hover">
            <div className="flex gap-4">
                <div className="relative w-14 h-14 bg-surface-light block-inset shrink-0 overflow-hidden">
                    <img
                        src={file.previewUrl}
                        alt={file.originalName}
                        className="w-full h-full object-cover"
                    />
                    {file.isConverting && (
                        <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin" style={{ borderRadius: 0 }} />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="text-text font-medium text-sm truncate mb-1">
                        {file.originalName}
                    </h4>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-text-muted">{formatFileSize(file.originalSize)}</span>

                        {file.isConverted && (
                            <>
                                <span className="text-text-muted">→</span>
                                <span className="text-text font-medium">{formatFileSize(file.convertedSize)}</span>
                                <span className={`pixel-text ${savings > 0 ? 'text-secondary-light' : 'text-primary'}`}>
                                    {savings > 0 ? `−${savings}%` : `+${Math.abs(savings)}%`}
                                </span>
                                {file.outputFormat && (
                                    <span className="text-text-muted bg-surface-light px-1 py-0.5">
                                        {file.outputFormat.toUpperCase()}
                                    </span>
                                )}
                            </>
                        )}

                        {file.error && <span className="text-primary">ERROR</span>}
                    </div>

                    {/* Warnings and notifications */}
                    {file.isConverted && (
                        <div className="mt-2 space-y-1">
                            {isFormatFallback && (
                                <div className="text-xs text-secondary-light bg-secondary/20 px-2 py-1 rounded">
                                    ⚠️ Format optimized for compression
                                </div>
                            )}
                            {isAggressiveCompression && (
                                <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                                    ⚡ Aggressive compression applied
                                </div>
                            )}
                            {isSizeIncrease && (
                                <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                                    ⚠️ Size reduced with fallback format
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => onEdit(file)}
                        className="w-8 h-8 bg-surface-light block-border-sm flex items-center justify-center text-text-muted hover:bg-secondary hover:text-text"
                        title="Edit"
                    >
                        ✎
                    </button>

                    <button
                        onClick={() => onDownload(file)}
                        disabled={!file.isConverted}
                        className={`w-8 h-8 flex items-center justify-center ${file.isConverted
                                ? 'bg-primary block-border-sm text-text hover:bg-primary-dark'
                                : 'bg-surface-light block-border-sm text-text-muted/40 cursor-not-allowed'
                            }`}
                        title="Download"
                    >
                        ↓
                    </button>

                    <button
                        onClick={() => onRemove(file.id)}
                        className="w-8 h-8 bg-surface-light block-border-sm flex items-center justify-center text-text-muted hover:bg-primary hover:text-text"
                        title="Remove"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}
