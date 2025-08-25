const axios = require('axios');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');

class ProxyManager {
  constructor() {
    this.proxies = [];
    this.proxyIndex = 0;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/proxy.log' }),
        new winston.transports.Console()
      ]
    });
    
    this.proxyFile = path.join(__dirname, '../data/proxies.json');
    this.loadProxies();
  }

  async loadProxies() {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(this.proxyFile);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Load existing proxies
      try {
        const data = await fs.readFile(this.proxyFile, 'utf8');
        this.proxies = JSON.parse(data);
        this.logger.info(`Loaded ${this.proxies.length} proxies from file`);
      } catch (error) {
        // File doesn't exist, start with empty array
        this.proxies = [];
        await this.saveProxies();
      }

      // Load some free proxy lists
      await this.loadFreeProxyLists();
    } catch (error) {
      this.logger.error('Error loading proxies:', error);
    }
  }

  async saveProxies() {
    try {
      await fs.writeFile(this.proxyFile, JSON.stringify(this.proxies, null, 2));
    } catch (error) {
      this.logger.error('Error saving proxies:', error);
    }
  }

  async loadFreeProxyLists() {
    try {
      // Load from multiple free proxy sources
      const proxySources = [
        'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
        'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
        'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt'
      ];

      for (const source of proxySources) {
        try {
          const response = await axios.get(source, { timeout: 10000 });
          const proxyList = this.parseProxyList(response.data);
          
          for (const proxy of proxyList) {
            if (await this.testProxy(proxy)) {
              await this.addProxy(proxy);
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to load proxies from ${source}:`, error.message);
        }
      }
    } catch (error) {
      this.logger.error('Error loading free proxy lists:', error);
    }
  }

  parseProxyList(data) {
    const proxies = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Parse different proxy formats
      if (trimmed.includes(':')) {
        const [host, port] = trimmed.split(':');
        if (host && port && !isNaN(port)) {
          proxies.push({
            host: host.trim(),
            port: parseInt(port.trim()),
            protocol: 'http',
            username: '',
            password: '',
            country: '',
            anonymity: 'unknown',
            lastTested: null,
            successRate: 0,
            responseTime: 0
          });
        }
      }
    }
    
    return proxies;
  }

  async testProxy(proxy) {
    try {
      const startTime = Date.now();
      const response = await axios.get('http://httpbin.org/ip', {
        proxy: {
          host: proxy.host,
          port: proxy.port,
          protocol: proxy.protocol
        },
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        proxy.lastTested = new Date();
        proxy.responseTime = responseTime;
        proxy.successRate = 1;
        return true;
      }
    } catch (error) {
      proxy.lastTested = new Date();
      proxy.successRate = 0;
    }
    
    return false;
  }

  async addProxy(proxy) {
    // Check if proxy already exists
    const existingIndex = this.proxies.findIndex(p => 
      p.host === proxy.host && p.port === proxy.port
    );
    
    if (existingIndex >= 0) {
      // Update existing proxy
      this.proxies[existingIndex] = { ...this.proxies[existingIndex], ...proxy };
    } else {
      // Add new proxy
      this.proxies.push({
        id: Date.now().toString(),
        ...proxy,
        addedAt: new Date()
      });
    }
    
    await this.saveProxies();
    this.logger.info(`Added/updated proxy: ${proxy.host}:${proxy.port}`);
  }

  async removeProxy(proxyId) {
    const index = this.proxies.findIndex(p => p.id === proxyId);
    if (index >= 0) {
      this.proxies.splice(index, 1);
      await this.saveProxies();
      this.logger.info(`Removed proxy: ${proxyId}`);
      return true;
    }
    return false;
  }

  async getRandomProxy() {
    if (this.proxies.length === 0) {
      return null;
    }
    
    // Filter working proxies
    const workingProxies = this.proxies.filter(p => p.successRate > 0);
    
    if (workingProxies.length === 0) {
      // If no working proxies, try to test all proxies
      await this.testAllProxies();
      return this.proxies[Math.floor(Math.random() * this.proxies.length)];
    }
    
    // Return random working proxy
    return workingProxies[Math.floor(Math.random() * workingProxies.length)];
  }

  async getNextProxy() {
    if (this.proxies.length === 0) {
      return null;
    }
    
    this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
    return this.proxies[this.proxyIndex];
  }

  async testAllProxies() {
    this.logger.info('Testing all proxies...');
    
    const testPromises = this.proxies.map(async (proxy) => {
      const isWorking = await this.testProxy(proxy);
      if (isWorking) {
        proxy.successRate = Math.min(proxy.successRate + 0.1, 1);
      } else {
        proxy.successRate = Math.max(proxy.successRate - 0.1, 0);
      }
      return proxy;
    });
    
    await Promise.all(testPromises);
    await this.saveProxies();
    
    const workingCount = this.proxies.filter(p => p.successRate > 0).length;
    this.logger.info(`Proxy test completed. ${workingCount}/${this.proxies.length} proxies working`);
  }

  async getProxies() {
    return this.proxies;
  }

  async getWorkingProxies() {
    return this.proxies.filter(p => p.successRate > 0);
  }

  async getProxyStats() {
    const total = this.proxies.length;
    const working = this.proxies.filter(p => p.successRate > 0).length;
    const avgResponseTime = this.proxies.reduce((sum, p) => sum + p.responseTime, 0) / total || 0;
    
    return {
      total,
      working,
      successRate: total > 0 ? (working / total) * 100 : 0,
      averageResponseTime: avgResponseTime,
      lastUpdated: new Date()
    };
  }

  async addProxyFromString(proxyString) {
    // Parse proxy string in format: protocol://username:password@host:port
    const match = proxyString.match(/^(https?|socks5):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/);
    
    if (match) {
      const [, protocol, username, password, host, port] = match;
      const proxy = {
        host,
        port: parseInt(port),
        protocol,
        username: username || '',
        password: password || '',
        country: '',
        anonymity: 'unknown',
        lastTested: null,
        successRate: 0,
        responseTime: 0
      };
      
      await this.addProxy(proxy);
      return true;
    }
    
    return false;
  }

  async addProxyList(proxyList) {
    for (const proxyString of proxyList) {
      await this.addProxyFromString(proxyString);
    }
  }

  async cleanupDeadProxies() {
    const beforeCount = this.proxies.length;
    this.proxies = this.proxies.filter(p => p.successRate > 0 || p.lastTested === null);
    const afterCount = this.proxies.length;
    
    if (beforeCount !== afterCount) {
      await this.saveProxies();
      this.logger.info(`Cleaned up ${beforeCount - afterCount} dead proxies`);
    }
  }
}

module.exports = ProxyManager;
