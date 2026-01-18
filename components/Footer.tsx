import React from 'react';

interface FooterProps {
    orthoMode: boolean;
    toggleOrtho: () => void;
    snapMode: boolean;
    toggleSnap: () => void;
    gridMode: boolean;
    toggleGrid: () => void;
}

export const Footer: React.FC<FooterProps> = ({ 
    orthoMode, toggleOrtho, 
    snapMode, toggleSnap, 
    gridMode, toggleGrid 
}) => {
    
    const ToggleButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
        <button 
            onClick={onClick}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors font-mono
            ${active ? 'bg-white/20 text-cad-primary shadow-sm' : 'hover:bg-white/10 text-gray-500 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <footer className="flex flex-col shrink-0 z-20 border-t border-cad-border bg-cad-panel">
            {/* Command Line Input */}
            <div className="flex items-center px-4 py-2 border-b border-cad-border/50 bg-[#0d1116]">
                <span className="text-cad-primary font-mono text-sm mr-2 font-bold">&gt;</span>
                <input 
                    className="bg-transparent border-none text-gray-300 text-sm w-full focus:ring-0 placeholder-gray-600 font-mono focus:outline-none" 
                    placeholder="Type a command" 
                    type="text"
                />
                <div className="hidden md:flex gap-2">
                    <span className="text-[10px] text-gray-500 font-mono border border-gray-700 rounded px-1.5 py-0.5 cursor-pointer hover:bg-gray-700">ESC Cancel</span>
                    <span className="text-[10px] text-gray-500 font-mono border border-gray-700 rounded px-1.5 py-0.5 cursor-pointer hover:bg-gray-700">ENTER Execute</span>
                    <span className="text-[10px] text-gray-500 font-mono border border-gray-700 rounded px-1.5 py-0.5 cursor-pointer hover:bg-gray-700">DEL Delete</span>
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 h-8 bg-cad-panel text-[11px] text-gray-400 font-medium select-none">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 font-mono">
                        <span className="text-gray-500">Ready</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-1">
                    <button className="px-2 py-0.5 rounded hover:bg-white/10 text-gray-300 font-bold transition-colors">MODEL</button>
                    <div className="w-px h-3 bg-gray-700 mx-1"></div>
                    <ToggleButton label="GRID" active={gridMode} onClick={toggleGrid} />
                    <ToggleButton label="SNAP" active={snapMode} onClick={toggleSnap} />
                    <ToggleButton label="ORTHO" active={orthoMode} onClick={toggleOrtho} />
                    <ToggleButton label="POLAR" active={false} onClick={() => {}} />
                    <ToggleButton label="OSNAP" active={snapMode} onClick={toggleSnap} />
                </div>
            </div>
        </footer>
    );
};