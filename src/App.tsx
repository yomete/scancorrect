import React, { useState, useEffect } from "react";
import "./App.css";
import { useTheme } from "./ThemeContext";
import { DropZone, ProfileModal, Footer } from "./components";
import { CameraProfile, ProcessResult } from "./types";

function App() {
  const { theme, setTheme } = useTheme();
  const [profiles, setProfiles] = useState<CameraProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const loadedProfiles = await window.electronAPI.getProfiles();
      setProfiles(loadedProfiles);
      if (loadedProfiles.length > 0 && !selectedProfile) {
        setSelectedProfile(loadedProfiles[0].id);
      }
    } catch (error) {
      console.error("Failed to load profiles:", error);
    }
  };

  const handleSaveProfile = async (profile: CameraProfile) => {
    try {
      await window.electronAPI.saveProfile(profile);
      await loadProfiles();
      setSelectedProfile(profile.id);
      setIsCreatingProfile(false);
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      await window.electronAPI.deleteProfile(profileId);
      await loadProfiles();
      if (selectedProfile === profileId) {
        setSelectedProfile(
          profiles.length > 1
            ? profiles.find((p) => p.id !== profileId)?.id || ""
            : ""
        );
      }
    } catch (error) {
      console.error("Failed to delete profile:", error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imagePaths = files
      .filter((file) => /\.(jpg|jpeg|tiff|tif)$/i.test(file.name))
      .map((file) => file.path);

    if (imagePaths.length > 0) {
      await processFiles(imagePaths);
    }
  };

  const handleFileSelect = async () => {
    try {
      const filePaths = await window.electronAPI.showOpenDialog();
      if (filePaths && filePaths.length > 0) {
        await processFiles(filePaths);
      }
    } catch (error) {
      console.error("Failed to select files:", error);
    }
  };

  const processFiles = async (filePaths: string[]) => {
    if (!selectedProfile) {
      alert("Please select a camera profile first");
      return;
    }

    const profile = profiles.find((p) => p.id === selectedProfile);
    if (!profile) {
      alert("Selected profile not found");
      return;
    }

    setIsProcessing(true);
    setResults([]);

    try {
      const processResults = await window.electronAPI.editExif(
        filePaths,
        profile
      );
      setResults(processResults);
    } catch (error) {
      console.error("Failed to process files:", error);
      alert("Failed to process files");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-neutral-800">
      <main className="flex-1">
        <DropZone
          isDragOver={isDragOver}
          isProcessing={isProcessing}
          results={results}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
          onClearResults={() => setResults([])}
        />
      </main>

      <Footer
        profiles={profiles}
        selectedProfile={selectedProfile}
        onAddProfile={() => setIsCreatingProfile(true)}
        onProfileSelect={setSelectedProfile}
        onProfileDelete={handleDeleteProfile}
      />

      <ProfileModal
        isOpen={isCreatingProfile}
        onClose={() => setIsCreatingProfile(false)}
        onSave={handleSaveProfile}
      />
    </div>
  );
}

export default App;
