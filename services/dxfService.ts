import { CADElement } from '../types';

// Helper to generate a unique ID
const uid = () => Math.random().toString(36).substr(2, 9);

// --- EXPORT LOGIC ---
export const exportToDXF = (elements: CADElement[]): string => {
    let dxf = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";

    elements.forEach(el => {
        if (el.type === 'LINE' && el.start && el.end) {
            dxf += `0\nLINE\n8\n${el.layer}\n10\n${el.start.x}\n20\n${el.start.y}\n11\n${el.end.x}\n21\n${el.end.y}\n`;
        } else if (el.type === 'CIRCLE' && el.center && el.radius) {
            dxf += `0\nCIRCLE\n8\n${el.layer}\n10\n${el.center.x}\n20\n${el.center.y}\n40\n${el.radius}\n`;
        } else if (el.type === 'RECTANGLE' && el.start && el.width && el.height) {
            // Export rectangle as LWPOLYLINE
            dxf += `0\nLWPOLYLINE\n8\n${el.layer}\n90\n4\n70\n1\n`;
            // Vertex 1
            dxf += `10\n${el.start.x}\n20\n${el.start.y}\n`;
            // Vertex 2
            dxf += `10\n${el.start.x + el.width}\n20\n${el.start.y}\n`;
            // Vertex 3
            // Use + height because we are now storing signed delta Y. 
            // If we assume a 1:1 coordinate map to DXF, adding the delta reaches the other corner.
            dxf += `10\n${el.start.x + el.width}\n20\n${el.start.y + el.height}\n`; 
            // Vertex 4
            dxf += `10\n${el.start.x}\n20\n${el.start.y + el.height}\n`;
        }
    });

    dxf += "0\nENDSEC\n0\nEOF";
    return dxf;
};

// --- IMPORT LOGIC ---
// A very basic parser for demo purposes. Real DXF parsing is complex.
export const parseDXF = (dxfContent: string): CADElement[] => {
    const lines = dxfContent.split(/\r?\n/);
    const elements: CADElement[] = [];
    
    let currentEntity: any = null;
    let section = '';
    
    for (let i = 0; i < lines.length; i++) {
        const code = lines[i].trim();
        const value = lines[i + 1]?.trim();
        i++; // consume value

        if (code === '0' && value === 'SECTION') continue;
        if (code === '2' && value === 'ENTITIES') { section = 'ENTITIES'; continue; }
        if (code === '0' && value === 'ENDSEC') { section = ''; continue; }

        if (section === 'ENTITIES') {
            if (code === '0') {
                // New Entity or End
                if (currentEntity) {
                    elements.push(finalizeEntity(currentEntity));
                }
                if (value === 'LINE' || value === 'CIRCLE' || value === 'LWPOLYLINE') {
                    currentEntity = { type: value, points: [] };
                } else {
                    currentEntity = null;
                }
            } else if (currentEntity) {
                parseEntityProp(currentEntity, code, value);
            }
        }
    }
    if (currentEntity) elements.push(finalizeEntity(currentEntity));

    return elements.filter(e => e.type === 'LINE' || e.type === 'CIRCLE' || e.type === 'RECTANGLE'); // Simplified
};

function parseEntityProp(entity: any, code: string, value: string) {
    const val = parseFloat(value);
    switch (code) {
        case '8': entity.layer = value; break;
        case '10': entity.x1 = val; if(entity.type === 'LWPOLYLINE') entity.points.push({x: val, y:0}); break; // temp storage for polyline
        case '20': entity.y1 = val; if(entity.type === 'LWPOLYLINE') entity.points[entity.points.length-1].y = val; break;
        case '11': entity.x2 = val; break;
        case '21': entity.y2 = val; break;
        case '40': entity.r = val; break;
    }
}

function finalizeEntity(entity: any): CADElement {
    const base = { id: uid(), layer: entity.layer || '0', color: '#e6edf3' };
    
    if (entity.type === 'LINE') {
        return {
            ...base,
            type: 'LINE',
            start: { x: entity.x1 || 0, y: entity.y1 || 0 },
            end: { x: entity.x2 || 0, y: entity.y2 || 0 }
        };
    } else if (entity.type === 'CIRCLE') {
        return {
            ...base,
            type: 'CIRCLE',
            center: { x: entity.x1 || 0, y: entity.y1 || 0 },
            radius: entity.r || 10
        };
    }
    // Simplification: Treat polyline as nothing for now or Lines if needed
    // In a full app, we would handle Polyline fully.
    return { ...base, type: 'LINE', start: {x:0, y:0}, end: {x:0, y:0} }; 
}