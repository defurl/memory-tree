import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAppStore, TreeMemory } from '@/stores/useAppStore';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export function useTreeMemories() {
  const [memories, setMemories] = useState<TreeMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setTreeMemories } = useAppStore();

  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setMemories(data);
        setTreeMemories(data);
      }
    } catch (err) {
      console.error('Failed to load memories:', err);
      // Don't show toast on initial load failure to avoid annoyance if offline
      setError('Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, [setTreeMemories]);

  // Initial fetch
  useEffect(() => {
    fetchMemories();
    
    // Realtime subscription could go here
  }, [fetchMemories]);

  const uploadMemory = async (file: File, label: string, year: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current User:', user);
      
      if (!user) {
        toast.error('You are not logged in!');
        return false;
      }

      const fileName = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      
      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('memory-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        throw new Error(`Storage: ${uploadError.message}`);
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('memory-images')
        .getPublicUrl(fileName);

      // 3. Insert into Table
      const newMemory = {
        label,
        year,
        image_url: publicUrl,
      };

      const { data, error: dbError } = await supabase
        .from('memories')
        .insert(newMemory)
        .select()
        .single();

      if (dbError) {
        console.error('DB Insert Error:', dbError);
        throw new Error(`Database: ${dbError.message}`);
      }

      if (data) {
        const updated = [...memories, data];
        setMemories(updated);
        setTreeMemories(updated);
        toast.success('Memory uploaded successfully');
        return true;
      }
      return false;

    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to upload: ${message}`);
      return false;
    }
  };

  const deleteMemory = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updated = memories.filter(m => m.id !== id);
      setMemories(updated);
      setTreeMemories(updated);
      toast.success('Memory deleted');
      return true;
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete memory');
      return false;
    }
  };

  const updateMemory = async (id: string, label?: string, year?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('memories')
        .update({ label, year })
        .eq('id', id);

      if (error) throw error;

      const updated = memories.map(m => 
        m.id === id ? { ...m, ...(label && { label }), ...(year && { year }) } : m
      );
      
      setMemories(updated);
      setTreeMemories(updated);
      toast.success('Memory updated');
      return true;
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update memory');
      return false;
    }
  };

  return {
    memories,
    loading,
    error,
    fetchMemories,
    uploadMemory,
    deleteMemory,
    updateMemory,
  };
}
