import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { RightPanel } from './components/RightPanel';
import { Footer } from './components/Footer';
import { ToolType, SidePanelMode, CADElement } from './types';

function App() {
    const [activeTool, setActiveTool] = useState<ToolType>(ToolType.SELECT);
    const [sideMode, setSideMode] = useState<SidePanelMode>(SidePanelMode.CHAT);
    const [elements, setElements] = useState<CADElement[]>([
        { id: 'init-1', type: 'LINE', start: { x: 100, y: 100 }, end: { x: 700, y: 100 }, layer: '0', color: '#8b949e' },
        { id: 'init-2', type: 'LINE', start: { x: 700, y: 100 }, end: { x: 700, y: 500 }, layer: '0', color: '#8b949e' },
        { id: 'init-3', type: 'LINE', start: { x: 700, y: 500 }, end: { x: 100, y: 500 }, layer: '0', color: '#8b949e' },
        { id: 'init-4', type: 'LINE', start: { x: 100, y: 500 }, end: { x: 100, y: 100 }, layer: '0', color: '#8b949e' }
    ]);

    // Drawing Aids State
    const [orthoMode, setOrthoMode] = useState(false);
    const [snapMode, setSnapMode] = useState(true);
    const [gridMode, setGridMode] = useState(true);

    // Keyboard shortcuts for delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Only delete if we are in SELECT mode to avoid accidents during typing in chat
                if (activeTool === ToolType.SELECT && document.activeElement === document.body) {
                    setElements(prev => prev.filter(el => !el.selected));
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTool]);

    const handleAddElement = (el: CADElement) => {
        setElements(prev => [...prev, el]);
    };

    const handleUpdateElement = (updatedEl: CADElement) => {
        setElements(prev => prev.map(el => el.id === updatedEl.id ? updatedEl : el));
    };

    const handleBulkUpdate = (updatedElements: CADElement[]) => {
        // Create a map for fast lookup
        const updates = new Map(updatedElements.map(e => [e.id, e]));
        setElements(prev => prev.map(el => updates.has(el.id) ? updates.get(el.id)! : el));
    };

    const handleImport = (importedElements: CADElement[]) => {
        setElements(importedElements);
    };

    const handleAIAction = (operation: string, aiElements?: CADElement[]) => {
        if (operation === 'CLEAR') {
            setElements([]);
        } else if (operation === 'DELETE_LAST') {
            setElements(prev => prev.slice(0, -1));
        } else if (operation === 'ADD' && aiElements) {
            setElements(prev => [...prev, ...aiElements]);
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-cad-bg text-cad-text font-display">
            <Header elements={elements} onImport={handleImport} />
            <div className="flex flex-1 overflow-hidden relative">
                <Toolbar activeTool={activeTool} onToolSelect={setActiveTool} />
                <Canvas 
                    elements={elements} 
                    activeTool={activeTool} 
                    onAddElement={handleAddElement}
                    onUpdateElement={handleUpdateElement}
                    onBulkUpdate={handleBulkUpdate}
                    setElements={setElements}
                    orthoMode={orthoMode}
                    snapMode={snapMode}
                    gridMode={gridMode}
                />
                <RightPanel 
                    mode={sideMode} 
                    onChangeMode={setSideMode} 
                    currentElements={elements}
                    onApplyAIAction={handleAIAction}
                />
            </div>
            <Footer 
                orthoMode={orthoMode} toggleOrtho={() => setOrthoMode(!orthoMode)}
                snapMode={snapMode} toggleSnap={() => setSnapMode(!snapMode)}
                gridMode={gridMode} toggleGrid={() => setGridMode(!gridMode)}
            />
        </div>
    );
}

export default App;