'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useFitomicsStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  StickyNote,
  X,
  Minimize2,
  Maximize2,
  Plus,
  Trash2,
  Pin,
  PinOff,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
} from 'lucide-react';

export function FloatingNotes() {
  const {
    sessionNotes,
    activeNoteContent,
    isNotePanelOpen,
    activeClientId,
    setNotePanelOpen,
    setActiveNoteContent,
    saveNote,
    deleteNote,
    pinNote,
    getActiveClient,
  } = useFitomicsStore();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const activeClient = isHydrated ? getActiveClient() : null;
  
  // Filter notes for current client or general notes
  const relevantNotes = isHydrated 
    ? sessionNotes.filter(n => n.clientId === activeClientId || n.clientId === null)
    : [];
  
  // Sort: pinned first, then by date
  const sortedNotes = [...relevantNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  const handleSave = () => {
    if (activeNoteContent.trim()) {
      saveNote();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Floating toggle button when panel is closed
  if (!isNotePanelOpen) {
    return (
      <Button
        onClick={() => setNotePanelOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d] z-50"
        size="icon"
      >
        <StickyNote className="h-6 w-6" />
        {relevantNotes.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#00263d] text-white text-xs flex items-center justify-center">
            {relevantNotes.length}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 bg-background border rounded-lg shadow-2xl z-50 transition-all duration-200",
        isMinimized ? "w-72 h-12" : "w-96 h-[500px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-[#00263d] text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-[#c19962]" />
          <span className="font-semibold text-sm">Session Notes</span>
          {activeClient && (
            <Badge variant="secondary" className="text-xs bg-[#c19962]/20 text-[#c19962]">
              {activeClient.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-white/10"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-white/10"
            onClick={() => setNotePanelOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* New Note Input */}
          <div className="p-3 border-b space-y-2">
            <Textarea
              placeholder={activeClient 
                ? `Add note for ${activeClient.name}...` 
                : "Add a session note..."
              }
              value={activeNoteContent}
              onChange={(e) => setActiveNoteContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] text-sm resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Ctrl+Enter to save
              </span>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={!activeNoteContent.trim()}
                className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Note
              </Button>
            </div>
          </div>

          {/* Notes List */}
          <ScrollArea className="h-[300px]">
            {sortedNotes.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageSquarePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notes yet</p>
                <p className="text-xs">Add notes during client sessions</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {sortedNotes.map((note) => (
                  <div
                    key={note.id}
                    className={cn(
                      "p-3 rounded-lg border text-sm",
                      note.isPinned ? "bg-[#c19962]/5 border-[#c19962]/30" : "bg-muted/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(note.createdAt)}
                        {note.clientId && (
                          <>
                            <User className="h-3 w-3 ml-1" />
                            <span>Client note</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => pinNote(note.id)}
                        >
                          {note.isPinned ? (
                            <PinOff className="h-3 w-3 text-[#c19962]" />
                          ) : (
                            <Pin className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:text-red-500"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
            {sortedNotes.length} note{sortedNotes.length !== 1 ? 's' : ''} 
            {activeClient ? ` for ${activeClient.name}` : ' (general)'}
          </div>
        </>
      )}
    </div>
  );
}
