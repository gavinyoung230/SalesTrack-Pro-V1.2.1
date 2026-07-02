/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Pin, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  AlertCircle,
  Calendar,
  X,
  FileCheck,
  FolderOpen,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';
import { Note } from '../types';

interface NotesViewProps {
  categories: string[];
  userEmail: string | null;
}

const NOTE_COLORS = [
  { id: 'slate', name: 'Dark Slate', bg: 'bg-[#18181b]', border: 'border-zinc-800', accent: 'border-l-zinc-500' },
  { id: 'blue', name: 'Royal Blue', bg: 'bg-[#0f172a]', border: 'border-blue-900/40', accent: 'border-l-blue-500' },
  { id: 'green', name: 'Emerald', bg: 'bg-[#052e16]/40', border: 'border-emerald-900/40', accent: 'border-l-emerald-500' },
  { id: 'amber', name: 'Amber Warning', bg: 'bg-[#451a03]/40', border: 'border-amber-950/40', accent: 'border-l-amber-500' },
  { id: 'red', name: 'Crimson Alert', bg: 'bg-[#4c0519]/40', border: 'border-rose-950/40', accent: 'border-l-rose-500' },
  { id: 'purple', name: 'Purple Goal', bg: 'bg-[#2e1065]/40', border: 'border-purple-950/40', accent: 'border-l-purple-500' },
];

export default function NotesView({
  categories = [],
  userEmail
}: NotesViewProps) {
  const activeUserKey = userEmail || 'guest_user';
  
  // State for all notes
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(`ops_hub_notes_v1_${activeUserKey}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    
    // Seed standard starter notes if none found
    return [
      {
        id: 'note-seed-1',
        title: '📦 Standard Shipping Instructions',
        content: '1. Handle fragile 3D prints (especially PLA/PETG thin-walled gears) with extra padding.\n2. Wrap double-box for high-value orders over $150.\n3. Include a free brand sticker and business card in all custom order boxes.',
        category: 'Shipping',
        color: 'blue',
        isPinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'note-seed-2',
        title: '💡 Custom Laser Engraving Presets',
        content: '- Walnut Hardwood: 40% speed, 90% power, 300 DPI.\n- Clear Acrylic (Engrave): 70% speed, 30% power, 400 DPI (always mirror graphic!).\n- Anodized Aluminum: 25% speed, 100% power, 500 DPI.',
        category: 'Production',
        color: 'purple',
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'note-seed-3',
        title: '⚠️ Overhead Cutback Goals',
        content: '- Cancel raw material delivery subscriptions on months with low orders.\n- Order filament in bulk units (10kg+ rolls) from central suppliers to trim cost margins by 15%.',
        category: 'Overhead',
        color: 'red',
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  });

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterPinnedOnly, setFilterPinnedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // Form values
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formColor, setFormColor] = useState('slate');
  const [formIsPinned, setFormIsPinned] = useState(false);

  // Clipboard copies tracker
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion tracker to bypass iframe sandbox-blocked confirm modals
  const [noteIdToDelete, setNoteIdToDelete] = useState<string | null>(null);

  // Synchronize Notes List to localStorage whenever notes or userEmail change
  useEffect(() => {
    try {
      localStorage.setItem(`ops_hub_notes_v1_${activeUserKey}`, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed storing notes list', e);
    }
  }, [notes, activeUserKey]);

  // Load user notes when switching active logged-in account
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ops_hub_notes_v1_${activeUserKey}`);
      if (saved) {
        setNotes(JSON.parse(saved));
      } else {
        setNotes([]); // Standard clean empty canvas for brand new accounts
      }
    } catch {}
    setSearchQuery('');
    setSelectedCategory('All');
    setFilterPinnedOnly(false);
  }, [activeUserKey]);

  const handleOpenCreateModal = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    // Default to the first category if available
    setFormCategory(categories[0] || 'Uncategorized');
    setFormColor('slate');
    setFormIsPinned(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category || 'Uncategorized');
    setFormColor(note.color || 'slate');
    setFormIsPinned(!!note.isPinned);
    setIsModalOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const timestamp = new Date().toISOString();

    if (editingNote) {
      // Edit existing note
      const updatedNotes = notes.map(n => 
        n.id === editingNote.id 
          ? {
              ...n,
              title: formTitle.trim(),
              content: formContent.trim(),
              category: formCategory,
              color: formColor,
              isPinned: formIsPinned,
              updatedAt: timestamp
            }
          : n
      );
      setNotes(updatedNotes);
    } else {
      // Create new note
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        color: formColor,
        isPinned: formIsPinned,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      setNotes([newNote, ...notes]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteNote = (id: string) => {
    setNoteIdToDelete(id);
  };

  const handleTogglePin = (id: string, currentPinStatus: boolean) => {
    setNotes(notes.map(n => 
      n.id === id 
        ? { ...n, isPinned: !currentPinStatus, updatedAt: new Date().toISOString() }
        : n
    ));
  };

  const handleCopyContent = (note: Note) => {
    try {
      const fullText = `${note.title}\nCategory: ${note.category}\n\n${note.content}`;
      navigator.clipboard.writeText(fullText);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleExportNote = (note: Note) => {
    try {
      const textToSave = `=== TITLE: ${note.title} ===\nCATEGORY: ${note.category}\nCREATED: ${new Date(note.createdAt).toLocaleString()}\nLAST UPDATE: ${new Date(note.updatedAt).toLocaleString()}\n\n---\n\n${note.content}`;
      const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Clean name for file
      const safeTitle = note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30);
      link.download = `salestrackpro_note_${safeTitle || 'export'}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  // Seed default notes manually
  const handleSeedNotes = () => {
    const freshSeed: Note[] = [
      {
        id: 'note-seed-1',
        title: '📦 Standard Shipping Instructions',
        content: '1. Handle fragile 3D prints (especially PLA/PETG thin-walled gears) with extra padding.\n2. Wrap double-box for high-value orders over $150.\n3. Include a free brand sticker and business card in all custom order boxes.',
        category: categories[0] || 'General',
        color: 'blue',
        isPinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'note-seed-2',
        title: '💡 Custom Laser Engraving Presets',
        content: '- Walnut Hardwood: 40% speed, 90% power, 300 DPI.\n- Clear Acrylic (Engrave): 70% speed, 30% power, 400 DPI (always mirror graphic!).\n- Anodized Aluminum: 25% speed, 100% power, 500 DPI.',
        category: categories[1] || categories[0] || 'Production',
        color: 'purple',
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    setNotes(freshSeed);
  };

  // Formulate filtered lists
  const filteredNotes = notes.filter(note => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      note.title.toLowerCase().includes(query) || 
      note.content.toLowerCase().includes(query) ||
      note.category.toLowerCase().includes(query);
      
    const isUncategorized = !note.category || note.category === 'Uncategorized' || !categories.includes(note.category);
    const isCategorized = note.category && note.category !== 'Uncategorized' && categories.includes(note.category);
    const matchesCategory = 
      selectedCategory === 'All' || 
      (selectedCategory === 'Uncategorized' && isUncategorized) || 
      (selectedCategory === 'Categorized' && isCategorized) ||
      (selectedCategory !== 'Uncategorized' && selectedCategory !== 'Categorized' && note.category === selectedCategory);
    const matchesPinStatus = !filterPinnedOnly || note.isPinned;

    return matchesSearch && matchesCategory && matchesPinStatus;
  });

  // Apply sorting
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    // Pinned notes are always displayed first regardless of local sort
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'created') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); // 'updated' default
  });

  return (
    <div id="notes-manager-view" className="flex-1 flex flex-col gap-6 w-full animate-none">
      
      {/* Visual Header Block */}
      <div id="notes-view-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#0f172a] to-[#070b14] border border-[#1e3a8a]/40 rounded-[16px] shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-600/10 text-[#4169E1] border border-blue-500/20 rounded-xl">
            <BookOpen size={24} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-display">Business Ledger Notes</h1>
            <p className="text-xs text-gray-400 mt-0.5 font-sans">
              Keep critical raw material specs, shipping logs, and production procedures pinned side-by-side with your cashflows.
            </p>
          </div>
        </div>

        <div>
          <button
            id="create-note-trigger-btn"
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl border border-blue-500 shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create New Note</span>
          </button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-[#0f172a] border border-[#222] rounded-xl p-4 flex flex-col gap-4">
        
        {/* Search and sorting row */}
        <div className="flex flex-col lg:flex-row gap-3.5 justify-between">
          
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              id="notes-search-query-field"
              type="text"
              placeholder="Search notes by title, content, or active tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-1.5">
              <ArrowUpDown size={13} className="text-gray-500" />
              <span className="text-gray-500">SORT BY:</span>
              <select
                id="notes-sort-select"
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent text-gray-300 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="updated">Recently Updated</option>
                <option value="created">Created Date</option>
                <option value="title">Alphabetical Title</option>
              </select>
            </div>

            {/* Pinned checkbox button */}
            <button
              id="filter-pinned-toggle"
              onClick={() => setFilterPinnedOnly(!filterPinnedOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all cursor-pointer ${
                filterPinnedOnly 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                  : 'bg-[#09090b] border-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <Pin size={13} className={filterPinnedOnly ? 'fill-amber-400' : ''} />
              <span>PINNED ONLY</span>
            </button>

          </div>
        </div>

        {/* Categories Quick Badges */}
        <div className="border-t border-[#1e3a8a]/20 pt-3.5 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
            <Layers size={13} className="text-[#4169E1]" />
            <span>FILTER BY LEDGER CATEGORY:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              id="filter-cat-all"
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all cursor-pointer ${
                selectedCategory === 'All'
                  ? 'bg-[#1e3a8a] text-white border border-[#4169E1]'
                  : 'bg-black/30 border border-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              All Categories ({notes.length})
            </button>
            <button
              id="filter-cat-categorized"
              onClick={() => setSelectedCategory('Categorized')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all cursor-pointer ${
                selectedCategory === 'Categorized'
                  ? 'bg-[#1e3a8a] text-white border border-[#4169E1]'
                  : 'bg-black/30 border border-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Categorized ({notes.filter(n => n.category && n.category !== 'Uncategorized' && categories.includes(n.category)).length})
            </button>
            {categories.filter(cat => cat.toLowerCase() !== 'uncategorized').map((cat, idx) => {
              const count = notes.filter(n => n.category === cat).length;
              return (
                <button
                  id={`filter-cat-${cat}`}
                  key={idx}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1e3a8a] text-white border border-[#4169E1]'
                      : 'bg-black/30 border border-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
            {notes.some(n => !n.category || n.category === 'Uncategorized' || !categories.includes(n.category)) && (
              <button
                id="filter-cat-uncategorized"
                onClick={() => setSelectedCategory('Uncategorized')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all cursor-pointer ${
                  selectedCategory === 'Uncategorized'
                    ? 'bg-[#1e3a8a] text-white border border-[#4169E1]'
                    : 'bg-black/30 border border-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                Uncategorized ({notes.filter(n => !n.category || n.category === 'Uncategorized' || !categories.includes(n.category)).length})
              </button>
            )}
          </div>
        </div>

      </div>

      {sortedNotes.length > 0 ? (
        /* Notes Grid */
        <div id="notes-interactive-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedNotes.map((note) => {
            const matchColor = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0];
            const isNoteCopied = copiedId === note.id;

            return (
              <div
                id={`note-card-${note.id}`}
                key={note.id}
                className={`flex flex-col justify-between border rounded-[14px] p-5.5 relative hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ${matchColor.bg} ${matchColor.border} border-l-[5px] ${matchColor.accent} group overflow-hidden`}
              >
                {/* Custom Inline Confirmation Overlay to avoid iframe sandbox-blocked confirm dialogs */}
                {noteIdToDelete === note.id && (
                  <div className="absolute inset-0 bg-[#070b14] border border-red-500/20 rounded-[14px] p-5 flex flex-col justify-between z-10">
                    <div>
                      <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
                        <AlertCircle size={12} />
                        <span>Confirm Deletion</span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-2 line-clamp-1">{note.title}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Pressing delete will remove this ledger entry from local storage permanently.
                      </p>
                    </div>
                    <div className="flex gap-2.5 mt-4">
                      <button
                        type="button"
                        onClick={() => setNoteIdToDelete(null)}
                        className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold font-mono tracking-wide transition-all cursor-pointer"
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNotes(notes.filter(n => n.id !== note.id));
                          setNoteIdToDelete(null);
                        }}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold font-mono tracking-wide transition-all cursor-pointer"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                )}

                {/* Header row */}
                <div>
                  <div className="flex items-start justify-between gap-2.5 mb-2.5">
                    <span className="px-2 py-0.5 bg-black/45 border border-zinc-800 rounded text-[10px] font-mono font-bold tracking-wide text-gray-400 uppercase">
                      {note.category || 'General'}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button
                        id={`note-btn-pin-${note.id}`}
                        onClick={() => handleTogglePin(note.id, !!note.isPinned)}
                        className={`p-1 rounded hover:bg-zinc-800/60 transition-colors cursor-pointer ${
                          note.isPinned ? 'text-amber-400' : 'text-gray-600 opacity-50 group-hover:opacity-100'
                        }`}
                        title={note.isPinned ? "Unpin Note" : "Pin to Top"}
                      >
                        <Pin size={13} className={note.isPinned ? 'fill-amber-400' : ''} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-2 leading-snug line-clamp-2">
                    {note.title}
                  </h3>
                  
                  <p className="text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-wrap break-words line-clamp-6 mb-4">
                    {note.content}
                  </p>
                </div>

                {/* Footer and interactive quick utility controls */}
                <div className="border-t border-zinc-800/60 pt-3.5 mt-2 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                  <div className="flex items-center gap-1" title={`Updated: ${new Date(note.updatedAt).toLocaleTimeString()}`}>
                    <Calendar size={11} />
                    <span>{new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: '2-digit' })}</span>
                  </div>

                  <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-lg border border-zinc-800/40">
                    <button
                      id={`note-btn-copy-${note.id}`}
                      onClick={() => handleCopyContent(note)}
                      className={`p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-all cursor-pointer ${isNoteCopied ? 'text-emerald-400' : ''}`}
                      title="Copy contents to clipboard"
                    >
                      {isNoteCopied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    <button
                      id={`note-btn-dl-${note.id}`}
                      onClick={() => handleExportNote(note)}
                      className="p-1.5 rounded hover:bg-zinc-800 hover:text-white text-gray-500 transition-all cursor-pointer"
                      title="Export single note file (.txt)"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      id={`note-btn-edit-${note.id}`}
                      onClick={() => handleOpenEditModal(note)}
                      className="p-1.5 rounded hover:bg-zinc-800 hover:text-blue-400 text-gray-500 transition-all cursor-pointer"
                      title="Edit note text"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      id={`note-btn-delete-${note.id}`}
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 rounded hover:bg-rose-950 hover:text-rose-400 text-gray-500 transition-all cursor-pointer"
                      title="Delete permanently"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Gorgeous empty state canvas */
        <div id="notes-empty-slate" className="border border-dashed border-zinc-800 rounded-[16px] p-12 text-center flex flex-col items-center justify-center bg-[#0a0a0c]/20 max-w-2xl mx-auto my-6">
          <div className="p-4 bg-zinc-800/10 text-zinc-500 rounded-full border border-zinc-800/30 mb-4 animate-pulse">
            <FileText size={32} />
          </div>
          <h3 className="text-base font-bold text-gray-200 mb-1.5 font-sans">No Ledger Notes Classified</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-sans max-w-sm mb-6">
            There are no notes matching your search tags or active ledger query. Create a new custom checklist or procedure.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center font-mono">
            <button
              id="seed-starter-notes-btn"
              onClick={handleSeedNotes}
              className="text-xs font-bold text-blue-400 hover:text-white px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-black/40 rounded-lg transition-colors cursor-pointer"
            >
              SEED STANDARD PROTOCOLS
            </button>
            <span className="text-xs text-gray-600 hidden sm:inline">OR</span>
            <button
              id="empty-state-create-btn"
              onClick={handleOpenCreateModal}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              CREATE BLANK NOTE
            </button>
          </div>
        </div>
      )}

      {/* Editor Overlay Modal Portal */}
      {isModalOpen && (
        <div id="note-modal-overlay" className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div 
            id="note-editor-card"
            className="bg-[#0f172a] border border-[#1e3a8a]/40 rounded-[20px] shadow-2xl w-full max-w-xl overflow-hidden animate-none"
          >
            {/* Modal Title bar */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#1e3a8a]/20 bg-black/20">
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-blue-400" />
                <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
                  {editingNote ? 'Edit Ledger Note' : 'Draft New Business Note'}
                </h2>
              </div>
              <button
                id="close-note-modal-btn"
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-6 space-y-4">
              
              {/* Note Title Input */}
              <div className="space-y-1.5">
                <label htmlFor="note-form-title" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Title Heading</label>
                <input
                  id="note-form-title"
                  type="text"
                  required
                  placeholder="e.g. Filament Supplier Packing Specs"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  maxLength={80}
                  autoComplete="off"
                />
              </div>

              {/* Category dropdown & Background color row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Category selectors */}
                <div className="space-y-1.5">
                  <label htmlFor="note-form-category" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Ledger Category</label>
                  <select
                    id="note-form-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="General">General / Administrative</option>
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                    <option value="Uncategorized">Uncategorized / Miscellaneous</option>
                  </select>
                </div>

                {/* Color selects */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono font-sans">Visual Tint Color</label>
                  <div className="flex items-center gap-1.5 py-2">
                    {NOTE_COLORS.map((col) => {
                      const isColorSelected = formColor === col.id;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setFormColor(col.id)}
                          className={`w-6.5 h-6.5 rounded-full border transition-all cursor-pointer flex items-center justify-center text-[10px] ${
                            isColorSelected 
                              ? 'border-white scale-125 ring-1 ring-blue-500' 
                              : 'border-zinc-800 scale-100 hover:scale-110'
                          } ${col.bg}`}
                          title={col.name}
                        >
                          {isColorSelected && <span className="text-[9px] text-white">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Note Content Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="note-form-content" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Note Body Content</label>
                  <span className="text-[10px] text-zinc-500 font-mono">{formContent.length} characters</span>
                </div>
                <textarea
                  id="note-form-content"
                  required
                  rows={6}
                  placeholder="Record step-by-step procedures, business calculations, supplier presets, or overhead goals..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-sans resize-none leading-relaxed"
                  maxLength={1500}
                />
              </div>

              {/* Special options row */}
              <div className="flex items-center justify-between border-t border-zinc-800/50 pt-4 font-mono text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                  <input
                    id="note-form-is-pinned"
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="rounded border-zinc-800 text-blue-500 bg-[#0a0a0c] h-3.5 w-3.5 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Pin this note to outstanding top listing</span>
                </label>
              </div>

              {/* Form buttons */}
              <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-zinc-800/50">
                <button
                  id="cancel-modal-btn"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-transparent text-gray-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                >
                  Discard Draft
                </button>
                <button
                  id="save-note-modal-btn"
                  type="submit"
                  className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                >
                  {editingNote ? 'Save Changed Note' : 'Add Note to Ledger'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
