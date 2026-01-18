import React, { useState, useEffect, useRef } from 'react';
import { SidePanelMode, ChatMessage, CADElement } from '../types';
import { sendCADCommandToGemini } from '../services/geminiService';

interface RightPanelProps {
    mode: SidePanelMode;
    onChangeMode: (mode: SidePanelMode) => void;
    currentElements: CADElement[];
    onApplyAIAction: (operation: string, elements?: CADElement[]) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ mode, onChangeMode, currentElements, onApplyAIAction }) => {
    // --- STATE ---
    // Properties Panel State
    const [propTab, setPropTab] = useState<'PROPERTIES' | 'LAYERS' | 'BLOCKS'>('PROPERTIES');
    
    // AI Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            sender: 'ai',
            text: "I'm ready to help with your floor plan. I can suggest furniture arrangements or optimize pathways. What are the constraints?",
            type: 'text',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: inputValue,
            type: 'text',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);

        const response = await sendCADCommandToGemini(userMsg.text, currentElements);

        setIsLoading(false);

        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: response.message,
            type: 'text',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);

        if (response.operation && response.operation !== 'NONE') {
            onApplyAIAction(response.operation, response.elements);
        }
    };

    // --- SUB-VIEWS ---

    const PropertiesView = () => {
        const selected = currentElements.find(e => e.selected);
        return (
            <div className="flex flex-col h-full bg-cad-panel">
                 <div className="flex border-b border-cad-border bg-[#161b22]">
                    <button onClick={() => setPropTab('PROPERTIES')} className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${propTab === 'PROPERTIES' ? 'text-white border-cad-primary bg-white/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Properties</button>
                    <button onClick={() => setPropTab('LAYERS')} className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${propTab === 'LAYERS' ? 'text-white border-cad-primary bg-white/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Layers</button>
                    <button onClick={() => setPropTab('BLOCKS')} className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${propTab === 'BLOCKS' ? 'text-white border-cad-primary bg-white/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Blocks</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                     {/* General Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">General</h3>
                            {selected && <span className="text-[10px] px-1.5 py-0.5 bg-cad-primary/20 text-cad-primary rounded border border-cad-primary/30">{selected.type}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 font-medium">COLOR</label>
                                <div className="h-8 bg-black/40 border border-cad-border rounded flex items-center px-2 gap-2">
                                    <div className="size-3 rounded-sm" style={{ backgroundColor: selected?.color || '#3b82f6' }}></div>
                                    <span className="text-xs text-gray-300">{selected ? 'Custom' : 'ByLayer'}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 font-medium">LAYER</label>
                                <div className="h-8 bg-black/40 border border-cad-border rounded flex items-center px-2 gap-2">
                                    <span className="material-symbols-outlined text-[14px] text-gray-500">layers</span>
                                    <span className="text-xs text-gray-300">{selected?.layer || '0'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="h-px bg-cad-border"></div>
                    {/* Geometry Section */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Geometry</h3>
                        {selected ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1"><label className="text-[10px] text-gray-500 font-medium">Position X</label><input readOnly value={(selected.start?.x || selected.center?.x || 0).toFixed(2)} className="w-full h-8 bg-black/20 border border-cad-border rounded px-2 text-xs text-right font-mono text-white" /></div>
                                <div className="space-y-1"><label className="text-[10px] text-gray-500 font-medium">Position Y</label><input readOnly value={(selected.start?.y || selected.center?.y || 0).toFixed(2)} className="w-full h-8 bg-black/20 border border-cad-border rounded px-2 text-xs text-right font-mono text-white" /></div>
                                {(selected.type === 'RECTANGLE' || selected.width !== undefined) && <><div className="space-y-1"><label className="text-[10px] text-gray-500 font-medium">Width</label><input readOnly value={Math.abs(selected.width || 0).toFixed(2)} className="w-full h-8 bg-black/20 border border-cad-border rounded px-2 text-xs text-right font-mono text-white" /></div><div className="space-y-1"><label className="text-[10px] text-gray-500 font-medium">Height</label><input readOnly value={Math.abs(selected.height || 0).toFixed(2)} className="w-full h-8 bg-black/20 border border-cad-border rounded px-2 text-xs text-right font-mono text-white" /></div></>}
                                {selected.type === 'CIRCLE' && <div className="space-y-1"><label className="text-[10px] text-gray-500 font-medium">Radius</label><input readOnly value={(selected.radius || 0).toFixed(2)} className="w-full h-8 bg-black/20 border border-cad-border rounded px-2 text-xs text-right font-mono text-white" /></div>}
                            </div>
                        ) : (
                             <div className="p-4 bg-cad-bg/50 rounded border border-cad-border/50 text-center"><span className="text-xs text-gray-500">No selection</span></div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const ModelListView = () => (
        <div className="flex flex-col h-full bg-[#12161c]">
            <div className="flex items-center justify-between p-4 border-b border-cad-border bg-cad-panel">
                <h3 className="text-sm font-bold text-white">Model Elements</h3>
                <span className="text-xs text-gray-500">{currentElements.length} items</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {currentElements.map((el, idx) => (
                    <div key={el.id} className={`flex items-center p-2 rounded hover:bg-white/5 cursor-pointer mb-1 ${el.selected ? 'bg-cad-primary/20 border border-cad-primary/30' : ''}`}>
                         <span className="material-symbols-outlined text-gray-500 text-[18px] mr-2">
                            {el.type === 'LINE' ? 'remove' : el.type === 'CIRCLE' ? 'circle' : 'rectangle'}
                         </span>
                         <div className="flex flex-col">
                             <span className="text-xs text-white font-medium">{el.type}</span>
                             <span className="text-[10px] text-gray-500 font-mono">ID: {el.id}</span>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const AssistantsView = () => {
        const assistants = [
            { id: 'layout', name: 'Layout Generator', icon: 'psychology', desc: 'Space optimization', color: 'text-cad-primary' },
            { id: 'plumbing', name: 'Plumbing Auditor', icon: 'water_drop', desc: 'Pipe connectivity', color: 'text-cyan-400' },
            { id: 'electrical', name: 'Electrical Check', icon: 'electrical_services', desc: 'Wiring compliance', color: 'text-yellow-400' },
            { id: 'safety', name: 'Safety Inspector', icon: 'health_and_safety', desc: 'Egress paths', color: 'text-red-400' },
        ];

        return (
            <div className="flex flex-col h-full bg-[#12161c]">
                <div className="flex items-center justify-between p-4 border-b border-cad-border bg-cad-panel">
                    <h3 className="text-sm font-bold text-white">AI Assistants</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 p-4">
                    {assistants.map(a => (
                         <div key={a.id} onClick={() => onChangeMode(SidePanelMode.CHAT)} className="group bg-cad-panel border border-cad-border p-3 rounded-lg hover:border-cad-primary cursor-pointer transition-colors flex items-start gap-3">
                            <div className="p-2 bg-black/30 rounded-md">
                                <span className={`material-symbols-outlined ${a.color} text-[24px]`}>{a.icon}</span>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white group-hover:text-cad-primary transition-colors">{a.name}</h4>
                                <p className="text-[10px] text-gray-500 leading-tight mt-1">{a.desc}</p>
                            </div>
                         </div>
                    ))}
                </div>
            </div>
        );
    };

    const ChatView = () => (
        <div className="flex flex-col h-full bg-[#12161c]">
            <div className="flex items-center justify-between p-4 border-b border-cad-border bg-cad-panel">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-cad-primary text-[20px] animate-pulse">psychology</span>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-none">Layout Generator</h3>
                        <p className="text-[10px] text-gray-500 mt-0.5">Optimizing space usage...</p>
                    </div>
                </div>
                <span className="text-[9px] bg-cad-primary/20 text-cad-primary px-1.5 py-0.5 rounded font-mono border border-cad-primary/30">BETA</span>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-cad-bg">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                         {msg.sender === 'ai' && (
                            <div className="size-8 rounded-full bg-[#1e293b] flex items-center justify-center shrink-0 border border-cad-border shadow-sm">
                                <span className="material-symbols-outlined text-cad-primary text-[16px]">smart_toy</span>
                            </div>
                         )}
                         <div className={`flex flex-col gap-1 max-w-[85%] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                            <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm border
                                ${msg.sender === 'ai' ? 'bg-[#1e293b] rounded-tl-none border-cad-border text-gray-200' : 'bg-cad-primary text-white rounded-tr-none border-transparent'}`}>
                                {msg.text}
                            </div>
                         </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex gap-3">
                        <div className="size-8 rounded-full bg-[#1e293b] flex items-center justify-center shrink-0 border border-cad-border"><span className="material-symbols-outlined text-cad-primary text-[16px] animate-spin">sync</span></div>
                        <div className="flex items-center"><div className="typing-indicator flex gap-1"><span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></span><span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span><span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span></div></div>
                     </div>
                )}
            </div>

            <div className="p-3 bg-cad-panel border-t border-cad-border">
                <div className="relative">
                    <input className="w-full bg-[#0d1116] border border-cad-border rounded-lg pl-3 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-cad-primary focus:border-cad-primary" placeholder="Ask Layout Generator..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { handleSend(); }}} />
                    <button onClick={handleSend} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-cad-primary hover:bg-blue-600 text-white rounded-md transition-colors flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-[16px]">send</span></button>
                </div>
            </div>
        </div>
    );

    const NavButton = ({ icon, label, active, onClick }: { icon: string, label: string, active: boolean, onClick: () => void }) => (
        <button onClick={onClick} className={`group flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-10 ${active ? 'bg-cad-primary/20 text-cad-primary' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`} title={label}>
            <span className={`material-symbols-outlined text-[20px] ${active ? 'filled' : ''}`}>{icon}</span>
        </button>
    );

    // --- RENDER ---
    return (
        <div className="flex h-full shrink-0 z-20 shadow-xl shadow-black/50 border-l border-cad-border bg-cad-panel">
            {/* Collapse Button */}
            <button 
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-12 bg-cad-panel border border-cad-border border-r-0 rounded-l-md flex items-center justify-center text-gray-400 hover:text-white cursor-pointer z-30" 
                title={isPanelCollapsed ? "Expand Panel" : "Collapse Panel"}
            >
                <span className="material-symbols-outlined text-[16px]">{isPanelCollapsed ? 'chevron_left' : 'chevron_right'}</span>
            </button>

            {/* Frame 1: Properties Library (Always visible on large screens or if not fully collapsed) */}
             <div className="w-64 border-r border-cad-border flex flex-col relative bg-cad-panel hidden lg:flex">
                <PropertiesView />
            </div>

            {/* Frame 2: AI / Dynamic Content (Collapsible) */}
            <div className={`flex flex-col relative bg-cad-panel transition-all duration-300 ${isPanelCollapsed ? 'w-0 overflow-hidden' : 'w-80 border-l border-cad-border'}`}>
                {mode === SidePanelMode.MODEL_LIST && <ModelListView />}
                {mode === SidePanelMode.ASSISTANTS && <AssistantsView />}
                {(mode === SidePanelMode.CHAT || mode === SidePanelMode.SETTINGS) && <ChatView />}
            </div>

            {/* Navigation Strip */}
            <nav className="w-12 border-l border-cad-border bg-[#0d1116] flex flex-col items-center py-4 gap-4 z-40">
                <NavButton icon="view_in_ar" label="Model" active={mode === SidePanelMode.MODEL_LIST} onClick={() => { setIsPanelCollapsed(false); onChangeMode(SidePanelMode.MODEL_LIST); }} />
                <NavButton icon="grid_view" label="Assistants" active={mode === SidePanelMode.ASSISTANTS} onClick={() => { setIsPanelCollapsed(false); onChangeMode(SidePanelMode.ASSISTANTS); }} />
                <NavButton icon="chat" label="Dialogue" active={mode === SidePanelMode.CHAT} onClick={() => { setIsPanelCollapsed(false); onChangeMode(SidePanelMode.CHAT); }} />
                
                <div className="flex-1"></div>
                <NavButton icon="settings" label="Settings" active={mode === SidePanelMode.SETTINGS} onClick={() => onChangeMode(SidePanelMode.SETTINGS)} />
                <div className="size-8 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer mt-2">JS</div>
            </nav>
        </div>
    );
};