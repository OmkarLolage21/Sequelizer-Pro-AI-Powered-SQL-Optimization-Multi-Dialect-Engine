"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Check, AlertCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface CsvUploaderProps {
  onUploadComplete?: () => void
}

export function CsvUploader({ onUploadComplete }: CsvUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]

    if (!selectedFile) {
      return
    }

    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)
    setUploadStatus("idle")
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)

    try {
      // In production, replace with actual API call
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await fetch('/api/upload-csv', {
      //   method: 'POST',
      //   body: formData,
      // });
      // const data = await response.json();
      // if (data.success) {
      //   setUploadStatus("success");
      //   if (onUploadComplete) onUploadComplete();
      // } else {
      //   setUploadStatus("error");
      // }

      // Simulate file upload
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // 90% chance of success
      const isSuccess = Math.random() < 0.9

      if (isSuccess) {
        setUploadStatus("success")
        toast({
          title: "File uploaded successfully",
          description: "Your CSV file has been processed",
        })
        if (onUploadComplete) onUploadComplete()
      } else {
        setUploadStatus("error")
        toast({
          title: "Upload failed",
          description: "There was an error processing your file",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      setUploadStatus("error")
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-purple-500 transition-colors duration-300">
        <input type="file" id="csv-upload" accept=".csv" onChange={handleFileChange} className="hidden" />
        <label htmlFor="csv-upload" className="flex flex-col items-center justify-center cursor-pointer">
          <Upload className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-gray-300 mb-1">Drag and drop your CSV file here</p>
          <p className="text-gray-500 text-sm">or click to browse</p>
        </label>
      </div>

      {file && (
        <div
          className={`flex items-center justify-between p-3 rounded-lg ${
            uploadStatus === "success"
              ? "bg-green-900/20 border border-green-800"
              : uploadStatus === "error"
                ? "bg-red-900/20 border border-red-800"
                : "bg-gray-800"
          }`}
        >
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-gray-400 mr-2" />
            <div className="text-sm">
              <p className="text-gray-300 truncate max-w-[200px]">{file.name}</p>
              <p className="text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          </div>

          {uploadStatus === "idle" && (
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          )}

          {uploadStatus === "success" && (
            <div className="flex items-center text-green-500">
              <Check className="h-5 w-5 mr-1" />
              <span className="text-sm">Uploaded</span>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="flex items-center text-red-500">
              <AlertCircle className="h-5 w-5 mr-1" />
              <span className="text-sm">Failed</span>
            </div>
          )}
        </div>
      )}

      <div className="text-sm text-gray-400">
        <p>Supported format: CSV</p>
        <p>Max file size: 10MB</p>
      </div>
    </div>
  )
}

