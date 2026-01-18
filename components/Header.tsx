import React, { useRef } from 'react';
import { exportToDXF, parseDXF } from '../services/dxfService';
import { CADElement } from '../types';

interface HeaderProps {
    elements: CADElement[];
    onImport: (elements: CADElement[]) => void;
}

export const Header: React.FC<HeaderProps> = ({ elements, onImport }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const dxfContent = exportToDXF(elements);
        const blob = new Blob([dxfContent], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drawing-${Date.now()}.dxf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const imported = parseDXF(text);
                onImport(imported);
            };
            reader.readAsText(file);
        }
    };

    const MenuLink = ({ label }: { label: string }) => (
        <button className="text-gray-300 hover:text-white px-3 py-1.5 text-sm font-medium transition-colors rounded hover:bg-white/5">
            {label}
        </button>
    );

    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-cad-border bg-cad-bg px-4 h-14 shrink-0 z-30 shadow-sm">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".dxf" 
                onChange={handleFileChange}
            />
            
            <div className="flex items-center gap-6">
                {/* Logo Area */}
                <div className="flex items-center gap-3">
                    <div className="size-8 flex items-center justify-center bg-cad-primary rounded text-white shadow-lg shadow-blue-500/20">
                        <span className="material-symbols-outlined text-[20px] transform -rotate-45">arrow_outward</span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-white text-sm font-bold leading-none tracking-tight font-display">DXF Editor</h2>
                        <span className="text-[10px] text-gray-500 font-mono">Untitled-1.dxf</span>
                    </div>
                </div>

                <div className="h-6 w-px bg-cad-border hidden md:block"></div>

                {/* Menu Bar */}
                <div className="hidden md:flex items-center gap-1">
                    <MenuLink label="File" />
                    <MenuLink label="Edit" />
                    <MenuLink label="View" />
                    <MenuLink label="Insert" />
                    <MenuLink label="Format" />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-gray-400">
                     <button className="p-1.5 hover:text-white hover:bg-white/10 rounded transition-colors" title="Undo">
                        <span className="material-symbols-outlined text-[20px]">undo</span>
                     </button>
                     <button className="p-1.5 hover:text-white hover:bg-white/10 rounded transition-colors" title="Redo">
                        <span className="material-symbols-outlined text-[20px]">redo</span>
                     </button>
                </div>

                <div className="h-5 w-px bg-cad-border"></div>

                <button onClick={handleImportClick} className="text-gray-400 hover:text-white text-xs font-medium px-2">
                    Import
                </button>

                <button 
                    onClick={handleExport}
                    className="hidden sm:flex items-center gap-2 h-8 px-4 bg-cad-primary hover:bg-cad-primaryHover text-white text-sm font-bold rounded transition-colors shadow-lg shadow-blue-900/20"
                >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    <span>Export</span>
                </button>

                <div className="size-8 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:bg-gray-600">
                    LT
                </div>
            </div>
        </header>
    );
};