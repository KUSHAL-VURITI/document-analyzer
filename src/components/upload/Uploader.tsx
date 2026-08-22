"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Image, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploaderProps {
  onFileSelect: (file: File) => void;
}

export function Uploader({ onFileSelect }: UploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      setError(null);
      setSelectedFile(null);

      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors[0].code === "file-too-large") {
          setError("File is too large. Maximum size is 10MB.");
        } else if (rejection.errors[0].code === "file-invalid-type") {
          setError("Invalid file type. Please upload a PDF or an image (JPG, PNG, WEBP).");
        } else {
          setError(rejection.errors[0].message);
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
        // Small delay so user sees the file name before transition
        setTimeout(() => onFileSelect(acceptedFiles[0]), 400);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center w-full px-8 py-14 rounded-xl cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm hover:shadow-md",
          isDragActive
            ? "dropzone-active bg-[var(--annotation-soft)] scale-[1.02] shadow-[0_0_30px_rgba(46,107,229,0.1)] border-[var(--annotation)]"
            : error
            ? "bg-[var(--caution-soft)] border-2 border-dashed border-[var(--caution)]/40 hover:bg-[var(--caution-soft)]/60"
            : selectedFile
            ? "bg-[var(--success-soft)] border-2 border-dashed border-[var(--success)]/40"
            : "dropzone-idle bg-card hover:bg-[var(--annotation-soft)]/20 hover:scale-[1.01]"
        )}
      >
        <input {...getInputProps()} />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-500 ease-out">
            <div className="w-12 h-12 rounded-xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center animate-bounce">
              <Check className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatSize(selectedFile.size)} · Processing...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-12 h-12 rounded-xl bg-[var(--caution)]/10 text-[var(--caution)] flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--caution)]">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">Click or drop again to try a different file.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
              isDragActive ? "bg-[var(--annotation)] text-[var(--accent-foreground)] scale-110 rotate-3" : "bg-[var(--muted)] text-muted-foreground group-hover:scale-105"
            )}>
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground transition-colors duration-200">
                {isDragActive ? "Drop your document here" : "Drop a document here, or click to browse"}
              </p>
            </div>
            {/* Format chips */}
            <div className="flex items-center gap-2 mt-1">
              {[
                { icon: FileText, label: "PDF" },
                { icon: Image, label: "JPG" },
                { icon: Image, label: "PNG" },
                { icon: Image, label: "WEBP" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--muted)] text-[11px] font-mono text-muted-foreground transition-all hover:bg-[var(--border)]">
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
              ))}
              <span className="text-[11px] text-muted-foreground font-mono">· 10MB max</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
