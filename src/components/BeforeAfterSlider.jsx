import { useState, useRef, useEffect } from 'react';

export function BeforeAfterSlider({ beforeUrl, afterUrl, beforeLabel = 'Before', afterLabel = 'After' }) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const containerRef = useRef(null);
    const isDraggingRef = useRef(false);

    const updatePosition = (clientX) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        isDraggingRef.current = true;
    };
    const handleMouseUp = () => { isDraggingRef.current = false; };
    const handleMouseMove = (e) => { if (isDraggingRef.current) updatePosition(e.clientX); };
    const handleTouchMove = (e) => {
        e.preventDefault();
        updatePosition(e.touches[0].clientX);
    };
    const handleClick = (e) => { updatePosition(e.clientX); };

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            className="relative w-full aspect-video block-inset overflow-hidden cursor-ew-resize select-none bg-surface-light"
        >
            {/* After image (full size, bottom layer) */}
            <img
                src={afterUrl}
                alt={afterLabel}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                draggable={false}
            />

            {/* Before image (same size, clipped with clip-path) */}
            <img
                src={beforeUrl}
                alt={beforeLabel}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{
                    clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
                }}
                draggable={false}
            />

            {/* Slider line */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-primary pointer-events-none"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-primary flex items-center justify-center border-2 border-block-border">
                    <span className="pixel-text text-lg text-text">◀▶</span>
                </div>
            </div>

            {/* Labels */}
            <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 text-text pixel-text text-sm pointer-events-none">
                {beforeLabel}
            </div>
            <div className="absolute top-2 right-2 px-2 py-1 bg-background/80 text-text pixel-text text-sm pointer-events-none">
                {afterLabel}
            </div>
        </div>
    );
}
