/**
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { useState } from 'react';
import {
  Button,
  FileUploaderDropContainer,
  FileUploaderItem,
  InlineNotification,
  InlineLoading,
} from '@carbon/react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];

/**
 * ContractUpload handles TASK-FE-02 and TASK-FE-03.
 *
 * - Renders a file drop area restricted to PDF and DOCX (FR-1, NFR-4).
 * - Validates format and size synchronously on selection (first gate, AD-5).
 * - Submits a multipart POST to /upload on confirmation (FR-2).
 * - Reports loading state during the in-flight request.
 * - Calls onUploadSuccess(contract) on 201 so the queue can prepend the entry.
 *
 * @param {{ onUploadSuccess: (contract: object) => void }} props
 */
const ContractUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // TASK-FE-02 — client-side first gate validation
  const validateFile = (file) => {
    if (!file) return null;

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const mimeOk = ACCEPTED_MIME_TYPES.includes(file.type);
    const extOk = ACCEPTED_EXTENSIONS.includes(ext);

    if (!mimeOk && !extOk) {
      return 'Only PDF and DOCX files are accepted. Please select a valid file.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'The selected file exceeds the 10 MB size limit. Please choose a smaller file.';
    }
    return null;
  };

  const handleFileAdded = (_, { addedFiles }) => {
    const file = addedFiles[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
    } else {
      setValidationError(null);
      setUploadError(null);
      setSelectedFile(file);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setValidationError(null);
    setUploadError(null);
  };

  // TASK-FE-03 — submit to POST /upload
  const handleSubmit = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.status === 201) {
        const contract = await response.json();
        onUploadSuccess(contract);
        setSelectedFile(null);
        setValidationError(null);
      } else if (response.status === 400) {
        setUploadError('This file format is not accepted. Please upload a PDF or DOCX file.');
        setSelectedFile(null);
      } else if (response.status === 413) {
        setUploadError('The file exceeds the 10 MB size limit. Please upload a smaller file.');
        setSelectedFile(null);
      } else {
        setUploadError('Upload failed. Please try again.');
        setSelectedFile(null);
      }
    } catch {
      setUploadError('A network error occurred. Please check your connection and try again.');
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="cra--contract-upload" aria-label="Upload contract">
      <h2 className="cra--contract-upload__heading">Upload contract</h2>

      <FileUploaderDropContainer
        accept={ACCEPTED_MIME_TYPES}
        labelText="Drag and drop a PDF or DOCX file here, or click to browse"
        multiple={false}
        onAddFiles={handleFileAdded}
        disabled={isUploading}
        className="cra--contract-upload__drop"
      />

      {validationError && (
        <InlineNotification
          kind="error"
          title="Invalid file"
          subtitle={validationError}
          hideCloseButton={false}
          onClose={handleClearFile}
          lowContrast
          className="cra--contract-upload__notification"
        />
      )}

      {uploadError && (
        <InlineNotification
          kind="error"
          title="Upload failed"
          subtitle={uploadError}
          hideCloseButton={false}
          onClose={() => setUploadError(null)}
          lowContrast
          className="cra--contract-upload__notification"
        />
      )}

      {selectedFile && !validationError && (
        <FileUploaderItem
          name={selectedFile.name}
          status="edit"
          onDelete={handleClearFile}
          iconDescription="Remove file"
          className="cra--contract-upload__file-item"
        />
      )}

      {isUploading ? (
        <InlineLoading
          description="Uploading…"
          status="active"
          className="cra--contract-upload__loading"
        />
      ) : (
        <Button
          kind="primary"
          disabled={!selectedFile || !!validationError}
          onClick={handleSubmit}
          className="cra--contract-upload__submit"
        >
          Upload contract
        </Button>
      )}
    </section>
  );
};

export { ContractUpload };
