import { useState, useRef, useEffect } from "react";
import { 
  Image as ImageIcon, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  Trash2, 
  Eye, 
  Plus,
  X,
  FileImage,
  Folder,
  Grid,
  List,
  MoreVertical,
  Copy,
  Share2,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// Storage integration for BannerImages uploads
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { listAll, getMetadata, updateMetadata } from 'firebase/storage';

// Helper: load image and compress to WebP/JPEG using Canvas
const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), type, quality);
  });
};

const replaceExt = (name: string, newExt: string) => name.replace(/\.[^/.]+$/, '') + '.' + newExt;

async function compressImage(
  file: File,
  opts: { maxWidth?: number; maxHeight?: number; quality?: number; thresholdKB?: number } = {}
): Promise<{ blob: Blob; width: number; height: number; mime: string; ext: 'webp' | 'jpeg'; name: string }> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8, thresholdKB = 200 } = opts;

  // Skip compression for GIFs or very small files
  if (file.type.includes('gif') || file.size <= thresholdKB * 1024) {
    return { blob: file, width: 0, height: 0, mime: file.type || 'image/jpeg', ext: 'jpeg', name: file.name };
  }

  const img = await loadImageFromFile(file);
  // Compute target size preserving aspect ratio
  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  const targetW = Math.max(1, Math.round(width * ratio));
  const targetH = Math.max(1, Math.round(height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = targetW; canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not available');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Prefer WebP for better compression, fallback to JPEG
  let mime = 'image/webp';
  let ext: 'webp' | 'jpeg' = 'webp';
  let q = quality;
  let blob = await canvasToBlob(canvas, mime, q).catch(async () => {
    mime = 'image/jpeg';
    ext = 'jpeg';
    return canvasToBlob(canvas, mime, q);
  });

  // Simple second pass if still big
  if (blob.size > 350 * 1024) {
    q = 0.65;
    blob = await canvasToBlob(canvas, mime, q);
  }

  return { blob, width: targetW, height: targetH, mime, ext, name: replaceExt(file.name, ext) };
}

interface ImageAsset {
  id: string;
  name: string;
  category: 'login-popup' | 'banners' | 'cart-popup' | 'home-popup' | 'general';
  type: 'image' | 'video' | 'gif';
  size: number;
  dimensions: { width: number; height: number };
  format: string;
  url: string;
  thumbnail: string;
  uploadDate: string;
  lastModified: string;
  uploadedBy: string;
  tags: string[];
  isActive: boolean;
  usageCount: number;
  path?: string; // storage path for delete/management
}

interface ImagesTabProps {
  loading?: boolean;
  error?: string | null;
  setError?: (error: string | null) => void;
  onTabChange?: (tab: string) => void;
}

const ImagesTab = ({ loading = false, error, setError, onTabChange }: ImagesTabProps) => {
  const [images, setImages] = useState<ImageAsset[]>([]); // start empty, fetch from storage
  // NEW: loading & dimension tracking state
  const [bannerLoading, setBannerLoading] = useState<boolean>(false);
  const [dimensionProgress, setDimensionProgress] = useState<{ total: number; done: number }>({ total: 0, done: 0 });
  const [activeCategory, setActiveCategory] = useState<string>("banners");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload states
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>("general");
  const [uploadTags, setUploadTags] = useState<string>("");

  // Only show Banners category
  const categories = [
    { id: "banners", name: "Banners", count: images.length },
  ];

  const filteredImages = images.filter(image => {
    const matchesCategory = image.category === "banners"; // banner-only
    const matchesSearch = image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'login-popup': return '🚪';
      case 'banners': return '🎯';
      case 'cart-popup': return '🛒';
      case 'home-popup': return '🏠';
      default: return '📁';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'login-popup': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'banners': return 'bg-green-100 text-green-800 border-green-200';
      case 'cart-popup': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'home-popup': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setUploadFiles(imageFiles);
    setShowUploadModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles(files.filter(f => f.type.startsWith('image/')));
    setShowUploadModal(true);
  };

  // Helpers to validate banner size
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const { width, height } = img as HTMLImageElement;
        URL.revokeObjectURL(url);
        resolve({ width, height });
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  };

  const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '_');

  // Load all banner images from Firebase Storage folder BannerImages (incremental for faster UX)
  const loadBanners = async () => {
    setBannerLoading(true);
    try {
      const folderRef = storageRef(storage, 'BannerImages');
      const list = await listAll(folderRef);
      const baseItems = await Promise.all(
        list.items.map(async (item) => {
          const [url, meta] = await Promise.all([
            getDownloadURL(item),
            getMetadata(item)
          ]);
          const custom = meta.customMetadata || {};
          const tags = (custom.tags || '').split(',').map(t => t.trim()).filter(Boolean);
          const isActive = custom.isActive === 'true';
          // Dimensions deferred (set 0 initially for quick list render)
          return {
            id: meta.fullPath,
            name: meta.name,
            category: 'banners',
            type: meta.contentType?.includes('image/gif') ? 'gif' : 'image',
            size: Number(meta.size) || 0,
            dimensions: { width: 0, height: 0 },
            format: meta.name.split('.').pop()?.toUpperCase() || 'IMG',
            url,
            thumbnail: url,
            uploadDate: meta.timeCreated || new Date().toISOString(),
            lastModified: meta.updated || meta.timeCreated || new Date().toISOString(),
            uploadedBy: custom.uploadedBy || 'unknown',
            tags,
            isActive,
            usageCount: 0,
            path: meta.fullPath,
          } as ImageAsset;
        })
      );
      setImages(baseItems);
      // Progressive dimension resolution (non-blocking)
      setDimensionProgress({ total: baseItems.length, done: 0 });
      let cancelled = false;
      const resolveDims = (asset: ImageAsset) => {
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
            setImages(prev => prev.map(it => it.id === asset.id ? { ...it, dimensions: { width: img.width, height: img.height } } : it));
          setDimensionProgress(p => ({ total: p.total, done: Math.min(p.total, p.done + 1) }));
        };
        img.onerror = () => {
          if (cancelled) return;
          setDimensionProgress(p => ({ total: p.total, done: Math.min(p.total, p.done + 1) }));
        };
        // Defer loading to idle time for smoother UI
        if (typeof (window as any).requestIdleCallback === 'function') {
          (window as any).requestIdleCallback(() => { img.src = asset.url; });
        } else {
          setTimeout(() => { img.src = asset.url; }, 0);
        }
      };
      // Concurrency throttle
      const concurrency = 6;
      for (let i = 0; i < baseItems.length; i += concurrency) {
        baseItems.slice(i, i + concurrency).forEach(resolveDims);
      }
      // Cleanup
      return () => { cancelled = true; };
    } catch (err) {
      console.error('Failed to load banner images', err);
      setError?.('Failed to fetch banner images');
    } finally {
      setBannerLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => { loadBanners(); }, []);

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;

    setError?.(null);
    try {
      const results: ImageAsset[] = [];

      for (const file of uploadFiles) {
        // Compress image before upload (to WebP by default)
        let processed = await compressImage(file);

        // If compression was skipped (e.g., small or GIF), read dimensions from original
        let width = 0, height = 0;
        if (processed.width && processed.height) {
          width = processed.width; height = processed.height;
        } else {
          try { const dims = await getImageDimensions(file); width = dims.width; height = dims.height; } catch {}
        }

        const clean = safeFileName(processed.name);
        const path = `BannerImages/${Date.now()}_${clean}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, processed.blob, { contentType: processed.mime, customMetadata: { tags: uploadTags, isActive: 'false', uploadedBy: 'current-user@dentpal.com' } });
        const url = await getDownloadURL(ref);

        const format = processed.ext.toUpperCase();

        results.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: clean,
          category: 'banners',
          type: 'image',
          size: processed.blob.size,
          dimensions: { width, height },
          format,
          url,
          thumbnail: url,
          uploadDate: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          uploadedBy: "current-user@dentpal.com",
          tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
          isActive: false,
          usageCount: 0,
          path,
        });
      }

      if (results.length) {
        setImages(prev => [...prev, ...results]);
      }

      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadTags("");
    } catch (err) {
      console.error(err);
      setError?.("Failed to upload images. Please try again.");
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    const img = images.find(i => i.id === imageId);
    if (!img) return;
    if (window.confirm("Are you sure you want to delete this image?")) {
      try {
        if (img.path) {
          await deleteObject(storageRef(storage, img.path));
        }
      } catch (e) {
        console.warn('Failed to delete storage object, removing locally', e);
      }
      setImages(prev => prev.filter(img => img.id !== imageId));
      setSelectedImages(prev => prev.filter(id => id !== imageId));
    }
  };

  // Toggle active flag & persist to storage metadata (multiple active supported)
  const toggleImageStatus = async (imageId: string) => {
    const target = images.find(i => i.id === imageId);
    if (!target) return;
    const willBeActive = !target.isActive;

    if (target.path) {
      try {
        await updateMetadata(
          storageRef(storage, target.path),
          { customMetadata: { tags: target.tags.join(','), isActive: willBeActive ? 'true' : 'false', uploadedBy: target.uploadedBy } }
        );
      } catch (e) {
        console.warn('Failed to update active metadata', e);
      }
    }

    // Update only this image locally; leave others unchanged
    setImages(prev => prev.map(img => (
      img.id === imageId ? { ...img, isActive: willBeActive } : img
    )));
  };

  const activeBanner = images.find(i => i.isActive);

  // Selection helpers
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const selectAllImages = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(img => img.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedImages.length} selected images?`)) {
      // Attempt to delete from storage; ignore errors to continue UX
      await Promise.all(
        selectedImages.map(id => {
          const img = images.find(i => i.id === id);
          if (img?.path) {
            return deleteObject(storageRef(storage, img.path)).catch(() => {});
          }
          return Promise.resolve();
        })
      );
      setImages(prev => prev.filter(img => !selectedImages.includes(img.id)));
      setSelectedImages([]);
    }
  };

  const handleClearAll = async () => {
    if (images.length === 0) return;
    if (window.confirm("Are you sure you want to clear all images? This action cannot be undone.")) {
      await Promise.all(
        images.map(img =>
          img.path ? deleteObject(storageRef(storage, img.path)).catch(() => {}) : Promise.resolve()
        )
      );
      setImages([]);
      setSelectedImages([]);
    }
  };

  const renderImageCard = (image: ImageAsset) => (
    <div 
      key={image.id}
      className={`group relative bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
        image.isActive
          ? 'border-green-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
          : selectedImages.includes(image.id)
            ? 'border-teal-500 shadow-md'
            : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={selectedImages.includes(image.id)}
          onChange={() => toggleImageSelection(image.id)}
          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
        />
      </div>

      {/* Active Toggle */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
        <Button
          variant="secondary"
            size="sm"
            onClick={() => toggleImageStatus(image.id)}
            className={`text-xs px-2 py-1 rounded-full border ${image.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
          >
          <span className="flex items-center gap-1">
            <Star className={`w-3 h-3 ${image.isActive ? 'text-green-600 fill-green-600' : 'text-gray-500'}`} />
            {image.isActive ? 'Active' : 'Set Active'}
          </span>
        </Button>
      </div>

      {/* Image Preview */}
      <div className="aspect-video bg-gray-100 rounded-t-xl overflow-hidden relative">
        {image.type === 'video' ? (
          <video 
            src={image.url} 
            className="w-full h-full object-cover"
            muted
          />
        ) : (
          <img 
            src={image.thumbnail || image.url} 
            alt={image.name}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 text-gray-900 hover:bg-white"
              onClick={() => window.open(image.url, '_blank')}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 text-gray-900 hover:bg-white"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 text-red-600 hover:bg-white"
              onClick={() => handleDeleteImage(image.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="bg-black/70 text-white text-xs">
            {image.type.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Image Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-gray-900 truncate flex-1 mr-2">
            {image.name}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleImageStatus(image.id)}
            className="p-1"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Badge className={`${getCategoryColor(image.category)} text-xs border`}>
            <span className="mr-1">{getCategoryIcon(image.category)}</span>
            {categories.find(cat => cat.id === image.category)?.name || image.category}
          </Badge>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatFileSize(image.size)}</span>
            <span>{image.dimensions.width > 0 ? `${image.dimensions.width} × ${image.dimensions.height}` : 'Loading…'}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Used {image.usageCount} times</span>
            <span>{formatDate(image.uploadDate)}</span>
          </div>

          {image.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {image.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {image.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{image.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderListView = (image: ImageAsset) => (
    <tr key={image.id} className={`hover:bg-gray-50 ${image.isActive ? 'bg-green-50/50' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selectedImages.includes(image.id)}
          onChange={() => toggleImageSelection(image.id)}
          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <img 
            src={image.thumbnail || image.url} 
            alt={image.name}
            className="w-12 h-12 object-cover rounded-lg mr-4"
          />
          <div>
            <div className="text-sm font-medium text-gray-900">{image.name}</div>
            <div className="text-sm text-gray-500">{image.format}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge className={`${getCategoryColor(image.category)} text-xs border`}>
          <span className="mr-1">{getCategoryIcon(image.category)}</span>
          {categories.find(cat => cat.id === image.category)?.name || image.category}
        </Badge>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatFileSize(image.size)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {image.dimensions.width > 0 ? `${image.dimensions.width} × ${image.dimensions.height}` : 'Loading…'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge 
          className={`${image.isActive 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-gray-100 text-gray-800 border-gray-200'
          } text-xs border flex items-center gap-1`}
        >
          <Star className={`w-3 h-3 ${image.isActive ? 'text-green-600 fill-green-600' : 'text-gray-400'}`} />
          {image.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(image.uploadDate)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(image.url, '_blank')}
            className="text-teal-600 hover:text-teal-800"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-800"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleImageStatus(image.id)}
            className={image.isActive ? 'text-green-600 hover:text-green-800' : 'text-gray-600 hover:text-gray-800'}
            title={image.isActive ? 'Unset Active' : 'Set Active'}
          >
            <Star className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteImage(image.id)}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-8" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag}>
      {/* Loading banner indicator */}
      {bannerLoading && images.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-3 text-sm text-gray-600 shadow-sm">
          <span className="animate-pulse inline-flex w-4 h-4 rounded-full bg-teal-500" /> Loading banner images…
        </div>
      )}
      {!bannerLoading && dimensionProgress.total > 0 && dimensionProgress.done < dimensionProgress.total && (
        <div className="bg-white border border-teal-200 rounded-xl px-4 py-2 text-xs text-teal-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" /> Resolving dimensions {dimensionProgress.done}/{dimensionProgress.total}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <X className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError?.(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Categories Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'default' : 'ghost'}
              className={`${activeCategory === category.id 
                ? 'bg-teal-600 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              <Folder className="w-4 h-4 mr-2" />
              {category.name}
              <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-700">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search images by name or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </Button>
              
              {selectedImages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllImages}
                >
                  {selectedImages.length === filteredImages.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            
            {selectedImages.length > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedImages.length})
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
            >
              Clear All
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filteredImages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="max-w-md mx-auto">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No Images Found</h3>
            <p className="text-gray-500 mb-8">
              {searchTerm ? `No images match your search for "${searchTerm}".` : 'Upload your first images to get started.'}
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Images
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {viewMode === 'grid' ? (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredImages.map(renderImageCard)}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedImages.length === filteredImages.length && filteredImages.length > 0}
                        onChange={selectAllImages}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dimensions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredImages.map(renderListView)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drag & Drop Overlay */}
      {dragActive && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onDrop={handleDrop}
        >
          <div className="bg-white rounded-2xl p-12 text-center max-w-md mx-4">
            <Upload className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Drop Images Here</h3>
            <p className="text-gray-500">Release to upload your images</p>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Upload Banner Images</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadModal(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Files ({uploadFiles.length})
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uploadFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileImage className="w-5 h-5 text-gray-400" />
                        <span className="text-sm">{file.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(file.size)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fixed category for Banners */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="text-sm text-gray-700">Banners</div>
                <p className="text-xs text-gray-500 mt-1">Uploads save to Firebase Storage folder "BannerImages" and are compressed to reduce file size.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <Input
                  placeholder="e.g. promotion, dental, banner"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {uploadFiles.length} files ready to upload
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={loading || uploadFiles.length === 0}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {loading ? "Uploading..." : "Upload Images"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagesTab;
