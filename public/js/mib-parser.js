// MIB Parser - Client-side SMIv1/SMIv2 MIB file parser
// Parses SNMP MIB definitions and classifies objects into FM/PM/CM categories

const MIBParser = {
    // Base OID map for resolving symbolic references
    _baseOidMap: {
        'iso': '1',
        'org': '1.3',
        'dod': '1.3.6',
        'internet': '1.3.6.1',
        'directory': '1.3.6.1.1',
        'mgmt': '1.3.6.1.2',
        'mib-2': '1.3.6.1.2.1',
        'system': '1.3.6.1.2.1.1',
        'interfaces': '1.3.6.1.2.1.2',
        'snmpMIB': '1.3.6.1.6.3.1',
        'experimental': '1.3.6.1.3',
        'private': '1.3.6.1.4',
        'enterprises': '1.3.6.1.4.1',
        'snmpModules': '1.3.6.1.6.3',
        'zeroDotZero': '0.0'
    },

    /**
     * Parse a MIB file text and return structured data
     * @param {string} text - Raw MIB file content
     * @returns {object} Parsed MIB data
     */
    parse(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('Invalid MIB content: empty or not a string');
        }

        const cleaned = this._preprocess(text);
        const moduleName = this._parseModuleName(cleaned);
        const moduleIdentity = this._parseModuleIdentity(cleaned);
        const importedModules = this._parseImports(cleaned);
        const textualConventions = this._parseTextualConventions(cleaned);
        const sequences = this._parseSequences(cleaned);
        const oidDefinitions = this._parseOidAssignments(cleaned);
        const objects = this._parseObjectTypes(cleaned, oidDefinitions);
        const notifications = this._parseNotificationTypes(cleaned, oidDefinitions);
        const traps = this._parseTrapTypes(cleaned, oidDefinitions);

        // Merge traps into notifications
        const allNotifications = [...notifications, ...traps];

        // Classify all objects
        objects.forEach(obj => {
            obj.category = this._classifyObject(obj);
        });

        // Notifications are always FM
        allNotifications.forEach(n => {
            n.category = 'FM';
        });

        // Build combined object list
        const allObjects = [...objects, ...allNotifications];

        // Compute stats
        const stats = {
            total: allObjects.length,
            fm: allObjects.filter(o => o.category === 'FM').length,
            pm: allObjects.filter(o => o.category === 'PM').length,
            cm: allObjects.filter(o => o.category === 'CM').length,
            scalars: objects.filter(o => !o.isTableColumn).length,
            tableColumns: objects.filter(o => o.isTableColumn).length,
            notifications: allNotifications.length
        };

        return {
            moduleName,
            moduleIdentity,
            objects: allObjects,
            notifications: allNotifications,
            sequences,
            importedModules,
            oidDefinitions,
            textualConventions,
            stats
        };
    },

    /**
     * Strip comments and normalize whitespace
     */
    _preprocess(text) {
        // Remove single-line comments (-- to end of line)
        let cleaned = text.replace(/--[^\n]*$/gm, '');
        // Normalize line endings
        cleaned = cleaned.replace(/\r\n/g, '\n');
        return cleaned;
    },

    /**
     * Extract module name from DEFINITIONS line
     */
    _parseModuleName(text) {
        const match = text.match(/^\s*([A-Za-z][A-Za-z0-9_-]*)\s+DEFINITIONS\s*::=\s*BEGIN/m);
        return match ? match[1] : 'UNKNOWN-MIB';
    },

    /**
     * Extract MODULE-IDENTITY block
     */
    _parseModuleIdentity(text) {
        const match = text.match(
            /(\w+)\s+MODULE-IDENTITY\s+([\s\S]*?)::=\s*\{([^}]+)\}/
        );
        if (!match) return null;

        const name = match[1];
        const body = match[2];
        const oidRef = match[3].trim();

        const lastUpdated = this._extractQuotedField(body, 'LAST-UPDATED');
        const organization = this._extractQuotedField(body, 'ORGANIZATION');
        const contactInfo = this._extractQuotedField(body, 'CONTACT-INFO');
        const description = this._extractQuotedField(body, 'DESCRIPTION');

        return {
            name,
            lastUpdated,
            organization,
            contactInfo,
            description,
            oidRef
        };
    },

    /**
     * Extract IMPORTS section
     */
    _parseImports(text) {
        const match = text.match(/IMPORTS\s+([\s\S]*?)\s*;/);
        if (!match) return {};

        const imports = {};
        const body = match[1];
        // Split by FROM keyword
        const parts = body.split(/\bFROM\b/);

        for (let i = 1; i < parts.length; i++) {
            const lines = parts[i].trim().split('\n');
            const moduleName = lines[0].trim().replace(/[,;]/g, '').trim();
            const importedItems = parts[i - 1]
                ? parts[i - 1].trim().split(/[,\s]+/).filter(s => s && s !== 'FROM')
                : [];
            // The items before each FROM belong to the previous module
            // Actually we need items from parts[i-1] end section
        }

        // Simpler approach: match each "item1, item2 FROM ModuleName"
        const importRegex = /([\s\S]*?)\s+FROM\s+([A-Za-z][A-Za-z0-9_-]*)/g;
        let m;
        while ((m = importRegex.exec(body)) !== null) {
            const items = m[1].trim().split(/[,\s]+/).filter(s => s.length > 0);
            const moduleName = m[2].trim();
            imports[moduleName] = items;
        }

        return imports;
    },

    /**
     * Parse TEXTUAL-CONVENTION definitions
     */
    _parseTextualConventions(text) {
        const conventions = {};
        const regex = /(\w+)\s*::=\s*TEXTUAL-CONVENTION\s+([\s\S]*?)SYNTAX\s+(\S+)/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const name = match[1];
            const body = match[2];
            const syntax = match[3];
            conventions[name] = {
                name,
                displayHint: this._extractQuotedField(body, 'DISPLAY-HINT'),
                status: this._extractField(body, 'STATUS'),
                description: this._extractQuotedField(body, 'DESCRIPTION'),
                syntax
            };
        }

        return conventions;
    },

    /**
     * Parse SEQUENCE definitions
     */
    _parseSequences(text) {
        const sequences = {};
        const regex = /(\w+)\s*::=\s*SEQUENCE\s*\{([^}]+)\}/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const name = match[1];
            const fields = match[2].split(',').map(f => {
                const parts = f.trim().split(/\s+/);
                return { name: parts[0], type: parts.slice(1).join(' ') };
            }).filter(f => f.name);

            sequences[name] = fields;
        }

        return sequences;
    },

    /**
     * Parse OID assignments: name OBJECT IDENTIFIER ::= { parent num }
     */
    _parseOidAssignments(text) {
        const oidMap = { ...this._baseOidMap };

        // Match: name OBJECT IDENTIFIER ::= { parent sub }
        const oidRegex = /(\w+)\s+OBJECT\s+IDENTIFIER\s*::=\s*\{\s*(\w+)\s+(\d+)\s*\}/g;
        let match;

        while ((match = oidRegex.exec(text)) !== null) {
            const name = match[1];
            const parent = match[2];
            const sub = match[3];
            const parentOid = oidMap[parent];
            if (parentOid) {
                oidMap[name] = `${parentOid}.${sub}`;
            } else {
                oidMap[name] = `${parent}.${sub}`;
            }
        }

        // Also match MODULE-IDENTITY and other ::= { parent num } patterns
        const genRegex = /(\w+)\s+(?:MODULE-IDENTITY|OBJECT-TYPE|NOTIFICATION-TYPE|OBJECT-GROUP|NOTIFICATION-GROUP|MODULE-COMPLIANCE)[\s\S]*?::=\s*\{\s*(\w+)\s+(\d+)\s*\}/g;

        while ((match = genRegex.exec(text)) !== null) {
            const name = match[1];
            const parent = match[2];
            const sub = match[3];
            if (!oidMap[name]) {
                const parentOid = oidMap[parent];
                if (parentOid) {
                    oidMap[name] = `${parentOid}.${sub}`;
                } else {
                    oidMap[name] = `${parent}.${sub}`;
                }
            }
        }

        return oidMap;
    },

    /**
     * Parse OBJECT-TYPE definitions (scalar and table column objects)
     */
    _parseObjectTypes(text, oidMap) {
        const objects = [];
        const regex = /(\w+)\s+OBJECT-TYPE\s+([\s\S]*?)::=\s*\{\s*(\w+)\s+(\d+)\s*\}/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const name = match[1];
            const body = match[2];
            const parent = match[3];
            const sub = match[4];

            const syntax = this._extractField(body, 'SYNTAX');
            const maxAccess = this._extractField(body, 'MAX-ACCESS') || this._extractField(body, 'ACCESS');
            const status = this._extractField(body, 'STATUS');
            const description = this._extractQuotedField(body, 'DESCRIPTION');
            const units = this._extractQuotedField(body, 'UNITS');
            const index = this._extractField(body, 'INDEX');

            // Resolve OID
            const parentOid = oidMap[parent];
            const oid = parentOid ? `${parentOid}.${sub}` : `${parent}.${sub}`;
            oidMap[name] = oid;

            // Determine if this is a table entry (SEQUENCE type) or a column
            const isTableEntry = syntax && syntax.toUpperCase().includes('SEQUENCE');
            const isTableColumn = !isTableEntry && this._isTableColumn(parent, text);

            objects.push({
                name,
                type: 'OBJECT-TYPE',
                syntax: syntax || '',
                maxAccess: maxAccess || '',
                status: status || 'current',
                description: description || '',
                units: units || '',
                oid,
                parent,
                isTableEntry,
                isTableColumn,
                index: index || '',
                category: '' // Will be classified later
            });
        }

        return objects.filter(o => !o.isTableEntry);
    },

    /**
     * Check if parent is a table entry
     */
    _isTableColumn(parent, text) {
        const entryRegex = new RegExp(`${parent}\\s+OBJECT-TYPE\\s+[\\s\\S]*?SYNTAX\\s+\\w*[Ee]ntry`, 'i');
        return entryRegex.test(text);
    },

    /**
     * Parse NOTIFICATION-TYPE definitions (SMIv2)
     */
    _parseNotificationTypes(text, oidMap) {
        const notifications = [];
        const regex = /(\w+)\s+NOTIFICATION-TYPE\s+([\s\S]*?)::=\s*\{\s*(\w+)\s+(\d+)\s*\}/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const name = match[1];
            const body = match[2];
            const parent = match[3];
            const sub = match[4];

            const objectsField = this._extractListField(body, 'OBJECTS');
            const status = this._extractField(body, 'STATUS');
            const description = this._extractQuotedField(body, 'DESCRIPTION');

            const parentOid = oidMap[parent];
            const oid = parentOid ? `${parentOid}.${sub}` : `${parent}.${sub}`;
            oidMap[name] = oid;

            notifications.push({
                name,
                type: 'NOTIFICATION-TYPE',
                syntax: 'NOTIFICATION',
                maxAccess: 'not-accessible',
                status: status || 'current',
                description: description || '',
                oid,
                parent,
                notificationObjects: objectsField,
                category: 'FM'
            });
        }

        return notifications;
    },

    /**
     * Parse TRAP-TYPE definitions (SMIv1)
     */
    _parseTrapTypes(text, oidMap) {
        const traps = [];
        const regex = /(\w+)\s+TRAP-TYPE\s+([\s\S]*?)::=\s*(\d+)/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const name = match[1];
            const body = match[2];
            const trapNum = match[3];

            const enterprise = this._extractField(body, 'ENTERPRISE');
            const description = this._extractQuotedField(body, 'DESCRIPTION');

            const enterpriseOid = oidMap[enterprise] || enterprise;
            const oid = `${enterpriseOid}.0.${trapNum}`;

            traps.push({
                name,
                type: 'TRAP-TYPE',
                syntax: 'TRAP',
                maxAccess: 'not-accessible',
                status: 'current',
                description: description || '',
                oid,
                parent: enterprise,
                category: 'FM'
            });
        }

        return traps;
    },

    /**
     * Classify an OBJECT-TYPE into FM, PM, or CM
     */
    _classifyObject(obj) {
        // Already classified (notifications)
        if (obj.type === 'NOTIFICATION-TYPE' || obj.type === 'TRAP-TYPE') {
            return 'FM';
        }

        const nameLower = obj.name.toLowerCase();
        const syntaxLower = (obj.syntax || '').toLowerCase();
        const accessLower = (obj.maxAccess || '').toLowerCase();
        const descLower = (obj.description || '').toLowerCase();

        // PM: Counter/Gauge types or performance-related names
        const pmSyntaxTypes = ['counter32', 'counter64', 'gauge32', 'gauge64', 'counter', 'timeticks'];
        const pmNamePatterns = [
            'counter', 'count', 'bytes', 'packets', 'attempts', 'success',
            'failure', 'failures', 'total', 'rate', 'dropped', 'errors',
            'received', 'sent', 'active', 'connections', 'sessions',
            'messages', 'requests', 'latency', 'throughput', 'utilization'
        ];

        if (pmSyntaxTypes.some(t => syntaxLower.includes(t))) {
            return 'PM';
        }
        if (pmNamePatterns.some(p => nameLower.includes(p))) {
            return 'PM';
        }

        // CM: read-write/read-create access or config-related names
        const cmAccessTypes = ['read-write', 'read-create'];
        const cmNamePatterns = [
            'config', 'timeout', 'max', 'threshold', 'policy', 'interval',
            'retry', 'limit', 'size', 'enable', 'disable', 'mode',
            'setting', 'parameter', 'admin', 'oper', 'enforcement',
            'pool', 'selection', 'drx', 'cycle'
        ];

        if (cmAccessTypes.some(a => accessLower.includes(a))) {
            return 'CM';
        }
        if (cmNamePatterns.some(p => nameLower.includes(p))) {
            return 'CM';
        }

        // Default: if read-only with numeric type, likely PM
        if (accessLower === 'read-only' && (syntaxLower.includes('integer') || syntaxLower.includes('unsigned'))) {
            return 'PM';
        }

        // Default to CM for anything else
        return 'CM';
    },

    /**
     * Resolve a symbolic OID path to numeric
     */
    _resolveOid(oidRef, oidMap) {
        const parts = oidRef.trim().replace(/[{}]/g, '').trim().split(/\s+/);
        if (parts.length === 2) {
            const parent = parts[0];
            const sub = parts[1];
            const parentOid = oidMap[parent];
            if (parentOid) {
                return `${parentOid}.${sub}`;
            }
        }
        return oidRef;
    },

    // Helper: extract a simple field value (e.g., STATUS current)
    _extractField(body, fieldName) {
        const regex = new RegExp(`${fieldName}\\s+([^\\n"]+)`, 'i');
        const match = body.match(regex);
        return match ? match[1].trim() : '';
    },

    // Helper: extract a quoted field value (e.g., DESCRIPTION "...")
    _extractQuotedField(body, fieldName) {
        const regex = new RegExp(`${fieldName}\\s+"([^"]*)"`, 'is');
        const match = body.match(regex);
        return match ? match[1].trim() : '';
    },

    // Helper: extract a list field like OBJECTS { item1, item2 }
    _extractListField(body, fieldName) {
        const regex = new RegExp(`${fieldName}\\s*\\{([^}]*)\\}`, 'i');
        const match = body.match(regex);
        if (!match) return [];
        return match[1].split(',').map(s => s.trim()).filter(s => s);
    }
};
