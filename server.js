const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const cron = require('node-cron');

// Import load testing modules
const LoadTester = require('./src/loadTester');
const ProxyManager = require('./src/proxyManager');
const TestManager = require('./src/testManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize managers
const proxyManager = new ProxyManager();
const testManager = new TestManager();
const loadTester = new LoadTester(proxyManager, testManager);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/proxies', async (req, res) => {
  try {
    const proxies = await proxyManager.getProxies();
    res.json({ success: true, proxies });
  } catch (error) {
    logger.error('Error fetching proxies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/proxies', async (req, res) => {
  try {
    const { proxy } = req.body;
    await proxyManager.addProxy(proxy);
    res.json({ success: true, message: 'Proxy added successfully' });
  } catch (error) {
    logger.error('Error adding proxy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test/start', async (req, res) => {
  try {
    const { targetUrl, config } = req.body;
    const testId = uuidv4();
    
    const testConfig = {
      id: testId,
      targetUrl,
      ...config,
      startTime: new Date(),
      status: 'running'
    };

    await testManager.createTest(testConfig);
    
    // Start load testing in background
    loadTester.startTest(testConfig, (results) => {
      io.emit('testUpdate', { testId, results });
    });

    res.json({ success: true, testId });
  } catch (error) {
    logger.error('Error starting test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/test/stop', async (req, res) => {
  try {
    const { testId } = req.body;
    await loadTester.stopTest(testId);
    await testManager.updateTest(testId, { status: 'stopped', endTime: new Date() });
    res.json({ success: true, message: 'Test stopped successfully' });
  } catch (error) {
    logger.error('Error stopping test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await testManager.getTest(testId);
    res.json({ success: true, test });
  } catch (error) {
    logger.error('Error fetching test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tests', async (req, res) => {
  try {
    const tests = await testManager.getAllTests();
    res.json({ success: true, tests });
  } catch (error) {
    logger.error('Error fetching tests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);

  socket.on('joinTest', (testId) => {
    socket.join(testId);
    logger.info(`Client ${socket.id} joined test ${testId}`);
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Cleanup old tests daily
cron.schedule('0 0 * * *', async () => {
  try {
    await testManager.cleanupOldTests();
    logger.info('Cleaned up old tests');
  } catch (error) {
    logger.error('Error cleaning up old tests:', error);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Load testing server running on port ${PORT}`);
  console.log(`🚀 Load Testing Website running on http://localhost:${PORT}`);
});
