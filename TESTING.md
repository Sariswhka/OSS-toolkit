# E2E Integration Generator — Testing Guide

**Last Updated**: 2026-02-16
**Deployment**: https://emstools.web.app
**Feature**: MIB Analysis + SNMP Artifact Generation

---

## Pre-requisite

1. Open **https://emstools.web.app** in Chrome or Edge
2. Sign in with your Google account
3. Click the **E2E Integration Generator** tab

---

## Test 1: Sample MIB — AMF (Happy Path)

1. In **Phase 1: Requirements Gathering**, locate the **MIB Analysis** section
2. Click **"Load Sample MIB"** dropdown and select **MAVENIR-AMF-MIB**
3. **Expected**: MIB parses and shows statistics:
   - Total OIDs count
   - FM / PM / CM category counts
4. Browse the **FM / PM / CM tabs** — verify objects are listed
5. Check the **Select All** checkbox for FM objects
6. Click **"Apply to Integration"**
7. **Expected**: Wizard auto-populates SNMP fields in subsequent phases

---

## Test 2: Sample MIBs — All Four

Repeat Test 1 for each sample MIB:
- **MAVENIR-SMF-MIB** (5G Session Management Function)
- **MAVENIR-UPF-MIB** (5G User Plane Function)
- **MAVENIR-MME-MIB** (4G Mobility Management Entity)

**Expected**: Each loads and classifies without errors.

---

## Test 3: MIB File Upload

1. Create a simple `.mib` file locally (or rename any `.txt` MIB you have)
2. In Phase 1 MIB section, drag-and-drop the file onto the upload area (or click Browse)
3. **Expected**: File parses and shows object statistics
4. Try a file > 2MB — **Expected**: Error message rejecting oversized file
5. Try an invalid format (e.g., `.exe`) — **Expected**: Validation error

---

## Test 4: SNMP Flow Diagram

1. Load the **AMF MIB** and click **Apply to Integration**
2. Proceed to **Phase 2: Design**
3. **Expected Flow Diagram** should show SNMP-specific nodes:
   - `SNMP Agent → Trap Receiver + Poller → Alarm Correlator + KPI Calculator → Transformer → Target System`
4. Verify the Mermaid diagram renders correctly (not raw text)

---

## Test 5: Code Artifacts

1. Proceed to **Phase 3: Artifacts**
2. Verify these are generated:
   - `snmptrapd.conf` — trap receiver config with trap handlers
   - `polling_config.yaml` — SNMP polling with OID list
   - Java SNMP client code (trap listener + poller classes)
   - Python SNMP integration module
3. Spot-check the OIDs in the generated configs match what was in the loaded MIB

---

## Test 6: ZIP Export

1. From **Phase 3 or 4**, click **Export All / Download ZIP**
2. **Expected**: A `.zip` file downloads
3. Unzip and verify folder structure:
   ```
   code/
   orchestration/
   database/
   infrastructure/
   monitoring/
   snmp/
   diagrams/
   README.md
   ```
4. Open `diagrams/flow.mmd` — verify it contains valid Mermaid syntax
5. Open `README.md` — verify it has a quick-start guide

---

## Test 7: Non-SNMP Protocol (Regression)

1. Start a new E2E session, set protocol to **REST** (not SNMP)
2. Complete all 4 phases **without** loading a MIB
3. **Expected**: Normal REST artifacts generated (no SNMP-specific content)
4. Verify ZIP export still works for REST-based integration

---

## Pass Criteria

| Test | Expected Result |
|------|----------------|
| Sample MIBs load | FM/PM/CM stats shown |
| File upload | Accepts valid MIB, rejects invalid |
| Flow diagram | SNMP nodes visible, Mermaid renders |
| Code artifacts | snmptrapd.conf, polling_config.yaml present |
| ZIP export | Valid folder structure + README |
| Non-SNMP regression | No SNMP artifacts in REST flow |
