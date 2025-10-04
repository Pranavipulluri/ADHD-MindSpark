import { AlertCircle, CheckCircle, Chrome, Download, Settings } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface ExtensionStatus {
  isInstalled: boolean;
  isConnected: boolean;
  version?: string;
  lastSync?: Date;
}

const ExtensionIntegration: React.FC = () => {
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({
    isInstalled: false,
    isConnected: false
  });
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    checkExtensionStatus();
    
    // Listen for extension messages
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'EXTENSION_STATUS') {
        setExtensionStatus({
          isInstalled: true,
          isConnected: true,
          version: event.data.version,
          lastSync: new Date()
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkExtensionStatus = () => {
    // Check if extension is installed by looking for injected elements
    const extensionElement = document.getElementById('mindspark-extension-detector');
    if (extensionElement) {
      setExtensionStatus(prev => ({ ...prev, isInstalled: true }));
    }

    // Send ping to extension
    window.postMessage({ type: 'PING_EXTENSION' }, window.location.origin);
  };

  const downloadExtension = () => {
    // In production, this would link to Chrome Web Store
    const extensionPath = '/extension.zip'; // Development version
    const link = document.createElement('a');
    link.href = extensionPath;
    link.download = 'mindspark-extension.zip';
    link.click();
  };

  const syncWithExtension = async () => {
    try {
      // Send user data to extension
      const userData = {
        type: 'USER_DATA_SYNC',
        user: JSON.parse(localStorage.getItem('user') || '{}'),
        token: localStorage.getItem('token')
      };
      
      window.postMessage(userData, window.location.origin);
      
      setExtensionStatus(prev => ({ 
        ...prev, 
        isConnected: true, 
        lastSync: new Date() 
      }));
    } catch (error) {
      console.error('Extension sync failed:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Chrome className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Browser Extension</h3>
            <p className="text-sm text-gray-600">
              Access MindSpark features on any website
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {extensionStatus.isConnected ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-orange-600">
              <AlertCircle className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">
                {extensionStatus.isInstalled ? 'Not Connected' : 'Not Installed'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Extension Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">🎨 Accessibility Tools</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Dyslexia-friendly fonts</li>
            <li>• High contrast mode</li>
            <li>• Font size adjustment</li>
            <li>• Color scheme options</li>
          </ul>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">🤖 AI Features</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• One-click page summaries</li>
            <li>• Text simplification</li>
            <li>• Text-to-speech</li>
            <li>• Smart highlighting</li>
          </ul>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">🎮 Brain Games</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• Memory challenges</li>
            <li>• Focus exercises</li>
            <li>• Breathing techniques</li>
            <li>• Quick brain breaks</li>
          </ul>
        </div>
        
        <div className="p-4 bg-orange-50 rounded-lg">
          <h4 className="font-medium text-orange-900 mb-2">📊 Progress Tracking</h4>
          <ul className="text-sm text-orange-700 space-y-1">
            <li>• Reading time tracking</li>
            <li>• Points and achievements</li>
            <li>• Activity logging</li>
            <li>• Learning analytics</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!extensionStatus.isInstalled ? (
          <>
            <button
              onClick={downloadExtension}
              className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Extension
            </button>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Installation Guide
            </button>
          </>
        ) : !extensionStatus.isConnected ? (
          <button
            onClick={syncWithExtension}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Connect Extension
          </button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              Last synced: {extensionStatus.lastSync?.toLocaleTimeString()}
            </div>
            <button
              onClick={syncWithExtension}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Sync Now
            </button>
          </div>
        )}
      </div>

      {/* Installation Instructions */}
      {showInstructions && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Installation Instructions</h4>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong>Chrome/Edge:</strong>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                <li>Download the extension file</li>
                <li>Open Chrome and go to chrome://extensions/</li>
                <li>Enable "Developer mode" in the top right</li>
                <li>Click "Load unpacked" and select the extension folder</li>
                <li>The MindSpark icon should appear in your toolbar</li>
              </ol>
            </div>
            
            <div>
              <strong>Firefox:</strong>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                <li>Download the extension file</li>
                <li>Open Firefox and go to about:debugging</li>
                <li>Click "This Firefox" in the sidebar</li>
                <li>Click "Load Temporary Add-on"</li>
                <li>Select the manifest.json file from the extension folder</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Extension Status Details */}
      {extensionStatus.isInstalled && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Extension Status:</span>
            <div className="flex items-center space-x-4">
              {extensionStatus.version && (
                <span className="text-gray-500">v{extensionStatus.version}</span>
              )}
              <span className={`px-2 py-1 rounded-full text-xs ${
                extensionStatus.isConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {extensionStatus.isConnected ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtensionIntegration;