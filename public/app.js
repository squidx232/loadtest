// Load Testing Website JavaScript Application

class LoadTestingApp {
    constructor() {
        this.socket = null;
        this.currentTestId = null;
        this.responseTimeChart = null;
        this.isConnected = false;
        this.testResults = {
            requests: 0,
            successful: 0,
            failed: 0,
            responseTimes: [],
            vulnerabilities: [],
            exploitationAttempts: []
        };
        
        this.initializeApp();
    }

    initializeApp() {
        this.initializeSocket();
        this.initializeEventListeners();
        this.initializeChart();
        this.loadProxies();
        this.loadTestHistory();
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.updateConnectionStatus(true);
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.updateConnectionStatus(false);
            console.log('Disconnected from server');
        });

        this.socket.on('testUpdate', (data) => {
            this.updateTestResults(data.results);
        });

        this.socket.on('vulnerabilityFound', (data) => {
            this.addVulnerability(data.vulnerability);
        });

        this.socket.on('exploitationAttempt', (data) => {
            this.addExploitationAttempt(data.attempt);
        });
    }

    initializeEventListeners() {
        // Load test form
        document.getElementById('loadTestForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startLoadTest();
        });

        // Stop test button
        document.getElementById('stopTestBtn').addEventListener('click', () => {
            this.stopLoadTest();
        });

        // Proxy management
        document.getElementById('addProxyBtn').addEventListener('click', () => {
            this.addProxy();
        });

        document.getElementById('refreshProxiesBtn').addEventListener('click', () => {
            this.loadProxies();
        });

        // Vulnerability scanner
        document.getElementById('scanBtn').addEventListener('click', () => {
            this.scanVulnerabilities();
        });

        // Export results
        document.getElementById('exportResultsBtn').addEventListener('click', () => {
            this.exportResults();
        });
    }

    initializeChart() {
        const ctx = document.getElementById('responseTimeChart').getContext('2d');
        this.responseTimeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                },
                animation: {
                    duration: 300
                }
            }
        });
    }

    async startLoadTest() {
        const targetUrl = document.getElementById('targetUrl').value;
        const testName = document.getElementById('testName').value;
        const concurrentUsers = parseInt(document.getElementById('concurrentUsers').value);
        const requestsPerSecond = parseInt(document.getElementById('requestsPerSecond').value);
        const duration = parseInt(document.getElementById('duration').value);
        const advancedHttpInstances = parseInt(document.getElementById('advancedHttpInstances').value);
        const exploitVulnerabilities = document.getElementById('exploitVulnerabilities').checked;

        if (!targetUrl) {
            this.showAlert('Please enter a target URL', 'danger');
            return;
        }

        const config = {
            concurrentUsers,
            requestsPerSecond,
            duration,
            advancedHttpInstances,
            exploitVulnerabilities
        };

        try {
            const response = await fetch('/api/test/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ targetUrl, config })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentTestId = result.testId;
                this.socket.emit('joinTest', result.testId);
                this.updateTestControls(true);
                this.resetTestResults();
                this.showAlert('Load test started successfully!', 'success');
            } else {
                this.showAlert('Failed to start load test: ' + result.error, 'danger');
            }
        } catch (error) {
            this.showAlert('Error starting load test: ' + error.message, 'danger');
        }
    }

    async stopLoadTest() {
        if (!this.currentTestId) return;

        try {
            const response = await fetch('/api/test/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ testId: this.currentTestId })
            });

            const result = await response.json();
            
            if (result.success) {
                this.updateTestControls(false);
                this.showAlert('Load test stopped successfully!', 'success');
            } else {
                this.showAlert('Failed to stop load test: ' + result.error, 'danger');
            }
        } catch (error) {
            this.showAlert('Error stopping load test: ' + error.message, 'danger');
        }
    }

    updateTestResults(results) {
        this.testResults = { ...this.testResults, ...results };
        
        // Update statistics
        document.getElementById('totalRequests').textContent = this.testResults.requests;
        document.getElementById('successfulRequests').textContent = this.testResults.successful;
        document.getElementById('failedRequests').textContent = this.testResults.failed;
        
        // Calculate average response time
        if (this.testResults.responseTimes.length > 0) {
            const avgTime = Math.round(
                this.testResults.responseTimes.reduce((a, b) => a + b, 0) / 
                this.testResults.responseTimes.length
            );
            document.getElementById('avgResponseTime').textContent = avgTime + 'ms';
        }

        // Update chart
        this.updateChart();

        // Show vulnerabilities if found
        if (this.testResults.vulnerabilities.length > 0) {
            this.showVulnerabilities();
        }

        // Show exploitation attempts if any
        if (this.testResults.exploitationAttempts.length > 0) {
            this.showExploitationAttempts();
        }
    }

    updateChart() {
        const responseTimes = this.testResults.responseTimes;
        const labels = responseTimes.map((_, index) => `Request ${index + 1}`);
        
        this.responseTimeChart.data.labels = labels;
        this.responseTimeChart.data.datasets[0].data = responseTimes;
        this.responseTimeChart.update('none');
    }

    addVulnerability(vulnerability) {
        this.testResults.vulnerabilities.push(vulnerability);
        this.showVulnerabilities();
        
        // Show notification
        this.showAlert(`Vulnerability found: ${vulnerability.type}`, 'warning');
    }

    addExploitationAttempt(attempt) {
        this.testResults.exploitationAttempts.push(attempt);
        this.showExploitationAttempts();
    }

    showVulnerabilities() {
        const vulnerabilitiesCard = document.getElementById('vulnerabilitiesCard');
        const vulnerabilitiesList = document.getElementById('vulnerabilitiesList');
        
        vulnerabilitiesCard.style.display = 'block';
        vulnerabilitiesList.innerHTML = '';

        this.testResults.vulnerabilities.forEach(vuln => {
            const vulnElement = document.createElement('div');
            vulnElement.className = `vulnerability-item ${vuln.severity.toLowerCase()}`;
            vulnElement.innerHTML = `
                <div class="vulnerability-severity ${vuln.severity.toLowerCase()}">${vuln.severity}</div>
                <h6>${vuln.type}</h6>
                <p><strong>Description:</strong> ${vuln.description}</p>
                <p><strong>Evidence:</strong> ${vuln.evidence}</p>
                <p><strong>Timestamp:</strong> ${new Date(vuln.timestamp).toLocaleString()}</p>
                ${vuln.cve ? `<p><strong>CVE:</strong> ${vuln.cve.join(', ')}</p>` : ''}
            `;
            vulnerabilitiesList.appendChild(vulnElement);
        });
    }

    showExploitationAttempts() {
        const exploitationCard = document.getElementById('exploitationCard');
        const exploitationList = document.getElementById('exploitationList');
        
        exploitationCard.style.display = 'block';
        exploitationList.innerHTML = '';

        this.testResults.exploitationAttempts.forEach(attempt => {
            const attemptElement = document.createElement('div');
            attemptElement.className = 'alert alert-info';
            attemptElement.innerHTML = `
                <h6><i class="fas fa-bug"></i> ${attempt.vulnerability}</h6>
                <p><strong>Success:</strong> ${attempt.success ? 'Yes' : 'No'}</p>
                <p><strong>Timestamp:</strong> ${new Date(attempt.timestamp).toLocaleString()}</p>
                ${attempt.response ? `<p><strong>Response:</strong> <code>${attempt.response}</code></p>` : ''}
            `;
            exploitationList.appendChild(attemptElement);
        });
    }

    async loadProxies() {
        try {
            const response = await fetch('/api/proxies');
            const result = await response.json();
            
            if (result.success) {
                this.updateProxyList(result.proxies);
            }
        } catch (error) {
            console.error('Error loading proxies:', error);
        }
    }

    updateProxyList(proxies) {
        const proxyList = document.getElementById('proxyList');
        const proxyCount = document.getElementById('proxyCount');
        
        proxyCount.textContent = proxies.length;
        proxyList.innerHTML = '';

        proxies.forEach(proxy => {
            const proxyElement = document.createElement('div');
            proxyElement.className = `proxy-item ${proxy.successRate > 0 ? 'working' : 'failed'}`;
            proxyElement.innerHTML = `
                <div>
                    <strong>${proxy.host}:${proxy.port}</strong>
                    <br><small>${proxy.protocol} • ${proxy.country || 'Unknown'}</small>
                </div>
                <div>
                    <span class="proxy-status ${proxy.successRate > 0 ? 'working' : 'failed'}">
                        ${proxy.successRate > 0 ? 'Working' : 'Failed'}
                    </span>
                </div>
            `;
            proxyList.appendChild(proxyElement);
        });
    }

    async addProxy() {
        const proxyInput = document.getElementById('proxyInput');
        const proxyString = proxyInput.value.trim();
        
        if (!proxyString) {
            this.showAlert('Please enter a proxy string', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/proxies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ proxy: proxyString })
            });

            const result = await response.json();
            
            if (result.success) {
                proxyInput.value = '';
                this.loadProxies();
                this.showAlert('Proxy added successfully!', 'success');
            } else {
                this.showAlert('Failed to add proxy: ' + result.error, 'danger');
            }
        } catch (error) {
            this.showAlert('Error adding proxy: ' + error.message, 'danger');
        }
    }

    async scanVulnerabilities() {
        const scanUrl = document.getElementById('scanUrl').value;
        const vulnerabilityResults = document.getElementById('vulnerabilityResults');
        
        if (!scanUrl) {
            this.showAlert('Please enter a URL to scan', 'warning');
            return;
        }

        vulnerabilityResults.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Scanning for vulnerabilities...</p></div>';

        try {
            const response = await fetch('/api/test/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetUrl: scanUrl,
                    config: {
                        concurrentUsers: 1,
                        requestsPerSecond: 1,
                        duration: 30,
                        advancedHttpInstances: 1,
                        exploitVulnerabilities: true
                    }
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Monitor the scan results
                this.monitorScanResults(result.testId, vulnerabilityResults);
            } else {
                vulnerabilityResults.innerHTML = '<div class="alert alert-danger">Failed to start scan: ' + result.error + '</div>';
            }
        } catch (error) {
            vulnerabilityResults.innerHTML = '<div class="alert alert-danger">Error starting scan: ' + error.message + '</div>';
        }
    }

    async monitorScanResults(testId, resultsElement) {
        const checkInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/test/${testId}`);
                const result = await response.json();
                
                if (result.success) {
                    const test = result.test;
                    
                    if (test.status === 'completed') {
                        clearInterval(checkInterval);
                        this.displayScanResults(test.results, resultsElement);
                    }
                }
            } catch (error) {
                console.error('Error monitoring scan:', error);
            }
        }, 2000);
    }

    displayScanResults(results, resultsElement) {
        if (results.vulnerabilities && results.vulnerabilities.length > 0) {
            let html = '<h6>Vulnerabilities Found:</h6>';
            results.vulnerabilities.forEach(vuln => {
                html += `
                    <div class="vulnerability-item ${vuln.severity.toLowerCase()}">
                        <div class="vulnerability-severity ${vuln.severity.toLowerCase()}">${vuln.severity}</div>
                        <h6>${vuln.type}</h6>
                        <p><strong>Description:</strong> ${vuln.description}</p>
                        <p><strong>Evidence:</strong> ${vuln.evidence}</p>
                        ${vuln.cve ? `<p><strong>CVE:</strong> ${vuln.cve.join(', ')}</p>` : ''}
                    </div>
                `;
            });
            resultsElement.innerHTML = html;
        } else {
            resultsElement.innerHTML = '<div class="alert alert-success">No vulnerabilities found!</div>';
        }
    }

    async loadTestHistory() {
        try {
            const response = await fetch('/api/tests');
            const result = await response.json();
            
            if (result.success) {
                this.updateTestHistory(result.tests);
            }
        } catch (error) {
            console.error('Error loading test history:', error);
        }
    }

    updateTestHistory(tests) {
        const testHistory = document.getElementById('testHistory');
        testHistory.innerHTML = '';

        tests.slice(0, 10).forEach(test => {
            const testElement = document.createElement('div');
            testElement.className = `test-history-item ${test.status}`;
            testElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${test.targetUrl}</strong>
                        <br><small>${new Date(test.createdAt).toLocaleString()}</small>
                    </div>
                    <div>
                        <span class="badge bg-${this.getStatusColor(test.status)}">${test.status}</span>
                    </div>
                </div>
            `;
            
            testElement.addEventListener('click', () => {
                this.showTestDetails(test);
            });
            
            testHistory.appendChild(testElement);
        });
    }

    getStatusColor(status) {
        switch (status) {
            case 'running': return 'primary';
            case 'completed': return 'success';
            case 'failed': return 'danger';
            case 'stopped': return 'secondary';
            default: return 'secondary';
        }
    }

    async showTestDetails(test) {
        const modalBody = document.getElementById('modalBody');
        
        let html = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Test Information</h6>
                    <p><strong>Target URL:</strong> ${test.targetUrl}</p>
                    <p><strong>Status:</strong> ${test.status}</p>
                    <p><strong>Start Time:</strong> ${new Date(test.startTime).toLocaleString()}</p>
                    <p><strong>End Time:</strong> ${test.endTime ? new Date(test.endTime).toLocaleString() : 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <h6>Test Results</h6>
                    <p><strong>Total Requests:</strong> ${test.results?.requests || 0}</p>
                    <p><strong>Successful:</strong> ${test.results?.successful || 0}</p>
                    <p><strong>Failed:</strong> ${test.results?.failed || 0}</p>
                    <p><strong>Vulnerabilities:</strong> ${test.results?.vulnerabilities?.length || 0}</p>
                </div>
            </div>
        `;

        if (test.results?.vulnerabilities?.length > 0) {
            html += '<h6 class="mt-3">Vulnerabilities Found</h6>';
            test.results.vulnerabilities.forEach(vuln => {
                html += `
                    <div class="vulnerability-item ${vuln.severity.toLowerCase()}">
                        <div class="vulnerability-severity ${vuln.severity.toLowerCase()}">${vuln.severity}</div>
                        <h6>${vuln.type}</h6>
                        <p><strong>Description:</strong> ${vuln.description}</p>
                        <p><strong>Evidence:</strong> ${vuln.evidence}</p>
                    </div>
                `;
            });
        }

        modalBody.innerHTML = html;
        
        const modal = new bootstrap.Modal(document.getElementById('resultsModal'));
        modal.show();
    }

    async exportResults() {
        if (!this.currentTestId) {
            this.showAlert('No test results to export', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/test/${this.currentTestId}`);
            const result = await response.json();
            
            if (result.success) {
                const test = result.test;
                const dataStr = JSON.stringify(test, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `load-test-results-${test.id}.json`;
                link.click();
                
                this.showAlert('Results exported successfully!', 'success');
            }
        } catch (error) {
            this.showAlert('Error exporting results: ' + error.message, 'danger');
        }
    }

    updateTestControls(isRunning) {
        const startBtn = document.getElementById('startTestBtn');
        const stopBtn = document.getElementById('stopTestBtn');
        const form = document.getElementById('loadTestForm');
        
        if (isRunning) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            form.querySelectorAll('input, select').forEach(input => input.disabled = true);
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            form.querySelectorAll('input, select').forEach(input => input.disabled = false);
        }
    }

    resetTestResults() {
        this.testResults = {
            requests: 0,
            successful: 0,
            failed: 0,
            responseTimes: [],
            vulnerabilities: [],
            exploitationAttempts: []
        };
        
        document.getElementById('totalRequests').textContent = '0';
        document.getElementById('successfulRequests').textContent = '0';
        document.getElementById('failedRequests').textContent = '0';
        document.getElementById('avgResponseTime').textContent = '0ms';
        
        this.responseTimeChart.data.labels = [];
        this.responseTimeChart.data.datasets[0].data = [];
        this.responseTimeChart.update();
        
        document.getElementById('vulnerabilitiesCard').style.display = 'none';
        document.getElementById('exploitationCard').style.display = 'none';
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const icon = statusElement.querySelector('.fas');
        
        if (connected) {
            icon.className = 'fas fa-circle text-success';
            statusElement.innerHTML = icon.outerHTML + ' Connected';
        } else {
            icon.className = 'fas fa-circle text-danger';
            statusElement.innerHTML = icon.outerHTML + ' Disconnected';
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LoadTestingApp();
});
