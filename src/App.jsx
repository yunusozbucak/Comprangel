import { useState, useEffect, useCallback, useRef } from 'react';
import { ImageProvider, useImageContext } from './context/ImageContext';
import { useImageProcessor } from './hooks/useImageProcessor';
import { DropZone } from './components/DropZone';
import { FileList } from './components/FileList';
import { CompressionSettings } from './components/CompressionSettings';
import { ImageEditor } from './components/ImageEditor';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { BatchControls } from './components/BatchControls';
import { ThemeToggle } from './components/ThemeToggle';
import { HistoryPanel, addToConversionHistory } from './components/HistoryPanel';
import './index.css';

function ImageConverterApp() {
  const { state, actions } = useImageContext();
  const { processBatch, reconvertAll } = useImageProcessor();
  const [editingFile, setEditingFile] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const prevFilesLengthRef = useRef(0);
  const prevSettingsRef = useRef(null);
  const isFirstRender = useRef(true);

  const { files, settings } = state;

  // Watch for settings changes and auto-reconvert
  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevSettingsRef.current = {
        quality: settings.quality,
        outputFormat: settings.outputFormat,
        preset: settings.preset,
        lossless: settings.lossless
      };
      return;
    }

    const prev = prevSettingsRef.current;
    const settingsChanged = prev && (
      prev.quality !== settings.quality ||
      prev.outputFormat !== settings.outputFormat ||
      prev.preset !== settings.preset ||
      prev.lossless !== settings.lossless
    );

    if (settingsChanged && files.length > 0) {
      // Trigger reconversion with debounce
      const timer = setTimeout(() => {
        reconvertAll();
      }, 300);

      prevSettingsRef.current = {
        quality: settings.quality,
        outputFormat: settings.outputFormat,
        preset: settings.preset,
        lossless: settings.lossless
      };

      return () => clearTimeout(timer);
    }

    prevSettingsRef.current = {
      quality: settings.quality,
      outputFormat: settings.outputFormat,
      preset: settings.preset,
      lossless: settings.lossless
    };
  }, [settings.quality, settings.outputFormat, settings.preset, settings.lossless, files.length, reconvertAll]);

  useEffect(() => {
    const currentLength = files.length;
    const prevLength = prevFilesLengthRef.current;
    if (currentLength > prevLength) {
      const unconvertedFiles = files.filter(f => !f.isConverted && !f.isConverting);
      if (unconvertedFiles.length > 0) processBatch(unconvertedFiles);
    }
    prevFilesLengthRef.current = currentLength;
  }, [files, processBatch]);

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      setSelectedFile(files[0]);
    } else if (selectedFile) {
      const updated = files.find(f => f.id === selectedFile.id);
      if (updated) setSelectedFile(updated);
      else if (files.length > 0) setSelectedFile(files[0]);
      else setSelectedFile(null);
    }
  }, [files]);

  useEffect(() => {
    files.forEach(file => {
      if (file.isConverted && !file.addedToHistory) {
        addToConversionHistory({
          filename: file.originalName,
          originalSize: file.originalSize,
          convertedSize: file.convertedSize,
          outputFormat: settings.outputFormat,
          savings: Math.round((1 - file.convertedSize / file.originalSize) * 100)
        });
        actions.updateFile(file.id, { addedToHistory: true });
      }
    });
  }, [files, settings.outputFormat, actions]);

  const handleEdit = useCallback((file) => setEditingFile(file), []);
  const handleSaveEdit = useCallback((editSettings) => {
    if (!editingFile) return;
    actions.setSettings({ resize: editSettings.resize, rotate: editSettings.rotate, flip: editSettings.flip, filters: editSettings.filters, crop: editSettings.crop });
    setTimeout(() => reconvertAll(), 100);
  }, [editingFile, actions, reconvertAll]);

  const handleDownload = useCallback((file) => {
    if (!file.webpUrl) return;
    const pattern = settings.filenamePattern || '{name}';
    const baseName = file.originalName.replace(/\.[^/.]+$/, '');
    const date = new Date().toISOString().split('T')[0];
    const outputExt = settings.outputFormat;
    const filename = pattern.replace('{name}', baseName).replace('{date}', date).replace('{format}', outputExt) + '.' + outputExt;
    const link = document.createElement('a');
    link.href = file.webpUrl;
    link.download = filename;
    link.click();
  }, [settings]);

  const handleRemove = useCallback((id) => {
    const file = files.find(f => f.id === id);
    if (file) {
      URL.revokeObjectURL(file.previewUrl);
      if (file.webpUrl) URL.revokeObjectURL(file.webpUrl);
    }
    actions.removeFile(id);
  }, [files, actions]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <header className="text-center mb-10 animate-pixel-fade">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary block-border flex items-center justify-center">
                <span className="pixel-text text-2xl text-text font-bold">C</span>
              </div>
              <h1 className="pixel-text text-4xl md:text-5xl text-text tracking-wider">
                COMPRANGEL
              </h1>
            </div>

            <p className="text-xl md:text-2xl text-primary pixel-text tracking-wide mb-3">
              "Craft Your Images, Block by Block"
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary block-border-sm text-sm">
              <span className="w-2 h-2 bg-text"></span>
              <span className="text-text">100% LOCAL • NO UPLOADS • OFFLINE READY</span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setShowHistory(true)}
                className="p-3 bg-surface block-btn"
                title="History"
              >
                <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <ThemeToggle />
            </div>
          </header>

          {/* Content */}
          <div className="space-y-6">
            <DropZone />

            {files.length > 0 && (
              <div className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full flex items-center justify-between p-4 bg-surface block-border block-hover"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary flex items-center justify-center">
                        <span className="pixel-text text-lg">⚙</span>
                      </div>
                      <span className="text-text font-medium">SETTINGS</span>
                    </div>
                    <span className="pixel-text text-xl text-text-muted">{showSettings ? '▲' : '▼'}</span>
                  </button>

                  {showSettings && <CompressionSettings />}

                  {selectedFile?.isConverted && (
                    <div className="bg-surface block-border p-4">
                      <h3 className="text-text font-medium text-sm mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-secondary flex items-center justify-center text-xs">👁</span>
                        PREVIEW
                      </h3>
                      <BeforeAfterSlider
                        beforeUrl={selectedFile.previewUrl}
                        afterUrl={selectedFile.webpUrl}
                        beforeLabel="BEFORE"
                        afterLabel="AFTER"
                      />
                    </div>
                  )}
                </div>

                <div className="lg:col-span-3 space-y-4">
                  <BatchControls onConvertAll={() => reconvertAll()} />
                  <FileList onEdit={handleEdit} onDownload={handleDownload} onRemove={handleRemove} />
                </div>
              </div>
            )}

            {files.length === 0 && (
              <div className="text-center py-6">
                <div className="inline-flex flex-wrap justify-center gap-2 pixel-text text-sm">
                  {['PNG', 'JPEG', 'GIF', 'WebP', 'AVIF', 'BMP', 'SVG'].map(fmt => (
                    <span key={fmt} className="px-3 py-1 bg-surface block-border-sm text-text-muted">{fmt}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 bg-surface border-t-4 border-block-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-secondary"></span>
              <span className="text-text-secondary">Zero Server Uploads</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-primary"></span>
              <span className="text-text-secondary">Instant Conversion</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-text"></span>
              <span className="text-text-secondary">Works Offline</span>
            </div>
          </div>

          <div className="h-1 bg-block-border mb-6"></div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary flex items-center justify-center">
                <span className="pixel-text text-sm font-bold text-text">C</span>
              </div>
              <span className="pixel-text text-lg text-text-muted">COMPRANGEL</span>
            </div>

            <p className="text-text-muted text-sm">
              The most advanced image converter • All processing happens locally
            </p>

            <div className="flex items-center gap-2">
              <span className="text-text-muted text-sm">Created by</span>
              <a
                href="https://www.linkedin.com/in/yunusozbucak/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1 bg-surface-light block-border-sm hover:bg-primary hover:text-text transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                <span className="text-sm font-medium">Yunus Emre Ozbucak</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {editingFile && <ImageEditor file={editingFile} onSave={handleSaveEdit} onClose={() => setEditingFile(null)} />}
      <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}

function App() {
  return (
    <ImageProvider>
      <ImageConverterApp />
    </ImageProvider>
  );
}

export default App;
