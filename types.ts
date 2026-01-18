export enum ToolType {
    SELECT = 'SELECT',
    LINE = 'LINE',
    CIRCLE = 'CIRCLE',
    RECTANGLE = 'RECTANGLE',
    TEXT = 'TEXT',
    POLYLINE = 'POLYLINE',
    ARC = 'ARC',
    HATCH = 'HATCH',
    TRIM = 'TRIM',
    MIRROR = 'MIRROR',
    ROTATE = 'ROTATE',
    DIMENSION = 'DIMENSION',
    MEASURE = 'MEASURE'
}

export enum SidePanelMode {
    MODEL_LIST = 'MODEL_LIST',
    ASSISTANTS = 'ASSISTANTS',
    CHAT = 'CHAT',
    SETTINGS = 'SETTINGS'
}

export interface Point {
    x: number;
    y: number;
}

export interface CADElement {
    id: string;
    type: 'LINE' | 'CIRCLE' | 'RECTANGLE' | 'LWPOLYLINE';
    layer: string;
    color: string; // Hex or AutoCAD color index
    selected?: boolean;
    // Geometry properties
    start?: Point;
    end?: Point; // For Line
    center?: Point; // For Circle
    radius?: number; // For Circle
    width?: number; // For Rect
    height?: number; // For Rect
    points?: Point[]; // For Polyline
}

export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
    type: 'text' | 'action';
}

export interface AIActionResponse {
    message: string;
    operation?: 'ADD' | 'CLEAR' | 'DELETE_LAST' | 'NONE';
    elements?: CADElement[];
}