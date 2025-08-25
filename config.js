module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  },
  
  loadTesting: {
    maxConcurrentUsers: parseInt(process.env.MAX_CONCURRENT_USERS) || 1000,
    maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS_PER_SECOND) || 100,
    maxTestDuration: parseInt(process.env.MAX_TEST_DURATION) || 3600,
    maxAdvancedHttpInstances: parseInt(process.env.MAX_ADVANCED_HTTP_INSTANCES) || 10,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000
  },
  
  security: {
    enableExploitation: process.env.ENABLE_EXPLOITATION !== 'false',
    scanInterval: parseInt(process.env.SCAN_INTERVAL) || 10000,
    maxVulnerabilityChecks: parseInt(process.env.MAX_VULNERABILITY_CHECKS) || 50,
    sqlInjectionPayloads: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --"
    ],
    xssPayloads: [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>'
    ]
  },
  
  proxies: {
    autoDiscovery: process.env.AUTO_DISCOVER_PROXIES !== 'false',
    testInterval: parseInt(process.env.PROXY_TEST_INTERVAL) || 300000, // 5 minutes
    maxProxies: parseInt(process.env.MAX_PROXIES) || 1000,
    testTimeout: parseInt(process.env.PROXY_TIMEOUT) || 10000,
    sources: [
      'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
      'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt'
    ]
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '10m'
  },
  
  data: {
    retentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 30,
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 86400000 // 24 hours
  }
};
