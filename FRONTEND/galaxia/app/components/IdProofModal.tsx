"use client";
import { useState, useEffect, useRef } from "react";
import { X, Download, Trash2, FileText, Image as ImageIcon, FileSpreadsheet, Loader2 } from "lucide-react";

interface IdProofModalProps {
    guestId: { id: number; fileName: string | null; fileType: string | null };
    onClose: () => void;
    onDelete?: (id: number) => Promise<void>;
}

function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("galaxia_token") || localStorage.getItem("adminToken") || localStorage.getItem("ownerToken") || localStorage.getItem("token");
}

// Map MIME type to proper file extension
const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
    "image/webp": ".webp", "image/gif": ".gif", "image/bmp": ".bmp",
    "application/pdf": ".pdf", "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function getDownloadName(rawName: string, mimeType: string): string {
    const ext = MIME_TO_EXT[mimeType.toLowerCase()] || "";
    const hasExt = /\.[a-zA-Z0-9]{2,5}$/.test(rawName);
    return hasExt ? rawName : rawName + ext;
}

export default function IdProofModal({ guestId, onClose, onDelete }: IdProofModalProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const blobRef = useRef<Blob | null>(null);

    const rawFileName = guestId.fileName || `ID-${guestId.id}`;
    const fileType = (guestId.fileType || "").toLowerCase();
    const isImage = fileType.startsWith("image/");
    const isPdf = fileType === "application/pdf";
    const isPreviewable = isImage || isPdf;
    const fileName = getDownloadName(rawFileName, fileType);

    // Fetch blob on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const token = getToken();
                if (!token) { setError("Not authenticated"); setLoading(false); return; }
                const res = await fetch(`/api/uploads/guest-id/${guestId.id}/download`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (cancelled) return;
                if (!res.ok) {
                    setError(`Failed to load (${res.status})`);
                    setLoading(false);
                    return;
                }
                const blob = await res.blob();
                if (cancelled) return;
                blobRef.current = blob;
                setPreviewUrl(URL.createObjectURL(blob));
            } catch {
                if (!cancelled) setError("Network error");
            }
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [guestId.id]);

    const handleDownload = () => {
        const blob = blobRef.current;
        if (!blob) return;

        // Create a typed blob to ensure proper MIME type
        const typedBlob = new Blob([blob], { type: fileType || blob.type || "application/octet-stream" });

        // Use FileReader to convert to data URL — this guarantees `a.download` works
        // because data: URLs are always treated as same-origin by the browser
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = fileName;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            setTimeout(() => document.body.removeChild(link), 300);
        };
        reader.readAsDataURL(typedBlob);
    };

    const handleDelete = async () => {
        if (!onDelete || deleting) return;
        if (!confirm("Delete this ID proof? This cannot be undone.")) return;
        setDeleting(true);
        try {
            await onDelete(guestId.id);
            onClose();
        } catch {
            alert("Failed to delete");
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-3 min-w-0">
                        {isImage ? <ImageIcon size={18} className="text-emerald-600 shrink-0" /> :
                         isPdf ? <FileText size={18} className="text-red-500 shrink-0" /> :
                         <FileSpreadsheet size={18} className="text-blue-500 shrink-0" />}
                        <span className="text-sm font-bold text-slate-700 truncate">{fileName}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider shrink-0">{fileType.split("/").pop()}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                        {previewUrl && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                                title="Download"
                            >
                                <Download size={14} /> Save
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                title="Delete"
                            >
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Delete
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-100/50 min-h-[300px]">
                    {loading && (
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Loader2 size={32} className="animate-spin" />
                            <p className="text-sm font-medium">Loading preview...</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center gap-3 text-red-400">
                            <FileText size={32} />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {!loading && !error && previewUrl && isImage && (
                        <img
                            src={previewUrl}
                            alt={fileName}
                            className="max-w-full max-h-[70vh] rounded-lg shadow-md object-contain"
                        />
                    )}

                    {!loading && !error && previewUrl && isPdf && (
                        <iframe
                            src={previewUrl}
                            title={fileName}
                            className="w-full h-[70vh] rounded-lg border border-slate-200"
                        />
                    )}

                    {!loading && !error && previewUrl && !isPreviewable && (
                        <div className="flex flex-col items-center gap-4 text-slate-500">
                            <FileSpreadsheet size={48} className="text-blue-400" />
                            <p className="text-sm font-bold">{fileName}</p>
                            <p className="text-xs text-slate-400">Preview not available for this file type</p>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md"
                            >
                                <Download size={16} /> Download File
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
