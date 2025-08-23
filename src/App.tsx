import React, { useState, useEffect, useRef } from 'react'
import './App.css'

interface CameraProfile {
  id: string
  name: string
  make: string
  model: string
  lens?: string
}

interface ProcessResult {
  file: string
  success: boolean
  error?: string
}

function App() {
  const [profiles, setProfiles] = useState<CameraProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [newProfile, setNewProfile] = useState({ name: '', make: '', model: '', lens: '' })
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<ProcessResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadProfiles = async () => {
    try {
      const loadedProfiles = await window.electronAPI.getProfiles()
      setProfiles(loadedProfiles)
      if (loadedProfiles.length > 0 && !selectedProfile) {
        setSelectedProfile(loadedProfiles[0].id)
      }
    } catch (error) {
      console.error('Failed to load profiles:', error)
    }
  }

  const handleSaveProfile = async () => {
    if (!newProfile.name || !newProfile.make || !newProfile.model) return

    const profile: CameraProfile = {
      id: Date.now().toString(),
      name: newProfile.name,
      make: newProfile.make,
      model: newProfile.model,
      lens: newProfile.lens || undefined
    }

    try {
      await window.electronAPI.saveProfile(profile)
      await loadProfiles()
      setSelectedProfile(profile.id)
      setNewProfile({ name: '', make: '', model: '', lens: '' })
      setIsCreatingProfile(false)
    } catch (error) {
      console.error('Failed to save profile:', error)
    }
  }

  const handleDeleteProfile = async (profileId: string) => {
    try {
      await window.electronAPI.deleteProfile(profileId)
      await loadProfiles()
      if (selectedProfile === profileId) {
        setSelectedProfile(profiles.length > 1 ? profiles.find(p => p.id !== profileId)?.id || '' : '')
      }
    } catch (error) {
      console.error('Failed to delete profile:', error)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const imagePaths = files
      .filter(file => /\.(jpg|jpeg|tiff|tif)$/i.test(file.name))
      .map(file => file.path)

    if (imagePaths.length > 0) {
      await processFiles(imagePaths)
    }
  }

  const handleFileSelect = async () => {
    try {
      const filePaths = await window.electronAPI.showOpenDialog()
      if (filePaths && filePaths.length > 0) {
        await processFiles(filePaths)
      }
    } catch (error) {
      console.error('Failed to select files:', error)
    }
  }

  const processFiles = async (filePaths: string[]) => {
    if (!selectedProfile) {
      alert('Please select a camera profile first')
      return
    }

    const profile = profiles.find(p => p.id === selectedProfile)
    if (!profile) {
      alert('Selected profile not found')
      return
    }

    setIsProcessing(true)
    setResults([])

    try {
      const processResults = await window.electronAPI.editExif(filePaths, profile)
      setResults(processResults)
    } catch (error) {
      console.error('Failed to process files:', error)
      alert('Failed to process files')
    } finally {
      setIsProcessing(false)
    }
  }

  const getCurrentProfile = () => {
    return profiles.find(p => p.id === selectedProfile)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <main className="flex-1 flex items-center justify-center p-5">
        <div 
          className={`flex-1 bg-white border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-all duration-300 relative ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50 border-solid' 
              : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
          }`}
          style={{ maxHeight: 'calc(100vh - 120px)' }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileSelect}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4 text-gray-600">
              <div className="w-10 h-10 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <p>Processing images...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="w-full max-w-2xl text-left">
              <div className="flex flex-col gap-2 mb-4">
                {results.map((result, index) => (
                  <div key={index} className={`flex items-center gap-3 p-2 px-3 rounded-md text-sm ${
                    result.success 
                      ? 'bg-green-100 border-l-3 border-green-500' 
                      : 'bg-red-100 border-l-3 border-red-500'
                  }`}>
                    <span className="text-lg">{result.success ? '✅' : '❌'}</span>
                    <span className="font-medium flex-1">{result.file}</span>
                    {result.error && <span className="text-xs text-red-500">{result.error}</span>}
                  </div>
                ))}
              </div>
              <button 
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600 transition-colors"
                onClick={() => setResults([])}
              >
                Clear Results
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4 opacity-60">📷</div>
              <p className="text-xl mb-2">Drop your scanned film images here</p>
              <p className="text-base text-gray-400">or click to select files</p>
              <p className="text-sm text-gray-400 mt-2">Supported: JPG, JPEG, TIFF</p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 px-4">
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <button 
            className="bg-blue-500 text-white w-8 h-8 rounded-full text-lg font-bold flex items-center justify-center hover:bg-blue-600 transition-colors flex-shrink-0"
            onClick={() => setIsCreatingProfile(true)}
            title="Add new camera profile"
          >
            +
          </button>
          
          <div className="flex-1 min-w-0">
            {getCurrentProfile() ? (
              <>
                <span className="block font-semibold text-gray-800 text-sm leading-tight">{getCurrentProfile()?.name}</span>
                <span className="block text-gray-500 text-xs mt-0.5 truncate">
                  {getCurrentProfile()?.make} {getCurrentProfile()?.model}
                  {getCurrentProfile()?.lens && ` • ${getCurrentProfile()?.lens}`}
                </span>
              </>
            ) : (
              <span className="text-gray-400 italic text-sm">No camera profile selected</span>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button 
              className="text-gray-500 text-lg p-2 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors flex items-center justify-center w-8 h-8"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              title="Switch camera profile"
            >
              ⋯
            </button>
            
            {showProfileDropdown && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-72 max-h-72 overflow-y-auto z-50">
                <div className="px-4 py-3 font-semibold text-gray-800 border-b border-gray-100 text-sm">Camera Profiles</div>
                {profiles.length === 0 ? (
                  <div className="px-4 py-4 text-gray-400 text-center italic text-sm">No profiles created yet</div>
                ) : (
                  <>
                    {profiles.map(profile => (
                      <div 
                        key={profile.id} 
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors gap-3 group hover:bg-gray-50 ${
                          profile.id === selectedProfile ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedProfile(profile.id)
                          setShowProfileDropdown(false)
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="block font-medium text-gray-800 text-sm">{profile.name}</span>
                          <span className="block text-gray-500 text-xs mt-0.5 truncate">
                            {profile.make} {profile.model}
                            {profile.lens && ` • ${profile.lens}`}
                          </span>
                        </div>
                        <button 
                          className="text-gray-400 p-1 rounded hover:bg-red-50 hover:text-red-500 transition-colors text-sm opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProfile(profile.id)
                          }}
                          title="Delete profile"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </footer>

      {isCreatingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsCreatingProfile(false)}>
          <div className="bg-white rounded-xl w-[90%] max-w-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 px-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Add Camera Profile</h2>
              <button 
                className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors p-1 rounded w-7 h-7 flex items-center justify-center text-lg"
                onClick={() => setIsCreatingProfile(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-5">
                <label className="block mb-1.5 font-medium text-gray-700 text-sm">Profile Name</label>
                <input
                  type="text"
                  placeholder="e.g., Nikon FM"
                  value={newProfile.name}
                  onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                  className="w-full p-2.5 px-3 border border-gray-300 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="flex gap-4 mb-5">
                <div className="flex-1">
                  <label className="block mb-1.5 font-medium text-gray-700 text-sm">Camera Make</label>
                  <input
                    type="text"
                    placeholder="e.g., Nikon"
                    value={newProfile.make}
                    onChange={(e) => setNewProfile({ ...newProfile, make: e.target.value })}
                    className="w-full p-2.5 px-3 border border-gray-300 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-1.5 font-medium text-gray-700 text-sm">Camera Model</label>
                  <input
                    type="text"
                    placeholder="e.g., FM"
                    value={newProfile.model}
                    onChange={(e) => setNewProfile({ ...newProfile, model: e.target.value })}
                    className="w-full p-2.5 px-3 border border-gray-300 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mb-5">
                <label className="block mb-1.5 font-medium text-gray-700 text-sm">Lens (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 50mm f/1.8"
                  value={newProfile.lens}
                  onChange={(e) => setNewProfile({ ...newProfile, lens: e.target.value })}
                  className="w-full p-2.5 px-3 border border-gray-300 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-5 px-6 border-t border-gray-100">
              <button 
                className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-md text-sm hover:bg-gray-200 transition-colors"
                onClick={() => {
                  setIsCreatingProfile(false)
                  setNewProfile({ name: '', make: '', model: '', lens: '' })
                }}
              >
                Cancel
              </button>
              <button 
                className="bg-blue-500 text-white px-5 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={handleSaveProfile}
                disabled={!newProfile.name || !newProfile.make || !newProfile.model}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App