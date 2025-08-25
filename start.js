#!/usr/bin/env node

const server = require('./server');
const config = require('./config');

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('🚀 Starting Advanced Load Testing & Security Scanner...');
console.log(`📊 Server will be available at http://localhost:${config.server.port}`);
console.log('⚠️  Remember to use this tool responsibly and ethically!');
