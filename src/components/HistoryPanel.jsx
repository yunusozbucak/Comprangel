import { useState, useEffect } from 'react';

export function HistoryPanel({ isOpen, onClose }) {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (isOpen) {
            try {
                const savedHistory = localStorage.getItem('conversion_history');
                setHistory(savedHistory ? JSON.parse(savedHistory) : []);
            } catch (e) {
                setHistory([]);
            }
        }
    }, [isOpen]);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const clearHistory = () => {
        localStorage.removeItem('conversion_history');
        setHistory([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/90" onClick={onClose} />

            <div className="relative w-full max-w-md bg-surface block-border max-h-[80vh] flex flex-col animate-pixel-fade">
                <div className="flex items-center justify-between p-4 border-b-2 border-block-border">
                    <h2 className="pixel-text text-xl text-text tracking-wider">[ HISTORY ]</h2>
                    <button onClick={onClose} className="w-8 h-8 bg-surface-light block-border-sm flex items-center justify-center text-text-muted hover:bg-primary hover:text-text">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {history.length === 0 ? (
                        <div className="text-center py-8 text-text-muted">
                            <p className="pixel-text text-lg">NO HISTORY</p>
                            <p className="text-sm mt-2">Converted files will appear here</p>
                        </div>
                    ) : (
                        history.map((entry, index) => (
                            <div key={index} className="p-3 bg-surface-light block-border-sm">
                                <div className="flex justify-between items-start">
                                    <span className="text-text text-sm truncate flex-1">{entry.filename}</span>
                                    <span className={`pixel-text text-sm ml-2 ${entry.savings > 0 ? 'text-secondary-light' : 'text-primary'}`}>
                                        {entry.savings > 0 ? `−${entry.savings}%` : `+${Math.abs(entry.savings)}%`}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-text-muted mt-1">
                                    <span>{formatFileSize(entry.originalSize)} → {formatFileSize(entry.convertedSize)}</span>
                                    <span>{entry.outputFormat?.toUpperCase()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {history.length > 0 && (
                    <div className="p-4 border-t-2 border-block-border">
                        <button
                            onClick={clearHistory}
                            className="w-full py-2 bg-surface-light block-border-sm text-text-muted hover:bg-primary hover:text-text"
                        >
                            CLEAR HISTORY
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function addToConversionHistory(entry) {
    try {
        const savedHistory = localStorage.getItem('conversion_history');
        const history = savedHistory ? JSON.parse(savedHistory) : [];
        history.unshift({ ...entry, date: new Date().toISOString() });
        localStorage.setItem('conversion_history', JSON.stringify(history.slice(0, 100)));
    } catch (e) {
        console.error('Failed to save history:', e);
    }
}
