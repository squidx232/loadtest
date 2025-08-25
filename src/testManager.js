const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

class TestManager {
  constructor() {
    this.tests = new Map();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/testmanager.log' }),
        new winston.transports.Console()
      ]
    });
    
    this.testsFile = path.join(__dirname, '../data/tests.json');
    this.loadTests();
  }

  async loadTests() {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(this.testsFile);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Load existing tests
      try {
        const data = await fs.readFile(this.testsFile, 'utf8');
        const testsArray = JSON.parse(data);
        
        // Convert array back to Map
        this.tests.clear();
        testsArray.forEach(test => {
          this.tests.set(test.id, test);
        });
        
        this.logger.info(`Loaded ${this.tests.size} tests from file`);
      } catch (error) {
        // File doesn't exist, start with empty Map
        this.tests = new Map();
        await this.saveTests();
      }
    } catch (error) {
      this.logger.error('Error loading tests:', error);
    }
  }

  async saveTests() {
    try {
      // Convert Map to array for JSON serialization
      const testsArray = Array.from(this.tests.values());
      await fs.writeFile(this.testsFile, JSON.stringify(testsArray, null, 2));
    } catch (error) {
      this.logger.error('Error saving tests:', error);
    }
  }

  async createTest(testConfig) {
    const test = {
      ...testConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'created'
    };

    this.tests.set(test.id, test);
    await this.saveTests();
    
    this.logger.info(`Created test: ${test.id}`);
    return test;
  }

  async updateTest(testId, updates) {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const updatedTest = {
      ...test,
      ...updates,
      updatedAt: new Date()
    };

    this.tests.set(testId, updatedTest);
    await this.saveTests();
    
    this.logger.info(`Updated test: ${testId}`);
    return updatedTest;
  }

  async getTest(testId) {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }
    return test;
  }

  async getAllTests() {
    return Array.from(this.tests.values());
  }

  async getTestsByStatus(status) {
    return Array.from(this.tests.values()).filter(test => test.status === status);
  }

  async getTestsByDateRange(startDate, endDate) {
    return Array.from(this.tests.values()).filter(test => {
      const testDate = new Date(test.createdAt);
      return testDate >= startDate && testDate <= endDate;
    });
  }

  async deleteTest(testId) {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    this.tests.delete(testId);
    await this.saveTests();
    
    this.logger.info(`Deleted test: ${testId}`);
    return true;
  }

  async getTestResults(testId) {
    const test = await this.getTest(testId);
    return test.results || {};
  }

  async updateTestResults(testId, results) {
    const test = await this.getTest(testId);
    test.results = { ...test.results, ...results };
    test.updatedAt = new Date();
    
    this.tests.set(testId, test);
    await this.saveTests();
    
    return test;
  }

  async getTestStats() {
    const tests = Array.from(this.tests.values());
    const total = tests.length;
    const running = tests.filter(t => t.status === 'running').length;
    const completed = tests.filter(t => t.status === 'completed').length;
    const failed = tests.filter(t => t.status === 'failed').length;

    // Calculate average response time
    const responseTimes = tests
      .filter(t => t.results && t.results.responseTimes)
      .flatMap(t => t.results.responseTimes);
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Calculate total requests
    const totalRequests = tests
      .filter(t => t.results)
      .reduce((sum, t) => sum + (t.results.requests || 0), 0);

    // Calculate vulnerabilities found
    const vulnerabilities = tests
      .filter(t => t.results && t.results.vulnerabilities)
      .flatMap(t => t.results.vulnerabilities);

    const vulnerabilityStats = {
      total: vulnerabilities.length,
      byType: vulnerabilities.reduce((acc, vuln) => {
        acc[vuln.type] = (acc[vuln.type] || 0) + 1;
        return acc;
      }, {}),
      bySeverity: vulnerabilities.reduce((acc, vuln) => {
        acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
        return acc;
      }, {})
    };

    return {
      total,
      running,
      completed,
      failed,
      averageResponseTime: Math.round(avgResponseTime),
      totalRequests,
      vulnerabilities: vulnerabilityStats,
      lastUpdated: new Date()
    };
  }

  async cleanupOldTests(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const testsToDelete = Array.from(this.tests.values())
      .filter(test => new Date(test.createdAt) < cutoffDate);

    for (const test of testsToDelete) {
      this.tests.delete(test.id);
    }

    if (testsToDelete.length > 0) {
      await this.saveTests();
      this.logger.info(`Cleaned up ${testsToDelete.length} old tests`);
    }

    return testsToDelete.length;
  }

  async exportTestResults(testId, format = 'json') {
    const test = await this.getTest(testId);
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(test, null, 2);
      
      case 'csv':
        return this.convertToCSV(test);
      
      case 'html':
        return this.convertToHTML(test);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  convertToCSV(test) {
    const headers = ['Test ID', 'Target URL', 'Status', 'Start Time', 'End Time', 'Duration', 'Total Requests', 'Successful', 'Failed'];
    const row = [
      test.id,
      test.targetUrl,
      test.status,
      test.startTime,
      test.endTime,
      test.duration,
      test.results?.requests || 0,
      test.results?.successful || 0,
      test.results?.failed || 0
    ];

    return [headers.join(','), row.join(',')].join('\n');
  }

  convertToHTML(test) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Load Test Results - ${test.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
          .results { margin: 20px 0; }
          .vulnerability { background: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }
          .critical { border-left-color: #dc3545; background: #f8d7da; }
          .high { border-left-color: #fd7e14; background: #fff3cd; }
          .medium { border-left-color: #ffc107; background: #fff3cd; }
          .low { border-left-color: #28a745; background: #d4edda; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Load Test Results</h1>
          <p><strong>Test ID:</strong> ${test.id}</p>
          <p><strong>Target URL:</strong> ${test.targetUrl}</p>
          <p><strong>Status:</strong> ${test.status}</p>
          <p><strong>Start Time:</strong> ${test.startTime}</p>
          <p><strong>End Time:</strong> ${test.endTime || 'N/A'}</p>
        </div>
        
        <div class="results">
          <h2>Test Results</h2>
          <p><strong>Total Requests:</strong> ${test.results?.requests || 0}</p>
          <p><strong>Successful:</strong> ${test.results?.successful || 0}</p>
          <p><strong>Failed:</strong> ${test.results?.failed || 0}</p>
          <p><strong>Average Response Time:</strong> ${test.results?.responseTimes ? Math.round(test.results.responseTimes.reduce((a, b) => a + b, 0) / test.results.responseTimes.length) : 0}ms</p>
        </div>
        
        ${test.results?.vulnerabilities ? `
        <div class="vulnerabilities">
          <h2>Vulnerabilities Found (${test.results.vulnerabilities.length})</h2>
          ${test.results.vulnerabilities.map(vuln => `
            <div class="vulnerability ${vuln.severity.toLowerCase()}">
              <h3>${vuln.type}</h3>
              <p><strong>Severity:</strong> ${vuln.severity}</p>
              <p><strong>Description:</strong> ${vuln.description}</p>
              <p><strong>Evidence:</strong> ${vuln.evidence}</p>
              <p><strong>Timestamp:</strong> ${vuln.timestamp}</p>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </body>
      </html>
    `;
  }

  async searchTests(query) {
    const tests = Array.from(this.tests.values());
    const searchTerm = query.toLowerCase();
    
    return tests.filter(test => 
      test.targetUrl.toLowerCase().includes(searchTerm) ||
      test.id.toLowerCase().includes(searchTerm) ||
      test.status.toLowerCase().includes(searchTerm) ||
      (test.results && JSON.stringify(test.results).toLowerCase().includes(searchTerm))
    );
  }
}

module.exports = TestManager;
