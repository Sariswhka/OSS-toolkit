// EMS Integration Toolkit - Main Application Logic

// ==========================================
// USAGE TRACKER
// ==========================================
const UsageTracker = {
    _stats: {},
    _uid: null,
    _unsubscribe: null,

    init(uid) {
        this._uid = uid;
        const ref = db.collection('users').doc(uid).collection('stats').doc('counts');
        this._unsubscribe = ref.onSnapshot(snap => {
            this._stats = snap.exists ? snap.data() : {};
            this._updateBadges();
        });
    },

    stop() {
        if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null; }
        this._uid = null;
        this._stats = {};
        this._clearBadges();
    },

    async increment(toolKey) {
        if (!this._uid) return;
        const today = new Date().toISOString().slice(0, 10);
        const current = this._stats[toolKey] || { total: 0, todayCount: 0, lastDate: '' };
        const todayCount = current.lastDate === today ? current.todayCount + 1 : 1;
        const update = { [toolKey]: { total: (current.total || 0) + 1, todayCount, lastDate: today } };
        try {
            await db.collection('users').doc(this._uid).collection('stats').doc('counts')
                .set(update, { merge: true });
        } catch (e) {
            console.warn('UsageTracker: failed to increment', toolKey, e);
        }
    },

    _updateBadges() {
        const today = new Date().toISOString().slice(0, 10);
        document.querySelectorAll('.usage-badge[data-tool]').forEach(badge => {
            const key = badge.dataset.tool;
            const s = this._stats[key];
            if (!s || s.total === 0) { badge.textContent = ''; return; }
            const todayCount = s.lastDate === today ? s.todayCount : 0;
            badge.textContent = todayCount > 0
                ? `${todayCount} today · ${s.total} total`
                : `${s.total} total`;
        });
    },

    _clearBadges() {
        document.querySelectorAll('.usage-badge').forEach(b => b.textContent = '');
    }
};

// ==========================================
// BUTTON LOADER UTILITY
// ==========================================
function withLoader(btn, fn) {
    if (btn._loading) return;
    btn._loading = true;
    const origHtml = btn.innerHTML;
    btn.style.minWidth = btn.offsetWidth + 'px';
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>Processing…';
    // setTimeout defers fn() to next macrotask so browser paints the loading state first
    setTimeout(() => {
        try { fn(); }
        finally {
            btn._loading = false;
            btn.disabled = false;
            btn.innerHTML = origHtml;
            btn.style.minWidth = '';
        }
    }, 30);
}

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================
const ToastManager = {
    container: null,

    init() {
        this.container = document.getElementById('toastContainer');
    },

    show(type, title, message, duration = 5000) {
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        this.container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    success(title, message) { return this.show('success', title, message); },
    error(title, message) { return this.show('error', title, message, 8000); },
    warning(title, message) { return this.show('warning', title, message, 6000); },
    info(title, message) { return this.show('info', title, message); }
};

// ==========================================
// VALIDATION UTILITIES
// ==========================================
const Validator = {
    setError(inputId, message) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.classList.add('input-error');
        input.classList.remove('input-success');

        // Remove existing error message
        const existing = input.parentElement.querySelector('.error-text');
        if (existing) existing.remove();

        // Add error message
        const errorEl = document.createElement('div');
        errorEl.className = 'error-text';
        errorEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>${message}`;
        input.parentElement.appendChild(errorEl);
    },

    clearError(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.classList.remove('input-error');
        const existing = input.parentElement.querySelector('.error-text');
        if (existing) existing.remove();
    },

    setSuccess(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.classList.remove('input-error');
        input.classList.add('input-success');

        const existing = input.parentElement.querySelector('.error-text');
        if (existing) existing.remove();
    },

    isEmpty(value) {
        return !value || value.trim() === '';
    },

    isValidOid(oid) {
        return /^[0-9]+(\.[0-9]+)*$/.test(oid);
    },

    isValidJson(str) {
        try {
            JSON.parse(str);
            return { valid: true };
        } catch (e) {
            return { valid: false, error: e.message, position: this.getJsonErrorPosition(e.message) };
        }
    },

    getJsonErrorPosition(errorMsg) {
        const match = errorMsg.match(/position\s+(\d+)/i);
        return match ? parseInt(match[1]) : null;
    },

    isValidXml(str) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(str, 'text/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            return { valid: false, error: parseError.textContent };
        }
        return { valid: true, doc };
    }
};

// ==========================================
// CLIPBOARD UTILITY
// ==========================================
async function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (!text || text.trim() === '') {
        ToastManager.warning('Nothing to Copy', 'The output is empty.');
        return false;
    }

    try {
        await navigator.clipboard.writeText(text);
        ToastManager.success('Copied!', successMsg);
        return true;
    } catch (err) {
        // Fallback for older browsers
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            ToastManager.success('Copied!', successMsg);
            return true;
        } catch (fallbackErr) {
            ToastManager.error('Copy Failed', 'Please select the text and copy manually (Ctrl+C).');
            return false;
        }
    }
}

// ==========================================
// LOCAL STORAGE UTILITY
// ==========================================
const Storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            ToastManager.error('Storage Error', 'Could not read from browser storage.');
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                ToastManager.error('Storage Full', 'Browser storage is full. Please export and clear some data.');
            } else {
                ToastManager.error('Storage Error', 'Could not save to browser storage.');
            }
            return false;
        }
    }
};

// ==========================================
// Initialize Toast Manager
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    ToastManager.init();
});

// ==========================================
// Tool Navigation
// ==========================================
document.querySelectorAll('.tool-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tool + 'Panel').classList.add('active');
    });
});

// ==========================================
// TL1 PARSER/BUILDER
// ==========================================
let currentTl1Format = 'json';
let lastParsedTl1Data = null;

// Mode switching
document.querySelectorAll('#tl1Panel .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#tl1Panel .mode-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#tl1Panel .mode-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tl1' + btn.dataset.mode.charAt(0).toUpperCase() + btn.dataset.mode.slice(1) + 'Mode').classList.add('active');
    });
});

// Output format switching
document.querySelectorAll('#tl1ParseMode .format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#tl1ParseMode .format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTl1Format = btn.dataset.format;
        if (lastParsedTl1Data) {
            renderTl1Output(lastParsedTl1Data);
        }
    });
});

// Parse TL1 Response
document.getElementById('tl1ParseBtn').addEventListener('click', function() {
    const input = document.getElementById('tl1Input').value.trim();

    if (Validator.isEmpty(input)) {
        Validator.setError('tl1Input', 'Please enter a TL1 response to parse');
        ToastManager.warning('Empty Input', 'Please paste a TL1 response to parse.');
        return;
    }

    Validator.clearError('tl1Input');
    withLoader(this, () => {
        UsageTracker.increment('tl1');
        try {
            const parsed = parseTl1Response(input);
            if (!parsed.header.tid && !parsed.status && parsed.data.length === 0) {
                ToastManager.warning('Parse Warning', 'Could not identify TL1 structure. Check the format.');
                showTl1FormatHint();
            } else if (parsed.data.length === 0) {
                ToastManager.info('No Data Rows', 'Header parsed but no data rows found in response.');
            } else {
                ToastManager.success('Parsed Successfully', `Found ${parsed.data.length} data row(s).`);
            }
            lastParsedTl1Data = parsed;
            renderTl1Output(parsed);
        } catch (err) {
            ToastManager.error('Parse Error', err.message);
            showTl1FormatHint();
        }
    });
});

function showTl1FormatHint() {
    const output = document.getElementById('tl1Output');
    output.innerHTML = `
        <div class="error-hint">
            <div class="error-hint-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Expected TL1 Format
            </div>
            <div class="error-hint-content">
                <p>TL1 response should follow this structure:</p>
                <code>TID DATE TIME</code><br>
                <code>M  CTAG COMPLD</code><br>
                <code>   "AID::PARAM=VALUE,PARAM=VALUE:STATE"</code><br>
                <code>;</code><br><br>
                <p>Click "Load Sample" to see an example.</p>
            </div>
        </div>
    `;
}

function parseTl1Response(response) {
    const lines = response.split('\n');
    const result = {
        header: {},
        status: '',
        ctag: '',
        data: []
    };

    // Parse header (first line typically: TID DATE TIME)
    const headerLine = lines[0].trim();
    const headerMatch = headerLine.match(/^(\S+)\s+(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
    if (headerMatch) {
        result.header = {
            tid: headerMatch[1],
            date: headerMatch[2],
            time: headerMatch[3]
        };
    }

    // Find response code line (M/A/R followed by CTAG and status)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const statusMatch = line.match(/^([MAR])\s+(\d+)\s+(\w+)/);
        if (statusMatch) {
            result.responseType = statusMatch[1];
            result.ctag = statusMatch[2];
            result.status = statusMatch[3];
            break;
        }
    }

    // Parse data blocks (lines starting with ")
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            const dataLine = trimmed.slice(1, -1);
            const parsed = parseTl1DataLine(dataLine);
            if (parsed) {
                result.data.push(parsed);
            }
        }
    }

    return result;
}

function parseTl1DataLine(line) {
    const parts = line.split(':');
    if (parts.length < 1) return null;

    const result = {
        aid: parts[0] || '',
        params: {},
        state: ''
    };

    if (parts.length >= 3) {
        const paramStr = parts[2];
        if (paramStr) {
            const paramPairs = paramStr.split(',');
            for (const pair of paramPairs) {
                const [key, value] = pair.split('=');
                if (key && value !== undefined) {
                    result.params[key.trim()] = value.trim();
                }
            }
        }
    }

    if (parts.length >= 4) {
        result.state = parts[3];
    }

    return result;
}

function renderTl1Output(data) {
    const output = document.getElementById('tl1Output');

    switch (currentTl1Format) {
        case 'json':
            output.innerHTML = syntaxHighlightJson(JSON.stringify(data, null, 2));
            break;
        case 'table':
            output.innerHTML = renderTl1Table(data);
            break;
        case 'csv':
            output.textContent = renderTl1Csv(data);
            break;
    }
}

function renderTl1Table(data) {
    if (!data.data || data.data.length === 0) {
        return `<div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <h4>No Data Records</h4>
            <p>No data rows found in the TL1 response.</p>
        </div>`;
    }

    const allKeys = new Set();
    data.data.forEach(row => {
        Object.keys(row.params).forEach(key => allKeys.add(key));
    });
    const keys = Array.from(allKeys);

    let html = '<table class="tbl-sm">';
    html += '<tr><th class="tbl-sm-hd">AID</th>';
    keys.forEach(key => {
        html += `<th class="tbl-sm-hd">${key}</th>`;
    });
    html += '<th class="tbl-sm-hd">State</th></tr>';

    data.data.forEach(row => {
        html += `<tr><td class="tbl-sm-td">${row.aid}</td>`;
        keys.forEach(key => {
            html += `<td class="tbl-sm-td">${row.params[key] || ''}</td>`;
        });
        html += `<td class="tbl-sm-td">${row.state}</td></tr>`;
    });

    html += '</table>';
    return html;
}

function renderTl1Csv(data) {
    if (!data.data || data.data.length === 0) {
        return 'No data records found';
    }

    const allKeys = new Set();
    data.data.forEach(row => {
        Object.keys(row.params).forEach(key => allKeys.add(key));
    });
    const keys = Array.from(allKeys);

    let csv = 'AID,' + keys.join(',') + ',State\n';
    data.data.forEach(row => {
        csv += row.aid + ',';
        csv += keys.map(key => row.params[key] || '').join(',');
        csv += ',' + row.state + '\n';
    });

    return csv;
}

// TL1 Command Builder
document.getElementById('tl1GenerateBtn').addEventListener('click', function() {
    const command = document.getElementById('tl1Command').value;
    const entity = document.getElementById('tl1Entity').value.trim().toUpperCase();
    const tid = document.getElementById('tl1Tid').value.trim();
    const aid = document.getElementById('tl1Aid').value.trim();
    const ctag = document.getElementById('tl1Ctag').value.trim() || Math.floor(Math.random() * 99999);
    const params = document.getElementById('tl1Params').value.trim();

    let hasError = false;
    if (Validator.isEmpty(entity)) {
        Validator.setError('tl1Entity', 'Entity type is required (e.g., EQPT, OTU, ODU)');
        hasError = true;
    } else {
        Validator.clearError('tl1Entity');
    }
    if (hasError) {
        ToastManager.warning('Validation Error', 'Please fill in required fields.');
        return;
    }

    withLoader(this, () => {
        UsageTracker.increment('tl1');
        let tl1Command = `${command}-${entity}:${tid}:${aid}:${ctag}`;
        if (params) tl1Command += `::${params}`;
        tl1Command += ';';
        document.getElementById('tl1GeneratedOutput').textContent = tl1Command;
        ToastManager.success('Command Generated', 'TL1 command is ready to copy.');
    });
});

// Sample TL1 Data
document.getElementById('tl1SampleBtn').addEventListener('click', () => {
    document.getElementById('tl1Input').value = `   NE-WEST-01 2024-01-15 14:30:45
M  12345 COMPLD
   "SLOT-1-1::PROVISIONEDTYPE=OTU4,ADMINSTATE=IS,OPERSTATE=IS:IS-NR"
   "SLOT-1-2::PROVISIONEDTYPE=OTU4,ADMINSTATE=IS,OPERSTATE=IS:IS-NR"
   "SLOT-1-3::PROVISIONEDTYPE=ODU4,ADMINSTATE=OOS,OPERSTATE=OOS:OOS-MA"
   "SLOT-2-1::PROVISIONEDTYPE=ETH100G,ADMINSTATE=IS,OPERSTATE=IS:IS-NR"
   "SLOT-2-2::PROVISIONEDTYPE=ETH100G,ADMINSTATE=IS,OPERSTATE=DSBLD:OOS-AUMA"
;`;
    Validator.clearError('tl1Input');
    ToastManager.info('Sample Loaded', 'Sample TL1 response loaded. Click Parse to process.');
});

// Clear TL1
document.getElementById('tl1ClearBtn').addEventListener('click', () => {
    document.getElementById('tl1Input').value = '';
    document.getElementById('tl1Output').innerHTML = '';
    lastParsedTl1Data = null;
    Validator.clearError('tl1Input');
});

// Copy TL1 output
document.getElementById('tl1CopyBtn').addEventListener('click', () => {
    const output = document.getElementById('tl1Output');
    copyToClipboard(output.textContent || output.innerText, 'TL1 output copied!');
});

document.getElementById('tl1CopyGenBtn').addEventListener('click', () => {
    const output = document.getElementById('tl1GeneratedOutput');
    copyToClipboard(output.textContent, 'TL1 command copied!');
});

// ==========================================
// ALARM MAPPER
// ==========================================
let alarmMappings = Storage.get('alarmMappings', []);

function renderAlarmMappings() {
    const container = document.getElementById('mappingRows');
    const searchTerm = document.getElementById('alarmSearch').value.toLowerCase();

    const filtered = alarmMappings.filter(m =>
        m.emsId.toLowerCase().includes(searchTerm) ||
        m.emsName.toLowerCase().includes(searchTerm) ||
        m.ossId.toLowerCase().includes(searchTerm) ||
        m.ossName.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <h4>No Alarm Mappings</h4>
            <p>${searchTerm ? 'No results match your search.' : 'Add your first alarm mapping above.'}</p>
        </div>`;
        return;
    }

    container.innerHTML = filtered.map((mapping, index) => `
        <div class="table-row" data-index="${alarmMappings.indexOf(mapping)}">
            <div>
                <div class="fw-500">${escapeHtml(mapping.emsId)}</div>
                <div class="text-muted-sm">${escapeHtml(mapping.emsName)}</div>
            </div>
            <div>
                <div class="fw-500">${escapeHtml(mapping.ossId)}</div>
                <div class="text-muted-sm">${escapeHtml(mapping.ossName)}</div>
            </div>
            <div>
                <span class="severity-badge ${mapping.severity.toLowerCase()}">${mapping.severity}</span>
            </div>
            <div class="row-actions">
                <button class="btn-icon delete" onclick="deleteMapping(${alarmMappings.indexOf(mapping)})" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.deleteMapping = function(index) {
    if (confirm('Delete this alarm mapping?')) {
        alarmMappings.splice(index, 1);
        if (Storage.set('alarmMappings', alarmMappings)) {
            renderAlarmMappings();
            ToastManager.success('Deleted', 'Alarm mapping removed.');
        }
    }
};

document.getElementById('addMappingBtn').addEventListener('click', () => {
    const emsId = document.getElementById('emsAlarmId').value.trim();
    const ossId = document.getElementById('ossAlarmId').value.trim();

    // Validation
    let hasError = false;

    if (Validator.isEmpty(emsId)) {
        Validator.setError('emsAlarmId', 'EMS Alarm ID is required');
        hasError = true;
    } else {
        Validator.clearError('emsAlarmId');
    }

    if (Validator.isEmpty(ossId)) {
        Validator.setError('ossAlarmId', 'OSS Alarm ID is required');
        hasError = true;
    } else {
        Validator.clearError('ossAlarmId');
    }

    if (hasError) {
        ToastManager.warning('Validation Error', 'Please fill in required fields.');
        return;
    }

    // Check for duplicates
    const duplicate = alarmMappings.find(m => m.emsId.toLowerCase() === emsId.toLowerCase());
    if (duplicate) {
        if (!confirm(`EMS Alarm ID "${emsId}" already exists. Add anyway?`)) {
            return;
        }
    }

    const mapping = {
        emsId: emsId,
        emsName: document.getElementById('emsAlarmName').value.trim(),
        ossId: ossId,
        ossName: document.getElementById('ossAlarmName').value.trim(),
        severity: document.getElementById('alarmSeverity').value,
        category: document.getElementById('alarmCategory').value,
        description: document.getElementById('alarmDescription').value.trim()
    };

    alarmMappings.push(mapping);

    if (Storage.set('alarmMappings', alarmMappings)) {
        renderAlarmMappings();
        ToastManager.success('Mapping Added', `Added mapping: ${emsId} → ${ossId}`);
        UsageTracker.increment('alarm');

        // Clear form
        document.getElementById('emsAlarmId').value = '';
        document.getElementById('emsAlarmName').value = '';
        document.getElementById('ossAlarmId').value = '';
        document.getElementById('ossAlarmName').value = '';
        document.getElementById('alarmDescription').value = '';
    }
});

document.getElementById('alarmSearch').addEventListener('input', renderAlarmMappings);

document.getElementById('exportMappingBtn').addEventListener('click', () => {
    if (alarmMappings.length === 0) {
        ToastManager.warning('Nothing to Export', 'No alarm mappings to export.');
        return;
    }

    try {
        const blob = new Blob([JSON.stringify(alarmMappings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'alarm-mappings.json';
        a.click();
        URL.revokeObjectURL(url);
        ToastManager.success('Exported', `Exported ${alarmMappings.length} alarm mapping(s).`);
    } catch (err) {
        ToastManager.error('Export Failed', err.message);
    }
});

document.getElementById('importMappingBtn').addEventListener('click', () => {
    document.getElementById('importMappingFile').click();
});

document.getElementById('importMappingFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
        ToastManager.error('Invalid File', 'Please select a JSON or CSV file.');
        e.target.value = '';
        return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
        ToastManager.error('File Too Large', 'Maximum file size is 1MB.');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);

            if (!Array.isArray(imported)) {
                throw new Error('File must contain an array of alarm mappings.');
            }

            // Validate structure
            const validMappings = imported.filter(m => m.emsId && m.ossId);
            if (validMappings.length === 0) {
                throw new Error('No valid mappings found. Each mapping must have emsId and ossId.');
            }

            if (validMappings.length < imported.length) {
                ToastManager.warning('Partial Import', `${imported.length - validMappings.length} invalid entries were skipped.`);
            }

            alarmMappings = [...alarmMappings, ...validMappings];

            if (Storage.set('alarmMappings', alarmMappings)) {
                renderAlarmMappings();
                ToastManager.success('Imported', `Imported ${validMappings.length} mapping(s).`);
            }
        } catch (err) {
            ToastManager.error('Import Failed', err.message);
        }
    };

    reader.onerror = () => {
        ToastManager.error('Read Error', 'Could not read the file.');
    };

    reader.readAsText(file);
    e.target.value = '';
});

document.getElementById('clearMappingBtn').addEventListener('click', () => {
    if (alarmMappings.length === 0) {
        ToastManager.info('Already Empty', 'No mappings to clear.');
        return;
    }

    if (confirm(`Clear all ${alarmMappings.length} alarm mapping(s)? This cannot be undone.`)) {
        alarmMappings = [];
        if (Storage.set('alarmMappings', alarmMappings)) {
            renderAlarmMappings();
            ToastManager.success('Cleared', 'All alarm mappings removed.');
        }
    }
});

// Initialize alarm mappings display
renderAlarmMappings();

// ==========================================
// PAYLOAD TRANSFORMER
// ==========================================
document.getElementById('transformBtn').addEventListener('click', function() {
    const input = document.getElementById('transformInput').value.trim();
    const inputFormat = document.getElementById('inputFormat').value;
    const outputFormat = document.getElementById('outputFormat').value;

    if (Validator.isEmpty(input)) {
        Validator.setError('transformInput', 'Please enter data to transform');
        ToastManager.warning('Empty Input', 'Please enter data to transform.');
        return;
    }

    Validator.clearError('transformInput');
    withLoader(this, () => {
    UsageTracker.increment('transform');

    try {
        // Parse input
        let data;
        switch (inputFormat) {
            case 'json':
                const jsonResult = Validator.isValidJson(input);
                if (!jsonResult.valid) {
                    throw new Error(`Invalid JSON: ${jsonResult.error}`);
                }
                data = JSON.parse(input);
                break;
            case 'xml':
                const xmlResult = Validator.isValidXml(input);
                if (!xmlResult.valid) {
                    throw new Error(`Invalid XML: ${xmlResult.error}`);
                }
                data = xmlToJson(input);
                break;
            case 'csv':
                data = csvToJson(input);
                break;
            case 'yaml':
                if (typeof jsyaml === 'undefined') {
                    throw new Error('YAML library not loaded. Please refresh the page.');
                }
                data = jsyaml.load(input);
                break;
        }

        // Convert to output format
        let output;
        switch (outputFormat) {
            case 'json':
                output = JSON.stringify(data, null, 2);
                document.getElementById('transformOutput').innerHTML = syntaxHighlightJson(output);
                break;
            case 'xml':
                output = jsonToXml(data);
                document.getElementById('transformOutput').innerHTML = syntaxHighlightXml(output);
                break;
            case 'csv':
                output = jsonToCsv(data);
                document.getElementById('transformOutput').textContent = output;
                break;
            case 'yaml':
                output = jsyaml.dump(data);
                document.getElementById('transformOutput').textContent = output;
                break;
        }

        ToastManager.success('Transformed', `${inputFormat.toUpperCase()} → ${outputFormat.toUpperCase()}`);
    } catch (err) {
        document.getElementById('transformOutput').innerHTML = `
            <div class="error-hint">
                <div class="error-hint-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Transformation Error
                </div>
                <div class="error-hint-content">
                    <p>${escapeHtml(err.message)}</p>
                </div>
            </div>
        `;
        ToastManager.error('Transform Failed', 'Check your input format.');
    }
    }); // withLoader
});

// XML to JSON conversion
function xmlToJson(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid XML structure');
    }

    function nodeToJson(node) {
        const obj = {};

        if (node.attributes && node.attributes.length > 0) {
            obj['@attributes'] = {};
            for (const attr of node.attributes) {
                obj['@attributes'][attr.name] = attr.value;
            }
        }

        if (node.hasChildNodes()) {
            for (const child of node.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent.trim();
                    if (text) {
                        if (Object.keys(obj).length === 0) {
                            return text;
                        }
                        obj['#text'] = text;
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    const childObj = nodeToJson(child);
                    if (obj[child.nodeName]) {
                        if (!Array.isArray(obj[child.nodeName])) {
                            obj[child.nodeName] = [obj[child.nodeName]];
                        }
                        obj[child.nodeName].push(childObj);
                    } else {
                        obj[child.nodeName] = childObj;
                    }
                }
            }
        }

        return Object.keys(obj).length === 0 ? '' : obj;
    }

    return { [doc.documentElement.nodeName]: nodeToJson(doc.documentElement) };
}

// JSON to XML conversion
function jsonToXml(json, indent = 0) {
    let xml = '';
    const spaces = '  '.repeat(indent);

    for (const key in json) {
        if (key === '@attributes') continue;
        if (key === '#text') {
            xml += json[key];
            continue;
        }

        const value = json[key];

        if (Array.isArray(value)) {
            for (const item of value) {
                xml += `${spaces}<${key}`;
                if (typeof item === 'object' && item['@attributes']) {
                    for (const attr in item['@attributes']) {
                        xml += ` ${attr}="${item['@attributes'][attr]}"`;
                    }
                }
                xml += '>';
                if (typeof item === 'object') {
                    xml += '\n' + jsonToXml(item, indent + 1) + spaces;
                } else {
                    xml += item;
                }
                xml += `</${key}>\n`;
            }
        } else if (typeof value === 'object' && value !== null) {
            xml += `${spaces}<${key}`;
            if (value['@attributes']) {
                for (const attr in value['@attributes']) {
                    xml += ` ${attr}="${value['@attributes'][attr]}"`;
                }
            }
            xml += '>\n' + jsonToXml(value, indent + 1) + `${spaces}</${key}>\n`;
        } else {
            xml += `${spaces}<${key}>${value}</${key}>\n`;
        }
    }

    return xml;
}

// CSV to JSON conversion
function csvToJson(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV must have a header row and at least one data row.');
    }

    const headers = lines[0].split(',').map(h => h.trim());

    if (headers.some(h => !h)) {
        throw new Error('CSV headers cannot be empty.');
    }

    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());

        if (values.length !== headers.length) {
            ToastManager.warning('Row Mismatch', `Row ${i + 1} has ${values.length} columns, expected ${headers.length}.`);
        }

        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        result.push(obj);
    }

    return result;
}

// JSON to CSV conversion
function jsonToCsv(json) {
    if (!Array.isArray(json)) {
        json = [json];
    }

    if (json.length === 0) {
        throw new Error('Cannot convert empty data to CSV.');
    }

    const headers = Object.keys(json[0]);
    let csv = headers.join(',') + '\n';

    for (const row of json) {
        csv += headers.map(h => {
            const val = row[h];
            if (typeof val === 'object') {
                return '"' + JSON.stringify(val).replace(/"/g, '""') + '"';
            }
            const strVal = String(val);
            return strVal.includes(',') || strVal.includes('"') ? `"${strVal.replace(/"/g, '""')}"` : strVal;
        }).join(',') + '\n';
    }

    return csv;
}

// Sample data
document.getElementById('transformSampleBtn').addEventListener('click', () => {
    const format = document.getElementById('inputFormat').value;
    const samples = {
        json: `{
  "networkElements": [
    {
      "neId": "NE-001",
      "name": "Router-West",
      "type": "ROUTER",
      "status": "ACTIVE",
      "ipAddress": "192.168.1.1"
    },
    {
      "neId": "NE-002",
      "name": "Switch-East",
      "type": "SWITCH",
      "status": "ACTIVE",
      "ipAddress": "192.168.1.2"
    }
  ]
}`,
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<networkElements>
  <element neId="NE-001" status="ACTIVE">
    <name>Router-West</name>
    <type>ROUTER</type>
    <ipAddress>192.168.1.1</ipAddress>
  </element>
  <element neId="NE-002" status="ACTIVE">
    <name>Switch-East</name>
    <type>SWITCH</type>
    <ipAddress>192.168.1.2</ipAddress>
  </element>
</networkElements>`,
        csv: `neId,name,type,status,ipAddress
NE-001,Router-West,ROUTER,ACTIVE,192.168.1.1
NE-002,Switch-East,SWITCH,ACTIVE,192.168.1.2`,
        yaml: `networkElements:
  - neId: NE-001
    name: Router-West
    type: ROUTER
    status: ACTIVE
    ipAddress: 192.168.1.1
  - neId: NE-002
    name: Switch-East
    type: SWITCH
    status: ACTIVE
    ipAddress: 192.168.1.2`
    };

    document.getElementById('transformInput').value = samples[format];
    Validator.clearError('transformInput');
    ToastManager.info('Sample Loaded', `${format.toUpperCase()} sample loaded.`);
});

document.getElementById('transformClearBtn').addEventListener('click', () => {
    document.getElementById('transformInput').value = '';
    document.getElementById('transformOutput').innerHTML = '';
    Validator.clearError('transformInput');
});

document.getElementById('transformCopyBtn').addEventListener('click', () => {
    const output = document.getElementById('transformOutput');
    copyToClipboard(output.textContent || output.innerText, 'Transformed output copied!');
});

// ==========================================
// SNMP OID BROWSER
// ==========================================
const commonOids = [
    { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', desc: 'System Description' },
    { oid: '1.3.6.1.2.1.1.2.0', name: 'sysObjectID', desc: 'System Object ID' },
    { oid: '1.3.6.1.2.1.1.3.0', name: 'sysUpTime', desc: 'System Uptime' },
    { oid: '1.3.6.1.2.1.1.4.0', name: 'sysContact', desc: 'System Contact' },
    { oid: '1.3.6.1.2.1.1.5.0', name: 'sysName', desc: 'System Name' },
    { oid: '1.3.6.1.2.1.1.6.0', name: 'sysLocation', desc: 'System Location' },
    { oid: '1.3.6.1.2.1.2.1.0', name: 'ifNumber', desc: 'Number of Interfaces' },
    { oid: '1.3.6.1.2.1.2.2.1.1', name: 'ifIndex', desc: 'Interface Index' },
    { oid: '1.3.6.1.2.1.2.2.1.2', name: 'ifDescr', desc: 'Interface Description' },
    { oid: '1.3.6.1.2.1.2.2.1.3', name: 'ifType', desc: 'Interface Type' },
    { oid: '1.3.6.1.2.1.2.2.1.5', name: 'ifSpeed', desc: 'Interface Speed' },
    { oid: '1.3.6.1.2.1.2.2.1.6', name: 'ifPhysAddress', desc: 'Interface MAC Address' },
    { oid: '1.3.6.1.2.1.2.2.1.7', name: 'ifAdminStatus', desc: 'Interface Admin Status' },
    { oid: '1.3.6.1.2.1.2.2.1.8', name: 'ifOperStatus', desc: 'Interface Oper Status' },
    { oid: '1.3.6.1.2.1.2.2.1.10', name: 'ifInOctets', desc: 'Incoming Bytes' },
    { oid: '1.3.6.1.2.1.2.2.1.16', name: 'ifOutOctets', desc: 'Outgoing Bytes' },
    { oid: '1.3.6.1.4.1', name: 'enterprises', desc: 'Enterprise MIBs' },
    { oid: '1.3.6.1.4.1.9', name: 'cisco', desc: 'Cisco Systems' },
    { oid: '1.3.6.1.4.1.2636', name: 'juniper', desc: 'Juniper Networks' },
    { oid: '1.3.6.1.4.1.2011', name: 'huawei', desc: 'Huawei Technologies' },
    { oid: '1.3.6.1.4.1.6527', name: 'nokia', desc: 'Nokia (Alcatel-Lucent)' },
    { oid: '1.3.6.1.4.1.193', name: 'ericsson', desc: 'Ericsson' },
];

const oidTree = {
    '1': { name: 'iso', desc: 'ISO' },
    '1.3': { name: 'org', desc: 'Organization' },
    '1.3.6': { name: 'dod', desc: 'Department of Defense' },
    '1.3.6.1': { name: 'internet', desc: 'Internet' },
    '1.3.6.1.2': { name: 'mgmt', desc: 'Management' },
    '1.3.6.1.2.1': { name: 'mib-2', desc: 'MIB-2' },
    '1.3.6.1.2.1.1': { name: 'system', desc: 'System MIB' },
    '1.3.6.1.2.1.2': { name: 'interfaces', desc: 'Interfaces MIB' },
    '1.3.6.1.4': { name: 'private', desc: 'Private' },
    '1.3.6.1.4.1': { name: 'enterprises', desc: 'Enterprise MIBs' },
};

function renderMibTree() {
    const container = document.getElementById('mibTree');
    const search = document.getElementById('mibSearch').value.toLowerCase();

    const filtered = commonOids.filter(o =>
        o.oid.includes(search) ||
        o.name.toLowerCase().includes(search) ||
        o.desc.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <p>No OIDs match your search.</p>
        </div>`;
        return;
    }

    container.innerHTML = filtered.map(o => `
        <div class="mib-item" onclick="selectOid('${o.oid}')">
            <div class="name">${o.name}</div>
            <div class="oid">${o.oid}</div>
            <div class="desc">${o.desc}</div>
        </div>
    `).join('');
}

window.selectOid = function(oid) {
    document.getElementById('oidInput').value = oid;
    decodeOid(oid);
};

document.getElementById('mibSearch').addEventListener('input', renderMibTree);

document.getElementById('decodeOidBtn').addEventListener('click', function() {
    const oid = document.getElementById('oidInput').value.trim();

    if (Validator.isEmpty(oid)) {
        Validator.setError('oidInput', 'Please enter an OID');
        ToastManager.warning('Empty Input', 'Please enter an OID to decode.');
        return;
    }

    if (!Validator.isValidOid(oid)) {
        Validator.setError('oidInput', 'Invalid OID format. Expected: 1.3.6.1...');
        ToastManager.error('Invalid OID', 'OID must contain only numbers separated by dots.');
        return;
    }

    if (!oid.startsWith('1.')) {
        Validator.setError('oidInput', 'OID should start with 1 (iso)');
        ToastManager.warning('Unusual OID', 'Standard OIDs start with 1 (iso).');
    } else {
        Validator.clearError('oidInput');
    }

    withLoader(this, () => {
        UsageTracker.increment('snmp');
        decodeOid(oid);
    });
});

function decodeOid(oid) {
    const result = document.getElementById('oidResult');
    const parts = oid.split('.');
    let decoded = [];
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
        currentPath += (i > 0 ? '.' : '') + parts[i];
        const info = oidTree[currentPath];
        if (info) {
            decoded.push(`<span class="text-primary">${parts[i]}</span> = ${info.name} (${info.desc})`);
        } else {
            decoded.push(`<span class="text-secondary">${parts[i]}</span>`);
        }
    }

    const match = commonOids.find(o => o.oid === oid);

    let html = `<div class="mb-3"><strong>OID Path:</strong></div>`;
    html += `<div class="font-mono-mb">${decoded.join(' → ')}</div>`;

    if (match) {
        html += `<div class="bg-input-padded">`;
        html += `<div><strong>Name:</strong> ${match.name}</div>`;
        html += `<div><strong>Description:</strong> ${match.desc}</div>`;
        html += `</div>`;
        ToastManager.success('OID Found', `${match.name} - ${match.desc}`);
    } else {
        html += `<div class="bg-input-padded-muted">`;
        html += `<p>OID not found in common MIB database.</p>`;
        html += `<p>This may be a vendor-specific or custom OID.</p>`;
        html += `</div>`;
    }

    result.innerHTML = html;
}

// SNMP Walk Formatter
document.getElementById('formatSnmpBtn').addEventListener('click', function() {
    const input = document.getElementById('snmpWalkInput').value.trim();

    if (Validator.isEmpty(input)) {
        Validator.setError('snmpWalkInput', 'Please enter SNMP walk output');
        ToastManager.warning('Empty Input', 'Please paste SNMP walk output.');
        return;
    }

    Validator.clearError('snmpWalkInput');
    withLoader(this, () => {
    UsageTracker.increment('snmp');

    const lines = input.split('\n');
    const data = [];
    let skippedLines = 0;

    for (const line of lines) {
        const match = line.match(/^([.\d]+)\s*=\s*(?:(\w+):\s*)?(.*)$/);
        if (match) {
            data.push({
                oid: match[1],
                type: match[2] || 'STRING',
                value: match[3]
            });
        } else if (line.trim()) {
            skippedLines++;
        }
    }

    if (data.length === 0) {
        document.getElementById('snmpFormatOutput').innerHTML = `
            <div class="error-hint">
                <div class="error-hint-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Could Not Parse Output
                </div>
                <div class="error-hint-content">
                    <p>Expected format:</p>
                    <code>1.3.6.1.2.1.1.1.0 = STRING: Description</code><br>
                    <code>1.3.6.1.2.1.1.3.0 = Timeticks: (12345) 0:02:03.45</code>
                </div>
            </div>
        `;
        ToastManager.error('Parse Failed', 'Could not parse SNMP walk output.');
        return;
    }

    if (skippedLines > 0) {
        ToastManager.warning('Partial Parse', `${skippedLines} line(s) could not be parsed.`);
    }

    let html = '<table class="tbl-sm">';
    html += '<tr><th class="tbl-sm-hd">OID</th>';
    html += '<th class="tbl-sm-hd">Type</th>';
    html += '<th class="tbl-sm-hd">Value</th></tr>';

    for (const row of data) {
        html += `<tr>
            <td class="tbl-sm-td mono">${escapeHtml(row.oid)}</td>
            <td class="tbl-sm-td">${escapeHtml(row.type)}</td>
            <td class="tbl-sm-td">${escapeHtml(row.value)}</td>
        </tr>`;
    }
    html += '</table>';

    document.getElementById('snmpFormatOutput').innerHTML = html;
    ToastManager.success('Formatted', `Parsed ${data.length} SNMP entries.`);
    });
});

document.getElementById('exportSnmpBtn').addEventListener('click', () => {
    const input = document.getElementById('snmpWalkInput').value.trim();
    if (!input) {
        ToastManager.warning('Nothing to Export', 'Please format SNMP data first.');
        return;
    }

    const lines = input.split('\n');
    let csv = 'OID,Type,Value\n';
    let count = 0;

    for (const line of lines) {
        const match = line.match(/^([.\d]+)\s*=\s*(?:(\w+):\s*)?(.*)$/);
        if (match) {
            csv += `"${match[1]}","${match[2] || 'STRING'}","${match[3].replace(/"/g, '""')}"\n`;
            count++;
        }
    }

    if (count === 0) {
        ToastManager.warning('Nothing to Export', 'No valid SNMP data found.');
        return;
    }

    try {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'snmp-walk.csv';
        a.click();
        URL.revokeObjectURL(url);
        ToastManager.success('Exported', `Exported ${count} SNMP entries.`);
    } catch (err) {
        ToastManager.error('Export Failed', err.message);
    }
});

// Initialize MIB tree
renderMibTree();

// ==========================================
// NETCONF/XML TOOLS
// ==========================================
const netconfTemplates = {
    'get': `<?xml version="1.0" encoding="UTF-8"?>
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <get>
    <filter type="subtree">
      <!-- Add your filter here -->
    </filter>
  </get>
</rpc>`,
    'get-config': `<?xml version="1.0" encoding="UTF-8"?>
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <get-config>
    <source>
      <running/>
    </source>
    <filter type="subtree">
      <!-- Add your filter here -->
    </filter>
  </get-config>
</rpc>`,
    'edit-config': `<?xml version="1.0" encoding="UTF-8"?>
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <edit-config>
    <target>
      <running/>
    </target>
    <config>
      <!-- Add your configuration here -->
    </config>
  </edit-config>
</rpc>`,
    'rpc': `<?xml version="1.0" encoding="UTF-8"?>
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <!-- Add your custom RPC operation here -->
</rpc>`,
    'notification': `<?xml version="1.0" encoding="UTF-8"?>
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <create-subscription xmlns="urn:ietf:params:xml:ns:netconf:notification:1.0">
    <stream>NETCONF</stream>
  </create-subscription>
</rpc>`
};

document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const template = netconfTemplates[btn.dataset.template];
        document.getElementById('xmlInput').value = template;
        document.getElementById('xmlValidation').textContent = '';
        document.getElementById('xmlValidation').className = 'validation-result';
        ToastManager.info('Template Loaded', `${btn.dataset.template.toUpperCase()} template loaded.`);
    });
});

document.getElementById('formatXmlBtn').addEventListener('click', function() {
    const input = document.getElementById('xmlInput').value;

    if (Validator.isEmpty(input)) {
        ToastManager.warning('Empty Input', 'Please enter XML to format.');
        return;
    }

    withLoader(this, () => {
    UsageTracker.increment('netconf');
    try {
        const formatted = formatXml(input);
        document.getElementById('xmlInput').value = formatted;
        showValidation(true, 'XML formatted successfully');
        ToastManager.success('Formatted', 'XML formatted successfully.');
    } catch (err) {
        showValidation(false, 'Invalid XML: ' + err.message);
        ToastManager.error('Format Failed', 'Invalid XML structure.');
    }
    });
});

document.getElementById('minifyXmlBtn').addEventListener('click', function() {
    const input = document.getElementById('xmlInput').value;

    if (Validator.isEmpty(input)) {
        ToastManager.warning('Empty Input', 'Please enter XML to minify.');
        return;
    }

    withLoader(this, () => {
    UsageTracker.increment('netconf');
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/xml');
        if (doc.querySelector('parsererror')) {
            throw new Error('Parse error');
        }
        const serializer = new XMLSerializer();
        document.getElementById('xmlInput').value = serializer.serializeToString(doc);
        showValidation(true, 'XML minified');
        ToastManager.success('Minified', 'XML minified successfully.');
    } catch (err) {
        showValidation(false, 'Invalid XML');
        ToastManager.error('Minify Failed', 'Invalid XML structure.');
    }
    });
});

document.getElementById('validateXmlBtn').addEventListener('click', function() {
    const input = document.getElementById('xmlInput').value;

    if (Validator.isEmpty(input)) {
        ToastManager.warning('Empty Input', 'Please enter XML to validate.');
        return;
    }

    withLoader(this, () => {
    UsageTracker.increment('netconf');
    const result = Validator.isValidXml(input);
    if (result.valid) {
        showValidation(true, 'Valid XML - No syntax errors found');
        ToastManager.success('Valid', 'XML is well-formed.');
    } else {
        showValidation(false, 'Invalid XML: ' + result.error);
        ToastManager.error('Invalid', 'XML has syntax errors.');
    }
    });
});

function showValidation(valid, message) {
    const el = document.getElementById('xmlValidation');
    el.className = 'validation-result ' + (valid ? 'valid' : 'invalid');
    el.textContent = message;
}

function formatXml(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) {
        throw new Error('Invalid XML');
    }

    const serializer = new XMLSerializer();
    let formatted = serializer.serializeToString(doc);

    formatted = formatted.replace(/></g, '>\n<');
    const lines = formatted.split('\n');
    let indent = 0;
    const result = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('</')) {
            indent--;
        }
        result.push('  '.repeat(Math.max(0, indent)) + trimmed);
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
            indent++;
        }
    }

    return result.join('\n');
}

// XPath Tester
document.getElementById('testXpathBtn').addEventListener('click', function() {
    const xml = document.getElementById('xmlInput').value;
    const xpath = document.getElementById('xpathInput').value;

    if (Validator.isEmpty(xml)) {
        ToastManager.warning('Missing XML', 'Please enter XML in the editor first.');
        return;
    }

    if (Validator.isEmpty(xpath)) {
        Validator.setError('xpathInput', 'Please enter an XPath expression');
        ToastManager.warning('Missing XPath', 'Please enter an XPath expression.');
        return;
    }

    Validator.clearError('xpathInput');
    withLoader(this, () => {
    UsageTracker.increment('netconf');

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        if (doc.querySelector('parsererror')) {
            throw new Error('Invalid XML in editor');
        }

        const result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        if (result.snapshotLength === 0) {
            document.getElementById('xpathResult').innerHTML = `
                <div class="text-warning">
                    <p>No matches found for: <code>${escapeHtml(xpath)}</code></p>
                    <p class="text-muted-sm">
                        Tip: Check namespace prefixes. Default namespaces require special handling.
                    </p>
                </div>
            `;
            ToastManager.info('No Matches', 'XPath returned no results.');
            return;
        }

        let output = `<div class="success-mb">Found ${result.snapshotLength} match(es):</div>\n`;

        for (let i = 0; i < result.snapshotLength; i++) {
            const node = result.snapshotItem(i);
            if (node.nodeType === Node.ELEMENT_NODE) {
                output += escapeHtml(new XMLSerializer().serializeToString(node)) + '\n\n';
            } else {
                output += escapeHtml(node.textContent) + '\n';
            }
        }

        document.getElementById('xpathResult').innerHTML = `<pre class="pre-wrap">${output}</pre>`;
        ToastManager.success('XPath Results', `Found ${result.snapshotLength} match(es).`);
    } catch (err) {
        document.getElementById('xpathResult').innerHTML = `
            <div class="error-hint">
                <div class="error-hint-title">XPath Error</div>
                <div class="error-hint-content">${escapeHtml(err.message)}</div>
            </div>
        `;
        ToastManager.error('XPath Error', 'Invalid XPath expression or XML.');
    }
    });
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function syntaxHighlightJson(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

function syntaxHighlightXml(xml) {
    xml = xml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    xml = xml.replace(/(&lt;\/?[\w-]+)/g, '<span class="xml-tag">$1</span>');
    xml = xml.replace(/(\w+)=/g, '<span class="xml-attr">$1</span>=');
    xml = xml.replace(/"([^"]*)"/g, '<span class="xml-value">"$1"</span>');
    return xml;
}

// ==========================================
// YANG PARSER & COMPARISON
// ==========================================

// YANG Mode Switching
document.querySelectorAll('#yangPanel .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active button
        document.querySelectorAll('#yangPanel .mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update active mode panel
        document.querySelectorAll('.yang-mode').forEach(m => m.classList.remove('active'));
        const mode = btn.dataset.mode;
        document.getElementById(`yang${mode.charAt(0).toUpperCase() + mode.slice(1)}Mode`).classList.add('active');
    });
});

// Parse YANG
document.getElementById('parseYangBtn')?.addEventListener('click', function() {
    const input = document.getElementById('yangInput').value.trim();

    if (Validator.isEmpty(input)) {
        ToastManager.warning('Empty Input', 'Please enter a YANG module to parse.');
        return;
    }

    withLoader(this, () => {
    UsageTracker.increment('yang');
    try {
        const parsed = parseYangModule(input);
        displayYangParsed(parsed);
        ToastManager.success('Parse Success', 'YANG module parsed successfully.');
    } catch (err) {
        ToastManager.error('Parse Failed', err.message);
        document.getElementById('yangParseOutput').innerHTML = `
            <div class="error-message">
                <strong>Parse Error:</strong> ${escapeHtml(err.message)}
            </div>
        `;
    }
    });
});

// Validate YANG
document.getElementById('validateYangBtn')?.addEventListener('click', () => {
    const input = document.getElementById('yangInput').value.trim();

    if (Validator.isEmpty(input)) {
        ToastManager.warning('Empty Input', 'Please enter a YANG module to validate.');
        return;
    }

    try {
        const validation = validateYangModule(input);
        if (validation.valid) {
            ToastManager.success('Valid', 'YANG module syntax is valid.');
            document.getElementById('yangParseOutput').innerHTML = `
                <div class="success-message">
                    ✓ YANG module is syntactically valid
                    <br>Module: ${escapeHtml(validation.moduleName)}
                    <br>Namespace: ${escapeHtml(validation.namespace)}
                </div>
            `;
        } else {
            ToastManager.error('Invalid', validation.errors.join(', '));
            document.getElementById('yangParseOutput').innerHTML = `
                <div class="error-message">
                    <strong>Validation Errors:</strong><br>
                    ${validation.errors.map(e => '• ' + escapeHtml(e)).join('<br>')}
                </div>
            `;
        }
    } catch (err) {
        ToastManager.error('Validation Failed', err.message);
    }
});

// Compare YANG
document.getElementById('compareYangBtn')?.addEventListener('click', function() {
    const input1 = document.getElementById('yangCompareInput1').value.trim();
    const input2 = document.getElementById('yangCompareInput2').value.trim();

    if (Validator.isEmpty(input1) || Validator.isEmpty(input2)) {
        ToastManager.warning('Missing Input', 'Please provide both YANG modules to compare.');
        return;
    }

    withLoader(this, () => {
    UsageTracker.increment('yang');
    try {
        const comparison = compareYangModules(input1, input2);
        displayYangComparison(comparison);
        ToastManager.success('Comparison Complete', 'YANG modules compared successfully.');
    } catch (err) {
        ToastManager.error('Comparison Failed', err.message);
        document.getElementById('yangCompareOutput').innerHTML = `
            <div class="error-message">
                <strong>Comparison Error:</strong> ${escapeHtml(err.message)}
            </div>
        `;
    }
    });
});

// Generate Tree View
document.getElementById('generateTreeBtn')?.addEventListener('click', function() {
    const input = document.getElementById('yangTreeInput').value.trim();

    if (Validator.isEmpty(input)) {
        ToastManager.warning('Empty Input', 'Please enter a YANG module.');
        return;
    }

    withLoader(this, () => {
    UsageTracker.increment('yang');
    try {
        const tree = generateYangTree(input);
        document.getElementById('yangTreeOutput').innerHTML = tree;
        ToastManager.success('Tree Generated', 'Schema tree generated successfully.');
    } catch (err) {
        ToastManager.error('Tree Generation Failed', err.message);
        document.getElementById('yangTreeOutput').innerHTML = `
            <div class="error-message">
                <strong>Error:</strong> ${escapeHtml(err.message)}
            </div>
        `;
    }
    });
});

// Clear buttons
document.getElementById('clearYangBtn')?.addEventListener('click', () => {
    document.getElementById('yangInput').value = '';
    document.getElementById('yangParseOutput').innerHTML = '';
});

document.getElementById('clearCompareBtn')?.addEventListener('click', () => {
    document.getElementById('yangCompareInput1').value = '';
    document.getElementById('yangCompareInput2').value = '';
    document.getElementById('yangCompareOutput').innerHTML = '';
});

document.getElementById('clearTreeBtn')?.addEventListener('click', () => {
    document.getElementById('yangTreeInput').value = '';
    document.getElementById('yangTreeOutput').innerHTML = '';
});

// YANG Parser Functions
function parseYangModule(yangText) {
    const result = {
        module: null,
        namespace: null,
        prefix: null,
        imports: [],
        typedefs: [],
        groupings: [],
        containers: [],
        lists: [],
        leafs: [],
        revisions: []
    };

    // Extract module name
    const moduleMatch = yangText.match(/(?:module|submodule)\s+([a-zA-Z0-9_-]+)/);
    if (moduleMatch) {
        result.module = moduleMatch[1];
    }

    // Extract namespace
    const nsMatch = yangText.match(/namespace\s+"([^"]+)"/);
    if (nsMatch) {
        result.namespace = nsMatch[1];
    }

    // Extract prefix
    const prefixMatch = yangText.match(/prefix\s+"?([a-zA-Z0-9_-]+)"?/);
    if (prefixMatch) {
        result.prefix = prefixMatch[1];
    }

    // Extract imports
    const importRegex = /import\s+([a-zA-Z0-9_-]+)\s*\{[^}]*prefix\s+"?([a-zA-Z0-9_-]+)"?/g;
    let importMatch;
    while ((importMatch = importRegex.exec(yangText)) !== null) {
        result.imports.push({
            module: importMatch[1],
            prefix: importMatch[2]
        });
    }

    // Extract typedefs
    const typedefRegex = /typedef\s+([a-zA-Z0-9_-]+)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    let typedefMatch;
    while ((typedefMatch = typedefRegex.exec(yangText)) !== null) {
        result.typedefs.push({
            name: typedefMatch[1],
            definition: typedefMatch[2].trim()
        });
    }

    // Extract containers
    const containerRegex = /container\s+([a-zA-Z0-9_-]+)/g;
    let containerMatch;
    while ((containerMatch = containerRegex.exec(yangText)) !== null) {
        result.containers.push(containerMatch[1]);
    }

    // Extract lists
    const listRegex = /list\s+([a-zA-Z0-9_-]+)/g;
    let listMatch;
    while ((listMatch = listRegex.exec(yangText)) !== null) {
        result.lists.push(listMatch[1]);
    }

    // Extract leafs
    const leafRegex = /leaf\s+([a-zA-Z0-9_-]+)\s*\{[^}]*type\s+([a-zA-Z0-9_:-]+)/g;
    let leafMatch;
    while ((leafMatch = leafRegex.exec(yangText)) !== null) {
        result.leafs.push({
            name: leafMatch[1],
            type: leafMatch[2]
        });
    }

    // Extract revisions
    const revisionRegex = /revision\s+"?([0-9-]+)"?\s*\{[^}]*description\s+"([^"]*)"/g;
    let revisionMatch;
    while ((revisionMatch = revisionRegex.exec(yangText)) !== null) {
        result.revisions.push({
            date: revisionMatch[1],
            description: revisionMatch[2]
        });
    }

    return result;
}

function validateYangModule(yangText) {
    const errors = [];
    const result = { valid: true, errors: [], moduleName: null, namespace: null };

    // Check for module/submodule declaration
    const moduleMatch = yangText.match(/(?:module|submodule)\s+([a-zA-Z0-9_-]+)/);
    if (!moduleMatch) {
        errors.push('Missing module or submodule declaration');
    } else {
        result.moduleName = moduleMatch[1];
    }

    // Check for namespace (required for module, not for submodule)
    if (yangText.match(/module\s+/)) {
        const nsMatch = yangText.match(/namespace\s+"([^"]+)"/);
        if (!nsMatch) {
            errors.push('Missing namespace declaration');
        } else {
            result.namespace = nsMatch[1];
        }
    }

    // Check for prefix
    if (!yangText.match(/prefix\s+"?[a-zA-Z0-9_-]+"?/)) {
        errors.push('Missing prefix declaration');
    }

    // Check for balanced braces
    const openBraces = (yangText.match(/\{/g) || []).length;
    const closeBraces = (yangText.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
        errors.push(`Unbalanced braces (${openBraces} open, ${closeBraces} close)`);
    }

    result.valid = errors.length === 0;
    result.errors = errors;
    return result;
}

function compareYangModules(yang1, yang2) {
    const parsed1 = parseYangModule(yang1);
    const parsed2 = parseYangModule(yang2);

    const comparison = {
        module1: parsed1.module,
        module2: parsed2.module,
        addedContainers: [],
        removedContainers: [],
        addedLists: [],
        removedLists: [],
        addedLeafs: [],
        removedLeafs: [],
        addedImports: [],
        removedImports: [],
        changes: []
    };

    // Compare containers
    comparison.addedContainers = parsed2.containers.filter(c => !parsed1.containers.includes(c));
    comparison.removedContainers = parsed1.containers.filter(c => !parsed2.containers.includes(c));

    // Compare lists
    comparison.addedLists = parsed2.lists.filter(l => !parsed1.lists.includes(l));
    comparison.removedLists = parsed1.lists.filter(l => !parsed2.lists.includes(l));

    // Compare leafs
    const leaf1Names = parsed1.leafs.map(l => l.name);
    const leaf2Names = parsed2.leafs.map(l => l.name);
    comparison.addedLeafs = parsed2.leafs.filter(l => !leaf1Names.includes(l.name));
    comparison.removedLeafs = parsed1.leafs.filter(l => !leaf2Names.includes(l.name));

    // Compare imports
    const import1Names = parsed1.imports.map(i => i.module);
    const import2Names = parsed2.imports.map(i => i.module);
    comparison.addedImports = parsed2.imports.filter(i => !import1Names.includes(i.module));
    comparison.removedImports = parsed1.imports.filter(i => !import2Names.includes(i.module));

    // General changes
    if (parsed1.namespace !== parsed2.namespace) {
        comparison.changes.push(`Namespace changed: ${parsed1.namespace} → ${parsed2.namespace}`);
    }
    if (parsed1.prefix !== parsed2.prefix) {
        comparison.changes.push(`Prefix changed: ${parsed1.prefix} → ${parsed2.prefix}`);
    }

    return comparison;
}

function generateYangTree(yangText) {
    const parsed = parseYangModule(yangText);
    let tree = `<pre class="yang-tree">module: ${escapeHtml(parsed.module || 'unknown')}\n`;

    if (parsed.namespace) {
        tree += `  +--ro namespace  ${escapeHtml(parsed.namespace)}\n`;
    }

    if (parsed.imports.length > 0) {
        tree += `  +--imports:\n`;
        parsed.imports.forEach(imp => {
            tree += `     +-- ${escapeHtml(imp.module)} (prefix: ${escapeHtml(imp.prefix)})\n`;
        });
    }

    parsed.containers.forEach(container => {
        tree += `  +--rw ${escapeHtml(container)}/\n`;
    });

    parsed.lists.forEach(list => {
        tree += `  +--rw ${escapeHtml(list)}* []\n`;
    });

    parsed.leafs.forEach(leaf => {
        tree += `  +--rw ${escapeHtml(leaf.name)}  ${escapeHtml(leaf.type)}\n`;
    });

    tree += `</pre>`;
    return tree;
}

function displayYangParsed(parsed) {
    let html = '<div class="yang-parsed-output">';

    html += `<div class="yang-section">
        <h4>Module Information</h4>
        <table class="info-table">
            <tr><td><strong>Module Name:</strong></td><td>${escapeHtml(parsed.module || 'N/A')}</td></tr>
            <tr><td><strong>Namespace:</strong></td><td>${escapeHtml(parsed.namespace || 'N/A')}</td></tr>
            <tr><td><strong>Prefix:</strong></td><td>${escapeHtml(parsed.prefix || 'N/A')}</td></tr>
        </table>
    </div>`;

    if (parsed.imports.length > 0) {
        html += `<div class="yang-section">
            <h4>Imports (${parsed.imports.length})</h4>
            <ul class="yang-list">
                ${parsed.imports.map(imp => `<li><code>${escapeHtml(imp.module)}</code> (prefix: <code>${escapeHtml(imp.prefix)}</code>)</li>`).join('')}
            </ul>
        </div>`;
    }

    if (parsed.containers.length > 0) {
        html += `<div class="yang-section">
            <h4>Containers (${parsed.containers.length})</h4>
            <ul class="yang-list">
                ${parsed.containers.map(c => `<li><code>${escapeHtml(c)}</code></li>`).join('')}
            </ul>
        </div>`;
    }

    if (parsed.lists.length > 0) {
        html += `<div class="yang-section">
            <h4>Lists (${parsed.lists.length})</h4>
            <ul class="yang-list">
                ${parsed.lists.map(l => `<li><code>${escapeHtml(l)}</code></li>`).join('')}
            </ul>
        </div>`;
    }

    if (parsed.leafs.length > 0) {
        html += `<div class="yang-section">
            <h4>Leaf Nodes (${parsed.leafs.length})</h4>
            <table class="yang-table">
                <thead>
                    <tr><th>Name</th><th>Type</th></tr>
                </thead>
                <tbody>
                    ${parsed.leafs.map(leaf => `<tr><td><code>${escapeHtml(leaf.name)}</code></td><td><code>${escapeHtml(leaf.type)}</code></td></tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }

    if (parsed.typedefs.length > 0) {
        html += `<div class="yang-section">
            <h4>Type Definitions (${parsed.typedefs.length})</h4>
            <ul class="yang-list">
                ${parsed.typedefs.map(t => `<li><code>${escapeHtml(t.name)}</code></li>`).join('')}
            </ul>
        </div>`;
    }

    if (parsed.revisions.length > 0) {
        html += `<div class="yang-section">
            <h4>Revisions</h4>
            <ul class="yang-list">
                ${parsed.revisions.map(r => `<li><strong>${escapeHtml(r.date)}</strong>: ${escapeHtml(r.description)}</li>`).join('')}
            </ul>
        </div>`;
    }

    html += '</div>';
    document.getElementById('yangParseOutput').innerHTML = html;
}

function displayYangComparison(comparison) {
    let html = '<div class="yang-comparison-output">';

    html += `<div class="comparison-header">
        <div class="module-info">
            <strong>Original:</strong> ${escapeHtml(comparison.module1 || 'unknown')}
        </div>
        <div class="module-info">
            <strong>Modified:</strong> ${escapeHtml(comparison.module2 || 'unknown')}
        </div>
    </div>`;

    let hasChanges = false;

    if (comparison.changes.length > 0) {
        hasChanges = true;
        html += `<div class="yang-section">
            <h4>Module Changes</h4>
            <ul class="change-list">
                ${comparison.changes.map(c => `<li class="changed">⚠️ ${escapeHtml(c)}</li>`).join('')}
            </ul>
        </div>`;
    }

    if (comparison.addedContainers.length > 0 || comparison.removedContainers.length > 0) {
        hasChanges = true;
        html += `<div class="yang-section">
            <h4>Containers</h4>
            <ul class="change-list">
                ${comparison.addedContainers.map(c => `<li class="added">+ Added: <code>${escapeHtml(c)}</code></li>`).join('')}
                ${comparison.removedContainers.map(c => `<li class="removed">- Removed: <code>${escapeHtml(c)}</code></li>`).join('')}
            </ul>
        </div>`;
    }

    if (comparison.addedLists.length > 0 || comparison.removedLists.length > 0) {
        hasChanges = true;
        html += `<div class="yang-section">
            <h4>Lists</h4>
            <ul class="change-list">
                ${comparison.addedLists.map(l => `<li class="added">+ Added: <code>${escapeHtml(l)}</code></li>`).join('')}
                ${comparison.removedLists.map(l => `<li class="removed">- Removed: <code>${escapeHtml(l)}</code></li>`).join('')}
            </ul>
        </div>`;
    }

    if (comparison.addedLeafs.length > 0 || comparison.removedLeafs.length > 0) {
        hasChanges = true;
        html += `<div class="yang-section">
            <h4>Leaf Nodes</h4>
            <ul class="change-list">
                ${comparison.addedLeafs.map(l => `<li class="added">+ Added: <code>${escapeHtml(l.name)}</code> (type: ${escapeHtml(l.type)})</li>`).join('')}
                ${comparison.removedLeafs.map(l => `<li class="removed">- Removed: <code>${escapeHtml(l.name)}</code> (type: ${escapeHtml(l.type)})</li>`).join('')}
            </ul>
        </div>`;
    }

    if (comparison.addedImports.length > 0 || comparison.removedImports.length > 0) {
        hasChanges = true;
        html += `<div class="yang-section">
            <h4>Imports</h4>
            <ul class="change-list">
                ${comparison.addedImports.map(i => `<li class="added">+ Added: <code>${escapeHtml(i.module)}</code></li>`).join('')}
                ${comparison.removedImports.map(i => `<li class="removed">- Removed: <code>${escapeHtml(i.module)}</code></li>`).join('')}
            </ul>
        </div>`;
    }

    if (!hasChanges) {
        html += `<div class="yang-section">
            <div class="no-changes">✓ No differences found - modules are identical in structure</div>
        </div>`;
    }

    html += '</div>';
    document.getElementById('yangCompareOutput').innerHTML = html;
}

// ==========================================
// E2E INTEGRATION SOLUTION GENERATOR
// ==========================================

// Mermaid is rendered externally via Mermaid Live Editor (no unsafe-eval needed)

// E2E State Management
const e2eState = {
    currentPhase: 1,
    project: {
        name: '',
        description: '',
        type: '',
        pattern: '',
        techStack: []
    },
    source: {
        type: '',
        name: '',
        format: '',
        connection: '',
        schema: ''
    },
    destination: {
        type: '',
        name: '',
        format: '',
        connection: '',
        schema: ''
    },
    mappings: [],
    rules: [],
    technical: {
        errorHandling: 'retry',
        logging: 'info',
        scheduling: 'realtime',
        performance: 1000,
        security: []
    },
    artifacts: {},
    mib: {
        mibs: [],        // Array of { parsed, moduleName } — one per loaded MIB
        merged: null,    // Computed merged view: { objects, stats, moduleNames, moduleIdentities }
        selectedFm: [], selectedPm: [], selectedCm: [],
        isApplied: false
    }
};

// Initialize E2E Generator features when DOM is ready
function initE2EGenerator() {
    // Auto-trim whitespace on blur for text inputs and textareas
    const autoTrimFields = [
        'e2eProjectName', 'e2eProjectDesc', 'e2eSourceName', 'e2eSourceConn', 'e2eSourceSchema',
        'e2eDestName', 'e2eDestConn', 'e2eDestSchema'
    ];

    autoTrimFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            // Remove existing listener if any
            field.removeEventListener('blur', field._trimHandler);
            // Create and store handler
            field._trimHandler = function() {
                this.value = this.value.trim();
                // Clear error highlight when user corrects the field
                if (this.value && this.classList.contains('field-error')) {
                    this.classList.remove('field-error');
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                }
            };
            field.addEventListener('blur', field._trimHandler);
        }
    });

    console.log('E2E Generator initialized with auto-trim on', autoTrimFields.length, 'fields');

    // Initialize MIB Analysis feature
    initMibAnalysis();
}

// ==========================================
// MIB ANALYSIS (E2E Generator Phase 1)
// ==========================================

function initMibAnalysis() {
    // Populate sample MIB dropdown
    const sampleSelect = document.getElementById('mibSampleSelect');
    if (sampleSelect && typeof SampleMIBs !== 'undefined') {
        SampleMIBs.getList().forEach(mib => {
            const opt = document.createElement('option');
            opt.value = mib.id;
            opt.textContent = `${mib.name} - ${mib.description}`;
            sampleSelect.appendChild(opt);
        });
    }

    // File upload - browse
    const fileInput = document.getElementById('mibFileInput');
    const uploadZone = document.getElementById('mibUploadZone');

    if (uploadZone) {
        uploadZone.addEventListener('click', () => fileInput?.click());

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) handleMibFile(file);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleMibFile(file);
        });
    }

    // Load sample button
    document.getElementById('mibLoadSampleBtn')?.addEventListener('click', () => {
        const select = document.getElementById('mibSampleSelect');
        const id = select?.value;
        if (!id) {
            ToastManager.warning('No Selection', 'Please select a sample MIB first.');
            return;
        }
        const content = SampleMIBs.get(id);
        if (content) {
            parseMibContent(content);
        }
    });

    // Category tab switching
    document.querySelectorAll('.mib-cat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.mib-cat-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.mib-cat-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const cat = tab.dataset.cat;
            document.querySelector(`.mib-cat-panel[data-cat-panel="${cat}"]`)?.classList.add('active');
        });
    });

    // Select-all checkboxes
    ['Fm', 'Pm', 'Cm'].forEach(cat => {
        document.getElementById(`mibSelectAll${cat}`)?.addEventListener('change', (e) => {
            const listId = `mib${cat}List`;
            document.querySelectorAll(`#${listId} input[type="checkbox"]`).forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    });

    // Apply to Integration button
    document.getElementById('mibApplyBtn')?.addEventListener('click', applyMibToIntegration);

    // Clear MIB Data button
    document.getElementById('mibClearBtn')?.addEventListener('click', clearMibData);

    // Clear All MIBs button (in loaded panel)
    document.getElementById('mibClearAllBtn')?.addEventListener('click', clearMibData);

    // Chip remove buttons — event delegation on chips container
    document.getElementById('mibChips')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.mib-chip-remove');
        if (!btn) return;
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx)) removeMib(idx);
    });

    console.log('MIB Analysis initialized');
}

function handleMibFile(file) {
    // Validate extension
    const validExts = ['.mib', '.txt', '.my'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExts.includes(ext)) {
        ToastManager.error('Invalid File', `Unsupported file type: ${ext}. Use .mib, .txt, or .my`);
        return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        ToastManager.error('File Too Large', 'MIB file must be under 2MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => parseMibContent(e.target.result);
    reader.onerror = () => ToastManager.error('Read Error', 'Could not read the file.');
    reader.readAsText(file);
}

function mergeMibs(mibs) {
    const seenOids = new Set();
    const objects = [];
    const moduleIdentities = [];

    mibs.forEach(({ parsed, moduleName }) => {
        if (parsed.moduleIdentity) {
            moduleIdentities.push({ moduleName, ...parsed.moduleIdentity });
        }
        (parsed.objects || []).forEach(obj => {
            if (!seenOids.has(obj.oid)) {
                seenOids.add(obj.oid);
                objects.push({ ...obj, sourceMib: moduleName });
            }
        });
    });

    const fm = objects.filter(o => o.category === 'FM').length;
    const pm = objects.filter(o => o.category === 'PM').length;
    const cm = objects.filter(o => o.category === 'CM').length;

    return {
        objects,
        stats: { total: objects.length, fm, pm, cm },
        moduleNames: mibs.map(m => m.moduleName),
        moduleIdentities
    };
}

function renderLoadedMibsPanel() {
    const panel = document.getElementById('mibLoadedList');
    const chipsEl = document.getElementById('mibChips');
    if (!panel || !chipsEl) return;

    const mibs = e2eState.mib.mibs;
    const uploadLabel = document.getElementById('mibUploadZoneLabel');

    if (mibs.length === 0) {
        panel.style.display = 'none';
        if (uploadLabel) uploadLabel.textContent = 'Drag & drop MIB file here, or click to browse';
        return;
    }

    panel.style.display = 'block';
    if (uploadLabel) uploadLabel.textContent = 'Drag & drop to add another MIB';

    chipsEl.innerHTML = mibs.map((m, i) => `
        <span class="mib-chip">
            ${escapeHtml(m.moduleName)}
            <button class="mib-chip-remove" data-index="${i}" title="Remove ${escapeHtml(m.moduleName)}">&#215;</button>
        </span>
    `).join('');
}

function removeMib(index) {
    e2eState.mib.mibs.splice(index, 1);

    if (e2eState.mib.mibs.length === 0) {
        e2eState.mib.merged = null;
        document.getElementById('mibResults').style.display = 'none';
        renderLoadedMibsPanel();
        ToastManager.info('Removed', 'All MIBs cleared.');
        return;
    }

    e2eState.mib.merged = mergeMibs(e2eState.mib.mibs);
    renderMibResults(e2eState.mib.merged);
    renderLoadedMibsPanel();
    ToastManager.info('Removed', `MIB removed. ${e2eState.mib.mibs.length} MIB(s) still loaded.`);
}

function parseMibContent(text) {
    const statusEl = document.getElementById('mibParseStatus');
    const resultsEl = document.getElementById('mibResults');

    // Show parsing status
    if (statusEl) statusEl.style.display = 'flex';
    if (resultsEl) resultsEl.style.display = 'none';

    // Use setTimeout to let the UI update before parsing
    setTimeout(() => {
        try {
            const parsed = MIBParser.parse(text);
            const moduleName = parsed.moduleName;

            // Duplicate check
            if (e2eState.mib.mibs.some(m => m.moduleName === moduleName)) {
                if (statusEl) statusEl.style.display = 'none';
                ToastManager.warning('Already Loaded', `${moduleName} is already in the MIB library.`);
                return;
            }

            e2eState.mib.mibs.push({ parsed, moduleName });
            e2eState.mib.merged = mergeMibs(e2eState.mib.mibs);

            renderMibResults(e2eState.mib.merged);
            renderLoadedMibsPanel();

            if (statusEl) statusEl.style.display = 'none';
            if (resultsEl) resultsEl.style.display = 'block';

            const merged = e2eState.mib.merged;
            ToastManager.success('MIB Loaded', `${moduleName} added. Total: ${merged.stats.total} objects (${merged.stats.fm} FM, ${merged.stats.pm} PM, ${merged.stats.cm} CM) across ${merged.moduleNames.length} MIB(s).`);
        } catch (err) {
            if (statusEl) statusEl.style.display = 'none';
            ToastManager.error('Parse Error', err.message);
        }
    }, 100);
}

function renderMibResults(merged) {
    // Update stats
    document.getElementById('mibStatTotal').textContent = merged.stats.total;
    document.getElementById('mibStatFm').textContent = merged.stats.fm;
    document.getElementById('mibStatPm').textContent = merged.stats.pm;
    document.getElementById('mibStatCm').textContent = merged.stats.cm;

    // Update badges
    document.getElementById('mibCatBadgeFm').textContent = merged.stats.fm;
    document.getElementById('mibCatBadgePm').textContent = merged.stats.pm;
    document.getElementById('mibCatBadgeCm').textContent = merged.stats.cm;

    // Module info
    const moduleInfo = document.getElementById('mibModuleInfo');
    if (moduleInfo) {
        if (merged.moduleNames.length === 1) {
            const identity = merged.moduleIdentities?.[0];
            moduleInfo.innerHTML = `<strong>Module:</strong> ${escapeHtml(merged.moduleNames[0])}` +
                (identity?.organization ? ` | <strong>Org:</strong> ${escapeHtml(identity.organization)}` : '') +
                (identity?.description ? `<br><span class="tag-sm">${escapeHtml(identity.description)}</span>` : '');
        } else {
            moduleInfo.innerHTML = `<strong>Modules (${merged.moduleNames.length}):</strong> ${merged.moduleNames.map(escapeHtml).join(', ')}`;
        }
    }

    // Render object lists
    const fmObjects = merged.objects.filter(o => o.category === 'FM');
    const pmObjects = merged.objects.filter(o => o.category === 'PM');
    const cmObjects = merged.objects.filter(o => o.category === 'CM');

    renderMibObjectList('mibFmList', fmObjects);
    renderMibObjectList('mibPmList', pmObjects);
    renderMibObjectList('mibCmList', cmObjects);

    // Reset select-all checkboxes
    ['Fm', 'Pm', 'Cm'].forEach(cat => {
        const cb = document.getElementById(`mibSelectAll${cat}`);
        if (cb) cb.checked = true;
    });
}

function renderMibObjectList(containerId, objects) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (objects.length === 0) {
        container.innerHTML = '<div class="empty-center">No objects in this category</div>';
        return;
    }

    container.innerHTML = objects.map(obj => `
        <div class="mib-object-row">
            <input type="checkbox" checked data-obj-name="${escapeHtml(obj.name)}" data-obj-oid="${escapeHtml(obj.oid)}">
            <div>
                <div class="mib-obj-name">${escapeHtml(obj.name)}</div>
                <div class="mib-obj-desc" title="${escapeHtml(obj.description)}">${escapeHtml(obj.description)}</div>
            </div>
            <div class="mib-obj-syntax">${escapeHtml(obj.syntax)}</div>
            <div class="mib-obj-oid" title="${escapeHtml(obj.oid)}">${escapeHtml(obj.oid)}</div>
            <div class="mib-obj-source" title="${escapeHtml(obj.sourceMib || '')}">${escapeHtml(obj.sourceMib || '')}</div>
        </div>
    `).join('');
}

function applyMibToIntegration() {
    const merged = e2eState.mib.merged;
    if (!merged) {
        ToastManager.warning('No MIB Data', 'Load a MIB file first.');
        return;
    }

    // Collect selected objects from each category
    const selectedFm = getSelectedMibObjects('mibFmList');
    const selectedPm = getSelectedMibObjects('mibPmList');
    const selectedCm = getSelectedMibObjects('mibCmList');

    e2eState.mib.selectedFm = selectedFm;
    e2eState.mib.selectedPm = selectedPm;
    e2eState.mib.selectedCm = selectedCm;
    e2eState.mib.isApplied = true;

    const allSelected = [...selectedFm, ...selectedPm, ...selectedCm];
    if (allSelected.length === 0) {
        ToastManager.warning('No Objects Selected', 'Select at least one MIB object to apply.');
        return;
    }

    // Auto-populate Source System
    const sourceTypeEl = document.getElementById('e2eSourceType');
    const sourceNameEl = document.getElementById('e2eSourceName');
    const sourceFormatEl = document.getElementById('e2eSourceFormat');
    const sourceConnEl = document.getElementById('e2eSourceConn');
    const sourceSchemaEl = document.getElementById('e2eSourceSchema');

    if (sourceTypeEl) sourceTypeEl.value = 'ems';
    if (sourceNameEl) sourceNameEl.value = merged.moduleNames.join(', ');
    if (sourceFormatEl) sourceFormatEl.value = 'json';
    if (sourceConnEl) sourceConnEl.value = 'snmp://host:161';

    // Build source schema as OID listing, grouped by source MIB
    let schemaText = `-- SNMP Objects from ${merged.moduleNames.length} MIB(s): ${merged.moduleNames.join(', ')} --\n`;
    const byMib = {};
    allSelected.forEach(o => {
        const src = o.sourceMib || 'Unknown';
        if (!byMib[src]) byMib[src] = { FM: [], PM: [], CM: [] };
        byMib[src][o.category]?.push(o);
    });
    Object.entries(byMib).forEach(([mibName, cats]) => {
        schemaText += `\n-- ${mibName} --\n`;
        if (cats.FM.length > 0) {
            schemaText += '-- FM (Fault Management) --\n';
            cats.FM.forEach(o => { schemaText += `${o.name}: ${o.oid}\n`; });
        }
        if (cats.PM.length > 0) {
            schemaText += '-- PM (Performance Management) --\n';
            cats.PM.forEach(o => { schemaText += `${o.name}: ${o.oid}\n`; });
        }
        if (cats.CM.length > 0) {
            schemaText += '-- CM (Configuration Management) --\n';
            cats.CM.forEach(o => { schemaText += `${o.name}: ${o.oid}\n`; });
        }
    });
    if (sourceSchemaEl) sourceSchemaEl.value = schemaText;

    // Set integration type
    const intTypeEl = document.getElementById('e2eIntegrationType');
    if (intTypeEl) {
        if (selectedFm.length > 0 && selectedPm.length > 0) {
            intTypeEl.value = 'hybrid';
        } else if (selectedFm.length > 0) {
            intTypeEl.value = 'realtime';
        } else {
            intTypeEl.value = 'etl';
        }
    }

    // Generate data mappings
    const mappingContainer = document.getElementById('e2eMappingRows');
    if (mappingContainer) {
        mappingContainer.innerHTML = '';

        // FM mappings - lookup style
        selectedFm.forEach(obj => {
            addMappingRow(mappingContainer, obj.oid, toCamelCase(obj.name) + 'Event', 'lookup');
        });

        // PM mappings - format/convert style
        selectedPm.forEach(obj => {
            addMappingRow(mappingContainer, obj.oid, toCamelCase(obj.name), 'format');
        });

        // CM mappings - direct copy
        selectedCm.forEach(obj => {
            addMappingRow(mappingContainer, obj.oid, toCamelCase(obj.name), 'direct');
        });
    }

    // Generate business rules
    const rulesContainer = document.getElementById('e2eRulesRows');
    if (rulesContainer) {
        rulesContainer.innerHTML = '';

        if (selectedFm.length > 0) {
            addRuleRow(rulesContainer, 'Alarm Correlation',
                'filter',
                'Correlate related alarms within a 30-second window. Suppress duplicate trap OIDs and identify root cause alarm.');
            addRuleRow(rulesContainer, 'Severity Mapping',
                'transform',
                'Map SNMP trap severity to OSS alarm severity: Critical→1, Major→2, Minor→3, Warning→4, Clear→5');
        }

        if (selectedPm.length > 0) {
            addRuleRow(rulesContainer, 'KPI Calculation',
                'transform',
                'Calculate success rates from attempt/success counter pairs. Formula: (success/attempts)*100. Apply 15-min aggregation window.');
        }

        if (selectedCm.length > 0) {
            addRuleRow(rulesContainer, 'Threshold Validation',
                'validate',
                'Validate configuration values against allowed ranges. Flag out-of-range values for review before applying.');
        }
    }

    // Set scheduling based on content
    const schedEl = document.getElementById('e2eScheduling');
    if (schedEl) {
        schedEl.value = selectedFm.length > 0 ? 'realtime' : 'hourly';
    }

    // Open relevant sections to show populated data
    const sourceSection = document.querySelector('.req-section[data-section="source"]');
    const mappingSection = document.querySelector('.req-section[data-section="mapping"]');
    if (sourceSection) sourceSection.classList.add('active');
    if (mappingSection) mappingSection.classList.add('active');

    ToastManager.success('MIB Applied', `${allSelected.length} objects applied. Source config, ${allSelected.length} mappings, and business rules auto-generated.`);
}

function getSelectedMibObjects(containerId) {
    const selected = [];
    const merged = e2eState.mib.merged;
    if (!merged) return selected;

    document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`).forEach(cb => {
        const name = cb.dataset.objName;
        const obj = merged.objects.find(o => o.name === name);
        if (obj) selected.push(obj);
    });

    return selected;
}

function addMappingRow(container, sourceField, destField, transformType) {
    const row = document.createElement('div');
    row.className = 'mapping-row';
    row.innerHTML = `
        <input type="text" value="${escapeHtml(sourceField)}" placeholder="source_field">
        <input type="text" value="${escapeHtml(destField)}" placeholder="dest_field">
        <select>
            <option value="direct" ${transformType === 'direct' ? 'selected' : ''}>Direct Copy</option>
            <option value="concat" ${transformType === 'concat' ? 'selected' : ''}>Concatenate</option>
            <option value="split" ${transformType === 'split' ? 'selected' : ''}>Split</option>
            <option value="lookup" ${transformType === 'lookup' ? 'selected' : ''}>Lookup</option>
            <option value="format" ${transformType === 'format' ? 'selected' : ''}>Format/Convert</option>
            <option value="custom" ${transformType === 'custom' ? 'selected' : ''}>Custom Logic</option>
        </select>
        <button class="btn-icon btn-remove-mapping" title="Remove">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    container.appendChild(row);
    attachRemoveMappingHandler(row.querySelector('.btn-remove-mapping'));
}

function addRuleRow(container, ruleName, action, condition) {
    const row = document.createElement('div');
    row.className = 'rule-row';
    row.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Rule Name</label>
                <input type="text" value="${escapeHtml(ruleName)}">
            </div>
            <div class="form-group">
                <label>Action</label>
                <select>
                    <option value="filter" ${action === 'filter' ? 'selected' : ''}>Filter/Exclude</option>
                    <option value="transform" ${action === 'transform' ? 'selected' : ''}>Transform</option>
                    <option value="route" ${action === 'route' ? 'selected' : ''}>Route/Split</option>
                    <option value="aggregate" ${action === 'aggregate' ? 'selected' : ''}>Aggregate</option>
                    <option value="enrich" ${action === 'enrich' ? 'selected' : ''}>Enrich</option>
                    <option value="validate" ${action === 'validate' ? 'selected' : ''}>Validate</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Condition / Logic</label>
            <textarea>${escapeHtml(condition)}</textarea>
        </div>
    `;
    container.appendChild(row);
}

function toCamelCase(name) {
    return name.replace(/([A-Z])/g, (m, c, i) => i === 0 ? c.toLowerCase() : c).replace(/[-_](.)/g, (m, c) => c.toUpperCase());
}

function clearMibData() {
    e2eState.mib = {
        mibs: [],
        merged: null,
        selectedFm: [], selectedPm: [], selectedCm: [],
        isApplied: false
    };

    document.getElementById('mibResults').style.display = 'none';
    document.getElementById('mibParseStatus').style.display = 'none';
    document.getElementById('mibFileInput').value = '';
    document.getElementById('mibSampleSelect').value = '';

    renderLoadedMibsPanel();

    // Hide SNMP artifact card
    const snmpCard = document.getElementById('snmpArtifactCard');
    if (snmpCard) snmpCard.style.display = 'none';

    ToastManager.info('Cleared', 'MIB data cleared.');
}

// Call init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initE2EGenerator);
} else {
    initE2EGenerator();
}

// Phase Navigation
document.querySelectorAll('.phase-step').forEach(step => {
    step.addEventListener('click', () => {
        const phase = parseInt(step.dataset.phase);
        if (phase <= e2eState.currentPhase || step.classList.contains('completed')) {
            goToPhase(phase);
        }
    });
});

function goToPhase(phase) {
    // Update phase steps
    document.querySelectorAll('.phase-step').forEach(s => {
        s.classList.remove('active');
        if (parseInt(s.dataset.phase) < phase) {
            s.classList.add('completed');
        }
    });
    document.querySelector(`.phase-step[data-phase="${phase}"]`).classList.add('active');

    // Update phase panels
    document.querySelectorAll('.phase-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`phase${phase}`).classList.add('active');

    e2eState.currentPhase = phase;
}

// Requirements Section Accordion
document.querySelectorAll('.req-section-header').forEach(header => {
    header.addEventListener('click', () => {
        const section = header.closest('.req-section');
        section.classList.toggle('active');
    });
});

// Add Field Mapping
document.getElementById('e2eAddMappingBtn')?.addEventListener('click', () => {
    const container = document.getElementById('e2eMappingRows');
    const row = document.createElement('div');
    row.className = 'mapping-row';
    row.innerHTML = `
        <input type="text" placeholder="source_field">
        <input type="text" placeholder="dest_field">
        <select>
            <option value="direct">Direct Copy</option>
            <option value="concat">Concatenate</option>
            <option value="split">Split</option>
            <option value="lookup">Lookup</option>
            <option value="format">Format/Convert</option>
            <option value="custom">Custom Logic</option>
        </select>
        <button class="btn-icon btn-remove-mapping" title="Remove">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    container.appendChild(row);
    attachRemoveMappingHandler(row.querySelector('.btn-remove-mapping'));
});

// Remove Mapping Handler
function attachRemoveMappingHandler(btn) {
    btn?.addEventListener('click', () => {
        btn.closest('.mapping-row').remove();
    });
}

document.querySelectorAll('.btn-remove-mapping').forEach(attachRemoveMappingHandler);

// Add Business Rule
document.getElementById('e2eAddRuleBtn')?.addEventListener('click', () => {
    const container = document.getElementById('e2eRulesRows');
    const row = document.createElement('div');
    row.className = 'rule-row';
    row.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Rule Name</label>
                <input type="text" placeholder="e.g., Filter Invalid Records">
            </div>
            <div class="form-group">
                <label>Action</label>
                <select>
                    <option value="filter">Filter/Exclude</option>
                    <option value="transform">Transform</option>
                    <option value="route">Route/Split</option>
                    <option value="aggregate">Aggregate</option>
                    <option value="enrich">Enrich</option>
                    <option value="validate">Validate</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Condition / Logic</label>
            <textarea placeholder="e.g., WHERE status = 'ACTIVE' AND amount > 0"></textarea>
        </div>
    `;
    container.appendChild(row);
});

// Helper function to trim whitespace from input fields
function trimFieldValue(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.value = el.value.trim();
        return el.value;
    }
    return '';
}

// Helper function to highlight field with error
function highlightFieldError(elementId, hasError) {
    const el = document.getElementById(elementId);
    if (el) {
        if (hasError) {
            el.classList.add('field-error');
            el.style.borderColor = '#ef4444';
            el.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
        } else {
            el.classList.remove('field-error');
            el.style.borderColor = '';
            el.style.boxShadow = '';
        }
    }
}

// Clear all field error highlights
function clearFieldErrors() {
    const fields = [
        'e2eProjectName', 'e2eSourceName', 'e2eSourceConn', 'e2eSourceSchema',
        'e2eDestName', 'e2eDestConn', 'e2eDestSchema'
    ];
    fields.forEach(id => highlightFieldError(id, false));
}

// Collect Requirements Data
function collectRequirements() {
    // Project Details - auto-trim all text fields
    e2eState.project.name = trimFieldValue('e2eProjectName') || 'Integration-Project';
    e2eState.project.description = trimFieldValue('e2eProjectDesc') || '';
    e2eState.project.type = document.getElementById('e2eIntegrationType')?.value || 'etl';
    e2eState.project.pattern = document.getElementById('e2ePattern')?.value || 'point-to-point';

    e2eState.project.techStack = [];
    if (document.getElementById('e2eTechJava')?.checked) e2eState.project.techStack.push('java');
    if (document.getElementById('e2eTechPython')?.checked) e2eState.project.techStack.push('python');
    if (document.getElementById('e2eTechNode')?.checked) e2eState.project.techStack.push('nodejs');
    if (e2eState.project.techStack.length === 0) e2eState.project.techStack.push('java');

    // Source System - auto-trim connection and schema fields
    e2eState.source.type = document.getElementById('e2eSourceType')?.value || 'database';
    e2eState.source.name = trimFieldValue('e2eSourceName') || 'Source System';
    e2eState.source.format = document.getElementById('e2eSourceFormat')?.value || 'json';
    e2eState.source.connection = trimFieldValue('e2eSourceConn') || '';
    e2eState.source.schema = trimFieldValue('e2eSourceSchema') || '';

    // Destination System - auto-trim connection and schema fields
    e2eState.destination.type = document.getElementById('e2eDestType')?.value || 'api';
    e2eState.destination.name = trimFieldValue('e2eDestName') || 'Destination System';
    e2eState.destination.format = document.getElementById('e2eDestFormat')?.value || 'json';
    e2eState.destination.connection = trimFieldValue('e2eDestConn') || '';
    e2eState.destination.schema = trimFieldValue('e2eDestSchema') || '';

    // Mappings
    e2eState.mappings = [];
    document.querySelectorAll('#e2eMappingRows .mapping-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const select = row.querySelector('select');
        if (inputs[0]?.value && inputs[1]?.value) {
            e2eState.mappings.push({
                source: inputs[0].value,
                destination: inputs[1].value,
                transformation: select?.value || 'direct'
            });
        }
    });

    // Business Rules
    e2eState.rules = [];
    document.querySelectorAll('#e2eRulesRows .rule-row').forEach(row => {
        const name = row.querySelector('input')?.value;
        const action = row.querySelector('select')?.value;
        const condition = row.querySelector('textarea')?.value;
        if (name && condition) {
            e2eState.rules.push({ name, action, condition });
        }
    });

    // Technical Requirements
    e2eState.technical.errorHandling = document.getElementById('e2eErrorHandling')?.value || 'retry';
    e2eState.technical.logging = document.getElementById('e2eLogging')?.value || 'info';
    e2eState.technical.scheduling = document.getElementById('e2eScheduling')?.value || 'realtime';
    e2eState.technical.performance = parseInt(document.getElementById('e2ePerformance')?.value) || 1000;

    e2eState.technical.security = [];
    if (document.getElementById('e2eSecEncrypt')?.checked) e2eState.technical.security.push('encryption');
    if (document.getElementById('e2eSecAuth')?.checked) e2eState.technical.security.push('auth');
    if (document.getElementById('e2eSecMask')?.checked) e2eState.technical.security.push('masking');
    if (document.getElementById('e2eSecAudit')?.checked) e2eState.technical.security.push('audit');
}

// Validate Requirements
function validateRequirements() {
    const errors = [];
    const warnings = [];

    // Clear previous error highlights
    clearFieldErrors();

    // Project Name (mandatory)
    const projectName = document.getElementById('e2eProjectName')?.value?.trim();
    if (!projectName) {
        errors.push('Project Name is required');
        highlightFieldError('e2eProjectName', true);
    }

    // Integration Type (mandatory)
    if (!document.getElementById('e2eIntegrationType')?.value) {
        errors.push('Integration Type is required');
    }

    // Integration Pattern (mandatory)
    if (!document.getElementById('e2ePattern')?.value) {
        errors.push('Integration Pattern is required');
    }

    // Source System Type (mandatory)
    if (!document.getElementById('e2eSourceType')?.value) {
        errors.push('Source System Type is required');
    }

    // Source Name (mandatory)
    const sourceName = document.getElementById('e2eSourceName')?.value?.trim();
    if (!sourceName) {
        errors.push('Source System Name is required');
        highlightFieldError('e2eSourceName', true);
    }

    // Source Schema (mandatory - highlight if blank)
    const sourceSchema = document.getElementById('e2eSourceSchema')?.value?.trim();
    if (!sourceSchema) {
        errors.push('Source Schema is required - please define the source data structure');
        highlightFieldError('e2eSourceSchema', true);
    }

    // Destination System Type (mandatory)
    if (!document.getElementById('e2eDestType')?.value) {
        errors.push('Destination System Type is required');
    }

    // Destination Name (mandatory)
    const destName = document.getElementById('e2eDestName')?.value?.trim();
    if (!destName) {
        errors.push('Destination System Name is required');
        highlightFieldError('e2eDestName', true);
    }

    // Destination Schema (mandatory - highlight if blank)
    const destSchema = document.getElementById('e2eDestSchema')?.value?.trim();
    if (!destSchema) {
        errors.push('Destination Schema is required - please define the target data structure');
        highlightFieldError('e2eDestSchema', true);
    }

    // Check for at least one mapping
    const mappingRows = document.querySelectorAll('#e2eMappingRows .mapping-row');
    let hasValidMapping = false;
    mappingRows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs[0]?.value?.trim() && inputs[1]?.value?.trim()) {
            hasValidMapping = true;
        }
    });
    if (!hasValidMapping) {
        errors.push('At least one field mapping is required');
    }

    // Warning: Business Rules (optional but recommended)
    const ruleRows = document.querySelectorAll('#e2eRulesRows .rule-row');
    let hasValidRule = false;
    ruleRows.forEach(row => {
        const name = row.querySelector('input')?.value?.trim();
        const condition = row.querySelector('textarea')?.value?.trim();
        if (name && condition) {
            hasValidRule = true;
        }
    });
    if (!hasValidRule) {
        warnings.push('No business rules defined - consider adding validation or transformation rules');
    }

    // Warning: Security Requirements (optional but recommended)
    const securityChecks = [
        document.getElementById('e2eSecEncrypt')?.checked,
        document.getElementById('e2eSecAuth')?.checked,
        document.getElementById('e2eSecMask')?.checked,
        document.getElementById('e2eSecAudit')?.checked
    ];
    const hasSecurityEnabled = securityChecks.some(checked => checked === true);
    if (!hasSecurityEnabled) {
        warnings.push('No security requirements selected - consider enabling encryption, authentication, or data masking');
    }

    return { errors, warnings };
}

// Phase 1 -> Phase 2 (Generate Design)
const nextPhase1Btn = document.getElementById('e2eNextPhase1Btn');
if (nextPhase1Btn) {
    nextPhase1Btn.addEventListener('click', () => {
        console.log('Generate Design button clicked');

        const validationResult = validateRequirements();
        const errors = validationResult.errors || [];
        const warnings = validationResult.warnings || [];

        console.log('Validation errors:', errors);
        console.log('Validation warnings:', warnings);

        // Show errors first - these block progression
        if (errors.length > 0) {
            ToastManager.error('Validation Error', errors.join('. '));
            // Scroll to first error field
            const firstErrorField = document.querySelector('.field-error');
            if (firstErrorField) {
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstErrorField.focus();
            }
            return;
        }

        // Show warnings but allow progression
        if (warnings.length > 0) {
            warnings.forEach(warning => {
                ToastManager.warning('Warning', warning);
            });
        }

        collectRequirements();
        generateDesign();
        goToPhase(2);
        ToastManager.success('Design Generated', 'Solution architecture created based on your requirements.');
    });
} else {
    console.error('e2eNextPhase1Btn not found in DOM');
}

// Generate Design (Phase 2)
function generateDesign() {
    generateFlowDiagram();
    generateArchDiagram();
    generateComponentBreakdown();
    generateDataflowSpec();
}

function generateFlowDiagram() {
    const { source, destination, project, mappings, rules, mib } = e2eState;

    let mermaidCode;

    if (mib.isApplied) {
        // SNMP-specific flow diagram
        mermaidCode = `flowchart LR
    subgraph NE["${source.name}"]
        S1[("EMS\\nSNMP Agent")]
    end

    subgraph Collection["SNMP Collection"]
        TR[Trap Receiver]
        PL[SNMP Poller]
    end

    subgraph Processing["Processing Layer"]
        AC[Alarm Correlator]
        KPI[KPI Calculator]
        TF[Transformer]
    end

    subgraph Destination["${destination.name || 'OSS/NMS'}"]
        D1[("${getSystemIcon(destination.type)}\\n${destination.type.toUpperCase() || 'TARGET'}")]
    end

    S1 -->|Traps| TR
    S1 <-->|GET/WALK| PL
    TR --> AC
    AC --> TF
    PL --> KPI
    KPI --> TF
    TF --> D1`;
    } else {
        mermaidCode = `flowchart LR
    subgraph Source["${source.name}"]
        S1[("${getSystemIcon(source.type)}\\n${source.type.toUpperCase()}")]
    end

    subgraph Integration["Integration Layer"]
        E[Extract]
        T[Transform]
        V[Validate]
        L[Load]
    end

    subgraph Destination["${destination.name}"]
        D1[("${getSystemIcon(destination.type)}\\n${destination.type.toUpperCase()}")]
    end

    S1 --> E
    E --> T
    T --> V
    V --> L
    L --> D1`;
    }

    if (e2eState.technical.errorHandling === 'deadletter') {
        mermaidCode += `\n    TF -->|Error| DLQ[Dead Letter Queue]`;
    } else if (e2eState.technical.errorHandling === 'retry') {
        mermaidCode += mib.isApplied ? `\n    TF -->|Retry| PL` : `\n    V -->|Retry| E`;
    }

    document.getElementById('flowMermaidCode').value = mermaidCode;
    renderMermaid('flowDiagram', mermaidCode);
}

function generateArchDiagram() {
    const { source, destination, project, technical, mib } = e2eState;
    const techStack = project.techStack[0] || 'java';

    let mermaidCode = `graph TB
    subgraph Source["Source Systems"]
        S1["${source.name}<br/>${source.type}"]
    end

    subgraph Integration["Integration Platform"]`;

    if (mib.isApplied) {
        mermaidCode += `
        subgraph SNMP["SNMP Layer"]
            STR["SNMP Trap Receiver<br/>UDP 162"]
            SPL["SNMP Poller<br/>GET/WALK"]
            MIB["MIB Store<br/>OID Resolution"]
        end
        AC1["Alarm Correlator"]
        KPI1["KPI Calculator"]`;
    }

    mermaidCode += `
        C1["Connector<br/>${techStack === 'java' ? 'Spring Integration' : techStack === 'python' ? 'Apache Airflow' : 'Node.js'}"]
        T1["Transformer<br/>Data Mapping"]
        V1["Validator<br/>Business Rules"]`;

    if (technical.security.includes('encryption')) {
        mermaidCode += `\n        SEC["Security<br/>Encryption"]`;
    }

    mermaidCode += `
    end

    subgraph Destination["Destination Systems"]
        D1["${destination.name}<br/>${destination.type}"]
    end

    subgraph Monitoring["Observability"]
        M1["Metrics<br/>Prometheus"]
        M2["Logs<br/>ELK Stack"]
    end`;

    if (mib.isApplied) {
        mermaidCode += `
    S1 -->|Traps| STR
    S1 <-->|SNMP| SPL
    STR --> AC1
    SPL --> KPI1
    MIB -.-> STR
    MIB -.-> SPL
    AC1 --> C1
    KPI1 --> C1`;
    } else {
        mermaidCode += `\n    S1 --> C1`;
    }

    mermaidCode += `
    C1 --> T1
    T1 --> V1`;

    if (technical.security.includes('encryption')) {
        mermaidCode += `\n    V1 --> SEC\n    SEC --> D1`;
    } else {
        mermaidCode += `\n    V1 --> D1`;
    }

    mermaidCode += `\n    C1 -.-> M1\n    C1 -.-> M2`;

    document.getElementById('archMermaidCode').value = mermaidCode;
    renderMermaid('archDiagram', mermaidCode);
}

function getSystemIcon(type) {
    const icons = {
        database: 'DB',
        api: 'API',
        file: 'FILE',
        mq: 'MQ',
        ftp: 'FTP',
        ems: 'EMS',
        oss: 'OSS'
    };
    return icons[type] || 'SYS';
}

function renderMermaid(containerId, code) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const encoded = btoa(unescape(encodeURIComponent(code)));
        const liveUrl = 'https://mermaid.live/edit#base64:' + encoded;
        container.innerHTML =
            '<div class="mermaid-placeholder">' +
            '<p class="mermaid-placeholder-text">Diagram code generated successfully.</p>' +
            '<a href="' + liveUrl + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Open in Mermaid Live Editor</a>' +
            '</div>';
    } catch (err) {
        container.innerHTML = '<div class="mermaid-placeholder"><p class="mermaid-placeholder-text">Copy the Mermaid code below and paste into mermaid.live to view the diagram.</p></div>';
    }
}

function generateComponentBreakdown() {
    const { project, source, destination, technical, mib } = e2eState;
    const techStack = project.techStack[0] || 'java';

    const snmpTech = techStack === 'java' ? 'SNMP4J' : techStack === 'python' ? 'pysnmp' : 'net-snmp';

    const components = [];

    // Add SNMP-specific components when MIB is applied
    if (mib.isApplied) {
        components.push(
            { name: 'SNMP Trap Receiver', purpose: 'Receive SNMP traps on UDP 162', tech: snmpTech, deps: 'MIB Store, Config' },
            { name: 'SNMP Poller', purpose: 'Poll OIDs via GET/WALK', tech: snmpTech, deps: 'MIB Store, Scheduling' },
            { name: 'MIB Store', purpose: 'OID resolution and metadata', tech: 'In-Memory / File', deps: 'MIB Files' },
            { name: 'Alarm Correlator', purpose: 'Correlate and deduplicate alarms', tech: 'Custom Rules Engine', deps: 'Trap Receiver, Config' },
            { name: 'KPI Calculator', purpose: 'Derive KPIs from counters', tech: 'Custom Aggregation', deps: 'SNMP Poller, Config' }
        );
    }

    components.push(
        { name: 'Source Connector', purpose: `Connect to ${source.name}`, tech: mib.isApplied ? snmpTech : getConnectorTech(source.type, techStack), deps: 'Config, Logging' },
        { name: 'Data Extractor', purpose: `Extract ${source.format} data`, tech: getExtractorTech(source.format, techStack), deps: 'Source Connector' },
        { name: 'Data Transformer', purpose: 'Apply field mappings', tech: getTransformTech(techStack), deps: 'Schema Definitions' },
        { name: 'Business Rules Engine', purpose: 'Apply business rules', tech: getRulesTech(techStack), deps: 'Configuration' },
        { name: 'Data Validator', purpose: 'Validate transformed data', tech: 'JSON Schema / XSD', deps: 'Schema Definitions' },
        { name: 'Destination Connector', purpose: `Connect to ${destination.name}`, tech: getConnectorTech(destination.type, techStack), deps: 'Config, Auth' },
        { name: 'Data Loader', purpose: `Load ${destination.format} data`, tech: getLoaderTech(destination.type, techStack), deps: 'Destination Connector' },
        { name: 'Error Handler', purpose: technical.errorHandling, tech: 'Custom Implementation', deps: 'Logging, Alerting' },
        { name: 'Monitoring', purpose: 'Metrics & Logging', tech: 'Prometheus, Grafana', deps: 'All Components' }
    );

    let html = `<table class="tbl-md">
        <thead>
            <tr>
                <th class="tbl-md-hd">Component</th>
                <th class="tbl-md-hd">Purpose</th>
                <th class="tbl-md-hd">Technology</th>
                <th class="tbl-md-hd">Dependencies</th>
            </tr>
        </thead>
        <tbody>`;

    components.forEach(c => {
        html += `<tr>
            <td class="tbl-md-td fw-500">${c.name}</td>
            <td class="tbl-md-td muted">${c.purpose}</td>
            <td class="tbl-md-td"><code>${c.tech}</code></td>
            <td class="tbl-md-td muted-sm">${c.deps}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('componentTable').innerHTML = html;
}

function getConnectorTech(type, stack) {
    const connectors = {
        java: { database: 'JDBC / JPA', api: 'RestTemplate / WebClient', file: 'Apache Commons IO', mq: 'Spring Kafka', ftp: 'Apache Commons Net' },
        python: { database: 'SQLAlchemy', api: 'Requests', file: 'Pandas', mq: 'kafka-python', ftp: 'paramiko' },
        nodejs: { database: 'Sequelize', api: 'Axios', file: 'fs / csv-parser', mq: 'kafkajs', ftp: 'ssh2-sftp-client' }
    };
    return connectors[stack]?.[type] || 'Custom Connector';
}

function getExtractorTech(format, stack) {
    const extractors = {
        java: { json: 'Jackson', xml: 'JAXB', csv: 'OpenCSV', avro: 'Apache Avro' },
        python: { json: 'json', xml: 'lxml', csv: 'pandas', avro: 'fastavro' },
        nodejs: { json: 'Native JSON', xml: 'xml2js', csv: 'csv-parser', avro: 'avsc' }
    };
    return extractors[stack]?.[format] || 'Custom Parser';
}

function getTransformTech(stack) {
    const transforms = { java: 'MapStruct / ModelMapper', python: 'Pandas / Custom', nodejs: 'Lodash / Custom' };
    return transforms[stack] || 'Custom Transformer';
}

function getRulesTech(stack) {
    const rules = { java: 'Drools / SpEL', python: 'Rule Engine / Custom', nodejs: 'json-rules-engine' };
    return rules[stack] || 'Custom Rules';
}

function getLoaderTech(type, stack) {
    const loaders = {
        java: { database: 'Batch Insert / JPA', api: 'RestTemplate', mq: 'KafkaTemplate' },
        python: { database: 'Bulk Insert', api: 'Requests', mq: 'Producer' },
        nodejs: { database: 'Bulk Operations', api: 'Axios', mq: 'Producer' }
    };
    return loaders[stack]?.[type] || 'Custom Loader';
}

function generateDataflowSpec() {
    const { source, destination, mappings, rules, technical } = e2eState;

    let html = `<div class="markdown-content">
        <h5>1. Data Extraction</h5>
        <ul>
            <li><strong>Source:</strong> ${source.name} (${source.type})</li>
            <li><strong>Format:</strong> ${source.format.toUpperCase()}</li>
            <li><strong>Frequency:</strong> ${technical.scheduling}</li>
        </ul>

        <h5>2. Data Transformation</h5>
        <ul>`;

    if (mappings.length > 0) {
        mappings.forEach(m => {
            html += `<li><code>${m.source}</code> → <code>${m.destination}</code> (${m.transformation})</li>`;
        });
    } else {
        html += `<li>Direct mapping (schema-to-schema)</li>`;
    }

    html += `</ul>

        <h5>3. Business Rules</h5>
        <ul>`;

    if (rules.length > 0) {
        rules.forEach(r => {
            html += `<li><strong>${r.name}:</strong> ${r.action} - ${r.condition}</li>`;
        });
    } else {
        html += `<li>No custom business rules defined</li>`;
    }

    html += `</ul>

        <h5>4. Data Loading</h5>
        <ul>
            <li><strong>Destination:</strong> ${destination.name} (${destination.type})</li>
            <li><strong>Format:</strong> ${destination.format.toUpperCase()}</li>
            <li><strong>Error Handling:</strong> ${technical.errorHandling}</li>
        </ul>

        <h5>5. Error Handling</h5>
        <ul>
            <li><strong>Strategy:</strong> ${technical.errorHandling}</li>
            <li><strong>Logging Level:</strong> ${technical.logging}</li>
            <li><strong>Retry Policy:</strong> ${technical.errorHandling === 'retry' ? '3 retries with exponential backoff' : 'N/A'}</li>
        </ul>
    </div>`;

    document.getElementById('dataflowSpec').innerHTML = html;
}

// Design Tabs
document.querySelectorAll('.design-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.design-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.design-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.design}Design`).classList.add('active');
    });
});

// Re-render buttons
document.getElementById('rerenderFlowBtn')?.addEventListener('click', () => {
    const code = document.getElementById('flowMermaidCode').value;
    renderMermaid('flowDiagram', code);
});

document.getElementById('rerenderArchBtn')?.addEventListener('click', () => {
    const code = document.getElementById('archMermaidCode').value;
    renderMermaid('archDiagram', code);
});

// Copy Mermaid Code
document.getElementById('copyFlowMermaid')?.addEventListener('click', () => {
    copyToClipboard(document.getElementById('flowMermaidCode').value, 'Flow diagram code copied!');
});

document.getElementById('copyArchMermaid')?.addEventListener('click', () => {
    copyToClipboard(document.getElementById('archMermaidCode').value, 'Architecture diagram code copied!');
});

document.getElementById('openFlowMermaidLive')?.addEventListener('click', () => {
    const code = document.getElementById('flowMermaidCode').value;
    if (code) {
        const encoded = btoa(unescape(encodeURIComponent(code)));
        window.open('https://mermaid.live/edit#base64:' + encoded, '_blank', 'noopener,noreferrer');
    }
});

document.getElementById('openArchMermaidLive')?.addEventListener('click', () => {
    const code = document.getElementById('archMermaidCode').value;
    if (code) {
        const encoded = btoa(unescape(encodeURIComponent(code)));
        window.open('https://mermaid.live/edit#base64:' + encoded, '_blank', 'noopener,noreferrer');
    }
});

// Phase 2 -> Phase 3 (Generate Artifacts)
document.getElementById('e2eNextPhase2Btn')?.addEventListener('click', () => {
    generateArtifacts();
    goToPhase(3);
    ToastManager.success('Artifacts Generated', 'Development artifacts created successfully.');
});

// Back buttons
document.getElementById('e2eBackPhase1Btn')?.addEventListener('click', () => goToPhase(1));
document.getElementById('e2eBackPhase2Btn')?.addEventListener('click', () => goToPhase(2));
document.getElementById('e2eBackPhase3Btn')?.addEventListener('click', () => goToPhase(3));

// Generate Artifacts (Phase 3)
function generateArtifacts() {
    const techStack = e2eState.project.techStack[0] || 'java';

    e2eState.artifacts = {
        code: generateCodeArtifacts(techStack),
        orchestration: generateOrchestrationArtifacts(),
        database: generateDatabaseArtifacts(),
        infrastructure: generateInfraArtifacts(),
        monitoring: generateMonitoringArtifacts()
    };

    // Generate SNMP artifacts if MIB applied
    if (e2eState.mib.isApplied) {
        e2eState.artifacts.snmp = generateSnmpArtifacts();
    }

    // Update UI
    updateArtifactList('codeArtifactList', Object.keys(e2eState.artifacts.code));
    updateArtifactList('orchArtifactList', Object.keys(e2eState.artifacts.orchestration));
    updateArtifactList('dbArtifactList', Object.keys(e2eState.artifacts.database));
    updateArtifactList('iacArtifactList', Object.keys(e2eState.artifacts.infrastructure));
    updateArtifactList('monArtifactList', Object.keys(e2eState.artifacts.monitoring));

    // Show/hide SNMP artifact card
    const snmpCard = document.getElementById('snmpArtifactCard');
    if (snmpCard) {
        if (e2eState.mib.isApplied && e2eState.artifacts.snmp) {
            snmpCard.style.display = '';
            updateArtifactList('snmpArtifactList', Object.keys(e2eState.artifacts.snmp));
        } else {
            snmpCard.style.display = 'none';
        }
    }
}

function updateArtifactList(containerId, files) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = files.map(f => `<span>${f}</span>`).join('');
}

function generateCodeArtifacts(stack) {
    const { project, source, destination, mappings } = e2eState;
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '');

    if (stack === 'java') {
        return generateJavaCode(projectName);
    } else if (stack === 'python') {
        return generatePythonCode(projectName);
    } else {
        return generateNodeCode(projectName);
    }
}

function generateJavaCode(projectName) {
    const { source, destination, mappings, technical } = e2eState;

    const result = {
        'Application.java': `package com.integration.${projectName.toLowerCase()};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}`,

        'IntegrationConfig.java': `package com.integration.${projectName.toLowerCase()}.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class IntegrationConfig {

    @Bean
    public SourceConnector sourceConnector() {
        return new SourceConnector("${source.connection}");
    }

    @Bean
    public DestinationConnector destinationConnector() {
        return new DestinationConnector("${destination.connection}");
    }
}`,

        'SourceConnector.java': `package com.integration.${projectName.toLowerCase()}.connector;

import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class SourceConnector {
    private static final Logger logger = LoggerFactory.getLogger(SourceConnector.class);
    private final String connectionString;

    public SourceConnector(String connectionString) {
        this.connectionString = connectionString;
    }

    public Object extract() {
        logger.info("Extracting data from source: ${source.name}");
        // TODO: Implement extraction logic for ${source.type}
        return null;
    }
}`,

        'DataTransformer.java': `package com.integration.${projectName.toLowerCase()}.transformer;

import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.HashMap;

@Component
public class DataTransformer {

    public Map<String, Object> transform(Map<String, Object> sourceData) {
        Map<String, Object> result = new HashMap<>();

        // Field Mappings
${mappings.map(m => `        result.put("${m.destination}", sourceData.get("${m.source}")); // ${m.transformation}`).join('\n')}

        return result;
    }
}`,

        'IntegrationService.java': `package com.integration.${projectName.toLowerCase()}.service;

import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class IntegrationService {
    private static final Logger logger = LoggerFactory.getLogger(IntegrationService.class);

    private final SourceConnector sourceConnector;
    private final DataTransformer transformer;
    private final DestinationConnector destinationConnector;

    public IntegrationService(SourceConnector src, DataTransformer trans, DestinationConnector dest) {
        this.sourceConnector = src;
        this.transformer = trans;
        this.destinationConnector = dest;
    }

    ${technical.scheduling !== 'realtime' ? '@Scheduled(cron = "0 0 * * * *")' : ''}
    public void runIntegration() {
        logger.info("Starting integration job");
        try {
            Object data = sourceConnector.extract();
            Object transformed = transformer.transform((Map) data);
            destinationConnector.load(transformed);
            logger.info("Integration completed successfully");
        } catch (Exception e) {
            logger.error("Integration failed", e);
            ${technical.errorHandling === 'retry' ? '// TODO: Implement retry logic' : ''}
        }
    }
}`,

        'pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>

    <groupId>com.integration</groupId>
    <artifactId>${projectName.toLowerCase()}</artifactId>
    <version>1.0.0</version>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-registry-prometheus</artifactId>
        </dependency>
    </dependencies>
</project>`
    };

    // Add SNMP-specific Java files when MIB is applied
    if (e2eState.mib.isApplied) {
        result['SnmpTrapReceiver.java'] = `package com.integration.${projectName.toLowerCase()}.snmp;

import org.snmp4j.*;
import org.snmp4j.mp.SnmpConstants;
import org.snmp4j.smi.*;
import org.snmp4j.transport.DefaultUdpTransportMapping;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import javax.annotation.PostConstruct;

@Component
public class SnmpTrapReceiver implements CommandResponder {
    private static final Logger logger = LoggerFactory.getLogger(SnmpTrapReceiver.class);
    private Snmp snmp;

    @PostConstruct
    public void start() throws Exception {
        TransportMapping<?> transport = new DefaultUdpTransportMapping(new UdpAddress("0.0.0.0/162"));
        snmp = new Snmp(transport);
        snmp.addCommandResponder(this);
        transport.listen();
        logger.info("SNMP Trap Receiver started on UDP 162");
    }

    @Override
    public void processPdu(CommandResponderEvent event) {
        PDU pdu = event.getPDU();
        if (pdu != null) {
            logger.info("Received trap: {}", pdu.toString());
            // TODO: Process trap OIDs and forward to alarm correlator
            for (VariableBinding vb : pdu.getVariableBindings()) {
                logger.debug("OID: {} = {}", vb.getOid(), vb.getVariable());
            }
        }
    }
}`;

        result['SnmpPoller.java'] = `package com.integration.${projectName.toLowerCase()}.snmp;

import org.snmp4j.*;
import org.snmp4j.event.ResponseEvent;
import org.snmp4j.mp.SnmpConstants;
import org.snmp4j.smi.*;
import org.snmp4j.transport.DefaultUdpTransportMapping;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class SnmpPoller {
    private static final Logger logger = LoggerFactory.getLogger(SnmpPoller.class);

    @Scheduled(fixedRate = 300000) // 5 minutes
    public void pollCounters() {
        logger.info("Polling SNMP performance counters");
        // TODO: Read OIDs from polling_config.yaml
        // TODO: Perform SNMP GET operations and forward to KPI calculator
    }

    public Map<String, String> snmpGet(String host, String community, List<String> oids) throws Exception {
        Map<String, String> results = new HashMap<>();
        TransportMapping<?> transport = new DefaultUdpTransportMapping();
        Snmp snmp = new Snmp(transport);
        transport.listen();

        CommunityTarget target = new CommunityTarget();
        target.setCommunity(new OctetString(community));
        target.setAddress(new UdpAddress(host + "/161"));
        target.setRetries(2);
        target.setTimeout(1500);
        target.setVersion(SnmpConstants.version2c);

        PDU pdu = new PDU();
        for (String oid : oids) {
            pdu.add(new VariableBinding(new OID(oid)));
        }
        pdu.setType(PDU.GET);

        ResponseEvent response = snmp.send(pdu, target);
        if (response.getResponse() != null) {
            for (VariableBinding vb : response.getResponse().getVariableBindings()) {
                results.put(vb.getOid().toString(), vb.getVariable().toString());
            }
        }
        snmp.close();
        return results;
    }
}`;
    }

    return result;
}

function generatePythonCode(projectName) {
    const { source, destination, mappings, technical } = e2eState;

    const result = {
        'main.py': `#!/usr/bin/env python3
"""${e2eState.project.description || projectName} - Integration Service"""

import logging
from integration import IntegrationService

logging.basicConfig(level=logging.${technical.logging.toUpperCase()})
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting ${projectName} integration")
    service = IntegrationService()
    service.run()

if __name__ == "__main__":
    main()`,

        'integration.py': `"""Core Integration Service"""

import logging
from source_connector import SourceConnector
from transformer import DataTransformer
from destination_connector import DestinationConnector

logger = logging.getLogger(__name__)

class IntegrationService:
    def __init__(self):
        self.source = SourceConnector()
        self.transformer = DataTransformer()
        self.destination = DestinationConnector()

    def run(self):
        try:
            logger.info("Extracting data from ${source.name}")
            data = self.source.extract()

            logger.info("Transforming data")
            transformed = self.transformer.transform(data)

            logger.info("Loading data to ${destination.name}")
            self.destination.load(transformed)

            logger.info("Integration completed successfully")
        except Exception as e:
            logger.error(f"Integration failed: {e}")
            ${technical.errorHandling === 'retry' ? 'self._retry()' : 'raise'}`,

        'transformer.py': `"""Data Transformation Module"""

class DataTransformer:
    def transform(self, data):
        result = {}

        # Field Mappings
${mappings.map(m => `        result["${m.destination}"] = data.get("${m.source}")  # ${m.transformation}`).join('\n')}

        return result`,

        'requirements.txt': `# ${projectName} Dependencies
requests>=2.28.0
pandas>=2.0.0
pyyaml>=6.0
prometheus-client>=0.17.0
python-json-logger>=2.0.0
${e2eState.mib.isApplied ? 'pysnmp>=4.4.0\npysnmp-mibs>=0.1.0' : ''}`
    };

    // Add SNMP-specific Python files when MIB is applied
    if (e2eState.mib.isApplied) {
        result['snmp_trap_receiver.py'] = `"""SNMP Trap Receiver using pysnmp"""

from pysnmp.entity import engine, config
from pysnmp.carrier.asyncore.dgram import udp
from pysnmp.entity.rfc3413 import ntfrcv
import logging
import json

logger = logging.getLogger(__name__)

def trap_callback(snmpEngine, stateReference, contextEngineId, contextName, varBinds, cbCtx):
    """Process incoming SNMP traps"""
    trap_data = {}
    for oid, val in varBinds:
        trap_data[str(oid)] = str(val)
    logger.info("Received trap: %s", json.dumps(trap_data))
    # TODO: Forward to alarm correlator

def start_trap_receiver(host='0.0.0.0', port=162):
    snmpEngine = engine.SnmpEngine()
    config.addTransport(snmpEngine, udp.domainName,
                       udp.UdpTransport().openServerMode((host, port)))
    config.addV1System(snmpEngine, 'public', 'public')

    ntfrcv.NotificationReceiver(snmpEngine, trap_callback)
    logger.info("SNMP Trap Receiver started on %s:%d", host, port)
    snmpEngine.transportDispatcher.jobStarted(1)
    snmpEngine.transportDispatcher.runDispatcher()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    start_trap_receiver()`;

        result['snmp_poller.py'] = `"""SNMP Poller using pysnmp"""

from pysnmp.hlapi import *
import logging
import yaml
import time

logger = logging.getLogger(__name__)

class SnmpPoller:
    def __init__(self, config_path='polling_config.yaml'):
        with open(config_path) as f:
            self.config = yaml.safe_load(f)
        self.agent = self.config.get('agent', {})

    def poll(self, oids):
        """Poll a list of OIDs from the SNMP agent"""
        results = {}
        for (errorIndication, errorStatus, errorIndex, varBinds) in getCmd(
            SnmpEngine(),
            CommunityData(self.agent.get('community', 'public')),
            UdpTransportTarget((self.agent['host'], self.agent.get('port', 161))),
            ContextData(),
            *[ObjectType(ObjectIdentity(oid)) for oid in oids]
        ):
            if errorIndication:
                logger.error("SNMP error: %s", errorIndication)
            elif errorStatus:
                logger.error("SNMP error at %s: %s", errorIndex, errorStatus.prettyPrint())
            else:
                for varBind in varBinds:
                    results[str(varBind[0])] = str(varBind[1])
        return results

    def run_polling_cycle(self):
        logger.info("Starting SNMP polling cycle")
        # Poll performance counters
        pm_oids = [o['oid'] for o in self.config.get('performance_counters', {}).get('oids', [])]
        if pm_oids:
            results = self.poll(pm_oids)
            logger.info("PM results: %s", results)
        # TODO: Forward to KPI calculator

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    poller = SnmpPoller()
    poller.run_polling_cycle()`;
    }

    return result;
}

function generateNodeCode(projectName) {
    const { source, destination, mappings, technical } = e2eState;

    const result = {
        'index.js': `/**
 * ${projectName} - Integration Service
 */

const IntegrationService = require('./integration');
const logger = require('./logger');

async function main() {
    logger.info('Starting ${projectName} integration');
    const service = new IntegrationService();
    await service.run();
}

main().catch(err => {
    logger.error('Integration failed:', err);
    process.exit(1);
});`,

        'integration.js': `const SourceConnector = require('./connectors/source');
const DestinationConnector = require('./connectors/destination');
const Transformer = require('./transformer');
const logger = require('./logger');

class IntegrationService {
    constructor() {
        this.source = new SourceConnector();
        this.destination = new DestinationConnector();
        this.transformer = new Transformer();
    }

    async run() {
        try {
            logger.info('Extracting data from ${source.name}');
            const data = await this.source.extract();

            logger.info('Transforming data');
            const transformed = this.transformer.transform(data);

            logger.info('Loading data to ${destination.name}');
            await this.destination.load(transformed);

            logger.info('Integration completed successfully');
        } catch (error) {
            logger.error('Integration failed:', error);
            ${technical.errorHandling === 'retry' ? 'await this.retry();' : 'throw error;'}
        }
    }
}

module.exports = IntegrationService;`,

        'transformer.js': `class Transformer {
    transform(data) {
        const result = {};

        // Field Mappings
${mappings.map(m => `        result['${m.destination}'] = data['${m.source}']; // ${m.transformation}`).join('\n')}

        return result;
    }
}

module.exports = Transformer;`,

        'package.json': `{
    "name": "${projectName.toLowerCase()}",
    "version": "1.0.0",
    "description": "${e2eState.project.description || 'Integration Service'}",
    "main": "index.js",
    "scripts": {
        "start": "node index.js",
        "test": "jest"
    },
    "dependencies": {
        "axios": "^1.6.0",
        "winston": "^3.11.0",
        "prom-client": "^15.0.0"${e2eState.mib.isApplied ? ',\n        "net-snmp": "^3.11.0"' : ''}
    }
}`
    };

    // Add SNMP-specific Node.js files when MIB is applied
    if (e2eState.mib.isApplied) {
        result['snmp-trap-receiver.js'] = `/**
 * SNMP Trap Receiver using net-snmp
 */

const snmp = require('net-snmp');
const logger = require('./logger');

class TrapReceiver {
    constructor(port = 162) {
        this.port = port;
        this.receiver = null;
    }

    start() {
        this.receiver = snmp.createReceiver({ port: this.port }, (error, notification) => {
            if (error) {
                logger.error('Trap receiver error:', error);
                return;
            }

            const pdu = notification.pdu;
            const trapOid = pdu.trapOid ? pdu.trapOid.toString() : 'unknown';
            const varbinds = {};

            pdu.varbinds.forEach(vb => {
                varbinds[vb.oid.toString()] = vb.value.toString();
            });

            logger.info('Received trap:', { trapOid, varbinds });
            // TODO: Forward to alarm correlator
        });

        logger.info(\`SNMP Trap Receiver started on UDP \${this.port}\`);
    }

    stop() {
        if (this.receiver) {
            this.receiver.close();
            logger.info('Trap receiver stopped');
        }
    }
}

module.exports = TrapReceiver;`;

        result['snmp-poller.js'] = `/**
 * SNMP Poller using net-snmp
 */

const snmp = require('net-snmp');
const logger = require('./logger');

class SnmpPoller {
    constructor(host, community = 'public') {
        this.session = snmp.createSession(host, community);
    }

    async get(oids) {
        return new Promise((resolve, reject) => {
            this.session.get(oids, (error, varbinds) => {
                if (error) {
                    reject(error);
                    return;
                }

                const results = {};
                varbinds.forEach(vb => {
                    if (snmp.isVarbindError(vb)) {
                        logger.error('OID error:', snmp.varbindError(vb));
                    } else {
                        results[vb.oid] = vb.value.toString();
                    }
                });
                resolve(results);
            });
        });
    }

    close() {
        this.session.close();
    }
}

module.exports = SnmpPoller;`;
    }

    return result;
}

function generateOrchestrationArtifacts() {
    const { project, technical } = e2eState;
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return {
        'airflow_dag.py': `from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'integration-team',
    'depends_on_past': False,
    'retries': ${technical.errorHandling === 'retry' ? 3 : 0},
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    '${projectName}_integration',
    default_args=default_args,
    description='${project.description || 'Integration workflow'}',
    schedule_interval='${getCronExpression(technical.scheduling)}',
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

def run_integration():
    from integration import IntegrationService
    service = IntegrationService()
    service.run()

integration_task = PythonOperator(
    task_id='run_integration',
    python_callable=run_integration,
    dag=dag,
)`,

        'cronjob.yaml': `apiVersion: batch/v1
kind: CronJob
metadata:
  name: ${projectName}-integration
spec:
  schedule: "${getCronExpression(technical.scheduling)}"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: integration
            image: ${projectName}:latest
            envFrom:
            - configMapRef:
                name: ${projectName}-config
          restartPolicy: OnFailure`
    };
}

function getCronExpression(scheduling) {
    const crons = {
        realtime: '* * * * *',
        hourly: '0 * * * *',
        daily: '0 0 * * *',
        weekly: '0 0 * * 0'
    };
    return crons[scheduling] || '0 * * * *';
}

function generateDatabaseArtifacts() {
    const { project, source, destination } = e2eState;
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return {
        'schema.sql': `-- ${project.name} Database Schema

-- Staging Table
CREATE TABLE IF NOT EXISTS ${projectName}_staging (
    id SERIAL PRIMARY KEY,
    source_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Error Log Table
CREATE TABLE IF NOT EXISTS ${projectName}_error_log (
    id SERIAL PRIMARY KEY,
    record_id INTEGER REFERENCES ${projectName}_staging(id),
    error_message TEXT,
    error_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Trail Table
CREATE TABLE IF NOT EXISTS ${projectName}_audit (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    record_count INTEGER,
    duration_ms INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_${projectName}_staging_status ON ${projectName}_staging(status);
CREATE INDEX idx_${projectName}_staging_created ON ${projectName}_staging(created_at);`,

        'migrations.sql': `-- Migration: Initial Setup
-- Version: 1.0.0

BEGIN;

-- Run schema creation
\\i schema.sql

-- Insert initial config
INSERT INTO ${projectName}_audit (action, status)
VALUES ('schema_created', 'success');

COMMIT;`
    };
}

function generateInfraArtifacts() {
    const { project } = e2eState;
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return {
        'Dockerfile': `FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
COPY target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]`,

        'docker-compose.yml': `version: '3.8'

services:
  ${projectName}:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=production
    depends_on:
      - postgres
    networks:
      - integration-net

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${projectName}
      POSTGRES_USER: integration
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - integration-net

volumes:
  postgres_data:

networks:
  integration-net:`,

        'terraform/main.tf': `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_ecs_cluster" "${projectName}" {
  name = "${projectName}-cluster"
}

resource "aws_ecs_task_definition" "${projectName}" {
  family                   = "${projectName}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    {
      name  = "${projectName}"
      image = "\${var.ecr_repo}:latest"
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
        }
      ]
    }
  ])
}`
    };
}

function generateMonitoringArtifacts() {
    const { project } = e2eState;
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return {
        'prometheus.yml': `global:
  scrape_interval: 15s

scrape_configs:
  - job_name: '${projectName}'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: /actuator/prometheus`,

        'grafana-dashboard.json': `{
  "dashboard": {
    "title": "${project.name} Dashboard",
    "panels": [
      {
        "title": "Integration Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "rate(integration_success_total[5m]) / rate(integration_total[5m]) * 100"
          }
        ]
      },
      {
        "title": "Processing Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(integration_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(integration_errors_total[5m])"
          }
        ]
      }
    ]
  }
}`,

        'alerts.yml': `groups:
  - name: ${projectName}_alerts
    rules:
      - alert: IntegrationFailure
        expr: rate(integration_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Integration errors detected"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(integration_duration_seconds_bucket[5m])) > 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High integration latency"`
    };
}

// ==========================================
// SNMP ARTIFACT GENERATION
// ==========================================

function generateSnmpArtifacts() {
    const { mib } = e2eState;
    if (!mib.parsed) return {};

    const fmObjects = mib.selectedFm || [];
    const pmObjects = mib.selectedPm || [];
    const cmObjects = mib.selectedCm || [];
    const moduleName = mib.moduleName;

    const artifacts = {};

    // 1. snmptrapd.conf
    if (fmObjects.length > 0) {
        let trapdConf = `# snmptrapd.conf - Trap Receiver Configuration
# Generated for ${moduleName}
# ==========================================

# Authentication
disableAuthorization yes
authCommunity log,execute,net public

# Log format
format1 %V\\n%v\\n
outputOption fts

# Trap handlers for ${moduleName}
`;
        fmObjects.forEach(obj => {
            trapdConf += `# ${obj.name}: ${obj.description}\ntraphandle ${obj.oid} /usr/local/bin/handle_trap.sh\n\n`;
        });

        trapdConf += `# Forward all traps to integration service
forward default udp:localhost:1162
`;
        artifacts['snmptrapd.conf'] = trapdConf;
    }

    // 2. polling_config.yaml
    if (pmObjects.length > 0 || cmObjects.length > 0) {
        let pollingYaml = `# SNMP Polling Configuration
# Generated for ${moduleName}
# ==========================================

agent:
  host: "\${SNMP_HOST}"
  port: 161
  community: "\${SNMP_COMMUNITY}"
  version: 2c
  timeout: 5
  retries: 3

`;
        if (pmObjects.length > 0) {
            pollingYaml += `# Performance counters - poll every 5 minutes
performance_counters:
  interval: 300
  oids:\n`;
            pmObjects.forEach(obj => {
                pollingYaml += `    - oid: "${obj.oid}"
      name: "${obj.name}"
      type: "${obj.syntax}"
      description: "${obj.description}"
`;
            });
        }

        if (cmObjects.length > 0) {
            pollingYaml += `\n# Configuration objects - poll every 15 minutes
configuration_objects:
  interval: 900
  oids:\n`;
            cmObjects.forEach(obj => {
                pollingYaml += `    - oid: "${obj.oid}"
      name: "${obj.name}"
      type: "${obj.syntax}"
      access: "${obj.maxAccess}"
      description: "${obj.description}"
`;
            });
        }

        artifacts['polling_config.yaml'] = pollingYaml;
    }

    // 3. alarm_mapping.json
    if (fmObjects.length > 0) {
        const alarmMappings = {};
        fmObjects.forEach((obj, idx) => {
            alarmMappings[obj.oid] = {
                trapName: obj.name,
                alarmId: `ALM-${String(idx + 1).padStart(4, '0')}`,
                severity: idx === 0 ? 'critical' : idx === 1 ? 'major' : 'minor',
                category: 'equipment',
                probableCause: obj.description,
                clearCondition: `${obj.name}Clear`,
                notificationObjects: obj.notificationObjects || [],
                additionalText: obj.description
            };
        });

        artifacts['alarm_mapping.json'] = JSON.stringify({
            module: moduleName,
            version: '1.0',
            generatedAt: new Date().toISOString(),
            alarms: alarmMappings
        }, null, 2);
    }

    // 4. kpi_definitions.yaml
    if (pmObjects.length > 0) {
        let kpiYaml = `# KPI Definitions
# Generated for ${moduleName}
# ==========================================

module: "${moduleName}"
aggregation_window: 900  # 15 minutes

kpis:\n`;

        // Auto-detect attempt/success pairs for success rate KPIs
        const attemptObjects = pmObjects.filter(o => o.name.toLowerCase().includes('attempt'));
        attemptObjects.forEach(attemptObj => {
            const baseName = attemptObj.name.replace(/[Aa]ttempts?$/, '');
            const successObj = pmObjects.find(o =>
                o.name.toLowerCase().includes('success') &&
                o.name.toLowerCase().startsWith(baseName.toLowerCase())
            );

            if (successObj) {
                const kpiName = toCamelCase(baseName) + 'SuccessRate';
                kpiYaml += `  - name: "${kpiName}"
    type: success_rate
    formula: "(${successObj.name} / ${attemptObj.name}) * 100"
    unit: percent
    threshold_warning: 95
    threshold_critical: 90
    source_counters:
      numerator: "${successObj.oid}"
      denominator: "${attemptObj.oid}"
    description: "Success rate for ${baseName}"
`;
            }
        });

        // Add throughput KPIs for byte/packet counters
        const throughputObjects = pmObjects.filter(o =>
            o.name.toLowerCase().includes('bytes') || o.name.toLowerCase().includes('packets')
        );
        throughputObjects.forEach(obj => {
            const kpiName = toCamelCase(obj.name) + 'Rate';
            kpiYaml += `  - name: "${kpiName}"
    type: rate
    formula: "delta(${obj.name}) / interval"
    unit: "${obj.name.toLowerCase().includes('bytes') ? 'bytes_per_second' : 'packets_per_second'}"
    source_counter: "${obj.oid}"
    description: "Rate of ${obj.description}"
`;
        });

        // Add gauge KPIs
        const gaugeObjects = pmObjects.filter(o =>
            o.syntax.toLowerCase().includes('gauge')
        );
        gaugeObjects.forEach(obj => {
            kpiYaml += `  - name: "${toCamelCase(obj.name)}"
    type: gauge
    oid: "${obj.oid}"
    unit: count
    description: "${obj.description}"
`;
        });

        artifacts['kpi_definitions.yaml'] = kpiYaml;
    }

    return artifacts;
}

// Artifact Viewer
let currentArtifactCategory = null;
let currentArtifactFile = null;

document.getElementById('viewCodeArtifact')?.addEventListener('click', () => showArtifactViewer('code', 'Integration Code'));
document.getElementById('viewOrchArtifact')?.addEventListener('click', () => showArtifactViewer('orchestration', 'Job Orchestration'));
document.getElementById('viewDbArtifact')?.addEventListener('click', () => showArtifactViewer('database', 'Database Schema'));
document.getElementById('viewIacArtifact')?.addEventListener('click', () => showArtifactViewer('infrastructure', 'Infrastructure'));
document.getElementById('viewMonArtifact')?.addEventListener('click', () => showArtifactViewer('monitoring', 'Monitoring'));
document.getElementById('viewSnmpArtifact')?.addEventListener('click', () => showArtifactViewer('snmp', 'SNMP Configuration'));

function showArtifactViewer(category, title) {
    const viewer = document.getElementById('artifactViewer');
    const artifacts = e2eState.artifacts[category];
    if (!artifacts || Object.keys(artifacts).length === 0) {
        ToastManager.warning('No Artifacts', 'Artifacts not generated yet.');
        return;
    }

    currentArtifactCategory = category;
    document.getElementById('artifactViewerTitle').textContent = title;

    // Create file tabs
    const tabsContainer = document.getElementById('artifactFileTabs');
    tabsContainer.innerHTML = '';
    const files = Object.keys(artifacts);
    files.forEach((file, index) => {
        const btn = document.createElement('button');
        btn.textContent = file;
        btn.className = index === 0 ? 'active' : '';
        btn.addEventListener('click', () => showArtifactFile(file));
        tabsContainer.appendChild(btn);
    });

    // Show first file
    showArtifactFile(files[0]);
    viewer.classList.remove('hidden');
}

function showArtifactFile(filename) {
    currentArtifactFile = filename;
    const content = e2eState.artifacts[currentArtifactCategory][filename];
    document.getElementById('artifactCodeContent').innerHTML = `<pre>${escapeHtml(content)}</pre>`;

    document.querySelectorAll('#artifactFileTabs button').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === filename);
    });
}

document.getElementById('closeArtifactViewer')?.addEventListener('click', () => {
    document.getElementById('artifactViewer').classList.add('hidden');
});

document.getElementById('copyArtifactCode')?.addEventListener('click', () => {
    const content = e2eState.artifacts[currentArtifactCategory][currentArtifactFile];
    copyToClipboard(content, `${currentArtifactFile} copied!`);
});

// Phase 3 -> Phase 4 (Generate Deployment)
document.getElementById('e2eNextPhase3Btn')?.addEventListener('click', function() {
    withLoader(this, () => {
    UsageTracker.increment('e2e');
    generateDeploymentPhase();
    goToPhase(4);
    ToastManager.success('Deployment Ready', 'Execution scripts and guides generated.');
    });
});

function generateDeploymentPhase() {
    generateExecutionScripts();
    generateTestingScripts();
    generateDeploymentGuide();
}

function generateExecutionScripts() {
    const container = document.getElementById('execScriptList');
    const scripts = ['run.sh', 'setup.sh', 'cleanup.sh'];
    container.innerHTML = scripts.map(s => `
        <div class="script-item">
            <span>${s}</span>
            <button class="btn btn-outline btn-sm" onclick="copyScript('${s}')">Copy</button>
        </div>
    `).join('');
}

function generateTestingScripts() {
    const container = document.getElementById('testScriptList');
    const techStack = e2eState.project.techStack[0] || 'java';
    const tests = techStack === 'java'
        ? ['IntegrationTest.java', 'TransformerTest.java']
        : techStack === 'python'
        ? ['test_integration.py', 'test_transformer.py']
        : ['integration.test.js', 'transformer.test.js'];

    container.innerHTML = tests.map(t => `
        <div class="script-item">
            <span>${t}</span>
            <button class="btn btn-outline btn-sm" onclick="copyScript('${t}')">Copy</button>
        </div>
    `).join('');
}

function generateDeploymentGuide() {
    const { project, source, destination, technical } = e2eState;
    const techStack = project.techStack[0] || 'java';

    const guide = `
        <h5>Prerequisites</h5>
        <ul>
            <li>${techStack === 'java' ? 'Java 17+ and Maven' : techStack === 'python' ? 'Python 3.9+' : 'Node.js 18+'}</li>
            <li>Docker and Docker Compose</li>
            <li>Access to ${source.name} (${source.type})</li>
            <li>Access to ${destination.name} (${destination.type})</li>
        </ul>

        <h5>Setup Steps</h5>
        <ul>
            <li>Clone the repository</li>
            <li>Copy <code>.env.example</code> to <code>.env</code> and configure</li>
            <li>Run <code>./setup.sh</code> to initialize</li>
            <li>Run <code>docker-compose up -d</code> to start services</li>
        </ul>

        <h5>Configuration</h5>
        <ul>
            <li><strong>Source Connection:</strong> <code>${source.connection || 'Configure in .env'}</code></li>
            <li><strong>Destination Connection:</strong> <code>${destination.connection || 'Configure in .env'}</code></li>
            <li><strong>Scheduling:</strong> ${technical.scheduling}</li>
            <li><strong>Error Handling:</strong> ${technical.errorHandling}</li>
        </ul>

        <h5>Running the Integration</h5>
        <ul>
            <li><strong>Manual Run:</strong> <code>./run.sh</code></li>
            <li><strong>Scheduled:</strong> Configured via ${technical.scheduling === 'realtime' ? 'event triggers' : 'cron job'}</li>
            <li><strong>Monitoring:</strong> Access Grafana at <code>http://localhost:3000</code></li>
        </ul>

        <h5>Troubleshooting</h5>
        <ul>
            <li>Check logs: <code>docker-compose logs -f</code></li>
            <li>Verify connections: <code>./test-connections.sh</code></li>
            <li>Reset state: <code>./cleanup.sh && ./setup.sh</code></li>
        </ul>
    `;

    document.getElementById('deploymentGuide').innerHTML = guide;
}

// Export All as ZIP
document.getElementById('e2eExportAllBtn')?.addEventListener('click', async () => {
    if (typeof JSZip === 'undefined') {
        ToastManager.error('Export Error', 'JSZip library not loaded.');
        return;
    }

    const zip = new JSZip();
    const projectName = e2eState.project.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    // Add all artifacts
    Object.entries(e2eState.artifacts).forEach(([category, files]) => {
        Object.entries(files).forEach(([filename, content]) => {
            zip.file(`${category}/${filename}`, content);
        });
    });

    // Add diagrams
    zip.file('diagrams/flow.mmd', document.getElementById('flowMermaidCode')?.value || '');
    zip.file('diagrams/architecture.mmd', document.getElementById('archMermaidCode')?.value || '');

    // Add README
    const readme = `# ${e2eState.project.name}

${e2eState.project.description || 'Integration Solution'}

## Generated by EMS Integration Toolkit

### Source: ${e2eState.source.name} (${e2eState.source.type})
### Destination: ${e2eState.destination.name} (${e2eState.destination.type})

## Quick Start

1. Review and configure the generated code
2. Set up environment variables
3. Run \`./setup.sh\`
4. Start with \`docker-compose up -d\`

## Documentation

See the deployment guide in the \`docs\` folder.
`;
    zip.file('README.md', readme);

    try {
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `${projectName}-integration.zip`);
        ToastManager.success('Export Complete', 'Project ZIP downloaded successfully.');
    } catch (err) {
        ToastManager.error('Export Failed', err.message);
    }
});

// New Project
document.getElementById('e2eNewProjectBtn')?.addEventListener('click', () => {
    if (confirm('Start a new project? Current data will be cleared.')) {
        location.reload();
    }
});

// Save Requirements
document.getElementById('e2eSaveReqBtn')?.addEventListener('click', () => {
    collectRequirements();
    Storage.set('e2eRequirements', e2eState);
    ToastManager.success('Saved', 'Requirements saved to browser storage.');
});

// ==========================================
// CONFIG COMPARE TOOL
// ==========================================

const ConfigCompare = {
    // Common identifier attributes for XML elements (priority order)
    identifierAttrs: ['class', 'id', 'name', 'distName', 'dn', 'key', 'type', 'refId', 'version'],

    // Detect file type from content
    detectFileType(content) {
        const trimmed = content.trim();

        // Check for XML
        if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
            try {
                new DOMParser().parseFromString(trimmed, 'text/xml');
                return 'xml';
            } catch (e) {}
        }

        // Check for JSON
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                JSON.parse(trimmed);
                return 'json';
            } catch (e) {}
        }

        // Check for YAML (basic heuristic)
        if (trimmed.includes(':') && !trimmed.startsWith('<') &&
            (trimmed.includes('\n  ') || trimmed.match(/^\w+:/m))) {
            return 'yaml';
        }

        return 'text';
    },

    // Update file info display
    updateFileInfo(textareaId, linesId, sizeId) {
        const content = document.getElementById(textareaId).value;
        const lines = content ? content.split('\n').length : 0;
        const size = new Blob([content]).size;

        document.getElementById(linesId).textContent = `Lines: ${lines}`;
        document.getElementById(sizeId).textContent = `Size: ${this.formatBytes(size)}`;

        // Update detected file type
        if (content.trim()) {
            const type = this.detectFileType(content);
            const badge = document.getElementById('detectedFileType');
            badge.textContent = type.toUpperCase();
            badge.className = 'file-type-badge ' + type;
        }
    },

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    // Get element identifier from attributes
    getElementIdentifier(attributes) {
        for (const attr of this.identifierAttrs) {
            if (attributes[attr]) {
                return attributes[attr];
            }
        }
        return null;
    },

    // Parse XML to object for comparison
    parseXML(xmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');

        const errorNode = doc.querySelector('parsererror');
        if (errorNode) {
            throw new Error('Invalid XML: ' + errorNode.textContent);
        }

        return this.xmlToObject(doc.documentElement);
    },

    xmlToObject(node, path = '') {
        const attributes = {};
        // Get attributes first
        for (const attr of node.attributes || []) {
            attributes[attr.name] = attr.value;
        }

        // Get identifier for this element
        const identifier = this.getElementIdentifier(attributes);
        const displayName = identifier ? `${node.nodeName}[${identifier}]` : node.nodeName;

        const obj = {
            name: node.nodeName,
            identifier: identifier,
            displayName: displayName,
            path: path ? `${path}/${displayName}` : displayName,
            attributes: attributes,
            text: '',
            children: []
        };

        // Get text content (direct text, not from children)
        for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent.trim();
                if (text) obj.text += text;
            }
        }

        // Get children
        for (const child of node.children) {
            obj.children.push(this.xmlToObject(child, obj.path));
        }

        return obj;
    },

    // Step 2: Canonicalize a node — normalize whitespace and sort attributes
    canonicalizeNode(node) {
        return {
            name: node.name,
            identifier: node.identifier,
            displayName: node.displayName,
            path: node.path,
            attributes: Object.fromEntries(
                Object.entries(node.attributes)
                    .map(([k, v]) => [k, v.trim().replace(/\s+/g, ' ')])
                    .sort(([a], [b]) => a.localeCompare(b))
            ),
            text: node.text.replace(/\s+/g, ' ').trim(),
            children: node.children.map(c => this.canonicalizeNode(c))
        };
    },

    // Step 3: Get the primary unique key for a node (priority order)
    getNodeKey(node) {
        for (const attr of this.identifierAttrs) {
            if (node.attributes[attr] !== undefined) {
                return `${node.name}[${attr}=${node.attributes[attr]}]`;
            }
        }
        return null;
    },

    // Compute similarity score between two nodes (0.0–1.0) by attribute overlap
    nodeSimilarity(n1, n2) {
        if (n1.name !== n2.name) return 0;
        const allKeys = [...new Set([...Object.keys(n1.attributes), ...Object.keys(n2.attributes)])];
        if (allKeys.length === 0) {
            return n1.text === n2.text ? 1.0 : 0.4;
        }
        const sameCount = allKeys.filter(k =>
            n1.attributes[k] !== undefined && n1.attributes[k] === n2.attributes[k]
        ).length;
        return sameCount / allKeys.length;
    },

    // Step 3: Match children — exact key first, then similarity fallback (threshold 40%)
    matchChildren(children1, children2) {
        const pairs = [];
        const used1 = new Set();
        const used2 = new Set();

        // Phase 1: exact key-based matching
        for (let i = 0; i < children1.length; i++) {
            const key = this.getNodeKey(children1[i]);
            if (!key) continue;
            for (let j = 0; j < children2.length; j++) {
                if (used2.has(j)) continue;
                if (this.getNodeKey(children2[j]) === key) {
                    pairs.push({ node1: children1[i], node2: children2[j] });
                    used1.add(i);
                    used2.add(j);
                    break;
                }
            }
        }

        // Phase 2: similarity-based matching for remaining unkeyed nodes
        for (let i = 0; i < children1.length; i++) {
            if (used1.has(i)) continue;
            let bestJ = -1, bestScore = 0.4;
            for (let j = 0; j < children2.length; j++) {
                if (used2.has(j)) continue;
                const score = this.nodeSimilarity(children1[i], children2[j]);
                if (score > bestScore) { bestScore = score; bestJ = j; }
            }
            if (bestJ !== -1) {
                pairs.push({ node1: children1[i], node2: children2[bestJ] });
                used1.add(i);
                used2.add(bestJ);
            }
        }

        return {
            pairs,
            removed: children1.filter((_, i) => !used1.has(i)),
            added:   children2.filter((_, j) => !used2.has(j))
        };
    },

    // Step 4: Field-by-field comparison of two canonicalized matched nodes
    compareNodes(node1, node2, pathPrefix = '') {
        const currentPath = pathPrefix || node1.displayName;
        const changes = [];

        // Compare attributes (sorted for determinism)
        const allAttrs = [...new Set([
            ...Object.keys(node1.attributes),
            ...Object.keys(node2.attributes)
        ])].sort();

        for (const attr of allAttrs) {
            const v1 = node1.attributes[attr];
            const v2 = node2.attributes[attr];
            if (v1 === undefined) {
                changes.push({ type: 'added', scope: 'attribute', path: currentPath, field: attr, oldValue: null, newValue: v2 });
            } else if (v2 === undefined) {
                changes.push({ type: 'removed', scope: 'attribute', path: currentPath, field: attr, oldValue: v1, newValue: null });
            } else if (v1 !== v2) {
                changes.push({ type: 'changed', scope: 'attribute', path: currentPath, field: attr, oldValue: v1, newValue: v2 });
            }
        }

        // Compare text content
        if (node1.text !== node2.text) {
            if (!node1.text) {
                changes.push({ type: 'added', scope: 'value', path: currentPath, field: '#text', oldValue: null, newValue: node2.text });
            } else if (!node2.text) {
                changes.push({ type: 'removed', scope: 'value', path: currentPath, field: '#text', oldValue: node1.text, newValue: null });
            } else {
                changes.push({ type: 'changed', scope: 'value', path: currentPath, field: '#text', oldValue: node1.text, newValue: node2.text });
            }
        }

        // Recursively compare matched children
        const { pairs, added, removed } = this.matchChildren(node1.children, node2.children);
        for (const { node1: c1, node2: c2 } of pairs) {
            changes.push(...this.compareNodes(c1, c2, `${currentPath}/${c1.displayName}`));
        }
        for (const node of removed) {
            changes.push({ type: 'removed', scope: 'element', path: `${currentPath}/${node.displayName}`, field: null, oldValue: this.xmlObjectToFormattedString(node, 0), newValue: null });
        }
        for (const node of added) {
            changes.push({ type: 'added', scope: 'element', path: `${currentPath}/${node.displayName}`, field: null, oldValue: null, newValue: this.xmlObjectToFormattedString(node, 0) });
        }

        return changes;
    },

    xmlObjectToString(obj, formatted = false) {
        if (formatted) {
            return this.xmlObjectToFormattedString(obj, 0);
        }
        let str = `<${obj.name}`;
        for (const [key, val] of Object.entries(obj.attributes)) {
            str += ` ${key}="${val}"`;
        }
        if (obj.text || obj.children.length > 0) {
            str += '>';
            str += obj.text;
            for (const child of obj.children) {
                str += this.xmlObjectToString(child);
            }
            str += `</${obj.name}>`;
        } else {
            str += '/>';
        }
        return str;
    },

    xmlObjectToFormattedString(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let str = `${spaces}<${obj.name}`;

        const attrEntries = Object.entries(obj.attributes);
        if (attrEntries.length <= 2) {
            for (const [key, val] of attrEntries) {
                str += ` ${key}="${val}"`;
            }
        } else {
            for (const [key, val] of attrEntries) {
                str += `\n${spaces}    ${key}="${val}"`;
            }
        }

        if (obj.text || obj.children.length > 0) {
            str += '>';
            if (obj.text) {
                str += obj.children.length > 0 ? `\n${spaces}  ${obj.text}` : obj.text;
            }
            if (obj.children.length > 0) {
                str += '\n';
                for (const child of obj.children) {
                    str += this.xmlObjectToFormattedString(child, indent + 1) + '\n';
                }
                str += `${spaces}</${obj.name}>`;
            } else {
                str += `</${obj.name}>`;
            }
        } else {
            str += '/>';
        }
        return str;
    },

    // Line-by-line text comparison using LCS algorithm
    compareText(text1, text2, options = {}) {
        let lines1 = text1.split('\n');
        let lines2 = text2.split('\n');

        if (options.ignoreWhitespace) {
            lines1 = lines1.map(l => l.trim());
            lines2 = lines2.map(l => l.trim());
        }

        if (!options.caseSensitive) {
            lines1 = lines1.map(l => l.toLowerCase());
            lines2 = lines2.map(l => l.toLowerCase());
        }

        // Use simplified diff algorithm
        const diff = this.computeDiff(lines1, lines2,
            text1.split('\n'), text2.split('\n'));

        return diff;
    },

    // Simple diff algorithm
    computeDiff(lines1, lines2, original1, original2) {
        const result = [];
        let i = 0, j = 0;

        while (i < lines1.length || j < lines2.length) {
            if (i >= lines1.length) {
                // Rest of lines2 are additions
                result.push({
                    type: 'addition',
                    lineNum: j + 1,
                    content: original2[j]
                });
                j++;
            } else if (j >= lines2.length) {
                // Rest of lines1 are deletions
                result.push({
                    type: 'deletion',
                    lineNum: i + 1,
                    content: original1[i]
                });
                i++;
            } else if (lines1[i] === lines2[j]) {
                // Lines match
                result.push({
                    type: 'unchanged',
                    lineNum: i + 1,
                    content: original1[i]
                });
                i++;
                j++;
            } else {
                // Check if line was modified, added, or deleted
                const nextMatch1 = this.findNextMatch(lines1, lines2, i, j);
                const nextMatch2 = this.findNextMatch(lines2, lines1, j, i);

                if (nextMatch1 !== -1 && (nextMatch2 === -1 || nextMatch1 - i <= nextMatch2 - j)) {
                    // Deletion in file1
                    result.push({
                        type: 'deletion',
                        lineNum: i + 1,
                        content: original1[i]
                    });
                    i++;
                } else if (nextMatch2 !== -1) {
                    // Addition in file2
                    result.push({
                        type: 'addition',
                        lineNum: j + 1,
                        content: original2[j]
                    });
                    j++;
                } else {
                    // Modification
                    result.push({
                        type: 'deletion',
                        lineNum: i + 1,
                        content: original1[i]
                    });
                    result.push({
                        type: 'addition',
                        lineNum: j + 1,
                        content: original2[j]
                    });
                    i++;
                    j++;
                }
            }
        }

        return result;
    },

    findNextMatch(lines1, lines2, start1, current2) {
        for (let i = start1; i < Math.min(start1 + 5, lines1.length); i++) {
            if (lines1[i] === lines2[current2]) {
                return i;
            }
        }
        return -1;
    },

    // Main compare entry point: parse → canonicalize → match → compare → structured diff
    compare(content1, content2, options = {}) {
        const type = this.detectFileType(content1);

        if (type === 'xml') {
            try {
                // Step 1: Parse both XMLs into trees
                const obj1 = this.parseXML(content1);
                const obj2 = this.parseXML(content2);

                // Step 2: Canonicalize (normalize whitespace, sort attributes)
                const canon1 = this.canonicalizeNode(obj1);
                const canon2 = this.canonicalizeNode(obj2);

                // Steps 3–5: Match nodes by key, compare field-by-field, build diff
                const changes = this.compareNodes(canon1, canon2);

                return {
                    type: 'xml',
                    differences: changes,
                    added:   changes.filter(c => c.type === 'added'),
                    removed: changes.filter(c => c.type === 'removed'),
                    changed: changes.filter(c => c.type === 'changed')
                };
            } catch (e) {
                const diff = this.compareText(content1, content2, options);
                return { type: 'text', differences: diff, added: [], removed: [], changed: [] };
            }
        } else {
            const diff = this.compareText(content1, content2, options);
            return {
                type: 'text',
                differences: diff,
                added:   diff.filter(d => d.type === 'addition'),
                removed: diff.filter(d => d.type === 'deletion'),
                changed: []
            };
        }
    },

    // Render diff results
    renderResults(results, summaryOnly = false) {
        const { type, added, removed, changed } = results;

        // Update summary bar
        document.getElementById('additionsCount').textContent = added.length;
        document.getElementById('deletionsCount').textContent = removed.length;
        document.getElementById('modificationsCount').textContent = changed.length;
        document.getElementById('unchangedCount').textContent = type === 'text'
            ? results.differences.filter(d => d.type === 'unchanged').length
            : '—';

        const output = document.getElementById('diffOutput');

        if (added.length === 0 && removed.length === 0 && changed.length === 0) {
            output.innerHTML = `
                <div class="no-diff">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <h4>Files are identical!</h4>
                    <p>No differences found between the two files.</p>
                </div>
            `;
            return;
        }

        if (type === 'xml') {
            const removedEls   = removed.filter(c => c.scope === 'element');
            const addedEls     = added.filter(c => c.scope === 'element');
            const fieldChanges = [
                ...removed.filter(c => c.scope !== 'element'),
                ...added.filter(c => c.scope !== 'element'),
                ...changed
            ];

            let html = `
                <div class="diff-category-summary">
                    <div class="summary-item missing-blocks">
                        <span class="summary-icon">−</span>
                        <span class="summary-count">${removedEls.length}</span>
                        <span class="summary-label">Removed Elements</span>
                    </div>
                    <div class="summary-item new-blocks">
                        <span class="summary-icon">+</span>
                        <span class="summary-count">${addedEls.length}</span>
                        <span class="summary-label">Added Elements</span>
                    </div>
                    <div class="summary-item modified-values">
                        <span class="summary-icon">~</span>
                        <span class="summary-count">${fieldChanges.length}</span>
                        <span class="summary-label">Field Changes</span>
                    </div>
                </div>
            `;

            if (summaryOnly) { output.innerHTML = html; return; }

            // Removed Elements
            if (removedEls.length > 0) {
                html += `<div class="diff-section collapsible open">
                    <h4 class="diff-section-title deletion" onclick="this.parentElement.classList.toggle('open')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        Removed Elements (${removedEls.length})
                        <span class="collapse-icon">▾</span>
                    </h4>
                    <div class="diff-section-content">`;
                for (const c of removedEls) html += this.renderElementChange(c, 'deletion');
                html += `</div></div>`;
            }

            // Added Elements
            if (addedEls.length > 0) {
                html += `<div class="diff-section collapsible open">
                    <h4 class="diff-section-title addition" onclick="this.parentElement.classList.toggle('open')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        Added Elements (${addedEls.length})
                        <span class="collapse-icon">▾</span>
                    </h4>
                    <div class="diff-section-content">`;
                for (const c of addedEls) html += this.renderElementChange(c, 'addition');
                html += `</div></div>`;
            }

            // Field Changes grouped by element path
            if (fieldChanges.length > 0) {
                const byPath = new Map();
                for (const c of fieldChanges) {
                    if (!byPath.has(c.path)) byPath.set(c.path, []);
                    byPath.get(c.path).push(c);
                }

                html += `<div class="diff-section collapsible open">
                    <h4 class="diff-section-title modification" onclick="this.parentElement.classList.toggle('open')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Field Changes (${fieldChanges.length})
                        <span class="collapse-icon">▾</span>
                    </h4>
                    <div class="diff-section-content">`;
                for (const [path, changes] of byPath) {
                    html += this.renderFieldChanges(path, changes);
                }
                html += `</div></div>`;
            }

            output.innerHTML = html;
        } else {
            // Text diff rendering (unchanged)
            output.innerHTML = results.differences.map(d => {
                const prefix = d.type === 'addition' ? '+' : d.type === 'deletion' ? '-' : ' ';
                return `
                    <div class="diff-line ${d.type}">
                        <span class="diff-line-num">${d.lineNum}</span>
                        <span class="diff-line-prefix">${prefix}</span>
                        <span class="diff-line-content">${this.escapeHtml(d.content)}</span>
                    </div>
                `;
            }).join('');
        }
    },

    // Render a single added or removed XML element block
    renderElementChange(change, type) {
        const value = type === 'deletion' ? change.oldValue : change.newValue;
        const icon  = type === 'deletion' ? '−' : '+';
        const label = type === 'deletion' ? 'Removed from File 1' : 'Added in File 2';
        return `
            <div class="xml-diff-element ${type}">
                <div class="xml-diff-header">
                    <span class="diff-type-badge ${type}">${icon}</span>
                    <span class="xml-diff-path">${this.escapeHtml(change.path)}</span>
                </div>
                <div class="xml-diff-detail">
                    <div class="xml-diff-${type === 'deletion' ? 'old' : 'new'}">
                        <div class="xml-diff-label">${label}</div>
                        <pre class="xml-content">${this.escapeHtml(value || '')}</pre>
                    </div>
                </div>
            </div>
        `;
    },

    // Render all field changes for one element path, grouped together
    renderFieldChanges(path, changes) {
        let html = `
            <div class="xml-diff-element field-group modification">
                <div class="xml-diff-header">
                    <span class="diff-type-badge modification">~</span>
                    <span class="xml-diff-path">${this.escapeHtml(path)}</span>
                </div>
                <div class="xml-diff-detail field-list">
        `;

        for (const c of changes) {
            const typeIcon = c.type === 'added' ? '+' : c.type === 'removed' ? '−' : '~';
            const typeCls  = c.type === 'added' ? 'addition' : c.type === 'removed' ? 'deletion' : 'modification';
            const scopeLabel = c.scope === 'attribute' ? `@${c.field}` : c.field;

            if (c.type === 'changed' && c.oldValue !== null && c.newValue !== null) {
                const highlighted = this.highlightValueDiff(c.oldValue, c.newValue);
                html += `
                    <div class="field-change ${typeCls}">
                        <span class="field-badge ${typeCls}">${typeIcon}</span>
                        <span class="field-name">${this.escapeHtml(scopeLabel)}</span>
                        <div class="xml-diff-comparison">
                            <div class="xml-diff-old">
                                <div class="xml-diff-label">File 1</div>
                                <div class="xml-value">${highlighted.old}</div>
                            </div>
                            <div class="xml-diff-arrow">→</div>
                            <div class="xml-diff-new">
                                <div class="xml-diff-label">File 2</div>
                                <div class="xml-value">${highlighted.new}</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                const val      = c.oldValue !== null ? c.oldValue : c.newValue;
                const valClass = c.type === 'removed' ? 'highlight-deletion' : 'highlight-addition';
                const valLabel = c.type === 'removed' ? 'Removed' : 'Added';
                html += `
                    <div class="field-change ${typeCls}">
                        <span class="field-badge ${typeCls}">${typeIcon}</span>
                        <span class="field-name">${this.escapeHtml(scopeLabel)}</span>
                        <div class="xml-diff-old">
                            <div class="xml-diff-label">${valLabel}</div>
                            <div class="xml-value ${valClass}">${this.escapeHtml(val || '')}</div>
                        </div>
                    </div>
                `;
            }
        }

        html += `</div></div>`;
        return html;
    },

    // Highlight character-level differences between two values
    highlightValueDiff(oldVal, newVal) {
        // Simple character-level diff highlighting
        const oldChars = oldVal.split('');
        const newChars = newVal.split('');

        // Find common prefix
        let prefixLen = 0;
        while (prefixLen < oldChars.length && prefixLen < newChars.length &&
               oldChars[prefixLen] === newChars[prefixLen]) {
            prefixLen++;
        }

        // Find common suffix
        let suffixLen = 0;
        while (suffixLen < oldChars.length - prefixLen &&
               suffixLen < newChars.length - prefixLen &&
               oldChars[oldChars.length - 1 - suffixLen] === newChars[newChars.length - 1 - suffixLen]) {
            suffixLen++;
        }

        const prefix = this.escapeHtml(oldVal.substring(0, prefixLen));
        const oldMiddle = this.escapeHtml(oldVal.substring(prefixLen, oldVal.length - suffixLen));
        const newMiddle = this.escapeHtml(newVal.substring(prefixLen, newVal.length - suffixLen));
        const suffix = this.escapeHtml(oldVal.substring(oldVal.length - suffixLen));

        return {
            old: `${prefix}<span class="highlight-deletion">${oldMiddle}</span>${suffix}`,
            new: `${prefix}<span class="highlight-addition">${newMiddle}</span>${suffix}`
        };
    },

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;');
    },

    // Get diff as text for copying/downloading
    getDiffAsText(results) {
        const { type, added, removed, changed } = results;
        let text = '';

        if (type === 'xml') {
            const removedEls   = removed.filter(c => c.scope === 'element');
            const addedEls     = added.filter(c => c.scope === 'element');
            const fieldChanges = [
                ...removed.filter(c => c.scope !== 'element'),
                ...added.filter(c => c.scope !== 'element'),
                ...changed
            ];

            text  = `=== CONFIG COMPARISON SUMMARY ===\n`;
            text += `Removed Elements : ${removedEls.length}\n`;
            text += `Added Elements   : ${addedEls.length}\n`;
            text += `Field Changes    : ${fieldChanges.length}\n`;
            text += `Total Differences: ${results.differences.length}\n\n`;

            if (removedEls.length > 0) {
                text += `=== REMOVED ELEMENTS (${removedEls.length}) ===\n`;
                for (const c of removedEls) {
                    text += `\n[-] ${c.path}\n`;
                    if (c.oldValue) text += c.oldValue.split('\n').map(l => '    ' + l).join('\n') + '\n';
                }
                text += '\n';
            }

            if (addedEls.length > 0) {
                text += `=== ADDED ELEMENTS (${addedEls.length}) ===\n`;
                for (const c of addedEls) {
                    text += `\n[+] ${c.path}\n`;
                    if (c.newValue) text += c.newValue.split('\n').map(l => '    ' + l).join('\n') + '\n';
                }
                text += '\n';
            }

            if (fieldChanges.length > 0) {
                text += `=== FIELD CHANGES (${fieldChanges.length}) ===\n`;
                const byPath = new Map();
                for (const c of fieldChanges) {
                    if (!byPath.has(c.path)) byPath.set(c.path, []);
                    byPath.get(c.path).push(c);
                }
                for (const [path, changes] of byPath) {
                    text += `\n  ${path}\n`;
                    for (const c of changes) {
                        const sym   = c.type === 'added' ? '+' : c.type === 'removed' ? '-' : '~';
                        const field = c.scope === 'attribute' ? `@${c.field}` : c.field;
                        text += `    [${sym}] ${field}`;
                        if (c.oldValue !== null) text += `  was: ${c.oldValue}`;
                        if (c.newValue !== null) text += `  now: ${c.newValue}`;
                        text += '\n';
                    }
                }
            }
        } else {
            text = results.differences.map(d => {
                const prefix = d.type === 'addition' ? '+' : d.type === 'deletion' ? '-' : ' ';
                return `${prefix} ${d.content}`;
            }).join('\n');
        }

        return text;
    }
};

// Config Compare Event Listeners
document.getElementById('file1Content')?.addEventListener('input', () => {
    ConfigCompare.updateFileInfo('file1Content', 'file1Lines', 'file1Size');
});

document.getElementById('file2Content')?.addEventListener('input', () => {
    ConfigCompare.updateFileInfo('file2Content', 'file2Lines', 'file2Size');
});

// File upload handlers
document.getElementById('file1Upload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('file1Content').value = event.target.result;
            ConfigCompare.updateFileInfo('file1Content', 'file1Lines', 'file1Size');
        };
        reader.readAsText(file);
    }
});

document.getElementById('file2Upload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('file2Content').value = event.target.result;
            ConfigCompare.updateFileInfo('file2Content', 'file2Lines', 'file2Size');
        };
        reader.readAsText(file);
    }
});

// Clear buttons
document.getElementById('clearFile1')?.addEventListener('click', () => {
    document.getElementById('file1Content').value = '';
    ConfigCompare.updateFileInfo('file1Content', 'file1Lines', 'file1Size');
});

document.getElementById('clearFile2')?.addEventListener('click', () => {
    document.getElementById('file2Content').value = '';
    ConfigCompare.updateFileInfo('file2Content', 'file2Lines', 'file2Size');
});

// Swap files
document.getElementById('swapFilesBtn')?.addEventListener('click', () => {
    const content1 = document.getElementById('file1Content').value;
    const content2 = document.getElementById('file2Content').value;
    document.getElementById('file1Content').value = content2;
    document.getElementById('file2Content').value = content1;
    ConfigCompare.updateFileInfo('file1Content', 'file1Lines', 'file1Size');
    ConfigCompare.updateFileInfo('file2Content', 'file2Lines', 'file2Size');
});

// Compare button
let lastCompareResults = null;

document.getElementById('compareBtn')?.addEventListener('click', function() {
    const content1 = document.getElementById('file1Content').value;
    const content2 = document.getElementById('file2Content').value;

    if (!content1.trim() || !content2.trim()) {
        ToastManager.error('Missing Input', 'Please provide content for both files.');
        return;
    }

    withLoader(this, () => {
    UsageTracker.increment('compare');
    const options = {
        ignoreWhitespace: document.getElementById('ignoreWhitespace').checked,
        caseSensitive: document.getElementById('caseSensitive').checked
    };
    const summaryOnly = document.getElementById('summaryOnly').checked;

    try {
        lastCompareResults = ConfigCompare.compare(content1, content2, options);
        ConfigCompare.renderResults(lastCompareResults, summaryOnly);
        document.getElementById('compareResults').style.display = 'block';

        // Scroll to results
        document.getElementById('compareResults').scrollIntoView({ behavior: 'smooth' });

        ToastManager.success('Comparison Complete',
            `Found ${lastCompareResults.differences.filter(d => d.type !== 'unchanged').length} differences.`);
    } catch (err) {
        ToastManager.error('Comparison Failed', err.message);
    }
    });
});

// Copy diff
document.getElementById('copyDiffBtn')?.addEventListener('click', () => {
    if (!lastCompareResults) return;

    const text = ConfigCompare.getDiffAsText(lastCompareResults);
    navigator.clipboard.writeText(text).then(() => {
        ToastManager.success('Copied', 'Diff copied to clipboard.');
    });
});

// Download diff
document.getElementById('downloadDiffBtn')?.addEventListener('click', () => {
    if (!lastCompareResults) return;

    const text = ConfigCompare.getDiffAsText(lastCompareResults);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config-diff.txt';
    a.click();
    URL.revokeObjectURL(url);

    ToastManager.success('Downloaded', 'Diff file downloaded.');
});

// ==========================================
// SIDE-BY-SIDE VIEW
// ==========================================

const SideBySideView = {
    file1Lines: [],
    file2Lines: [],
    alignedLines: [],
    connectorData: [],
    isSyncing: false,

    // Initialize the side-by-side view
    init() {
        this.setupScrollSync();
        this.setupResizeObserver();
    },

    // Generate side-by-side view from file contents
    generate(content1, content2, options = {}) {
        this.file1Lines = content1.split('\n');
        this.file2Lines = content2.split('\n');

        // Compute line-by-line diff with alignment
        this.alignedLines = this.computeAlignedDiff(
            this.file1Lines,
            this.file2Lines,
            options
        );

        this.render();
        this.updateConnectors();
    },

    // Compute aligned diff using LCS algorithm
    computeAlignedDiff(lines1, lines2, options) {
        const result = [];
        const lcs = this.computeLCS(lines1, lines2, options);

        let i = 0, j = 0, k = 0;

        while (i < lines1.length || j < lines2.length) {
            if (k < lcs.length && i < lines1.length && j < lines2.length) {
                const compareL1 = options.ignoreWhitespace ? lines1[i].trim() : lines1[i];
                const compareL2 = options.ignoreWhitespace ? lines2[j].trim() : lines2[j];
                const compareLCS = options.ignoreWhitespace ? lcs[k].trim() : lcs[k];

                if (compareL1 === compareLCS && compareL2 === compareLCS) {
                    // Both lines match LCS - unchanged
                    result.push({
                        type: 'unchanged',
                        left: { lineNum: i + 1, content: lines1[i] },
                        right: { lineNum: j + 1, content: lines2[j] }
                    });
                    i++; j++; k++;
                } else if (compareL1 !== compareLCS && compareL2 !== compareLCS) {
                    // Both different from LCS - modification
                    result.push({
                        type: 'modification',
                        left: { lineNum: i + 1, content: lines1[i] },
                        right: { lineNum: j + 1, content: lines2[j] }
                    });
                    i++; j++;
                } else if (compareL1 !== compareLCS) {
                    // Left doesn't match LCS - deletion
                    result.push({
                        type: 'deletion',
                        left: { lineNum: i + 1, content: lines1[i] },
                        right: null
                    });
                    i++;
                } else {
                    // Right doesn't match LCS - addition
                    result.push({
                        type: 'addition',
                        left: null,
                        right: { lineNum: j + 1, content: lines2[j] }
                    });
                    j++;
                }
            } else if (i < lines1.length) {
                // Remaining lines in file 1 - deletions
                result.push({
                    type: 'deletion',
                    left: { lineNum: i + 1, content: lines1[i] },
                    right: null
                });
                i++;
            } else if (j < lines2.length) {
                // Remaining lines in file 2 - additions
                result.push({
                    type: 'addition',
                    left: null,
                    right: { lineNum: j + 1, content: lines2[j] }
                });
                j++;
            }
        }

        return result;
    },

    // Compute Longest Common Subsequence
    computeLCS(lines1, lines2, options) {
        const m = lines1.length;
        const n = lines2.length;

        // Normalize lines for comparison
        const norm1 = lines1.map(l => options.ignoreWhitespace ? l.trim() : l);
        const norm2 = lines2.map(l => options.ignoreWhitespace ? l.trim() : l);

        // Build LCS table
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (norm1[i - 1] === norm2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        // Backtrack to find LCS
        const lcs = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (norm1[i - 1] === norm2[j - 1]) {
                lcs.unshift(lines1[i - 1]);
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }

        return lcs;
    },

    // Render the side-by-side view
    render() {
        const leftContent = document.getElementById('sbsFile1Content');
        const rightContent = document.getElementById('sbsFile2Content');

        if (!leftContent || !rightContent) return;

        let leftHTML = '';
        let rightHTML = '';

        this.connectorData = [];

        this.alignedLines.forEach((line, index) => {
            const lineId = `sbs-line-${index}`;

            if (line.left) {
                const highlightedContent = line.type === 'modification' && line.right
                    ? this.highlightInlineDiff(line.left.content, line.right.content, 'left')
                    : this.escapeHtml(line.left.content);

                leftHTML += `
                    <div class="sbs-line ${line.type}" id="${lineId}-left" data-index="${index}">
                        <span class="sbs-line-num">${line.left.lineNum}</span>
                        ${line.type !== 'unchanged' ? '<span class="sbs-line-marker"></span>' : ''}
                        <span class="sbs-line-content">${highlightedContent}</span>
                    </div>
                `;
            } else {
                leftHTML += `
                    <div class="sbs-line empty" id="${lineId}-left" data-index="${index}">
                        <span class="sbs-line-num"></span>
                        <span class="sbs-line-content"></span>
                    </div>
                `;
            }

            if (line.right) {
                const highlightedContent = line.type === 'modification' && line.left
                    ? this.highlightInlineDiff(line.left.content, line.right.content, 'right')
                    : this.escapeHtml(line.right.content);

                rightHTML += `
                    <div class="sbs-line ${line.type}" id="${lineId}-right" data-index="${index}">
                        <span class="sbs-line-num">${line.right.lineNum}</span>
                        ${line.type !== 'unchanged' ? '<span class="sbs-line-marker"></span>' : ''}
                        <span class="sbs-line-content">${highlightedContent}</span>
                    </div>
                `;
            } else {
                rightHTML += `
                    <div class="sbs-line empty" id="${lineId}-right" data-index="${index}">
                        <span class="sbs-line-num"></span>
                        <span class="sbs-line-content"></span>
                    </div>
                `;
            }

            // Store connector data for lines with differences
            if (line.type !== 'unchanged') {
                this.connectorData.push({
                    index,
                    type: line.type,
                    leftId: `${lineId}-left`,
                    rightId: `${lineId}-right`
                });
            }
        });

        leftContent.innerHTML = leftHTML;
        rightContent.innerHTML = rightHTML;

        // Update file info
        document.getElementById('sbsFile1Info').textContent = `${this.file1Lines.length} lines`;
        document.getElementById('sbsFile2Info').textContent = `${this.file2Lines.length} lines`;
    },

    // Highlight inline character differences
    highlightInlineDiff(oldText, newText, side) {
        const oldChars = oldText.split('');
        const newChars = newText.split('');

        // Find common prefix
        let prefixLen = 0;
        while (prefixLen < oldChars.length && prefixLen < newChars.length &&
               oldChars[prefixLen] === newChars[prefixLen]) {
            prefixLen++;
        }

        // Find common suffix
        let suffixLen = 0;
        while (suffixLen < oldChars.length - prefixLen &&
               suffixLen < newChars.length - prefixLen &&
               oldChars[oldChars.length - 1 - suffixLen] === newChars[newChars.length - 1 - suffixLen]) {
            suffixLen++;
        }

        if (side === 'left') {
            const prefix = this.escapeHtml(oldText.substring(0, prefixLen));
            const middle = this.escapeHtml(oldText.substring(prefixLen, oldText.length - suffixLen));
            const suffix = this.escapeHtml(oldText.substring(oldText.length - suffixLen));
            return middle ? `${prefix}<span class="sbs-highlight-del">${middle}</span>${suffix}` : this.escapeHtml(oldText);
        } else {
            const prefix = this.escapeHtml(newText.substring(0, prefixLen));
            const middle = this.escapeHtml(newText.substring(prefixLen, newText.length - suffixLen));
            const suffix = this.escapeHtml(newText.substring(newText.length - suffixLen));
            return middle ? `${prefix}<span class="sbs-highlight-add">${middle}</span>${suffix}` : this.escapeHtml(newText);
        }
    },

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;');
    },

    // Update connector lines (SVG)
    updateConnectors() {
        const svg = document.getElementById('connectorSvg');
        const leftPanel = document.getElementById('sbsFile1Content');
        const rightPanel = document.getElementById('sbsFile2Content');
        const connector = document.querySelector('.sbs-connector');

        if (!svg || !leftPanel || !rightPanel || !connector) return;

        const connectorRect = connector.getBoundingClientRect();
        const leftRect = leftPanel.getBoundingClientRect();
        const rightRect = rightPanel.getBoundingClientRect();

        // Clear existing lines
        svg.innerHTML = '';

        // Get scroll positions
        const leftScroll = leftPanel.scrollTop;
        const rightScroll = rightPanel.scrollTop;

        this.connectorData.forEach(data => {
            const leftEl = document.getElementById(data.leftId);
            const rightEl = document.getElementById(data.rightId);

            if (!leftEl || !rightEl) return;

            const leftElRect = leftEl.getBoundingClientRect();
            const rightElRect = rightEl.getBoundingClientRect();

            // Calculate positions relative to connector
            const leftY = leftElRect.top - connectorRect.top + leftElRect.height / 2;
            const rightY = rightElRect.top - connectorRect.top + rightElRect.height / 2;

            // Only draw if visible
            if (leftY < -50 || leftY > connectorRect.height + 50) return;
            if (rightY < -50 || rightY > connectorRect.height + 50) return;

            // Create bezier curve path
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midX = connectorRect.width / 2;
            const d = `M 0 ${leftY} C ${midX} ${leftY}, ${midX} ${rightY}, ${connectorRect.width} ${rightY}`;

            path.setAttribute('d', d);
            path.setAttribute('class', `connector-line ${data.type}`);
            path.setAttribute('data-index', data.index);

            // Add hover effect
            path.addEventListener('mouseenter', () => {
                document.getElementById(data.leftId)?.classList.add('hover');
                document.getElementById(data.rightId)?.classList.add('hover');
            });
            path.addEventListener('mouseleave', () => {
                document.getElementById(data.leftId)?.classList.remove('hover');
                document.getElementById(data.rightId)?.classList.remove('hover');
            });

            svg.appendChild(path);
        });
    },

    // Setup synchronized scrolling
    setupScrollSync() {
        const leftPanel = document.getElementById('sbsFile1Content');
        const rightPanel = document.getElementById('sbsFile2Content');

        if (!leftPanel || !rightPanel) return;

        const syncScroll = (source, target) => {
            if (this.isSyncing) return;
            this.isSyncing = true;

            const sourceMax = source.scrollHeight - source.clientHeight;
            const targetMax = target.scrollHeight - target.clientHeight;

            if (sourceMax > 0) {
                const ratio = source.scrollTop / sourceMax;
                target.scrollTop = ratio * targetMax;
            }

            this.updateConnectors();

            requestAnimationFrame(() => {
                this.isSyncing = false;
            });
        };

        leftPanel.addEventListener('scroll', () => syncScroll(leftPanel, rightPanel));
        rightPanel.addEventListener('scroll', () => syncScroll(rightPanel, leftPanel));
    },

    // Setup resize observer to update connectors on resize
    setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') return;

        const container = document.getElementById('sideBySideView');
        if (!container) return;

        const observer = new ResizeObserver(() => {
            this.updateConnectors();
        });

        observer.observe(container);
    },

    // Show/hide the side-by-side view
    show() {
        document.getElementById('diffOutput').style.display = 'none';
        document.getElementById('sideBySideView').style.display = 'flex';

        // Generate if we have content
        const content1 = document.getElementById('file1Content')?.value;
        const content2 = document.getElementById('file2Content')?.value;

        if (content1 && content2) {
            const options = {
                ignoreWhitespace: document.getElementById('ignoreWhitespace')?.checked || false
            };
            this.generate(content1, content2, options);
        }
    },

    hide() {
        document.getElementById('diffOutput').style.display = 'block';
        document.getElementById('sideBySideView').style.display = 'none';
    }
};

// Initialize side-by-side view
SideBySideView.init();

// View toggle buttons
document.getElementById('summaryViewBtn')?.addEventListener('click', () => {
    document.getElementById('summaryViewBtn').classList.add('active');
    document.getElementById('sideBySideViewBtn').classList.remove('active');
    SideBySideView.hide();
});

document.getElementById('sideBySideViewBtn')?.addEventListener('click', () => {
    document.getElementById('sideBySideViewBtn').classList.add('active');
    document.getElementById('summaryViewBtn').classList.remove('active');
    SideBySideView.show();
});

// ==========================================
// XML PARSER — Flatten + Compare
// ==========================================

// Mode switching
document.querySelectorAll('#xmlparserPanel .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#xmlparserPanel .mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.xmlmode;
        document.getElementById('xmlParseMode').style.display   = mode === 'parse'   ? '' : 'none';
        document.getElementById('xmlCompareMode').style.display = mode === 'compare' ? '' : 'none';
    });
});

let xmlParserRows = [];

// ── Nokia RAML 2.1 sample ──
const XML_SAMPLE_NOKIA = `<?xml version="1.0" encoding="UTF-8"?>
<raml xmlns="raml21.xsd" version="2.1">
<cmData type="actual" scope="all" id="1234">
<header><log action="create" dateTime="2021-04-02T13:17:41.240Z"/></header>
<managedObject class="com.nokia.srbts:MRBTS" distName="MRBTS-1" version="SBTS20C_2006_001" operation="create">
  <p name="altitude">106</p>
  <p name="btsName">4G RennesGare 1</p>
  <p name="latitude">481026755</p>
  <p name="longitude">-16726524</p>
</managedObject>
<managedObject class="com.nokia.srbts.eqm:EQM" distName="MRBTS-1/EQM-1" version="EQM20B_2007_002" operation="create"/>
<managedObject class="NOKLTE:LNBTS" distName="MRBTS-1/LNBTS-1" version="xL20C_2007_003" operation="create">
  <p name="mcc">208</p>
  <p name="mnc">85</p>
  <p name="operationalState">onAir</p>
  <list name="qciTab1">
    <item>
      <p name="qci">1</p>
      <p name="dscp">46</p>
      <p name="resType">GBR</p>
    </item>
  </list>
  <list name="ntpServerIpAddrList">
    <p>192.168.19.4</p>
  </list>
</managedObject>
</cmData>
</raml>`;

// ── Generic/AltioStar sample ──
const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<ManagedObjects>
  <ManagedElement id="NE-WEST-01" type="OTN" vendor="Huawei" swVersion="V800R021C10">
    <Slot name="SLOT-1" adminState="IS" operState="ENABLED">
      <Port id="P1" speed="100G" fec="OFEC" loopback="NONE"/>
      <Port id="P2" speed="10G" fec="NONE" loopback="NONE"/>
    </Slot>
    <Slot name="SLOT-2" adminState="OOS" operState="DISABLED">
      <Port id="P1" speed="100G" fec="OFEC" loopback="NONE"/>
    </Slot>
    <Alarm id="ALM-001" severity="MAJOR" probableCause="LOS">Loss of Signal on Port 1</Alarm>
  </ManagedElement>
  <ManagedElement id="NE-EAST-02" type="PTN" vendor="ZTE" swVersion="V3.00">
    <Slot name="SLOT-1" adminState="IS" operState="ENABLED">
      <Port id="P1" speed="1G" fec="NONE" loopback="NONE"/>
    </Slot>
  </ManagedElement>
</ManagedObjects>`;

/**
 * Recursively walk XML nodes and emit one row per attribute/text value.
 * Fixed 4 columns: Path | Element | Attribute | Value
 */
function flattenXmlNode(node, parentPath, rows) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const path = parentPath ? `${parentPath}/${node.tagName}` : node.tagName;
    const tag  = node.tagName;

    // One row per attribute
    for (const attr of node.attributes) {
        rows.push([path, tag, attr.name, attr.value]);
    }

    // One row for direct text content (if present)
    const directText = Array.from(node.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .filter(t => t.length > 0)
        .join(' ');
    if (directText) {
        rows.push([path, tag, '#text', directText]);
    }

    // If element has no attributes and no text, still emit one row so it appears
    if (node.attributes.length === 0 && !directText) {
        rows.push([path, tag, '', '']);
    }

    for (const child of node.children) {
        flattenXmlNode(child, path, rows);
    }
}

function renderXmlTable(headers, rows) {
    let html = '<table class="mapping-table" class="mapping-table tbl">';
    html += '<thead><tr>' + headers.map(h => `<th >${escapeHtml(h)}</th>`).join('') + '</tr></thead>';
    html += '<tbody>';
    rows.forEach(row => {
        html += '<tr>' + row.map(cell => `<td class="tbl-cell-nowrap" title="${escapeHtml(cell)}">${escapeHtml(cell)}</td>`).join('') + '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

function csvEscape(val) {
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function buildCsv(headers, rows) {
    const lines = [headers.map(csvEscape).join(',')];
    rows.forEach(row => lines.push(row.map(csvEscape).join(',')));
    return lines.join('\r\n');
}

/**
 * Nokia RAML 2.1 parser.
 * Each row = one parameter from a managedObject.
 * Columns: distName | class | version | operation | listName | listIndex | paramName | value
 */
function parseNokiaRaml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) throw new Error(parseError.textContent.split('\n')[0]);

    const headers = ['distName', 'class', 'version', 'operation', 'listName', 'listIndex', 'paramName', 'value'];
    const rows = [];

    const mos = doc.getElementsByTagName('managedObject');
    for (const mo of mos) {
        const distName  = mo.getAttribute('distName')  || '';
        const cls       = mo.getAttribute('class')     || '';
        const version   = mo.getAttribute('version')   || '';
        const operation = mo.getAttribute('operation') || '';

        let hasParams = false;

        for (const child of mo.children) {
            const tag = child.localName;

            if (tag === 'p') {
                rows.push([distName, cls, version, operation, '', '', child.getAttribute('name') || '', child.textContent.trim()]);
                hasParams = true;

            } else if (tag === 'list') {
                const listName = child.getAttribute('name') || '';
                const items = Array.from(child.children).filter(c => c.localName === 'item');

                if (items.length > 0) {
                    // <list><item><p>...</p></item></list>
                    let idx = 0;
                    for (const item of items) {
                        idx++;
                        for (const ip of item.children) {
                            if (ip.localName === 'p') {
                                rows.push([distName, cls, version, operation, listName, idx, ip.getAttribute('name') || '', ip.textContent.trim()]);
                                hasParams = true;
                            }
                        }
                    }
                } else {
                    // <list><p>value</p></list> — unnamed list values
                    let idx = 0;
                    for (const lp of child.children) {
                        if (lp.localName === 'p') {
                            idx++;
                            rows.push([distName, cls, version, operation, listName, idx, '', lp.textContent.trim()]);
                            hasParams = true;
                        }
                    }
                }
            }
        }

        // Empty managedObject (no parameters)
        if (!hasParams) {
            rows.push([distName, cls, version, operation, '', '', '', '']);
        }
    }

    return { headers, rows };
}

const XML_PREVIEW_LIMIT = 500;

function renderXmlPreview(result, showAll) {
    const { headers, rows } = result;
    const total = rows.length;
    const limit = showAll ? total : Math.min(total, XML_PREVIEW_LIMIT);
    const truncated = !showAll && total > XML_PREVIEW_LIMIT;

    const wrapper = document.getElementById('xmlParserTableWrapper');
    const countEl = document.getElementById('xmlParserRowCount');

    wrapper.innerHTML = renderXmlTable(headers, rows.slice(0, limit));

    if (truncated) {
        countEl.textContent = `Parsed Results — showing ${limit} of ${total} rows`;
        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn btn-outline btn-sm ml-12';
        loadBtn.textContent = `Load all ${total} rows`;
        loadBtn.addEventListener('click', () => {
            loadBtn.remove();
            renderXmlPreview(result, true);
        });
        countEl.after(loadBtn);
    } else {
        countEl.textContent = `Parsed Results — ${total} row${total !== 1 ? 's' : ''}`;
    }
}

function parseAndRenderXml(xmlText) {
    if (!xmlText.trim()) {
        ToastManager.error('Input Required', 'Please paste XML or upload a file.');
        return;
    }

    const vendor = (document.getElementById('xmlVendorSelect')?.value) || 'generic';
    let result;

    try {
        if (vendor === 'nokia') {
            result = parseNokiaRaml(xmlText);
        } else {
            // Generic / AltioStar RAN
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlText, 'application/xml');
            const parseError = doc.querySelector('parsererror');
            if (parseError) throw new Error(parseError.textContent.split('\n')[0]);
            const flatRows = [];
            flattenXmlNode(doc.documentElement, '', flatRows);
            result = { headers: ['Path', 'Element', 'Attribute', 'Value'], rows: flatRows };
        }
    } catch (err) {
        ToastManager.error('Parse Error', err.message);
        return;
    }

    if (result.rows.length === 0) {
        ToastManager.warning('No Data', 'No parameters were found in the input.');
        return;
    }

    xmlParserRows = result;
    renderXmlPreview(result);
    document.getElementById('xmlParserOutputSection').style.display = '';
    ToastManager.success('XML Parsed', `${result.rows.length} rows extracted successfully.`);
}

document.getElementById('xmlParseBtn').addEventListener('click', function() {
    withLoader(this, () => {
    UsageTracker.increment('xml');
    parseAndRenderXml(document.getElementById('xmlParserInput').value);
    });
});

document.getElementById('xmlParserClearBtn').addEventListener('click', () => {
    document.getElementById('xmlParserInput').value = '';
    document.getElementById('xmlParserOutputSection').style.display = 'none';
    xmlParserRows = [];
});

document.getElementById('xmlParserSampleBtn').addEventListener('click', () => {
    const vendor = (document.getElementById('xmlVendorSelect')?.value) || 'generic';
    document.getElementById('xmlParserInput').value = vendor === 'nokia' ? XML_SAMPLE_NOKIA : XML_SAMPLE;
    ToastManager.info('Sample Loaded', 'Click "Parse XML" to process the sample data.');
});

document.getElementById('xmlParserFileUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        document.getElementById('xmlParserInput').value = evt.target.result;
        ToastManager.info('File Loaded', `${file.name} loaded. Click "Parse XML" to process.`);
    };
    reader.readAsText(file);
    e.target.value = '';
});

document.getElementById('xmlDownloadCsvBtn').addEventListener('click', () => {
    if (!xmlParserRows.headers) {
        ToastManager.warning('No Data', 'Parse an XML file first.');
        return;
    }
    const csv = buildCsv(xmlParserRows.headers, xmlParserRows.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xml_parsed_elements.csv';
    a.click();
    URL.revokeObjectURL(url);
    ToastManager.success('Downloaded', 'CSV file has been downloaded.');
});

document.getElementById('xmlCopyTableBtn').addEventListener('click', () => {
    if (!xmlParserRows.headers) {
        ToastManager.warning('No Data', 'Parse an XML file first.');
        return;
    }
    const tsv = [xmlParserRows.headers.join('\t'), ...xmlParserRows.rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
        ToastManager.success('Copied', 'Table copied to clipboard (tab-separated).');
    });
});

// ==========================================
// XML COMPARE
// ==========================================

let xmlCompareData   = [];
let xmlCompareFilter = 'all';

const XML_SAMPLE_2 = `<?xml version="1.0" encoding="UTF-8"?>
<ManagedObjects>
  <ManagedElement id="NE-WEST-01" type="OTN" vendor="Huawei" swVersion="V800R022C00">
    <Slot name="SLOT-1" adminState="IS" operState="ENABLED">
      <Port id="P1" speed="100G" fec="OFEC" loopback="NONE"/>
      <Port id="P2" speed="25G" fec="RS-FEC" loopback="NONE"/>
    </Slot>
    <Slot name="SLOT-3" adminState="IS" operState="ENABLED">
      <Port id="P1" speed="400G" fec="OFEC" loopback="NONE"/>
    </Slot>
  </ManagedElement>
  <ManagedElement id="NE-EAST-02" type="PTN" vendor="ZTE" swVersion="V3.00">
    <Slot name="SLOT-1" adminState="IS" operState="ENABLED">
      <Port id="P1" speed="1G" fec="NONE" loopback="NONE"/>
    </Slot>
  </ManagedElement>
</ManagedObjects>`;

const XML_SAMPLE_NOKIA_2 = `<?xml version="1.0" encoding="UTF-8"?>
<raml xmlns="raml21.xsd" version="2.1">
<cmData type="actual" scope="all" id="1235">
<header><log action="modify" dateTime="2021-05-10T09:00:00.000Z"/></header>
<managedObject class="com.nokia.srbts:MRBTS" distName="MRBTS-1" version="SBTS21A_2103_001" operation="modify">
  <p name="altitude">108</p>
  <p name="btsName">4G RennesGare 1</p>
  <p name="latitude">481026755</p>
  <p name="longitude">-16726524</p>
  <p name="txPower">43</p>
</managedObject>
<managedObject class="NOKLTE:LNBTS" distName="MRBTS-1/LNBTS-1" version="xL21A_2103_003" operation="modify">
  <p name="mcc">208</p>
  <p name="mnc">85</p>
  <p name="operationalState">onAir</p>
  <list name="qciTab1">
    <item>
      <p name="qci">1</p>
      <p name="dscp">48</p>
      <p name="resType">GBR</p>
    </item>
  </list>
  <list name="ntpServerIpAddrList">
    <p>192.168.19.5</p>
  </list>
</managedObject>
<managedObject class="NOKLTE:LNCEL" distName="MRBTS-1/LNBTS-1/LNCEL-1" version="xL21A_2103_003" operation="create">
  <p name="cellId">101</p>
  <p name="earfcnDL">1300</p>
</managedObject>
</cmData>
</raml>`;

/**
 * Flatten XML into a Map keyed by "path|attribute" → value.
 * Reuses flattenXmlNode — each row is [path, element, attribute, value].
 */
function flattenXmlToMap(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) throw new Error(err.textContent.split('\n')[0]);
    const rows = [];
    flattenXmlNode(doc.documentElement, '', rows);
    // Build map: "path||attr" → { element, value }
    const map = new Map();
    rows.forEach(([path, element, attr, value]) => {
        map.set(`${path}||${attr}`, { path, element, attr, value });
    });
    return map;
}

function compareXmlMaps(map1, map2) {
    const allKeys = new Set([...map1.keys(), ...map2.keys()]);
    const rows = [];
    for (const key of [...allKeys].sort()) {
        const a = map1.get(key);
        const b = map2.get(key);
        if (a && b) {
            const status = a.value === b.value ? 'unchanged' : 'modified';
            rows.push({ path: a.path, element: a.element, attr: a.attr, value1: a.value, value2: b.value, status });
        } else if (a) {
            rows.push({ path: a.path, element: a.element, attr: a.attr, value1: a.value, value2: '', status: 'removed' });
        } else {
            rows.push({ path: b.path, element: b.element, attr: b.attr, value1: '', value2: b.value, status: 'added' });
        }
    }
    return rows;
}

const XML_STATUS_STYLE = {
    added:     'row-added',
    removed:   'row-removed',
    modified:  'row-modified',
    unchanged: 'row-unchanged',
};
const XML_STATUS_LABEL = { added: 'Added', removed: 'Removed', modified: 'Modified', unchanged: 'Unchanged' };

function renderXmlCompareTable(rows) {
    const headers = ['Path', 'Element', 'Attribute', 'Value (XML 1)', 'Value (XML 2)', 'Status'];
    let html = '<table class="mapping-table" class="mapping-table tbl">';
    html += '<thead><tr>' + headers.map(h => `<th >${escapeHtml(h)}</th>`).join('') + '</tr></thead>';
    html += '<tbody>';
    rows.forEach(r => {
        html += `<tr class="${XML_STATUS_STYLE[r.status]}">`;
        html += `<td class="tbl-cell-path" title="${escapeHtml(r.path)}">${escapeHtml(r.path)}</td>`;
        html += `<td>${escapeHtml(r.element)}</td>`;
        html += `<td>${escapeHtml(r.attr)}</td>`;
        html += `<td class="tbl-cell-val" title="${escapeHtml(r.value1)}">${escapeHtml(r.value1)}</td>`;
        html += `<td class="tbl-cell-val" title="${escapeHtml(r.value2)}">${escapeHtml(r.value2)}</td>`;
        html += `<td><strong>${XML_STATUS_LABEL[r.status]}</strong></td>`;
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

// ── Nokia-specific compare helpers ──────────────────────────────────────────

function parseNokiaRamlToMap(xmlText) {
    const { rows } = parseNokiaRaml(xmlText);
    const map = new Map();
    rows.forEach(([distName, cls, version, operation, listName, listIndex, paramName, value]) => {
        const key = `${distName}||${cls}||${listName}||${listIndex}||${paramName}`;
        map.set(key, { distName, cls, version, operation, listName, listIndex, paramName, value });
    });
    return map;
}

function compareNokiaMaps(map1, map2) {
    const allKeys = new Set([...map1.keys(), ...map2.keys()]);
    const rows = [];
    for (const key of [...allKeys].sort()) {
        const a = map1.get(key);
        const b = map2.get(key);
        if (a && b) {
            const status = a.value === b.value ? 'unchanged' : 'modified';
            rows.push({ distName: a.distName, cls: a.cls, listName: a.listName, listIndex: a.listIndex, paramName: a.paramName, value1: a.value, value2: b.value, status });
        } else if (a) {
            rows.push({ distName: a.distName, cls: a.cls, listName: a.listName, listIndex: a.listIndex, paramName: a.paramName, value1: a.value, value2: '', status: 'removed' });
        } else {
            rows.push({ distName: b.distName, cls: b.cls, listName: b.listName, listIndex: b.listIndex, paramName: b.paramName, value1: '', value2: b.value, status: 'added' });
        }
    }
    return rows;
}

function renderNokiaCompareTable(rows) {
    const headers = ['distName', 'class', 'listName', 'listIndex', 'paramName', 'Value (XML 1)', 'Value (XML 2)', 'Status'];
    let html = '<table class="mapping-table tbl">';
    html += '<thead><tr>' + headers.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '</tr></thead>';
    html += '<tbody>';
    rows.forEach(r => {
        html += `<tr class="${XML_STATUS_STYLE[r.status]}">`;
        html += `<td class="tbl-cell-nowrap" title="${escapeHtml(r.distName)}">${escapeHtml(r.distName)}</td>`;
        html += `<td class="tbl-cell-nowrap">${escapeHtml(r.cls)}</td>`;
        html += `<td>${escapeHtml(r.listName)}</td>`;
        html += `<td>${escapeHtml(String(r.listIndex))}</td>`;
        html += `<td class="tbl-cell-nowrap">${escapeHtml(r.paramName)}</td>`;
        html += `<td class="tbl-cell-val" title="${escapeHtml(r.value1)}">${escapeHtml(r.value1)}</td>`;
        html += `<td class="tbl-cell-val" title="${escapeHtml(r.value2)}">${escapeHtml(r.value2)}</td>`;
        html += `<td><strong>${XML_STATUS_LABEL[r.status]}</strong></td>`;
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

// ── Filter / render ──────────────────────────────────────────────────────────

let xmlCompareVendor = 'generic';

function applyXmlCompareFilter(filter) {
    xmlCompareFilter = filter;
    document.querySelectorAll('.xml-cmp-filter').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    let rows = xmlCompareData;
    if (filter === 'changed')  rows = rows.filter(r => r.status !== 'unchanged');
    if (filter === 'added')    rows = rows.filter(r => r.status === 'added');
    if (filter === 'removed')  rows = rows.filter(r => r.status === 'removed');
    if (filter === 'modified') rows = rows.filter(r => r.status === 'modified');
    const tableHtml = xmlCompareVendor === 'nokia'
        ? renderNokiaCompareTable(rows)
        : renderXmlCompareTable(rows);
    document.getElementById('xmlCompareTableWrapper').innerHTML = tableHtml;
    document.getElementById('xmlCompareRowCount').textContent = `Comparison Results — ${rows.length} row${rows.length !== 1 ? 's' : ''} shown`;
}

document.getElementById('xmlCompareBtn').addEventListener('click', function() {
    const text1 = document.getElementById('xmlCompare1Input').value.trim();
    const text2 = document.getElementById('xmlCompare2Input').value.trim();
    if (!text1 || !text2) { ToastManager.error('Input Required', 'Please provide both XML 1 and XML 2.'); return; }

    xmlCompareVendor = (document.getElementById('xmlCompareVendorSelect')?.value) || 'generic';
    withLoader(this, () => {
    UsageTracker.increment('xml');

    if (xmlCompareVendor === 'nokia') {
        let map1, map2;
        try { map1 = parseNokiaRamlToMap(text1); } catch (e) { ToastManager.error('Invalid XML 1', e.message); return; }
        try { map2 = parseNokiaRamlToMap(text2); } catch (e) { ToastManager.error('Invalid XML 2', e.message); return; }
        xmlCompareData = compareNokiaMaps(map1, map2);
    } else {
        let map1, map2;
        try { map1 = flattenXmlToMap(text1); } catch (e) { ToastManager.error('Invalid XML 1', e.message); return; }
        try { map2 = flattenXmlToMap(text2); } catch (e) { ToastManager.error('Invalid XML 2', e.message); return; }
        xmlCompareData = compareXmlMaps(map1, map2);
    }

    const counts = { added: 0, removed: 0, modified: 0, unchanged: 0 };
    xmlCompareData.forEach(r => counts[r.status]++);

    document.getElementById('xmlCmpAdded').textContent     = `+ ${counts.added} Added`;
    document.getElementById('xmlCmpRemoved').textContent   = `− ${counts.removed} Removed`;
    document.getElementById('xmlCmpModified').textContent  = `~ ${counts.modified} Modified`;
    document.getElementById('xmlCmpUnchanged').textContent = `= ${counts.unchanged} Unchanged`;
    document.getElementById('xmlCompareSummary').style.display = 'block';
    document.getElementById('xmlCompareOutputSection').style.display = '';
    applyXmlCompareFilter('all');
    ToastManager.success('Compared', `${xmlCompareData.length} rows analysed.`);
    });
});

document.getElementById('xmlCompareClearBtn').addEventListener('click', () => {
    document.getElementById('xmlCompare1Input').value = '';
    document.getElementById('xmlCompare2Input').value = '';
    document.getElementById('xmlCompareSummary').style.display = 'none';
    document.getElementById('xmlCompareOutputSection').style.display = 'none';
    xmlCompareData = [];
});

document.getElementById('xmlCompare1SampleBtn').addEventListener('click', () => {
    const vendor = document.getElementById('xmlCompareVendorSelect')?.value || 'generic';
    document.getElementById('xmlCompare1Input').value = vendor === 'nokia' ? XML_SAMPLE_NOKIA : XML_SAMPLE;
    ToastManager.info('Sample Loaded', 'Base XML loaded into XML 1.');
});

document.getElementById('xmlCompare2SampleBtn').addEventListener('click', () => {
    const vendor = document.getElementById('xmlCompareVendorSelect')?.value || 'generic';
    document.getElementById('xmlCompare2Input').value = vendor === 'nokia' ? XML_SAMPLE_NOKIA_2 : XML_SAMPLE_2;
    ToastManager.info('Sample Loaded', 'Modified XML loaded into XML 2.');
});

document.getElementById('xmlCompare1Upload').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => { document.getElementById('xmlCompare1Input').value = evt.target.result; ToastManager.info('File Loaded', `${file.name} loaded.`); };
    reader.readAsText(file); e.target.value = '';
});

document.getElementById('xmlCompare2Upload').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => { document.getElementById('xmlCompare2Input').value = evt.target.result; ToastManager.info('File Loaded', `${file.name} loaded.`); };
    reader.readAsText(file); e.target.value = '';
});

document.querySelectorAll('.xml-cmp-filter').forEach(btn => {
    btn.addEventListener('click', () => applyXmlCompareFilter(btn.dataset.filter));
});

document.getElementById('xmlCompareDownloadCsvBtn').addEventListener('click', () => {
    if (!xmlCompareData.length) { ToastManager.warning('No Data', 'Run a comparison first.'); return; }
    let rows = xmlCompareData;
    if (xmlCompareFilter === 'changed')  rows = rows.filter(r => r.status !== 'unchanged');
    if (xmlCompareFilter === 'added')    rows = rows.filter(r => r.status === 'added');
    if (xmlCompareFilter === 'removed')  rows = rows.filter(r => r.status === 'removed');
    if (xmlCompareFilter === 'modified') rows = rows.filter(r => r.status === 'modified');
    const headers = xmlCompareVendor === 'nokia'
        ? ['distName', 'class', 'listName', 'listIndex', 'paramName', 'Value (XML 1)', 'Value (XML 2)', 'Status']
        : ['Path', 'Element', 'Attribute', 'Value (XML 1)', 'Value (XML 2)', 'Status'];
    const tableRows = xmlCompareVendor === 'nokia'
        ? rows.map(r => [r.distName, r.cls, r.listName, String(r.listIndex), r.paramName, r.value1, r.value2, XML_STATUS_LABEL[r.status]])
        : rows.map(r => [r.path, r.element, r.attr, r.value1, r.value2, XML_STATUS_LABEL[r.status]]);
    const csv = buildCsv(headers, tableRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'xml_comparison.csv'; a.click();
    URL.revokeObjectURL(url);
    ToastManager.success('Downloaded', 'Comparison CSV downloaded.');
});

document.getElementById('xmlCompareCopyBtn').addEventListener('click', () => {
    if (!xmlCompareData.length) { ToastManager.warning('No Data', 'Run a comparison first.'); return; }
    let rows = xmlCompareData;
    if (xmlCompareFilter === 'changed')  rows = rows.filter(r => r.status !== 'unchanged');
    if (xmlCompareFilter === 'added')    rows = rows.filter(r => r.status === 'added');
    if (xmlCompareFilter === 'removed')  rows = rows.filter(r => r.status === 'removed');
    if (xmlCompareFilter === 'modified') rows = rows.filter(r => r.status === 'modified');
    const headers = xmlCompareVendor === 'nokia'
        ? ['distName', 'class', 'listName', 'listIndex', 'paramName', 'Value (XML 1)', 'Value (XML 2)', 'Status']
        : ['Path', 'Element', 'Attribute', 'Value (XML 1)', 'Value (XML 2)', 'Status'];
    const dataRows = xmlCompareVendor === 'nokia'
        ? rows.map(r => [r.distName, r.cls, r.listName, String(r.listIndex), r.paramName, r.value1, r.value2, XML_STATUS_LABEL[r.status]])
        : rows.map(r => [r.path, r.element, r.attr, r.value1, r.value2, XML_STATUS_LABEL[r.status]]);
    const tsv = [headers.join('\t'), ...dataRows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => ToastManager.success('Copied', 'Comparison table copied to clipboard.'));
});

// ==========================================
// JSON PARSER — Flatten to CSV + Compare
// ==========================================

// Mode switching
document.querySelectorAll('#jsonparserPanel .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#jsonparserPanel .mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.jsonmode;
        document.getElementById('jsonParseMode').style.display   = mode === 'parse'   ? '' : 'none';
        document.getElementById('jsonCompareMode').style.display = mode === 'compare' ? '' : 'none';
    });
});

let jsonParserRows = [];

const JSON_SAMPLE = `{
  "managedElements": [
    {
      "id": "NE-WEST-01",
      "type": "OTN",
      "vendor": "Huawei",
      "swVersion": "V800R021C10",
      "slots": [
        {
          "name": "SLOT-1",
          "adminState": "IS",
          "operState": "ENABLED",
          "ports": [
            { "id": "P1", "speed": "100G", "fec": "OFEC" },
            { "id": "P2", "speed": "10G",  "fec": "NONE" }
          ]
        },
        {
          "name": "SLOT-2",
          "adminState": "OOS",
          "operState": "DISABLED",
          "ports": [
            { "id": "P1", "speed": "100G", "fec": "OFEC" }
          ]
        }
      ],
      "alarms": [
        { "id": "ALM-001", "severity": "MAJOR", "cause": "LOS", "description": "Loss of Signal on Port 1" }
      ]
    },
    {
      "id": "NE-EAST-02",
      "type": "PTN",
      "vendor": "ZTE",
      "swVersion": "V3.00",
      "slots": [
        {
          "name": "SLOT-1",
          "adminState": "IS",
          "operState": "ENABLED",
          "ports": [
            { "id": "P1", "speed": "1G", "fec": "NONE" }
          ]
        }
      ],
      "alarms": []
    }
  ]
}`;

/**
 * Recursively flatten a JSON value into rows.
 * Each leaf produces one row: { path, type, value }.
 * Arrays are indexed as [0], [1], etc.
 */
function flattenJson(value, path, rows) {
    if (value === null) {
        rows.push({ path, type: 'null', value: 'null' });
    } else if (Array.isArray(value)) {
        if (value.length === 0) {
            rows.push({ path, type: 'array', value: '[]' });
        } else {
            value.forEach((item, i) => flattenJson(item, `${path}[${i}]`, rows));
        }
    } else if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) {
            rows.push({ path, type: 'object', value: '{}' });
        } else {
            keys.forEach(k => flattenJson(value[k], path ? `${path}.${k}` : k, rows));
        }
    } else {
        rows.push({ path, type: typeof value, value: String(value) });
    }
}

function renderJsonTable(headers, rows) {
    let html = '<table class="mapping-table" class="mapping-table tbl">';
    html += '<thead><tr>' + headers.map(h => `<th >${escapeHtml(h)}</th>`).join('') + '</tr></thead>';
    html += '<tbody>';
    rows.forEach(row => {
        html += '<tr>' + row.map(cell => `<td class="tbl-cell-lg" title="${escapeHtml(cell)}">${escapeHtml(cell)}</td>`).join('') + '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

function parseAndRenderJson(jsonText) {
    if (!jsonText.trim()) {
        ToastManager.error('Input Required', 'Please paste JSON or upload a file.');
        return;
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch (e) {
        ToastManager.error('Invalid JSON', e.message);
        return;
    }

    const flatRows = [];
    flattenJson(parsed, '', flatRows);

    if (flatRows.length === 0) {
        ToastManager.warning('No Data', 'No values were found in the JSON input.');
        return;
    }

    const headers = ['Path', 'Type', 'Value'];
    const tableRows = flatRows.map(r => [r.path, r.type, r.value]);
    jsonParserRows = { headers, rows: tableRows };

    document.getElementById('jsonParserTableWrapper').innerHTML = renderJsonTable(headers, tableRows);
    document.getElementById('jsonParserRowCount').textContent = `Parsed Results — ${tableRows.length} value${tableRows.length !== 1 ? 's' : ''}`;
    document.getElementById('jsonParserOutputSection').style.display = '';
    ToastManager.success('JSON Parsed', `${tableRows.length} values extracted successfully.`);
}

document.getElementById('jsonParseBtn').addEventListener('click', function() {
    withLoader(this, () => {
    UsageTracker.increment('json');
    parseAndRenderJson(document.getElementById('jsonParserInput').value);
    });
});

document.getElementById('jsonParserClearBtn').addEventListener('click', () => {
    document.getElementById('jsonParserInput').value = '';
    document.getElementById('jsonParserOutputSection').style.display = 'none';
    jsonParserRows = [];
});

document.getElementById('jsonParserSampleBtn').addEventListener('click', () => {
    document.getElementById('jsonParserInput').value = JSON_SAMPLE;
    ToastManager.info('Sample Loaded', 'Click "Parse JSON" to process the sample data.');
});

document.getElementById('jsonParserFileUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        document.getElementById('jsonParserInput').value = evt.target.result;
        ToastManager.info('File Loaded', `${file.name} loaded. Click "Parse JSON" to process.`);
    };
    reader.readAsText(file);
    e.target.value = '';
});

document.getElementById('jsonDownloadCsvBtn').addEventListener('click', () => {
    if (!jsonParserRows.headers) {
        ToastManager.warning('No Data', 'Parse a JSON file first.');
        return;
    }
    const csv = buildCsv(jsonParserRows.headers, jsonParserRows.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'json_parsed_values.csv';
    a.click();
    URL.revokeObjectURL(url);
    ToastManager.success('Downloaded', 'CSV file has been downloaded.');
});

document.getElementById('jsonCopyTableBtn').addEventListener('click', () => {
    if (!jsonParserRows.headers) {
        ToastManager.warning('No Data', 'Parse a JSON file first.');
        return;
    }
    const tsv = [jsonParserRows.headers.join('\t'), ...jsonParserRows.rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
        ToastManager.success('Copied', 'Table copied to clipboard (tab-separated).');
    });
});

// ==========================================
// JSON COMPARE
// ==========================================

let jsonCompareData = [];      // full set of comparison rows (objects)
let jsonCompareFilter = 'all'; // active filter

const JSON_SAMPLE_2 = `{
  "managedElements": [
    {
      "id": "NE-WEST-01",
      "type": "OTN",
      "vendor": "Huawei",
      "swVersion": "V800R022C00",
      "slots": [
        {
          "name": "SLOT-1",
          "adminState": "IS",
          "operState": "ENABLED",
          "ports": [
            { "id": "P1", "speed": "100G", "fec": "OFEC" },
            { "id": "P2", "speed": "25G",  "fec": "RS-FEC" }
          ]
        },
        {
          "name": "SLOT-3",
          "adminState": "IS",
          "operState": "ENABLED",
          "ports": [
            { "id": "P1", "speed": "400G", "fec": "OFEC" }
          ]
        }
      ],
      "alarms": []
    },
    {
      "id": "NE-EAST-02",
      "type": "PTN",
      "vendor": "ZTE",
      "swVersion": "V3.00",
      "slots": [
        {
          "name": "SLOT-1",
          "adminState": "IS",
          "operState": "ENABLED",
          "ports": [
            { "id": "P1", "speed": "1G", "fec": "NONE" }
          ]
        }
      ],
      "alarms": []
    }
  ]
}`;

/**
 * Flatten JSON into a Map of path → { type, value }.
 */
function flattenJsonToMap(value, path, map) {
    if (value === null) {
        map.set(path, { type: 'null', value: 'null' });
    } else if (Array.isArray(value)) {
        if (value.length === 0) {
            map.set(path, { type: 'array', value: '[]' });
        } else {
            value.forEach((item, i) => flattenJsonToMap(item, `${path}[${i}]`, map));
        }
    } else if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) {
            map.set(path, { type: 'object', value: '{}' });
        } else {
            keys.forEach(k => flattenJsonToMap(value[k], path ? `${path}.${k}` : k, map));
        }
    } else {
        map.set(path, { type: typeof value, value: String(value) });
    }
}

function compareJsonMaps(map1, map2) {
    const allPaths = new Set([...map1.keys(), ...map2.keys()]);
    const rows = [];
    for (const path of [...allPaths].sort()) {
        const a = map1.get(path);
        const b = map2.get(path);
        if (a && b) {
            if (a.value === b.value) {
                rows.push({ path, type: a.type, value1: a.value, value2: b.value, status: 'unchanged' });
            } else {
                rows.push({ path, type: a.type || b.type, value1: a.value, value2: b.value, status: 'modified' });
            }
        } else if (a && !b) {
            rows.push({ path, type: a.type, value1: a.value, value2: '', status: 'removed' });
        } else {
            rows.push({ path, type: b.type, value1: '', value2: b.value, status: 'added' });
        }
    }
    return rows;
}

const STATUS_STYLE = {
    added:     'row-added',
    removed:   'row-removed',
    modified:  'row-modified',
    unchanged: 'row-unchanged',
};
const STATUS_LABEL = {
    added: 'Added', removed: 'Removed', modified: 'Modified', unchanged: 'Unchanged'
};

function renderCompareTable(rows) {
    const headers = ['Path', 'Type', 'Value (JSON 1)', 'Value (JSON 2)', 'Status'];
    let html = '<table class="mapping-table" class="mapping-table tbl">';
    html += '<thead><tr>' + headers.map(h => `<th >${escapeHtml(h)}</th>`).join('') + '</tr></thead>';
    html += '<tbody>';
    rows.forEach(r => {
                html += `<tr class="${STATUS_STYLE[r.status]}">`;
        html += `<td class="tbl-cell-wide" title="${escapeHtml(r.path)}">${escapeHtml(r.path)}</td>`;
        html += `<td>${escapeHtml(r.type)}</td>`;
        html += `<td class="tbl-cell-val-md" title="${escapeHtml(r.value1)}">${escapeHtml(r.value1)}</td>`;
        html += `<td class="tbl-cell-val-md" title="${escapeHtml(r.value2)}">${escapeHtml(r.value2)}</td>`;
        html += `<td><strong>${STATUS_LABEL[r.status]}</strong></td>`;
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

function applyCompareFilter(filter) {
    jsonCompareFilter = filter;
    document.querySelectorAll('.json-cmp-filter').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    let rows = jsonCompareData;
    if (filter === 'changed')  rows = rows.filter(r => r.status !== 'unchanged');
    if (filter === 'added')    rows = rows.filter(r => r.status === 'added');
    if (filter === 'removed')  rows = rows.filter(r => r.status === 'removed');
    if (filter === 'modified') rows = rows.filter(r => r.status === 'modified');
    document.getElementById('jsonCompareTableWrapper').innerHTML = renderCompareTable(rows);
    document.getElementById('jsonCompareRowCount').textContent = `Comparison Results — ${rows.length} row${rows.length !== 1 ? 's' : ''} shown`;
}

function runJsonCompare() {
    const text1 = document.getElementById('jsonCompare1Input').value.trim();
    const text2 = document.getElementById('jsonCompare2Input').value.trim();
    if (!text1 || !text2) {
        ToastManager.error('Input Required', 'Please provide both JSON 1 and JSON 2.');
        return;
    }
    let parsed1, parsed2;
    try { parsed1 = JSON.parse(text1); } catch (e) { ToastManager.error('Invalid JSON 1', e.message); return; }
    try { parsed2 = JSON.parse(text2); } catch (e) { ToastManager.error('Invalid JSON 2', e.message); return; }

    const map1 = new Map(); flattenJsonToMap(parsed1, '', map1);
    const map2 = new Map(); flattenJsonToMap(parsed2, '', map2);

    jsonCompareData = compareJsonMaps(map1, map2);

    const counts = { added: 0, removed: 0, modified: 0, unchanged: 0 };
    jsonCompareData.forEach(r => counts[r.status]++);

    document.getElementById('jsonCmpAdded').textContent    = `+ ${counts.added} Added`;
    document.getElementById('jsonCmpRemoved').textContent  = `− ${counts.removed} Removed`;
    document.getElementById('jsonCmpModified').textContent = `~ ${counts.modified} Modified`;
    document.getElementById('jsonCmpUnchanged').textContent = `= ${counts.unchanged} Unchanged`;

    const summary = document.getElementById('jsonCompareSummary');
    summary.style.display = 'flex';
    summary.style.flexWrap = 'wrap';

    document.getElementById('jsonCompareOutputSection').style.display = '';
    applyCompareFilter('all');
    ToastManager.success('Compared', `${jsonCompareData.length} paths analysed.`);
}

document.getElementById('jsonCompareBtn').addEventListener('click', runJsonCompare);

document.getElementById('jsonCompareClearBtn').addEventListener('click', () => {
    document.getElementById('jsonCompare1Input').value = '';
    document.getElementById('jsonCompare2Input').value = '';
    document.getElementById('jsonCompareSummary').style.display = 'none';
    document.getElementById('jsonCompareOutputSection').style.display = 'none';
    jsonCompareData = [];
});

document.getElementById('jsonCompare1SampleBtn').addEventListener('click', () => {
    document.getElementById('jsonCompare1Input').value = JSON_SAMPLE;
    ToastManager.info('Sample Loaded', 'Base JSON loaded into JSON 1.');
});

document.getElementById('jsonCompare2SampleBtn').addEventListener('click', () => {
    document.getElementById('jsonCompare2Input').value = JSON_SAMPLE_2;
    ToastManager.info('Sample Loaded', 'Modified JSON loaded into JSON 2.');
});

function makeFileUploadHandler(inputId, elementId) {
    document.getElementById(inputId).addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            document.getElementById(elementId).value = evt.target.result;
            ToastManager.info('File Loaded', `${file.name} loaded.`);
        };
        reader.readAsText(file);
        e.target.value = '';
    });
}
makeFileUploadHandler('jsonCompare1Upload', 'jsonCompare1Input');
makeFileUploadHandler('jsonCompare2Upload', 'jsonCompare2Input');

document.querySelectorAll('.json-cmp-filter').forEach(btn => {
    btn.addEventListener('click', () => applyCompareFilter(btn.dataset.filter));
});

document.getElementById('jsonCompareDownloadCsvBtn').addEventListener('click', () => {
    if (!jsonCompareData.length) { ToastManager.warning('No Data', 'Run a comparison first.'); return; }
    let rows = jsonCompareData;
    if (jsonCompareFilter === 'changed')  rows = rows.filter(r => r.status !== 'unchanged');
    if (jsonCompareFilter === 'added')    rows = rows.filter(r => r.status === 'added');
    if (jsonCompareFilter === 'removed')  rows = rows.filter(r => r.status === 'removed');
    if (jsonCompareFilter === 'modified') rows = rows.filter(r => r.status === 'modified');
    const headers = ['Path', 'Type', 'Value (JSON 1)', 'Value (JSON 2)', 'Status'];
    const tableRows = rows.map(r => [r.path, r.type, r.value1, r.value2, STATUS_LABEL[r.status]]);
    const csv = buildCsv(headers, tableRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'json_comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
    ToastManager.success('Downloaded', 'Comparison CSV downloaded.');
});

document.getElementById('jsonCompareCopyBtn').addEventListener('click', () => {
    if (!jsonCompareData.length) { ToastManager.warning('No Data', 'Run a comparison first.'); return; }
    let rows = jsonCompareData;
    if (jsonCompareFilter === 'changed')  rows = rows.filter(r => r.status !== 'unchanged');
    if (jsonCompareFilter === 'added')    rows = rows.filter(r => r.status === 'added');
    if (jsonCompareFilter === 'removed')  rows = rows.filter(r => r.status === 'removed');
    if (jsonCompareFilter === 'modified') rows = rows.filter(r => r.status === 'modified');
    const headers = ['Path', 'Type', 'Value (JSON 1)', 'Value (JSON 2)', 'Status'];
    const tsv = [headers.join('\t'), ...rows.map(r => [r.path, r.type, r.value1, r.value2, STATUS_LABEL[r.status]].join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
        ToastManager.success('Copied', 'Comparison table copied to clipboard.');
    });
});
