const LoadTester = require('../src/loadTester');
const ProxyManager = require('../src/proxyManager');
const TestManager = require('../src/testManager');

// Mock dependencies
jest.mock('axios');
jest.mock('winston');

describe('LoadTester', () => {
    let loadTester;
    let proxyManager;
    let testManager;

    beforeEach(() => {
        proxyManager = new ProxyManager();
        testManager = new TestManager();
        loadTester = new LoadTester(proxyManager, testManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('detectJavaScriptVulnerabilities', () => {
        it('should detect vulnerable Axios versions', () => {
            const htmlContent = 'axios v1.6.5 some content';
            const vulnerabilities = loadTester.detectJavaScriptVulnerabilities(htmlContent);
            
            expect(vulnerabilities).toHaveLength(1);
            expect(vulnerabilities[0].type).toBe('Vulnerable JS Library');
            expect(vulnerabilities[0].description).toBe('Vulnerable Axios version detected');
            expect(vulnerabilities[0].cve).toContain('CVE-2025-27152');
        });

        it('should detect vulnerable jQuery versions', () => {
            const htmlContent = 'jquery 1.12.4 some content';
            const vulnerabilities = loadTester.detectJavaScriptVulnerabilities(htmlContent);
            
            expect(vulnerabilities).toHaveLength(1);
            expect(vulnerabilities[0].type).toBe('Vulnerable JS Library');
            expect(vulnerabilities[0].description).toBe('Vulnerable jquery version detected');
            expect(vulnerabilities[0].cve).toContain('CVE-2021-21349');
        });

        it('should return empty array for non-vulnerable content', () => {
            const htmlContent = 'axios v2.0.0 some content';
            const vulnerabilities = loadTester.detectJavaScriptVulnerabilities(htmlContent);
            
            expect(vulnerabilities).toHaveLength(0);
        });
    });

    describe('detectSQLInjectionResponse', () => {
        it('should detect SQL syntax errors', () => {
            const content = 'You have an error in your SQL syntax';
            const result = loadTester.detectSQLInjectionResponse(content);
            expect(result).toBe(true);
        });

        it('should detect MySQL errors', () => {
            const content = 'MySQL error occurred';
            const result = loadTester.detectSQLInjectionResponse(content);
            expect(result).toBe(true);
        });

        it('should return false for normal content', () => {
            const content = 'Welcome to our website';
            const result = loadTester.detectSQLInjectionResponse(content);
            expect(result).toBe(false);
        });
    });

    describe('makeHttpRequest', () => {
        it('should make successful HTTP request', async () => {
            const mockAxios = require('axios');
            mockAxios.mockResolvedValue({
                status: 200,
                data: '<html>test</html>',
                headers: { 'content-type': 'text/html' }
            });

            const result = await loadTester.makeHttpRequest('https://example.com');
            
            expect(result.success).toBe(true);
            expect(result.status).toBe(200);
            expect(result.data).toBe('<html>test</html>');
        });

        it('should handle failed HTTP request', async () => {
            const mockAxios = require('axios');
            mockAxios.mockRejectedValue(new Error('Network error'));

            const result = await loadTester.makeHttpRequest('https://example.com');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });
});

describe('ProxyManager', () => {
    let proxyManager;

    beforeEach(() => {
        proxyManager = new ProxyManager();
    });

    describe('parseProxyList', () => {
        it('should parse valid proxy strings', () => {
            const proxyData = '192.168.1.1:8080\n10.0.0.1:3128\n';
            const proxies = proxyManager.parseProxyList(proxyData);
            
            expect(proxies).toHaveLength(2);
            expect(proxies[0].host).toBe('192.168.1.1');
            expect(proxies[0].port).toBe(8080);
            expect(proxies[1].host).toBe('10.0.0.1');
            expect(proxies[1].port).toBe(3128);
        });

        it('should handle invalid proxy strings', () => {
            const proxyData = 'invalid\n192.168.1.1:8080\nalso-invalid';
            const proxies = proxyManager.parseProxyList(proxyData);
            
            expect(proxies).toHaveLength(1);
            expect(proxies[0].host).toBe('192.168.1.1');
        });
    });

    describe('addProxyFromString', () => {
        it('should parse HTTP proxy string', async () => {
            const proxyString = 'http://user:pass@proxy.example.com:8080';
            const result = await proxyManager.addProxyFromString(proxyString);
            
            expect(result).toBe(true);
            expect(proxyManager.proxies).toHaveLength(1);
            expect(proxyManager.proxies[0].host).toBe('proxy.example.com');
            expect(proxyManager.proxies[0].port).toBe(8080);
            expect(proxyManager.proxies[0].username).toBe('user');
            expect(proxyManager.proxies[0].password).toBe('pass');
        });

        it('should parse HTTPS proxy string', async () => {
            const proxyString = 'https://proxy.example.com:3128';
            const result = await proxyManager.addProxyFromString(proxyString);
            
            expect(result).toBe(true);
            expect(proxyManager.proxies[0].protocol).toBe('https');
        });

        it('should return false for invalid proxy string', async () => {
            const proxyString = 'invalid-proxy-string';
            const result = await proxyManager.addProxyFromString(proxyString);
            
            expect(result).toBe(false);
        });
    });
});

describe('TestManager', () => {
    let testManager;

    beforeEach(() => {
        testManager = new TestManager();
    });

    describe('createTest', () => {
        it('should create a new test', async () => {
            const testConfig = {
                id: 'test-123',
                targetUrl: 'https://example.com',
                status: 'created'
            };

            const test = await testManager.createTest(testConfig);
            
            expect(test.id).toBe('test-123');
            expect(test.targetUrl).toBe('https://example.com');
            expect(test.status).toBe('created');
            expect(test.createdAt).toBeDefined();
        });
    });

    describe('updateTest', () => {
        it('should update existing test', async () => {
            // First create a test
            const testConfig = {
                id: 'test-123',
                targetUrl: 'https://example.com'
            };
            await testManager.createTest(testConfig);

            // Then update it
            const updates = { status: 'running' };
            const updatedTest = await testManager.updateTest('test-123', updates);
            
            expect(updatedTest.status).toBe('running');
            expect(updatedTest.updatedAt).toBeDefined();
        });

        it('should throw error for non-existent test', async () => {
            await expect(
                testManager.updateTest('non-existent', { status: 'running' })
            ).rejects.toThrow('Test non-existent not found');
        });
    });

    describe('getTestStats', () => {
        it('should calculate correct statistics', async () => {
            // Create some test data
            const test1 = {
                id: 'test-1',
                targetUrl: 'https://example.com',
                status: 'completed',
                results: {
                    requests: 100,
                    successful: 90,
                    failed: 10,
                    responseTimes: [100, 200, 300],
                    vulnerabilities: [
                        { type: 'XSS', severity: 'HIGH' },
                        { type: 'SQL Injection', severity: 'CRITICAL' }
                    ]
                }
            };

            const test2 = {
                id: 'test-2',
                targetUrl: 'https://example2.com',
                status: 'running',
                results: {
                    requests: 50,
                    successful: 45,
                    failed: 5,
                    responseTimes: [150, 250]
                }
            };

            testManager.tests.set('test-1', test1);
            testManager.tests.set('test-2', test2);

            const stats = await testManager.getTestStats();
            
            expect(stats.total).toBe(2);
            expect(stats.running).toBe(1);
            expect(stats.completed).toBe(1);
            expect(stats.totalRequests).toBe(150);
            expect(stats.vulnerabilities.total).toBe(2);
            expect(stats.vulnerabilities.bySeverity.HIGH).toBe(1);
            expect(stats.vulnerabilities.bySeverity.CRITICAL).toBe(1);
        });
    });
});
