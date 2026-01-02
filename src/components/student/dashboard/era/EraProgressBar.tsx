import React from 'react';

export const EraProgressBar = ({ value, color, height = "h-2" }: { value: number, color?: string, height?: string }) => (
    <div className={`w-full bg-black/5 rounded-full ${height} overflow-hidden`}>
        <div
            className={`${height} rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]`}
            style={{
                width: `${value}%`,
                backgroundColor: color || '#FF8DA1',
                backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)'
            }}
        />
    </div>
);
