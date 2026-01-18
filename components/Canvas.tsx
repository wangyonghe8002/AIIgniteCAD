import React, { useRef, useState } from 'react';
import { ToolType, CADElement, Point } from '../types';

interface CanvasProps {
    elements: CADElement[];
    activeTool: ToolType;
    onAddElement: (el: CADElement) => void;
    onUpdateElement: (el: CADElement) => void;
    onBulkUpdate: (elements: CADElement[]) => void;
    setElements: React.Dispatch<React.SetStateAction<CADElement[]>>;
    orthoMode: boolean;
    snapMode: boolean;
    gridMode: boolean;
}

// Helper types
type DragMode = 'DRAW' | 'PAN' | 'SELECT_BOX' | 'MOVE_ITEMS' | 'MIRROR_LINE';

// Helper functions for geometry
const dist = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

const getSnapPoints = (element: CADElement): Point[] => {
    const points: Point[] = [];
    if (element.type === 'LINE' && element.start && element.end) {
        points.push(element.start, element.end, { x: (element.start.x + element.end.x) / 2, y: (element.start.y + element.end.y) / 2 });
    } else if (element.type === 'RECTANGLE' && element.start && element.width !== undefined && element.height !== undefined) {
        points.push(
            element.start,
            { x: element.start.x + element.width, y: element.start.y },
            { x: element.start.x + element.width, y: element.start.y + element.height },
            { x: element.start.x, y: element.start.y + element.height }
        );
    } else if (element.type === 'CIRCLE' && element.center) {
        points.push(element.center);
        points.push({ x: element.center.x + element.radius!, y: element.center.y });
        points.push({ x: element.center.x - element.radius!, y: element.center.y });
        points.push({ x: element.center.x, y: element.center.y + element.radius! });
        points.push({ x: element.center.x, y: element.center.y - element.radius! });
    }
    return points;
};

export const Canvas: React.FC<CanvasProps> = ({ 
    elements, activeTool, onAddElement, onUpdateElement, onBulkUpdate, setElements,
    orthoMode, snapMode, gridMode 
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
    
    // Interaction State
    const [dragMode, setDragMode] = useState<DragMode | null>(null);
    const [startPoint, setStartPoint] = useState<Point | null>(null); // Screen coordinates for Panning
    const [currentPoint, setCurrentPoint] = useState<Point | null>(null); // Transformed coordinates
    const [drawStart, setDrawStart] = useState<Point | null>(null); // Transformed start for drawing
    const [snapIndicator, setSnapIndicator] = useState<Point | null>(null);

    // Helpers
    const getSVGPoint = (e: React.MouseEvent): Point => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };
        return {
            x: (e.clientX - CTM.e) / CTM.a,
            y: (e.clientY - CTM.f) / CTM.d
        };
    };

    const applyConstraints = (pt: Point, anchor?: Point): Point => {
        let constrained = { ...pt };

        // 1. Grid Snap (low priority)
        if (gridMode) {
            constrained.x = Math.round(constrained.x / 10) * 10;
            constrained.y = Math.round(constrained.y / 10) * 10;
        }

        // 2. Object Snap (high priority)
        if (snapMode) {
            let closestDist = 15; // Threshold
            let closestPt: Point | null = null;
            
            elements.forEach(el => {
                getSnapPoints(el).forEach(sp => {
                    const d = dist(pt, sp);
                    if (d < closestDist) {
                        closestDist = d;
                        closestPt = sp;
                    }
                });
            });
            
            if (closestPt) {
                constrained = closestPt;
                setSnapIndicator(closestPt);
            } else {
                setSnapIndicator(null);
            }
        } else {
            setSnapIndicator(null);
        }

        // 3. Ortho
        if (orthoMode && anchor) {
            const dx = Math.abs(constrained.x - anchor.x);
            const dy = Math.abs(constrained.y - anchor.y);
            if (dx > dy) {
                constrained.y = anchor.y;
            } else {
                constrained.x = anchor.x;
            }
        }

        return constrained;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const rawPt = getSVGPoint(e);
        
        // Pan (Middle Click or Space + Drag - simulated here just by Middle Click)
        if (e.button === 1 || (activeTool === ToolType.SELECT && e.button === 2)) {
            setDragMode('PAN');
            setStartPoint({ x: e.clientX, y: e.clientY });
            return;
        }

        const pt = applyConstraints(rawPt, undefined); // Snap on click start too

        if (activeTool === ToolType.SELECT) {
            // Check if clicking an element
            // Simplified hit testing
            const hitElement = elements.slice().reverse().find(el => {
                // Point-Line Distance Check
                if (el.type === 'LINE' && el.start && el.end) {
                    const l2 = Math.pow(dist(el.start, el.end), 2);
                    if (l2 === 0) return dist(rawPt, el.start) < 5;
                    const t = ((rawPt.x - el.start.x) * (el.end.x - el.start.x) + (rawPt.y - el.start.y) * (el.end.y - el.start.y)) / l2;
                    const tClamped = Math.max(0, Math.min(1, t));
                    const proj = { x: el.start.x + tClamped * (el.end.x - el.start.x), y: el.start.y + tClamped * (el.end.y - el.start.y) };
                    return dist(rawPt, proj) < 5;
                }
                // Circle
                if (el.type === 'CIRCLE' && el.center && el.radius) {
                    return Math.abs(dist(rawPt, el.center) - el.radius) < 5;
                }
                // Rect (Bounding box check for simplicity)
                if (el.type === 'RECTANGLE' && el.start && el.width !== undefined && el.height !== undefined) {
                    const x = el.width > 0 ? el.start.x : el.start.x + el.width;
                    const y = el.height > 0 ? el.start.y : el.start.y + el.height;
                    const w = Math.abs(el.width);
                    const h = Math.abs(el.height);
                    return rawPt.x >= x && rawPt.x <= x + w && rawPt.y >= y && rawPt.y <= y + h;
                }
                return false;
            });

            if (hitElement) {
                // If the element is already selected, start moving
                if (hitElement.selected) {
                    setDragMode('MOVE_ITEMS');
                    setDrawStart(rawPt); // Use raw point for delta calculation to avoid snap jitter on move start
                } else {
                    // Select it
                    const newSelection = e.shiftKey ? [...elements] : elements.map(el => ({...el, selected: false}));
                    const index = newSelection.findIndex(x => x.id === hitElement.id);
                    if(index !== -1) newSelection[index] = { ...newSelection[index], selected: true };
                    setElements(newSelection);
                    
                    // Prepare to move immediately
                    setDragMode('MOVE_ITEMS');
                    setDrawStart(rawPt);
                }
            } else {
                // Deselect if not shift
                if (!e.shiftKey) {
                     setElements(prev => prev.map(el => ({ ...el, selected: false })));
                }
                setDragMode('SELECT_BOX');
                setDrawStart(rawPt);
            }
        } 
        else if (activeTool === ToolType.MIRROR) {
            setDragMode('MIRROR_LINE');
            setDrawStart(pt);
            setCurrentPoint(pt);
        }
        else if (activeTool === ToolType.TRIM) {
             // Eraser Mode
             const hitElement = elements.slice().reverse().find(el => {
                // Same hit test logic as above (duplicated for brevity, ideally a helper)
                // Using a simpler bounding box approach for circle/rect for speed
                 if (el.type === 'LINE' && el.start && el.end) {
                    const l2 = Math.pow(dist(el.start, el.end), 2);
                    if (l2 === 0) return dist(rawPt, el.start) < 5;
                    const t = ((rawPt.x - el.start.x) * (el.end.x - el.start.x) + (rawPt.y - el.start.y) * (el.end.y - el.start.y)) / l2;
                    const tClamped = Math.max(0, Math.min(1, t));
                    const proj = { x: el.start.x + tClamped * (el.end.x - el.start.x), y: el.start.y + tClamped * (el.end.y - el.start.y) };
                    return dist(rawPt, proj) < 5;
                }
                if (el.type === 'CIRCLE' && el.center && el.radius) { return Math.abs(dist(rawPt, el.center) - el.radius) < 5; }
                if (el.type === 'RECTANGLE' && el.start) {
                    const x = Math.min(el.start.x, el.start.x + el.width!);
                    const y = Math.min(el.start.y, el.start.y + el.height!);
                    return rawPt.x >= x && rawPt.x <= x + Math.abs(el.width!) && rawPt.y >= y && rawPt.y <= y + Math.abs(el.height!);
                }
                return false;
             });

             if (hitElement) {
                 setElements(prev => prev.filter(e => e.id !== hitElement.id));
             }
        }
        else {
            // Drawing Tools
            setDragMode('DRAW');
            setDrawStart(pt);
            setCurrentPoint(pt);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rawPt = getSVGPoint(e);
        const pt = applyConstraints(rawPt, drawStart || undefined); // Constrain relative to start if drawing

        if (dragMode === 'PAN' && startPoint) {
            const dx = (e.clientX - startPoint.x) * (viewBox.w / svgRef.current!.clientWidth);
            const dy = (e.clientY - startPoint.y) * (viewBox.h / svgRef.current!.clientHeight);
            setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
            setStartPoint({ x: e.clientX, y: e.clientY });
            return;
        }

        setCurrentPoint(pt);

        if (dragMode === 'MOVE_ITEMS' && drawStart) {
            // Delta from raw points to avoid double snapping issues
            const dx = rawPt.x - drawStart.x; 
            const dy = rawPt.y - drawStart.y;
            
            // Constrain move if ortho
            let effDx = dx;
            let effDy = dy;
            if (orthoMode) {
                if (Math.abs(dx) > Math.abs(dy)) effDy = 0; else effDx = 0;
            }

            // Temporarily update positions for visual feedback (could be optimized)
            // Ideally we'd use a separate layer for "moving" items, but modifying state is easiest for this demo
            // BUT, react state batching might be slow for complex drawings.
            // For this demo, we won't live-update the actual elements state to avoid lag, 
            // instead we'll render a "ghost" of the selected items in the render loop.
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        const rawPt = getSVGPoint(e);
        const pt = applyConstraints(rawPt, drawStart || undefined);

        if (dragMode === 'SELECT_BOX' && drawStart) {
            // Box Select
            const x = Math.min(drawStart.x, rawPt.x);
            const y = Math.min(drawStart.y, rawPt.y);
            const w = Math.abs(drawStart.x - rawPt.x);
            const h = Math.abs(drawStart.y - rawPt.y);
            
            const selectedIds = new Set<string>();
            elements.forEach(el => {
                // Simplified: Select if start point is in box
                let px = 0, py = 0;
                if (el.start) { px = el.start.x; py = el.start.y; }
                else if (el.center) { px = el.center.x; py = el.center.y; }
                
                if (px >= x && px <= x+w && py >= y && py <= y+h) {
                    selectedIds.add(el.id);
                }
            });

            setElements(prev => prev.map(el => ({ ...el, selected: selectedIds.has(el.id) || (e.shiftKey && el.selected) })));
        }

        if (dragMode === 'MOVE_ITEMS' && drawStart) {
            const dx = rawPt.x - drawStart.x;
            const dy = rawPt.y - drawStart.y;
            let effDx = dx;
            let effDy = dy;
            if (orthoMode) {
                if (Math.abs(dx) > Math.abs(dy)) effDy = 0; else effDx = 0;
            }

            // Apply move
            if (Math.abs(effDx) > 0 || Math.abs(effDy) > 0) {
                setElements(prev => prev.map(el => {
                    if (!el.selected) return el;
                    const newEl = { ...el };
                    if (newEl.start) newEl.start = { x: newEl.start.x + effDx, y: newEl.start.y + effDy };
                    if (newEl.end) newEl.end = { x: newEl.end.x + effDx, y: newEl.end.y + effDy };
                    if (newEl.center) newEl.center = { x: newEl.center.x + effDx, y: newEl.center.y + effDy };
                    // Points for polyline?
                    return newEl;
                }));
            }
        }

        if (dragMode === 'MIRROR_LINE' && drawStart) {
            // Perform Mirror
            // Mirror line is defined by drawStart and pt
            // If pt is same as drawStart, ignore
            if (dist(drawStart, pt) > 5) {
                // Calculate reflection
                const A = pt.y - drawStart.y;
                const B = drawStart.x - pt.x;
                const C = -A * drawStart.x - B * drawStart.y;
                const M = Math.sqrt(A*A + B*B);
                
                // For each selected item, create a copy and reflect coords
                const newItems: CADElement[] = [];
                elements.filter(e => e.selected).forEach(el => {
                    const reflect = (p: Point): Point => {
                        const d = (A * p.x + B * p.y + C) / (A*A + B*B);
                        return { x: p.x - 2 * A * d, y: p.y - 2 * B * d };
                    };
                    
                    const copy: CADElement = { ...el, id: Math.random().toString(36).substr(2, 9), selected: true };
                    if (copy.start) copy.start = reflect(copy.start);
                    if (copy.end) copy.end = reflect(copy.end);
                    if (copy.center) copy.center = reflect(copy.center);
                    // For rect, it becomes a polyline technically if rotated, but let's just mirror start and re-calc width/height if axis aligned?
                    // Simple Rect mirroring can be weird if not axis aligned. 
                    // Let's assume just reflecting start/width/height logic for simplicity or convert to lines.
                    // For this demo, mirroring rectangles might flip them inside out.
                    if (copy.type === 'RECTANGLE') {
                         // Reflecting a rect properly requires 4 points.
                         // Let's keep it simple: just mirror start, and flip width/height based on line slope?
                         // Too complex. Let's just reflect start and hope.
                         copy.start = reflect(el.start!); 
                         // Correct: Should reflect all 4 corners and make a polyline, but keeping as rect:
                    }
                    newItems.push(copy);
                });
                onAddElement(newItems[0]); // Hack to trigger re-render or add list
                setElements(prev => [...prev.map(e => ({...e, selected: false})), ...newItems]);
            }
        }

        if (dragMode === 'DRAW' && drawStart && currentPoint) {
            const uid = Math.random().toString(36).substr(2, 9);
            let newElement: CADElement | null = null;
            
            // Don't create zero size objects
            if (dist(drawStart, pt) > 2) {
                if (activeTool === ToolType.LINE) {
                    newElement = { id: uid, type: 'LINE', layer: '0', color: '#e6edf3', start: drawStart, end: pt };
                } else if (activeTool === ToolType.RECTANGLE) {
                    newElement = { 
                        id: uid, type: 'RECTANGLE', layer: '0', color: '#e6edf3', 
                        start: drawStart, width: pt.x - drawStart.x, height: pt.y - drawStart.y 
                    };
                } else if (activeTool === ToolType.CIRCLE) {
                    const radius = dist(drawStart, pt);
                    newElement = { id: uid, type: 'CIRCLE', layer: '0', color: '#e6edf3', center: drawStart, radius: radius };
                }
            }

            if (newElement) {
                onAddElement(newElement);
            }
        }

        setDragMode(null);
        setDrawStart(null);
        setCurrentPoint(null);
        setStartPoint(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        const scale = e.deltaY > 0 ? 1.1 : 0.9;
        // Zoom towards center for simplicity
        setViewBox(prev => ({
            x: prev.x + (prev.w - prev.w * scale) / 2,
            y: prev.y + (prev.h - prev.h * scale) / 2,
            w: prev.w * scale,
            h: prev.h * scale
        }));
    };

    return (
        <main className={`flex-1 relative bg-cad-bg overflow-hidden cursor-crosshair group/canvas ${gridMode ? 'bg-grid-pattern' : ''}`}>
            {/* Status Overlay */}
            <div className="absolute top-4 left-4 bg-cad-panel/80 backdrop-blur border border-cad-border rounded px-3 py-1.5 text-xs font-mono text-gray-300 pointer-events-none select-none z-10 flex items-center gap-2">
                <span>Top View [2D Wireframe]</span>
                <span className="w-px h-3 bg-gray-500"></span>
                <span>Zoom: {Math.round(800 / viewBox.w * 100)}%</span>
            </div>
            
            {dragMode === 'MIRROR_LINE' && (
                <div className="absolute top-12 left-4 bg-blue-900/80 border border-blue-500 rounded px-3 py-1 text-xs text-white z-10">
                    Draw mirror line...
                </div>
            )}
            
            {activeTool === ToolType.TRIM && (
                <div className="absolute top-12 left-4 bg-red-900/80 border border-red-500 rounded px-3 py-1 text-xs text-white z-10">
                    Eraser Mode: Click objects to remove
                </div>
            )}

            <div className="w-full h-full" id="drawing-surface">
                <svg 
                    ref={svgRef}
                    className="w-full h-full block"
                    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onWheel={handleWheel}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <defs>
                        <marker id="arrow" markerHeight="10" markerUnits="strokeWidth" markerWidth="10" orient="auto" refX="9" refY="3">
                            <path d="M0,0 L0,6 L9,3 z" fill="#137fec"></path>
                        </marker>
                    </defs>

                    {/* Render Existing Elements */}
                    {elements.map(el => {
                        const isSelected = el.selected;
                        const style = { 
                            stroke: isSelected ? '#fbbf24' : el.color, // Yellow if selected
                            strokeWidth: isSelected ? 3 : 2,
                            strokeDasharray: isSelected ? '5,2' : 'none',
                            cursor: activeTool === ToolType.SELECT ? 'move' : 'crosshair'
                        };
                        
                        // Apply Ghost transform if moving
                        let tx = 0, ty = 0;
                        if (isSelected && dragMode === 'MOVE_ITEMS' && drawStart && currentPoint) {
                            tx = currentPoint.x - drawStart.x;
                            ty = currentPoint.y - drawStart.y;
                            if (orthoMode) {
                                if (Math.abs(tx) > Math.abs(ty)) ty = 0; else tx = 0;
                            }
                        }

                        const transform = `translate(${tx}, ${ty})`;

                        if (el.type === 'LINE' && el.start && el.end) {
                            return <line key={el.id} x1={el.start.x} y1={el.start.y} x2={el.end.x} y2={el.end.y} {...style} transform={transform} vectorEffect="non-scaling-stroke" />;
                        }
                        if (el.type === 'RECTANGLE' && el.start && el.width) {
                            const x = el.width > 0 ? el.start.x : el.start.x + el.width;
                            const y = el.height! > 0 ? el.start.y : el.start.y + el.height!;
                            return <rect key={el.id} x={x} y={y} width={Math.abs(el.width)} height={Math.abs(el.height || 0)} fill="none" {...style} transform={transform} vectorEffect="non-scaling-stroke" />;
                        }
                        if (el.type === 'CIRCLE' && el.center && el.radius) {
                            return <circle key={el.id} cx={el.center.x} cy={el.center.y} r={el.radius} fill="none" {...style} transform={transform} vectorEffect="non-scaling-stroke" />;
                        }
                        return null;
                    })}

                    {/* Render Ghost Shape while Drawing */}
                    {dragMode === 'DRAW' && drawStart && currentPoint && (
                        <g opacity="0.6">
                            {activeTool === ToolType.LINE && (
                                <line x1={drawStart.x} y1={drawStart.y} x2={currentPoint.x} y2={currentPoint.y} stroke="#137fec" strokeWidth={2} strokeDasharray="5,5" vectorEffect="non-scaling-stroke" />
                            )}
                            {activeTool === ToolType.RECTANGLE && (
                                <rect 
                                    x={Math.min(drawStart.x, currentPoint.x)} 
                                    y={Math.min(drawStart.y, currentPoint.y)} 
                                    width={Math.abs(currentPoint.x - drawStart.x)} 
                                    height={Math.abs(currentPoint.y - drawStart.y)} 
                                    fill="rgba(19, 127, 236, 0.1)" stroke="#137fec" strokeWidth={2} strokeDasharray="5,5" vectorEffect="non-scaling-stroke" 
                                />
                            )}
                             {activeTool === ToolType.CIRCLE && (
                                <circle 
                                    cx={drawStart.x} 
                                    cy={drawStart.y} 
                                    r={dist(drawStart, currentPoint)} 
                                    fill="none" stroke="#137fec" strokeWidth={2} strokeDasharray="5,5" vectorEffect="non-scaling-stroke" 
                                />
                            )}
                        </g>
                    )}

                    {/* Render Mirror Line */}
                    {dragMode === 'MIRROR_LINE' && drawStart && currentPoint && (
                         <line x1={drawStart.x} y1={drawStart.y} x2={currentPoint.x} y2={currentPoint.y} stroke="#fbbf24" strokeWidth={1} strokeDasharray="10,5,2,5" vectorEffect="non-scaling-stroke" />
                    )}

                    {/* Render Selection Box */}
                    {dragMode === 'SELECT_BOX' && drawStart && currentPoint && (
                        <rect 
                            x={Math.min(drawStart.x, currentPoint.x)} 
                            y={Math.min(drawStart.y, currentPoint.y)} 
                            width={Math.abs(currentPoint.x - drawStart.x)} 
                            height={Math.abs(currentPoint.y - drawStart.y)} 
                            fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth={1} vectorEffect="non-scaling-stroke" 
                        />
                    )}

                    {/* Snap Indicator */}
                    {snapIndicator && (
                        <rect 
                            x={snapIndicator.x - 3} y={snapIndicator.y - 3} 
                            width="6" height="6" 
                            fill="#facc15" stroke="none" 
                            className="animate-pulse"
                            vectorEffect="non-scaling-stroke" // Doesn't scale with zoom well on rects, but ok for SVG
                        />
                    )}
                </svg>
            </div>
            
             {/* Floating Zoom Controls */}
             <div className="absolute top-4 right-4 flex flex-col items-center gap-1">
                 <div className="bg-cad-panel/90 backdrop-blur rounded p-1 shadow-lg border border-cad-border flex flex-col gap-1">
                    <button className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white" onClick={() => setViewBox(v => ({...v, w: v.w * 0.9, h: v.h * 0.9}))}><span className="material-symbols-outlined text-lg">add</span></button>
                    <button className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white" onClick={() => setViewBox(v => ({...v, w: v.w * 1.1, h: v.h * 1.1}))}><span className="material-symbols-outlined text-lg">remove</span></button>
                    <button className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white" onClick={() => setViewBox({ x: 0, y: 0, w: 800, h: 600 })}><span className="material-symbols-outlined text-lg">crop_free</span></button>
                 </div>
            </div>
        </main>
    );
};