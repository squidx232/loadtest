# Advanced Load Testing & Security Scanner

A comprehensive web-based load testing tool with built-in vulnerability scanning and exploitation capabilities. This tool can generate heavy traffic to test website breaking points while simultaneously scanning for and exploiting security vulnerabilities.

## ⚠️ **IMPORTANT DISCLAIMER**

This tool is designed for **ethical security testing and research purposes only**. Users are responsible for ensuring they have proper authorization before testing any website. Unauthorized testing may be illegal and could result in legal consequences.

**Only use this tool on websites you own or have explicit permission to test.**

## 🚀 Features

### Load Testing Capabilities
- **Concurrent User Simulation**: Test with up to 1000+ concurrent users
- **Request Rate Control**: Configurable requests per second
- **Advanced HTTP Simulation**: Browser-like behavior with realistic headers
- **Real-time Monitoring**: Live statistics and response time charts
- **Proxy Support**: Rotate through multiple IP addresses/proxies

### Security Testing Features
- **Vulnerability Scanning**: Automatic detection of common vulnerabilities
- **Exploitation Testing**: Attempt to exploit found vulnerabilities
- **JavaScript Library Analysis**: Detect vulnerable versions of common libraries
- **SQL Injection Testing**: Automated SQL injection payload testing
- **XSS Detection**: Cross-site scripting vulnerability scanning
- **Security Header Analysis**: Check for missing security headers

### Proxy Management
- **Multiple Proxy Types**: HTTP, HTTPS, SOCKS5 support
- **Automatic Proxy Discovery**: Load free proxy lists
- **Proxy Health Monitoring**: Test and track proxy reliability
- **Manual Proxy Addition**: Add custom proxies

### Real-time Analytics
- **Response Time Charts**: Visualize performance metrics
- **Vulnerability Dashboard**: Track discovered security issues
- **Test History**: View and export previous test results
- **Export Capabilities**: JSON, CSV, and HTML report formats

## 🛠️ Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd load-testing-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create necessary directories**
   ```bash
   mkdir -p logs data
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the web interface**
   Open your browser and navigate to `http://localhost:3000`

## 📖 Usage Guide

### Basic Load Testing

1. **Configure Test Parameters**
   - Enter target URL
   - Set concurrent users (1-1000)
   - Set requests per second (1-100)
   - Set test duration in seconds
   - Configure advanced HTTP instances (0-10)

2. **Enable Vulnerability Testing**
   - Check "Enable Vulnerability Exploitation" for security scanning
   - The tool will automatically scan for vulnerabilities during load testing

3. **Start the Test**
   - Click "Start Load Test"
   - Monitor real-time results
   - View vulnerability findings

### Proxy Management

1. **Add Proxies**
   - Format: `protocol://username:password@host:port`
   - Examples:
     - `http://user:pass@proxy.example.com:8080`
     - `https://proxy.example.com:3128`
     - `socks5://proxy.example.com:1080`

2. **Automatic Proxy Discovery**
   - Click "Refresh" to load free proxy lists
   - Proxies are automatically tested for reliability

### Vulnerability Scanning

1. **Standalone Scanning**
   - Use the "Vulnerability Scanner" panel
   - Enter target URL
   - Click "Scan Vulnerabilities"
   - Review results

2. **Integrated Scanning**
   - Enable during load testing
   - Vulnerabilities are detected and exploited automatically

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
MAX_CONCURRENT_TESTS=5
PROXY_TIMEOUT=10000
```

### Advanced Configuration

Edit `config.js` for advanced settings:

```javascript
module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0'
  },
  loadTesting: {
    maxConcurrentUsers: 1000,
    maxRequestsPerSecond: 100,
    maxTestDuration: 3600,
    maxAdvancedHttpInstances: 10
  },
  security: {
    enableExploitation: true,
    scanInterval: 10000,
    maxVulnerabilityChecks: 50
  },
  proxies: {
    autoDiscovery: true,
    testInterval: 300000,
    maxProxies: 1000
  }
};
```

## 🛡️ Security Features

### Vulnerability Detection

The tool automatically scans for:

- **JavaScript Library Vulnerabilities**
  - Axios CVE-2025-27152, CVE-2024-39338
  - jQuery CVE-2021-21349
  - Lodash CVE-2021-23337
  - Moment.js CVE-2022-31129

- **Web Application Vulnerabilities**
  - SQL Injection
  - Cross-Site Scripting (XSS)
  - Missing Security Headers
  - Server-Side Request Forgery (SSRF)

### Exploitation Testing

When vulnerabilities are found, the tool can:

- **Test Exploitability**: Attempt to exploit detected vulnerabilities
- **Generate Proof of Concept**: Create reproducible exploit scenarios
- **Document Findings**: Detailed reports with evidence and CVE references

## 📊 API Endpoints

### Load Testing
- `POST /api/test/start` - Start a new load test
- `POST /api/test/stop` - Stop an active test
- `GET /api/test/:testId` - Get test results
- `GET /api/tests` - List all tests

### Proxy Management
- `GET /api/proxies` - List all proxies
- `POST /api/proxies` - Add a new proxy

### Example API Usage

```javascript
// Start a load test
const response = await fetch('/api/test/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetUrl: 'https://example.com',
    config: {
      concurrentUsers: 10,
      requestsPerSecond: 5,
      duration: 60,
      advancedHttpInstances: 2,
      exploitVulnerabilities: true
    }
  })
});
```

## 📈 Monitoring & Analytics

### Real-time Metrics
- Total requests sent
- Successful vs failed requests
- Average response times
- Vulnerability count
- Exploitation success rate

### Charts and Visualizations
- Response time trends
- Request success rates
- Vulnerability severity distribution
- Proxy performance metrics

## 🔍 Troubleshooting

### Common Issues

1. **Proxy Connection Failures**
   - Check proxy credentials
   - Verify proxy is working
   - Try different proxy protocols

2. **High Memory Usage**
   - Reduce concurrent users
   - Lower advanced HTTP instances
   - Increase test intervals

3. **Slow Performance**
   - Check network connectivity
   - Verify target website accessibility
   - Monitor system resources

### Log Files

Check the following log files for debugging:

- `logs/combined.log` - General application logs
- `logs/error.log` - Error messages
- `logs/loadtest.log` - Load testing specific logs
- `logs/proxy.log` - Proxy management logs
- `logs/testmanager.log` - Test management logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚖️ Legal Notice

This tool is provided for educational and authorized security testing purposes only. Users are responsible for:

- Obtaining proper authorization before testing
- Complying with applicable laws and regulations
- Respecting website terms of service
- Not causing harm or disruption to systems

The authors are not responsible for any misuse of this tool.

## 🆘 Support

For support and questions:

1. Check the troubleshooting section
2. Review the logs for error messages
3. Create an issue on GitHub
4. Contact the development team

---

**Remember: Always test responsibly and ethically!**