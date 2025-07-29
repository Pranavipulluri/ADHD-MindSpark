// Central service exports
const emailService = require('./emailService');
const achievementService = require('./achievementService');
const WebSocketHandler = require('./websocketService');

// Initialize services
const initializeServices = async () => {
  try {
    console.log('🚀 Initializing services...');
    
    // Initialize email service
    await emailService.initialize();
    console.log('✅ Email service initialized');
    
    // Initialize achievement service
    await achievementService.initialize();
    console.log('✅ Achievement service initialized');
    
    console.log('🎉 All services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    throw error;
  }
};

// Graceful shutdown of services
const shutdownServices = async () => {
  try {
    console.log('🛑 Shutting down services...');
    
    // Cleanup services if needed
    if (emailService.cleanup) {
      await emailService.cleanup();
    }
    
    if (achievementService.cleanup) {
      await achievementService.cleanup();
    }
    
    console.log('✅ Services shut down gracefully');
  } catch (error) {
    console.error('❌ Error during service shutdown:', error);
  }
};

module.exports = {
  emailService,
  achievementService,
  WebSocketHandler,
  initializeServices,
  shutdownServices
};