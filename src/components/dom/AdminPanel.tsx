import { useState, useRef } from 'react';
import { useAppStore, TreeMemory } from '@/stores/useAppStore';
import { useTreeMemories } from '@/hooks/useTreeMemories';
import { supabase } from '@/lib/supabase';
import { GlassCard } from './GlassCard';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, Edit2, X, Lock, Unlock } from 'lucide-react';

export function AdminPanel() {
  const session = useAppStore((state) => state.session);
  const isAuthenticated = !!session;
  
  const { 
    memories, 
    uploadMemory, 
    deleteMemory, 
    updateMemory,
    loading 
  } = useTreeMemories();
  
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  
  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [year, setYear] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editYear, setEditYear] = useState('');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Admin access granted');
      setEmail('');
      setPassword('');
      // Session is updated via onAuthStateChange in App.tsx
    }
    setIsLoggingIn(false);
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    toast.success('Logged out');
  };
  
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !label || !year) {
      toast.error('Please fill all fields');
      return;
    }
    
    setIsSubmitting(true);
    const success = await uploadMemory(file, label, year);
    setIsSubmitting(false);
    
    if (success) {
      setFile(null);
      setLabel('');
      setYear('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('list');
    }
  };
  
  const startEdit = (memory: TreeMemory) => {
    setEditingId(memory.id);
    setEditLabel(memory.label);
    setEditYear(memory.year);
  };
  
  const saveEdit = async () => {
    if (!editingId) return;
    const success = await updateMemory(editingId, editLabel, editYear);
    if (success) {
      setEditingId(null);
    }
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 p-2 rounded-full glass-card hover:bg-white/10 transition-colors"
        title="Admin Panel"
      >
        <Lock className="w-5 h-5 text-muted-foreground" />
      </button>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <GlassCard className="w-full max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-display text-primary flex items-center gap-2">
            {isAuthenticated ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            Memory Admin
          </h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        {!isAuthenticated ? (
          <div className="p-8 flex flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground text-center mb-4">
              Sign in to manage memories.
            </p>
            <form onSubmit={handleLogin} className="flex flex-col gap-3 w-full max-w-xs">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary/50"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary/50"
              />
              <button 
                type="submit"
                disabled={isLoggingIn}
                className="bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                 {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
                 Login
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'list' 
                    ? 'text-primary border-b-2 border-primary bg-white/5' 
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                Memories List ({memories.length})
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'add' 
                    ? 'text-primary border-b-2 border-primary bg-white/5' 
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                Add New Memory
              </button>
            </div>
            
            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'list' ? (
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : memories.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      No memories found. Add some!
                    </div>
                  ) : (
                    memories.map((memory) => (
                      <div 
                        key={memory.id} 
                        className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-all"
                      >
                        <img 
                          src={memory.image_url} 
                          alt={memory.label} 
                          className="w-12 h-12 object-cover rounded-md bg-black/50"
                        />
                        
                        {editingId === memory.id ? (
                          <div className="flex-1 flex flex-col gap-2">
                            <input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                              placeholder="Title"
                            />
                            <input
                              value={editYear}
                              onChange={(e) => setEditYear(e.target.value)}
                              className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white w-20"
                              placeholder="Year"
                            />
                            <div className="flex gap-2 mt-1">
                              <button 
                                onClick={saveEdit}
                                className="text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="text-xs bg-white/10 text-white px-2 py-1 rounded hover:bg-white/20"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <h3 className="font-medium text-white">{memory.label}</h3>
                            <p className="text-xs text-muted-foreground">{memory.year}</p>
                          </div>
                        )}
                        
                        {!editingId && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => startEdit(memory)}
                              className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteMemory(memory.id)}
                              className="p-2 text-destructive hover:text-destructive-foreground hover:bg-destructive/20 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <form onSubmit={handleUpload} className="space-y-4 max-w-md mx-auto mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Image</label>
                    <div className="border border-dashed border-white/20 rounded-lg p-6 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {file ? (
                        <div className="text-primary truncate">{file.name}</div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Upload className="w-8 h-8" />
                          <span>Click to upload image</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Title</label>
                    <input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. Summer Vacation"
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Year</label>
                    <input
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="e.g. 2024"
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || !file}
                    className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Add Memory'
                    )}
                  </button>
                </form>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center text-xs text-muted-foreground">
              <span>{memories.length} memories stored locally</span>
              <button 
                onClick={handleLogout}
                className="text-white hover:text-primary transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
