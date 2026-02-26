# EMS Integration Toolkit

## Project Overview
A browser-based toolkit for Telecom OSS/BSS engineers providing utilities for EMS (Element Management System) integration tasks. All processing happens client-side for data privacy.

**Live URL**: https://emstools.web.app
**Firebase Project**: create-your-qr (hosting site: emstools)
**Repository**: https://github.com/Sariswhka/OSS-toolkit

---

## Tech Stack
- **Frontend**: Vanilla HTML, CSS, JavaScript (Single Page Application)
- **Authentication**: Firebase Auth (Google Sign-in)
- **Hosting**: Firebase Hosting
- **No Backend**: All processing done client-side for privacy

---

## File Structure
```
ems-tools/
├── public/
│   ├── index.html          # Main application (all tools)
│   ├── docs.html           # User documentation/guide
│   ├── css/
│   │   └── style.css       # All styles
│   └── js/
│       ├── app.js          # Main application logic
│       ├── auth.js         # Firebase authentication
│       └── config.js       # Firebase configuration
├── firebase.json           # Firebase hosting config
└── CLAUDE.md              # This file
```

---

## Features / Tools

### 1. TL1 Parser/Builder
- **Parse Mode**: Parse TL1 responses into JSON, Table, or CSV format
- **Build Mode**: Construct TL1 commands with proper syntax
- Supports standard TL1 response formats
- Auto-detects command completion codes (COMPLD, DENY, etc.)

### 2. Alarm Mapper
- Create mappings between EMS alarm codes and OSS alarm definitions
- Import/Export mappings as JSON
- Persistent storage in localStorage
- Fields: Source Code, Severity, Target Code, Category, Description

### 3. Payload Transformer
- Transform data between formats: JSON, XML, CSV, Key-Value
- Bi-directional conversion
- Pretty print / minify options
- Syntax validation

### 4. SNMP OID Browser
- Decode SNMP OID strings
- Parse SNMP walk output
- Common MIB lookups
- Format as table output

### 5. NETCONF/XML Tools
- XML validation and formatting
- XPath expression tester
- NETCONF RPC builder
- Namespace-aware processing

### 6. YANG Parser & Comparison
- **Parse Mode**: Parse YANG modules and extract structure
  - Module information (name, namespace, prefix)
  - Imports, typedefs, groupings
  - Containers, lists, leaf nodes
  - Revisions and descriptions
- **Compare Mode**: Compare two YANG modules
  - Detect added/removed/modified elements
  - Highlight structural differences
  - Side-by-side comparison view
- **Tree View Mode**: Generate schema tree visualization
  - Hierarchical display of YANG structure
  - Similar to `pyang --format tree` output
- **Validate**: Syntax validation for YANG modules

### 8. E2E Integration Generator
A 4-phase wizard for designing complete integration solutions:

**Phase 1 - Source Configuration**:
- Source type (EMS, Database, API, File)
- Protocol selection (TL1, SNMP, NETCONF, REST, etc.)
- Connection details

**Phase 2 - Target Configuration**:
- Target system type
- Output format
- Delivery method

**Phase 3 - Transformation Rules**:
- Field mappings
- Data transformations
- Filtering rules

**Phase 4 - Generated Artifacts**:
- Solution Flow Diagram (Mermaid)
- Architecture Diagram
- Component specifications
- Code artifacts (Python, Java, configs)
- Database schemas
- Deployment configurations

### 9. Config Compare
- Compare two configuration files side-by-side
- Highlight differences
- Support for various config formats

---

## Authentication
- Google Sign-in required to access tools
- Firebase Auth handles authentication
- User info displayed in header
- Logout functionality available

---

## Key Functions (app.js)

### TL1 Parser
- `parseTL1Response(input)` - Parse TL1 response text
- `buildTL1Command(params)` - Build TL1 command string
- `formatAsTable(data)` - Convert parsed data to HTML table
- `formatAsCSV(data)` - Convert to CSV format

### Alarm Mapper
- `addAlarmMapping(mapping)` - Add new alarm mapping
- `deleteAlarmMapping(id)` - Remove mapping
- `exportMappings()` - Export as JSON
- `importMappings(json)` - Import from JSON
- `saveMappingsToStorage()` - Persist to localStorage

### Payload Transformer
- `transformPayload(input, fromFormat, toFormat)` - Convert between formats
- `validateJSON(str)` - Validate JSON syntax
- `validateXML(str)` - Validate XML syntax
- `prettifyJSON(str)` - Format JSON with indentation
- `minifyJSON(str)` - Remove whitespace from JSON

### SNMP Tools
- `decodeOID(oid)` - Decode OID string
- `parseSnmpWalk(output)` - Parse snmpwalk output
- `lookupMIB(oid)` - Look up OID in common MIBs

### NETCONF/XML
- `validateXML(xml)` - Validate XML document
- `testXPath(xml, xpath)` - Execute XPath query
- `formatXML(xml)` - Pretty print XML
- `buildNetconfRPC(operation, params)` - Build NETCONF RPC

### YANG Parser
- `parseYangModule(yangText)` - Parse YANG module and extract elements
- `validateYangModule(yangText)` - Validate YANG syntax
- `compareYangModules(yang1, yang2)` - Compare two YANG modules
- `generateYangTree(yangText)` - Generate schema tree visualization
- `displayYangParsed(parsed)` - Display parsed YANG structure
- `displayYangComparison(comparison)` - Display comparison results

### E2E Generator
- `generateSolutionFlow()` - Create Mermaid flow diagram
- `generateArchitecture()` - Create architecture diagram
- `generateCodeArtifacts()` - Generate implementation code
- `generateDeploymentConfig()` - Create deployment files

---

## CSS Classes Reference

### Layout
- `.tool-tab` / `.tool-tab.active` - Tool navigation tabs
- `.tool-panel` / `.tool-panel.active` - Tool content panels
- `.mode-btn` / `.mode-btn.active` - Mode toggle buttons

### Components
- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-outline`
- `.input-section` / `.output-section` - Tool input/output areas
- `.output-area` - Results display container
- `.mapping-table` - Alarm mapper table

### E2E Generator
- `.wizard-step` / `.wizard-step.active` / `.wizard-step.completed`
- `.design-tab` / `.design-tab.active` - Design view tabs
- `.artifact-card` - Generated artifact cards

---

## Deployment

### Firebase CLI Commands
```bash
# Navigate to project
cd "C:\Users\Richa\OneDrive\Apps\EMS Tools"

# Deploy to Firebase
firebase deploy --only hosting:emstools

# View deployed site
# https://emstools.web.app
```

### Firebase Config (firebase.json)
```json
{
  "hosting": {
    "site": "emstools",
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

---

## Data Storage

| Storage | Content |
|---------|---------|
| localStorage | Alarm mappings, user preferences |
| Firebase Auth | User authentication state |

---

## Documentation
User documentation is available at `/docs.html` covering:
1. Overview
2. Getting Started
3. TL1 Parser/Builder
4. Alarm Mapper
5. Payload Transformer
6. SNMP OID Browser
7. NETCONF/XML Tools
8. E2E Integration Generator
9. Tips & Best Practices

---

## Privacy
- All data processing happens locally in the browser
- No data is sent to external servers (except Firebase Auth)
- User configurations stored only in localStorage

---

## Future Enhancements
- [ ] Additional protocol support (CORBA, SOAP)
- [ ] Template library for common integrations
- [ ] Batch processing capabilities
- [ ] Export to more formats
- [ ] Collaboration features

---

## Contact / Support
For issues or feature requests, continue the conversation with Claude Code.
