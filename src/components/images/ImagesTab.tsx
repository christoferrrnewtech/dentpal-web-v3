import { useState, useRef } from "react";
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
}

interface ImagesTabProps {
  loading?: boolean;
  error?: string | null;
  setError?: (error: string | null) => void;
  onTabChange?: (tab: string) => void;
}

const ImagesTab = ({ loading = false, error, setError, onTabChange }: ImagesTabProps) => {
  const [images, setImages] = useState<ImageAsset[]>([
    {
      id: "1",
      name: "dental-promotion-banner.jpg",
      category: "banners",
      type: "image",
      size: 245760,
      dimensions: { width: 1200, height: 400 },
      format: "JPEG",
      url: "/images/dental-promotion-banner.jpg",
      thumbnail: "/images/thumbnails/dental-promotion-banner.jpg",
      uploadDate: "2024-09-08T10:00:00Z",
      lastModified: "2024-09-08T10:00:00Z",
      uploadedBy: "admin@dentpal.com",
      tags: ["promotion", "dental", "banner"],
      isActive: true,
      usageCount: 15
    },
    {
      id: "2",
      name: "login-welcome-popup.png",
      category: "login-popup",
      type: "image",
      size: 156432,
      dimensions: { width: 600, height: 400 },
      format: "PNG",
      url: "/images/login-welcome-popup.png",
      thumbnail: "/images/thumbnails/login-welcome-popup.png",
      uploadDate: "2024-09-07T14:30:00Z",
      lastModified: "2024-09-07T14:30:00Z",
      uploadedBy: "designer@dentpal.com",
      tags: ["login", "welcome", "popup"],
      isActive: true,
      usageCount: 8
    },
    {
      id: "3",
      name: "cart-discount-offer.gif",
      category: "cart-popup",
      type: "gif",
      size: 512000,
      dimensions: { width: 500, height: 300 },
      format: "GIF",
      url: "/images/cart-discount-offer.gif",
      thumbnail: "/images/thumbnails/cart-discount-offer.gif",
      uploadDate: "2024-09-06T09:15:00Z",
      lastModified: "2024-09-06T09:15:00Z",
      uploadedBy: "marketing@dentpal.com",
      tags: ["cart", "discount", "animated"],
      isActive: false,
      usageCount: 23
    }
  ]);

  const [activeCategory, setActiveCategory] = useState<string>("all");
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

  const categories = [
    { id: "all", name: "All Images", count: images.length },
    { id: "login-popup", name: "Log In Pop-up Ads", count: images.filter(img => img.category === 'login-popup').length },
    { id: "banners", name: "Banners", count: images.filter(img => img.category === 'banners').length },
    { id: "cart-popup", name: "Cart Page Pop-up", count: images.filter(img => img.category === 'cart-popup').length },
    { id: "home-popup", name: "Home Page Pop-up", count: images.filter(img => img.category === 'home-popup').length },
    { id: "general", name: "General", count: images.filter(img => img.category === 'general').length }
  ];

  const filteredImages = images.filter(image => {
    const matchesCategory = activeCategory === "all" || image.category === activeCategory;
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
    const imageFiles = files.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));
    setUploadFiles(imageFiles);
    setShowUploadModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles(files);
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;

    setError?.(null);
    try {
      // TODO: API call to upload images
      const newImages: ImageAsset[] = uploadFiles.map((file, index) => ({
        id: Date.now().toString() + index,
        name: file.name,
        category: uploadCategory as any,
        type: file.type.startsWith('video/') ? 'video' : file.type === 'image/gif' ? 'gif' : 'image',
        size: file.size,
        dimensions: { width: 0, height: 0 }, // Would be calculated on upload
        format: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
        url: URL.createObjectURL(file),
        thumbnail: URL.createObjectURL(file),
        uploadDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        uploadedBy: "current-user@dentpal.com",
        tags: uploadTags.split(',').map(tag => tag.trim()).filter(Boolean),
        isActive: true,
        usageCount: 0
      }));

      setImages(prev => [...prev, ...newImages]);
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadTags("");
      console.log(`Uploaded ${newImages.length} images`);
    } catch (err) {
      setError?.("Failed to upload images. Please try again.");
    }
  };

  const handleDeleteImage = (imageId: string) => {
    if (window.confirm("Are you sure you want to delete this image?")) {
      setImages(prev => prev.filter(img => img.id !== imageId));
      setSelectedImages(prev => prev.filter(id => id !== imageId));
    }
  };

  const handleBulkDelete = () => {
    if (selectedImages.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedImages.length} selected images?`)) {
      setImages(prev => prev.filter(img => !selectedImages.includes(img.id)));
      setSelectedImages([]);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all images? This action cannot be undone.")) {
      setImages([]);
      setSelectedImages([]);
    }
  };

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

  const toggleImageStatus = (imageId: string) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, isActive: !img.isActive } : img
    ));
  };

  const renderImageCard = (image: ImageAsset) => (
    <div 
      key={image.id}
      className={`group relative bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
        selectedImages.includes(image.id) 
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

      {/* Status Badge */}
      <div className="absolute top-3 right-3 z-10">
        <Badge 
          className={`${image.isActive 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-gray-100 text-gray-800 border-gray-200'
          } text-xs border`}
        >
          {image.isActive ? 'Active' : 'Inactive'}
        </Badge>
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
            <span>{image.dimensions.width} × {image.dimensions.height}</span>
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
    <tr key={image.id} className="hover:bg-gray-50">
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
        {image.dimensions.width} × {image.dimensions.height}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge 
          className={`${image.isActive 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-gray-100 text-gray-800 border-gray-200'
          } text-xs border`}
        >
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
      {/* Header Section */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Images Management</h1>
            <p className="text-teal-100">Manage promotional images, banners, and pop-up assets</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 rounded-xl p-4">
              <ImageIcon className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

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
        accept="image/*,video/*"
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
              <h3 className="text-xl font-semibold">Upload Images</h3>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="general">General</option>
                  <option value="login-popup">Log In Pop-up Ads</option>
                  <option value="banners">Banners</option>
                  <option value="cart-popup">Cart Page Pop-up</option>
                  <option value="home-popup">Home Page Pop-up</option>
                </select>
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
