#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Build script for MindSpark Browser Extension
class ExtensionBuilder {
  constructor() {
    this.extensionDir = __dirname;
    this.buildDir = path.join(__dirname, 'build');
    this.distDir = path.join(__dirname, 'dist');
  }

  async build() {
    console.log('🚀 Building MindSpark Browser Extension...');
    
    try {
      // Clean and create directories
      await this.cleanDirectories();
      await this.createDirectories();
      
      // Copy files
      await this.copyFiles();
      
      // Process manifest for different browsers
      await this.processManifests();
      
      // Create distribution packages
      await this.createPackages();
      
      console.log('✅ Extension build completed successfully!');
      console.log(`📦 Chrome package: ${path.join(this.distDir, 'mindspark-chrome.zip')}`);
      console.log(`📦 Firefox package: ${path.join(this.distDir, 'mindspark-firefox.zip')}`);
      
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  }

  async cleanDirectories() {
    if (fs.existsSync(this.buildDir)) {
      fs.rmSync(this.buildDir, { recursive: true, force: true });
    }
    if (fs.existsSync(this.distDir)) {
      fs.rmSync(this.distDir, { recursive: true, force: true });
    }
  }

  async createDirectories() {
    fs.mkdirSync(this.buildDir, { recursive: true });
    fs.mkdirSync(this.distDir, { recursive: true });
    fs.mkdirSync(path.join(this.buildDir, 'chrome'), { recursive: true });
    fs.mkdirSync(path.join(this.buildDir, 'firefox'), { recursive: true });
  }

  async copyFiles() {
    const filesToCopy = [
      'background.js',
      'content.js',
      'content.css',
      'popup.html',
      'popup.css',
      'popup.js',
      'README.md'
    ];

    const directoriesToCopy = [
      'icons',
      'fonts'
    ];

    // Copy files to both Chrome and Firefox builds
    for (const browser of ['chrome', 'firefox']) {
      const targetDir = path.join(this.buildDir, browser);
      
      // Copy individual files
      for (const file of filesToCopy) {
        const sourcePath = path.join(this.extensionDir, file);
        const targetPath = path.join(targetDir, file);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
        }
      }

      // Copy directories
      for (const dir of directoriesToCopy) {
        const sourceDir = path.join(this.extensionDir, dir);
        const targetDirPath = path.join(targetDir, dir);
        
        if (fs.existsSync(sourceDir)) {
          this.copyDirectory(sourceDir, targetDirPath);
        }
      }
    }
  }

  copyDirectory(source, target) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);
    
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  async processManifests() {
    const baseManifest = JSON.parse(
      fs.readFileSync(path.join(this.extensionDir, 'manifest.json'), 'utf8')
    );

    // Chrome manifest (Manifest V3)
    const chromeManifest = {
      ...baseManifest,
      manifest_version: 3,
      background: {
        service_worker: 'background.js'
      }
    };

    // Firefox manifest (Manifest V2 compatibility)
    const firefoxManifest = {
      ...baseManifest,
      manifest_version: 2,
      background: {
        scripts: ['background.js'],
        persistent: false
      },
      permissions: [
        ...baseManifest.permissions,
        '<all_urls>'
      ],
      browser_specific_settings: {
        gecko: {
          id: 'mindspark@extension.com',
          strict_min_version: '90.0'
        }
      }
    };

    // Remove Manifest V3 specific fields for Firefox
    delete firefoxManifest.host_permissions;
    delete firefoxManifest.action;
    
    // Add browser_action for Firefox
    firefoxManifest.browser_action = {
      default_popup: 'popup.html',
      default_title: 'MindSpark Assistant',
      default_icon: {
        16: 'icons/icon16.png',
        32: 'icons/icon32.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png'
      }
    };

    // Write manifests
    fs.writeFileSync(
      path.join(this.buildDir, 'chrome', 'manifest.json'),
      JSON.stringify(chromeManifest, null, 2)
    );

    fs.writeFileSync(
      path.join(this.buildDir, 'firefox', 'manifest.json'),
      JSON.stringify(firefoxManifest, null, 2)
    );
  }

  async createPackages() {
    // Create Chrome package
    await this.createZip(
      path.join(this.buildDir, 'chrome'),
      path.join(this.distDir, 'mindspark-chrome.zip')
    );

    // Create Firefox package
    await this.createZip(
      path.join(this.buildDir, 'firefox'),
      path.join(this.distDir, 'mindspark-firefox.zip')
    );

    // Create development package (unzipped)
    this.copyDirectory(
      path.join(this.buildDir, 'chrome'),
      path.join(this.distDir, 'mindspark-dev')
    );
  }

  createZip(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`📦 Created ${outputPath} (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}

// Run the build if this script is executed directly
if (require.main === module) {
  const builder = new ExtensionBuilder();
  builder.build();
}

module.exports = ExtensionBuilder;