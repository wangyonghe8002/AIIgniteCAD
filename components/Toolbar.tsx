import React from 'react';
import { ToolType } from '../types';

interface ToolbarProps {
    activeTool: ToolType;
    onToolSelect: (tool: ToolType) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolSelect }) => {
    
    const ToolButton = ({ tool, icon, label }: { tool: ToolType, icon: string, label: string }) => {
        const isActive = activeTool === tool;
        return (
            <button 
                onClick={() => onToolSelect(tool)}
                className={`group relative flex size-10 items-center justify-center rounded transition-all shrink-0 
                ${isActive ? 'bg-cad-primary text-white shadow-md' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                title={label}
            >
                <span className="material-symbols-outlined text-[24px]">{icon}</span>
                <span className="absolute left-12 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {label}
                </span>
            </button>
        );
    };

    return (
        <aside className="w-14 bg-cad-panel border-r border-cad-border flex flex-col items-center py-4 gap-2 shrink-0 z-10 overflow-y-auto">
            <ToolButton tool={ToolType.SELECT} icon="arrow_selector_tool" label="Select" />
            
            <div className="w-8 h-px bg-cad-border my-1 shrink-0"></div>
            
            <ToolButton tool={ToolType.LINE} icon="remove" label="Line" />
            <ToolButton tool={ToolType.POLYLINE} icon="polyline" label="Polyline" />
            <ToolButton tool={ToolType.CIRCLE} icon="circle" label="Circle" />
            <ToolButton tool={ToolType.ARC} icon="interests" label="Arc" />
            <ToolButton tool={ToolType.RECTANGLE} icon="rectangle" label="Rectangle" />
            <ToolButton tool={ToolType.HATCH} icon="texture" label="Hatch" />
            
            <div className="w-8 h-px bg-cad-border my-1 shrink-0"></div>
            
            <ToolButton tool={ToolType.TRIM} icon="content_cut" label="Trim" />
            <ToolButton tool={ToolType.MIRROR} icon="flip" label="Mirror" />
            <ToolButton tool={ToolType.ROTATE} icon="rotate_right" label="Rotate" />
            
            <div className="w-8 h-px bg-cad-border my-1 shrink-0"></div>
            
            <ToolButton tool={ToolType.TEXT} icon="title" label="Text" />
            <ToolButton tool={ToolType.DIMENSION} icon="straighten" label="Dimension" />
            <ToolButton tool={ToolType.MEASURE} icon="square_foot" label="Measure" />
        </aside>
    );
};