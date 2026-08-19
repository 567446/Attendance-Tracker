
class AttendanceTracker {
    constructor() {
        this.subjects = JSON.parse(localStorage.getItem('subjects')) || [];
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.applyRolePermissions();
        this.loadTheme();
        this.updateCurrentDate();
        this.renderSubjects();
        this.updateDashboard();
        this.generateInsights();
        this.initializeChart();
    }

    // Event Listeners
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Add subject modal
        document.getElementById('addSubjectBtn').addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('fab').addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // Subject form submission
        document.getElementById('subjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSubject();
        });

        // Calculator
        document.getElementById('calculateBtn').addEventListener('click', () => {
            this.calculateAttendance();
        });

        // Modal backdrop click
        document.getElementById('subjectModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });

        // Analytics filter
        document.getElementById('analyticsFilter').addEventListener('change', (e) => {
            this.updateAnalytics(e.target.value);
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // Role-based permissions: students can view only; teachers can manage/mark attendance.
    applyRolePermissions() {
        const role = localStorage.getItem('attendanceRole');
        const loggedIn = localStorage.getItem('attendanceLoggedIn') === 'true';
        if (!loggedIn || !role) {
            document.body.classList.remove('authenticated', 'student-mode', 'teacher-mode');
            return;
        }
        document.body.classList.add('authenticated');
        document.body.classList.toggle('student-mode', role === 'student');
        document.body.classList.toggle('teacher-mode', role === 'teacher');
        const addBtn = document.getElementById('addSubjectBtn');
        const fab = document.getElementById('fab');
        if (role === 'student') {
            if (addBtn) addBtn.style.display = 'none';
            if (fab) fab.style.display = 'none';
        } else {
            if (addBtn) addBtn.style.display = '';
            if (fab) fab.style.display = '';
        }
    }

    // Theme Management
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.loadTheme();
        localStorage.setItem('theme', this.theme);
    }

    loadTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = this.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Date Management
    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = 
            now.toLocaleDateString('en-US', options);
    }

    // Modal Management
    openModal() {
        document.getElementById('subjectModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        // Focus on first input for accessibility
        setTimeout(() => {
            document.getElementById('subjectName').focus();
        }, 100);
    }

    closeModal() {
        document.getElementById('subjectModal').classList.remove('active');
        document.body.style.overflow = 'auto';
        this.resetForm();
    }

    resetForm() {
        document.getElementById('subjectForm').reset();
        document.getElementById('subjectColor').value = '#667eea';
    }

    // Subject Management
    addSubject() {
        if (localStorage.getItem('attendanceRole') !== 'teacher') { this.showNotification('Only teachers can add subjects.', 'error'); return; }
        const subject = {
            id: Date.now(),
            name: document.getElementById('subjectName').value.trim(),
            code: document.getElementById('subjectCode').value.trim().toUpperCase(),
            totalClasses: parseInt(document.getElementById('totalSemesterClasses').value),
            attendedClasses: 0,
            color: document.getElementById('subjectColor').value,
            createdAt: new Date().toISOString(),
            attendanceHistory: []
        };

        if (this.validateSubject(subject)) {
            this.subjects.push(subject);
            this.saveData();
            this.renderSubjects();
            this.updateDashboard();
            this.generateInsights();
            this.drawAttendanceChart();
            this.closeModal();
            this.showNotification('Subject added successfully!', 'success');
        }
    }

    validateSubject(subject) {
        if (!subject.name || !subject.code || !subject.totalClasses) {
            this.showNotification('Please fill in all required fields', 'error');
            return false;
        }

        if (subject.totalClasses <= 0) {
            this.showNotification('Total classes must be greater than 0', 'error');
            return false;
        }

        if (this.subjects.find(s => s.code === subject.code)) {
            this.showNotification('Subject code already exists', 'error');
            return false;
        }

        return true;
    }

    deleteSubject(id) {
        if (localStorage.getItem('attendanceRole') !== 'teacher') { this.showNotification('Only teachers can delete subjects.', 'error'); return; }
        if (confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
            this.subjects = this.subjects.filter(s => s.id !== id);
            this.saveData();
            this.renderSubjects();
            this.updateDashboard();
            this.generateInsights();
            this.drawAttendanceChart();
            this.showNotification('Subject deleted successfully!', 'success');
        }
    }

    markAttendance(id, type) {
        if (localStorage.getItem('attendanceRole') !== 'teacher') { this.showNotification('Students can only view attendance.', 'error'); return; }
        const subject = this.subjects.find(s => s.id === id);
        if (!subject) return;

        const now = new Date();
        const attendanceRecord = {
            date: now.toISOString().split('T')[0],
            type: type,
            timestamp: now.toISOString()
        };

        if (type === 'present' && subject.attendedClasses < subject.totalClasses) {
            subject.attendedClasses++;
            subject.attendanceHistory.push(attendanceRecord);
            this.showNotification(`Marked present for ${subject.name}`, 'success');
        } else if (type === 'absent' && subject.attendedClasses > 0) {
            subject.attendedClasses--;
            // Remove the last present record
            const lastPresentIndex = subject.attendanceHistory.findLastIndex(record => record.type === 'present');
            if (lastPresentIndex !== -1) {
                subject.attendanceHistory.splice(lastPresentIndex, 1);
            }
            this.showNotification(`Marked absent for ${subject.name}`, 'info');
        } else if (type === 'present' && subject.attendedClasses >= subject.totalClasses) {
            this.showNotification('Cannot exceed total classes limit', 'error');
            return;
        } else if (type === 'absent' && subject.attendedClasses <= 0) {
            this.showNotification('Attended classes cannot be negative', 'error');
            return;
        }
        
        this.saveData();
        this.renderSubjects();
        this.updateDashboard();
        this.generateInsights();
        this.drawAttendanceChart();
    }

    // Rendering Methods
    renderSubjects() {
        const container = document.getElementById('subjectsGrid');
        
        if (this.subjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <h3>No Subjects Added</h3>
                    <p>Click the "Add Subject" button to get started with tracking your attendance</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.subjects.map(subject => {
            const percentage = subject.totalClasses > 0 ? 
                ((subject.attendedClasses / subject.totalClasses) * 100).toFixed(1) : 0;
            const remainingClasses = subject.totalClasses - subject.attendedClasses;
            const status = percentage >= 75 ? 'success' : percentage >= 60 ? 'warning' : 'danger';
            
            return `
                <div class="subject-card" style="border-left-color: ${subject.color}">
                    <div class="subject-header">
                        <div class="subject-info">
                            <h4>${subject.name}</h4>
                            <div class="subject-code">${subject.code}</div>
                        </div>
                        <div class="subject-actions">
                            <button class="btn-icon delete-subject-btn teacher-only" onclick="app.deleteSubject(${subject.id})" title="Delete Subject">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="subject-stats">
                        <div class="subject-stat">
                            <div class="value">${subject.attendedClasses}</div>
                            <div class="label">Present</div>
                        </div>
                        <div class="subject-stat">
                            <div class="value">${remainingClasses}</div>
                            <div class="label">Remaining</div>
                        </div>
                    </div>
                    
                    <div class="attendance-progress">
                        <div class="progress-info">
                            <span>Attendance Progress</span>
                            <span class="progress-percentage ${status}">${percentage}%</span>
                        </div>
                        <div class="stat-progress">
                            <div class="progress-bar" style="width: ${percentage}%; background: ${subject.color}"></div>
                        </div>
                    </div>
                    
                    <div class="attendance-actions teacher-only">
                        <button class="btn-small btn-present" onclick="app.markAttendance(${subject.id}, 'present')" 
                                ${subject.attendedClasses >= subject.totalClasses ? 'disabled' : ''}>
                            <i class="fas fa-check"></i> Present
                        </button>
                        <button class="btn-small btn-absent" onclick="app.markAttendance(${subject.id}, 'absent')"
                                ${subject.attendedClasses <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-times"></i> Absent
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Dashboard Updates
    updateDashboard() {
        if (this.subjects.length === 0) {
            document.getElementById('overallPercentage').textContent = '0%';
            document.getElementById('totalPresent').textContent = '0';
            document.getElementById('totalAbsent').textContent = '0';
            document.getElementById('remainingClasses').textContent = '0';
            document.getElementById('overallProgress').style.width = '0%';
            return;
        }

        const totalClasses = this.subjects.reduce((sum, s) => sum + s.totalClasses, 0);
        const totalAttended = this.subjects.reduce((sum, s) => sum + s.attendedClasses, 0);
        const totalAbsent = totalClasses - totalAttended;
        const overallPercentage = totalClasses > 0 ? ((totalAttended / totalClasses) * 100).toFixed(1) : 0;

        document.getElementById('overallPercentage').textContent = `${overallPercentage}%`;
        document.getElementById('totalPresent').textContent = totalAttended;
        document.getElementById('totalAbsent').textContent = totalAbsent;
        document.getElementById('remainingClasses').textContent = totalClasses - totalAttended;

        // Update progress bar
        const progressBar = document.getElementById('overallProgress');
        progressBar.style.width = `${overallPercentage}%`;
        
        // Change color based on percentage
        if (overallPercentage >= 75) {
            progressBar.style.background = 'var(--success-color)';
        } else if (overallPercentage >= 60) {
            progressBar.style.background = 'var(--warning-color)';
        } else {
            progressBar.style.background = 'var(--danger-color)';
        }
        this.drawAttendanceChart();
    }

    // Attendance Calculator
    calculateAttendance() {
        const totalClasses = parseInt(document.getElementById('totalClasses').value) || 0;
        const attendedClasses = parseInt(document.getElementById('attendedClasses').value) || 0;
        const requiredPercentage = parseInt(document.getElementById('requiredPercentage').value) || 75;

        if (totalClasses === 0) {
            this.showNotification('Please enter total classes', 'error');
            return;
        }

        if (attendedClasses > totalClasses) {
            this.showNotification('Attended classes cannot exceed total classes', 'error');
            return;
        }

        if (attendedClasses < 0 || totalClasses < 0) {
            this.showNotification('Values cannot be negative', 'error');
            return;
        }

        const currentPercentage = ((attendedClasses / totalClasses) * 100).toFixed(1);
        const requiredClasses = Math.ceil((requiredPercentage * totalClasses) / 100);
        const classesNeeded = Math.max(0, requiredClasses - attendedClasses);
        const maxAbsentClasses = Math.floor((totalClasses * (100 - requiredPercentage)) / 100);
        const currentAbsent = totalClasses - attendedClasses;
        const canMiss = Math.max(0, maxAbsentClasses - currentAbsent);

        let resultHTML = '<div class="calculation-result">';
        
        // Current status
        let statusClass = currentPercentage >= requiredPercentage ? 'success' : 
                         currentPercentage >= (requiredPercentage - 10) ? 'warning' : 'danger';
        
        resultHTML += `
            <div class="result-item ${statusClass}">
                <div class="result-label">Current Attendance</div>
                <div class="result-value">${currentPercentage}%</div>
            </div>
        `;

        // Classes needed or target achieved
        if (classesNeeded > 0) {
            resultHTML += `
                <div class="result-item warning">
                    <div class="result-label">Classes Needed to Reach ${requiredPercentage}%</div>
                    <div class="result-value">${classesNeeded} classes</div>
                </div>
            `;
        } else {
            resultHTML += `
                <div class="result-item success">
                    <div class="result-label">Target Achieved!</div>
                    <div class="result-value">✓ ${requiredPercentage}% reached</div>
                </div>
            `;
        }

        // Classes can miss
        resultHTML += `
            <div class="result-item ${canMiss > 0 ? 'success' : 'danger'}">
                <div class="result-label">Classes You Can Miss</div>
                <div class="result-value">${canMiss} classes</div>
            </div>
        `;

        // Additional insights
        if (currentPercentage < requiredPercentage) {
            const classesToAttend = Math.ceil((requiredPercentage - currentPercentage) * totalClasses / 100);
            resultHTML += `
                <div class="result-item info">
                    <div class="result-label">Minimum Classes to Attend Continuously</div>
                    <div class="result-value">${classesToAttend} classes</div>
                </div>
            `;
        }

        // Future predictions
        if (totalClasses > 0) {
            const futureClasses = [5, 10, 15];
            futureClasses.forEach(future => {
                const futureAttended = attendedClasses + future;
                const futureTotal = totalClasses + future;
                const futurePercentage = ((futureAttended / futureTotal) * 100).toFixed(1);
                
                resultHTML += `
                    <div class="result-item info">
                        <div class="result-label">If you attend next ${future} classes</div>
                        <div class="result-value">${futurePercentage}%</div>
                    </div>
                `;
            });
        }

        resultHTML += '</div>';

        document.getElementById('calculationResults').innerHTML = resultHTML;
    }

    // Analytics and Insights
    generateInsights() {
        const insights = [];
        
        if (this.subjects.length === 0) {
            insights.push({
                text: "Start by adding subjects to track your attendance effectively.",
                type: "info"
            });
        } else {
            const totalClasses = this.subjects.reduce((sum, s) => sum + s.totalClasses, 0);
            const totalAttended = this.subjects.reduce((sum, s) => sum + s.attendedClasses, 0);
            const overallPercentage = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;

            // Overall performance insight
            if (overallPercentage >= 90) {
                insights.push({
                    text: "Excellent! Your attendance is outstanding. Keep up the great work!",
                    type: "success"
                });
            } else if (overallPercentage >= 75) {
                insights.push({
                    text: "Good job! Your attendance meets the minimum requirement.",
                    type: "success"
                });
            } else if (overallPercentage >= 60) {
                insights.push({
                    text: "Warning: Your attendance is below 75%. Consider attending more classes.",
                    type: "warning"
                });
            } else {
                insights.push({
                    text: "Critical: Your attendance is very low. Immediate action required!",
                    type: "danger"
                });
            }

            // Subject-specific insights
            if (this.subjects.length > 1) {
                const lowestSubject = this.subjects.reduce((min, subject) => {
                    const percentage = (subject.attendedClasses / subject.totalClasses) * 100;
                    const minPercentage = (min.attendedClasses / min.totalClasses) * 100;
                    return percentage < minPercentage ? subject : min;
                });

                const highestSubject = this.subjects.reduce((max, subject) => {
                    const percentage = (subject.attendedClasses / subject.totalClasses) * 100;
                    const maxPercentage = (max.attendedClasses / max.totalClasses) * 100;
                    return percentage > maxPercentage ? subject : max;
                });

                const lowestPercentage = ((lowestSubject.attendedClasses / lowestSubject.totalClasses) * 100).toFixed(1);
                const highestPercentage = ((highestSubject.attendedClasses / highestSubject.totalClasses) * 100).toFixed(1);

                if (lowestSubject.id !== highestSubject.id) {
                    insights.push({
                        text: `${lowestSubject.name} has the lowest attendance at ${lowestPercentage}%. Focus on this subject.`,
                        type: "warning"
                    });

                    insights.push({
                        text: `${highestSubject.name} has the highest attendance at ${highestPercentage}%. Great performance!`,
                        type: "success"
                    });
                }
            }

            // Risk assessment
            const atRiskSubjects = this.subjects.filter(s => {
                const percentage = (s.attendedClasses / s.totalClasses) * 100;
                return percentage < 75;
            });

            if (atRiskSubjects.length > 0) {
                insights.push({
                    text: `${atRiskSubjects.length} subject(s) are below 75% attendance. Prioritize attendance for these subjects.`,
                    type: "warning"
                });
            }

            // Motivational insight
            const totalPossibleClasses = this.subjects.reduce((sum, s) => sum + s.totalClasses, 0);
            const attendanceRate = totalPossibleClasses > 0 ? (totalAttended / totalPossibleClasses) * 100 : 0;
            
            if (attendanceRate > 80) {
                insights.push({
                    text: "You're maintaining excellent attendance habits. This discipline will serve you well!",
                    type: "success"
                });
            }
        }

        this.renderInsights(insights);
    }

    renderInsights(insights) {
        const container = document.getElementById('insightsList');
        if (insights.length === 0) {
            container.innerHTML = `
                <div class="insight-item">
                    <div class="insight-text">No insights available yet. Add subjects and track attendance to see personalized insights.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-text">${insight.text}</div>
            </div>
        `).join('');
    }

    // Attendance Analytics Chart
    initializeChart() {
        this.drawAttendanceChart();
    }

    drawAttendanceChart() {
        const canvas = document.getElementById('attendanceChart');
        if (!canvas) return;

        const container = canvas.parentElement;
        const width = Math.max(320, container.clientWidth - 32);
        const height = 300;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const styles = getComputedStyle(document.documentElement);
        const textColor = styles.getPropertyValue('--text-secondary').trim() || '#4a5568';
        const mutedColor = styles.getPropertyValue('--text-muted').trim() || '#718096';
        const primaryColor = styles.getPropertyValue('--primary-color').trim() || '#667eea';
        const successColor = styles.getPropertyValue('--success-color').trim() || '#48bb78';
        const dangerColor = styles.getPropertyValue('--danger-color').trim() || '#f56565';
        const borderColor = styles.getPropertyValue('--border-color').trim() || '#e2e8f0';

        const subjects = this.subjects || [];
        const padding = { top: 24, right: 18, bottom: 62, left: 46 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        // Empty state
        if (subjects.length === 0) {
            ctx.fillStyle = mutedColor;
            ctx.font = '600 15px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Add subjects to view attendance analytics', width / 2, height / 2 - 8);
            ctx.font = '13px Inter, sans-serif';
            ctx.fillText('Your subject-wise graph will appear here', width / 2, height / 2 + 18);
            return;
        }

        // Grid and 75% requirement line
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        for (let value = 0; value <= 100; value += 25) {
            const y = padding.top + chartH - (value / 100) * chartH;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.fillStyle = mutedColor;
            ctx.fillText(`${value}%`, padding.left - 8, y + 4);
        }

        const targetY = padding.top + chartH - 0.75 * chartH;
        ctx.strokeStyle = successColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, targetY);
        ctx.lineTo(width - padding.right, targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = successColor;
        ctx.textAlign = 'left';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillText('75% target', width - padding.right - 58, targetY - 7);

        // Bars
        const gap = Math.min(28, chartW / (subjects.length * 3));
        const barWidth = Math.max(24, Math.min(70, (chartW - gap * (subjects.length + 1)) / subjects.length));
        const totalBarsWidth = subjects.length * barWidth + (subjects.length + 1) * gap;
        const startX = padding.left + Math.max(0, (chartW - totalBarsWidth) / 2);

        subjects.forEach((subject, index) => {
            const percentage = subject.totalClasses > 0
                ? (subject.attendedClasses / subject.totalClasses) * 100
                : 0;
            const clamped = Math.max(0, Math.min(100, percentage));
            const barH = (clamped / 100) * chartH;
            const x = startX + gap + index * (barWidth + gap);
            const y = padding.top + chartH - barH;
            const barColor = clamped >= 75 ? (subject.color || successColor) : dangerColor;

            ctx.fillStyle = barColor;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, Math.max(4, barH), 7);
            ctx.fill();

            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.fillText(`${clamped.toFixed(0)}%`, x + barWidth / 2, Math.max(14, y - 8));

            ctx.fillStyle = mutedColor;
            ctx.font = '600 11px Inter, sans-serif';
            const label = subject.code || subject.name;
            const shortLabel = label.length > 10 ? `${label.slice(0, 9)}…` : label;
            ctx.fillText(shortLabel, x + barWidth / 2, padding.top + chartH + 22);
        });

        ctx.fillStyle = mutedColor;
        ctx.textAlign = 'left';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText('Subject-wise attendance', padding.left, height - 10);
    }

    updateAnalytics(filter) {
        this.drawAttendanceChart();
        this.generateInsights();
    }

    // Utility Methods
    saveData() {
        try {
            localStorage.setItem('subjects', JSON.stringify(this.subjects));
        } catch (error) {
            console.error('Failed to save data:', error);
            this.showNotification('Failed to save data. Please try again.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');

        document.body.appendChild(notification);

        // Show notification with animation
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);

        // Auto-hide notification
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    // Export data functionality
    exportData() {
        const data = {
            subjects: this.subjects,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendanceTracker_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Data exported successfully!', 'success');
    }

    // Import data functionality
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.subjects && Array.isArray(data.subjects)) {
                    this.subjects = data.subjects;
                    this.saveData();
                    this.renderSubjects();
                    this.updateDashboard();
                    this.generateInsights();
                    this.showNotification('Data imported successfully!', 'success');
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showNotification('Failed to import data. Invalid file format.', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AttendanceTracker();

    // Add sample data for demonstration if no data exists
    if (app.subjects.length === 0) {
        const sampleSubjects = [
            {
                id: 1,
                name: "Mathematics",
                code: "MATH101",
                totalClasses: 50,
                attendedClasses: 38,
                color: "#667eea",
                createdAt: new Date().toISOString(),
                attendanceHistory: []
            },
            {
                id: 2,
                name: "Physics",
                code: "PHY101",
                totalClasses: 45,
                attendedClasses: 35,
                color: "#f093fb",
                createdAt: new Date().toISOString(),
                attendanceHistory: []
            }
        ];
        
        // Uncomment the following lines to add sample data
        // app.subjects = sampleSubjects;
        // app.saveData();
        // app.renderSubjects();
        // app.updateDashboard();
        // app.generateInsights();
    }
});

// Service Worker Registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Handle online/offline status
window.addEventListener('online', () => {
    app.showNotification('You are back online!', 'success');
});

window.addEventListener('offline', () => {
    app.showNotification('You are now offline. Data will be saved locally.', 'info');
});
