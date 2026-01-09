import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  CheckCircle, 
  Clock,
  Shield,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  uploadPolicy,
  getAllPolicies,
  publishPolicy,
  deletePolicy,
  fetchPolicyContent,
  type PolicyDocument,
  type PolicyType
} from "@/services/policies";
import mammoth from "mammoth";

const PoliciesTab: React.FC = () => {
  const { uid, user } = useAuth();
  const { toast } = useToast();
  
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PolicyType>('terms-of-service');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  
  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewPolicy, setPreviewPolicy] = useState<PolicyDocument | null>(null);

  // Load policies
  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await getAllPolicies();
      setPolicies(data);
    } catch (error: any) {
      toast({
        title: "Error loading policies",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Check if file is DOCX
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setFileContent(result.value);
        setFileName(file.name.replace(/\.[^/.]+$/, '.txt'));
      } else {
        // Handle TXT, DOC, PDF as plain text
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setFileContent(content);
          setFileName(file.name.replace(/\.[^/.]+$/, '.txt'));
        };
        reader.readAsText(file);
      }
    } catch (error: any) {
      toast({
        title: "File read error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!fileContent || !fileName) {
      toast({
        title: "Missing information",
        description: "Please select a file",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      await uploadPolicy(
        selectedType,
        fileContent,
        fileName,
        uid || 'system',
        user?.name || user?.email || 'System Admin'
      );
      
      toast({
        title: "Policy uploaded",
        description: "Policy has been uploaded as draft successfully"
      });
      
      // Reset and reload
      setUploadDialogOpen(false);
      setFileContent('');
      setFileName('');
      await loadPolicies();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle publish
  const handlePublish = async (policy: PolicyDocument) => {
    if (!confirm(`Publish this ${policy.type === 'terms-of-service' ? 'Terms of Service' : 'Privacy Policy'}? This will replace the current active policy.`)) {
      return;
    }

    try {
      await publishPolicy(policy.id, policy.type);
      toast({
        title: "Policy published",
        description: "Policy is now active and visible to users"
      });
      await loadPolicies();
    } catch (error: any) {
      toast({
        title: "Publish failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handle preview
  const handlePreview = async (policy: PolicyDocument) => {
    try {
      const content = await fetchPolicyContent(policy.downloadUrl);
      setPreviewContent(content);
      setPreviewPolicy(policy);
      setPreviewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Preview failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handle delete
  const handleDelete = async (policy: PolicyDocument) => {
    if (!confirm(`Delete this policy? This action cannot be undone.`)) {
      return;
    }

    try {
      await deletePolicy(policy.id, policy.storageUrl);
      toast({
        title: "Policy deleted",
        description: "Policy has been removed successfully"
      });
      await loadPolicies();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handle download
  const handleDownload = (policy: PolicyDocument) => {
    window.open(policy.downloadUrl, '_blank');
  };

  // Group policies by type
  const termsOfService = policies.filter(p => p.type === 'terms-of-service');
  const privacyPolicies = policies.filter(p => p.type === 'privacy-policy');

  const renderPolicyCard = (policy: PolicyDocument) => (
    <div key={policy.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h4 className="font-medium text-gray-900">{policy.fileName}</h4>
            {policy.isActive && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
            <Badge variant={policy.status === 'published' ? 'default' : 'secondary'}>
              {policy.status === 'published' ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>Version: {policy.version}</p>
            <p>Size: {(policy.fileSize / 1024).toFixed(2)} KB</p>
            <p>Uploaded by: {policy.uploadedByName}</p>
            <p>Date: {policy.uploadedAt.toDate().toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePreview(policy)}
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(policy)}
            title="Download"
          >
            <Download className="w-4 h-4" />
          </Button>
          {!policy.isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePublish(policy)}
              className="text-green-600 hover:text-green-700"
              title="Publish"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(policy)}
            className="text-red-600 hover:text-red-700"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Terms & Policies</h1>
            <p className="text-green-100">
              Manage platform policies: Terms of Service and Privacy Policy
            </p>
          </div>
          <Shield className="w-12 h-12 text-green-200" />
        </div>
      </div>

      {/* Upload Button */}
      <div className="bg-white rounded-xl border p-4">
        <Button 
          onClick={() => setUploadDialogOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload New Policy
        </Button>
      </div>

      {/* Terms of Service Section */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-semibold">Merchant Terms of Service</h2>
          <Badge variant="secondary">{termsOfService.length} versions</Badge>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : termsOfService.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No Terms of Service uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {termsOfService.map(renderPolicyCard)}
          </div>
        )}
      </div>

      {/* Privacy Policy Section */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-semibold">Merchant Privacy Policy</h2>
          <Badge variant="secondary">{privacyPolicies.length} versions</Badge>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : privacyPolicies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No Privacy Policy uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {privacyPolicies.map(renderPolicyCard)}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Policy</DialogTitle>
            <DialogDescription>
              Upload a new policy document. Files will be converted to .txt format.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Policy Type</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as PolicyType)}
              >
                <option value="terms-of-service">Merchant Terms of Service</option>
                <option value="privacy-policy">Merchant Privacy Policy</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Select File</label>
              <input
                type="file"
                accept=".txt,.doc,.docx,.pdf"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: .txt, .doc, .docx, .pdf (will be converted to .txt)
              </p>
            </div>

            {fileName && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>File ready:</strong> {fileName}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Size: {(new Blob([fileContent]).size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setUploadDialogOpen(false);
                setFileContent('');
                setFileName('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!fileContent || uploading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {previewPolicy?.fileName}
            </DialogTitle>
            <DialogDescription>
              Version {previewPolicy?.version} • {previewPolicy?.uploadedAt.toDate().toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {previewContent}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            {previewPolicy && (
              <Button 
                onClick={() => handleDownload(previewPolicy)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoliciesTab;
