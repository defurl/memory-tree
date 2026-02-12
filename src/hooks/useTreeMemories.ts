import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAppStore, TreeMemory } from '@/stores/useAppStore';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'memory-tree-data';

// Helper to check image size (MAX_IMAGE_SIZE removed)

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Compress to JPEG with 0.7 quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export function useTreeMemories() {
  const [memories, setMemories] = useState<TreeMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setTreeMemories } = useAppStore();

  const fetchMemories = useCallback(() => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMemories(parsed);
        setTreeMemories(parsed);
      } else {
        // Initial empty state
        setMemories([]);
        setTreeMemories([]);
      }
    } catch (err) {
      console.error('Failed to load memories:', err);
      setError('Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, [setTreeMemories]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const uploadMemory = async (file: File, label: string, year: string): Promise<boolean> => {
    try {
      // Compress and convert to Base64
      const base64Image = await compressImage(file);
      
      const newMemory: TreeMemory = {
        id: uuidv4(),
        label,
        year,
        image_url: base64Image,
        created_at: new Date().toISOString(),
      };

      const updatedMemories = [...memories, newMemory];
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMemories));
        setMemories(updatedMemories);
        setTreeMemories(updatedMemories);
        toast.success('Memory saved locally');
        return true;
      } catch (e) {
        toast.error('Storage full! Delete some memories first.');
        return false;
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to process image');
      return false;
    }
  };

  const deleteMemory = async (id: string): Promise<boolean> => {
    try {
      const updatedMemories = memories.filter(m => m.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMemories));
      setMemories(updatedMemories);
      setTreeMemories(updatedMemories);
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
      const updatedMemories = memories.map(m => {
        if (m.id === id) {
          return {
            ...m,
            label: label || m.label,
            year: year || m.year,
          };
        }
        return m;
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMemories));
      setMemories(updatedMemories);
      setTreeMemories(updatedMemories);
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
