// Sample Mavenir MIB files for testing and demonstration
// Enterprise OID: 1.3.6.1.4.1.99999 (fictional Mavenir PEN)

const SampleMIBs = {
    /**
     * Get list of available sample MIBs
     */
    getList() {
        return [
            { id: 'amf', name: 'MAVENIR-AMF-MIB', description: '5G Access & Mobility Management Function' },
            { id: 'smf', name: 'MAVENIR-SMF-MIB', description: '5G Session Management Function' },
            { id: 'upf', name: 'MAVENIR-UPF-MIB', description: '5G User Plane Function' },
            { id: 'mme', name: 'MAVENIR-MME-MIB', description: '4G Mobility Management Entity' }
        ];
    },

    /**
     * Get MIB content by ID
     */
    get(id) {
        const mibs = {
            amf: this._amfMib,
            smf: this._smfMib,
            upf: this._upfMib,
            mme: this._mmeMib
        };
        return mibs[id] || null;
    },

    // =========================================================
    // MAVENIR-AMF-MIB - 5G Access & Mobility Management
    // =========================================================
    _amfMib: `MAVENIR-AMF-MIB DEFINITIONS ::= BEGIN

IMPORTS
    MODULE-IDENTITY, OBJECT-TYPE, NOTIFICATION-TYPE,
    Counter64, Gauge32, Integer32, Unsigned32
        FROM SNMPv2-SMI
    DisplayString
        FROM SNMPv2-TC
    MODULE-COMPLIANCE, OBJECT-GROUP, NOTIFICATION-GROUP
        FROM SNMPv2-CONF;

mavenicAmfMIB MODULE-IDENTITY
    LAST-UPDATED "202501150000Z"
    ORGANIZATION "Mavenir Systems"
    CONTACT-INFO "Mavenir NOC - noc@mavenir.com"
    DESCRIPTION  "MIB module for Mavenir 5G AMF (Access and Mobility Management Function)"
    ::= { enterprises 99999 1 1 }

-- OID tree
mavenir          OBJECT IDENTIFIER ::= { enterprises 99999 }
mavenicProducts  OBJECT IDENTIFIER ::= { mavenir 1 }
mavenicAmf       OBJECT IDENTIFIER ::= { mavenicProducts 1 }
amfObjects       OBJECT IDENTIFIER ::= { mavenicAmf 1 }
amfNotifs        OBJECT IDENTIFIER ::= { mavenicAmf 2 }
amfConformance   OBJECT IDENTIFIER ::= { mavenicAmf 3 }

-- PM subtrees
amfPmCounters    OBJECT IDENTIFIER ::= { amfObjects 1 }
amfPmGauges      OBJECT IDENTIFIER ::= { amfObjects 2 }

-- CM subtree
amfConfig        OBJECT IDENTIFIER ::= { amfObjects 3 }

-- ==========================================
-- PM Objects - Registration Counters
-- ==========================================

amfRegistrationAttempts OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total number of UE registration attempts received by AMF"
    ::= { amfPmCounters 1 }

amfRegistrationSuccess OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total number of successful UE registrations"
    ::= { amfPmCounters 2 }

amfRegistrationFailures OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total number of failed UE registration attempts"
    ::= { amfPmCounters 3 }

-- PM Objects - Paging Counters

amfPagingAttempts OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total number of paging attempts initiated by AMF"
    ::= { amfPmCounters 4 }

amfPagingSuccess OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total number of successful paging operations"
    ::= { amfPmCounters 5 }

-- PM Objects - Handover Counters

amfHandoverAttempts OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total number of inter-AMF handover attempts"
    ::= { amfPmCounters 6 }

amfHandoverSuccess OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total number of successful inter-AMF handovers"
    ::= { amfPmCounters 7 }

-- PM Objects - Gauges

amfActiveUeContexts OBJECT-TYPE
    SYNTAX      Gauge32
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Current number of active UE contexts managed by this AMF"
    ::= { amfPmGauges 1 }

amfN2ConnectionsActive OBJECT-TYPE
    SYNTAX      Gauge32
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Current number of active N2 (NGAP) connections to gNBs"
    ::= { amfPmGauges 2 }

-- ==========================================
-- CM Objects - Configuration
-- ==========================================

amfMaxUeContexts OBJECT-TYPE
    SYNTAX      Unsigned32
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Maximum number of UE contexts this AMF can manage"
    ::= { amfConfig 1 }

amfN2Timeout OBJECT-TYPE
    SYNTAX      Unsigned32
    UNITS       "seconds"
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Timeout for N2 interface operations in seconds"
    ::= { amfConfig 2 }

amfOverloadThreshold OBJECT-TYPE
    SYNTAX      Unsigned32
    UNITS       "percent"
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "CPU utilization percentage that triggers overload control"
    ::= { amfConfig 3 }

amfRegistrationRetryInterval OBJECT-TYPE
    SYNTAX      Unsigned32
    UNITS       "seconds"
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Retry interval for failed registrations in seconds"
    ::= { amfConfig 4 }

-- ==========================================
-- FM Objects - Notifications
-- ==========================================

amfRegistrationFailureAlarm NOTIFICATION-TYPE
    OBJECTS { amfRegistrationFailures, amfRegistrationAttempts }
    STATUS  current
    DESCRIPTION "Generated when registration failure rate exceeds threshold"
    ::= { amfNotifs 1 }

amfN2LinkDownAlarm NOTIFICATION-TYPE
    OBJECTS { amfN2ConnectionsActive }
    STATUS  current
    DESCRIPTION "Generated when an N2 link to a gNB goes down"
    ::= { amfNotifs 2 }

amfOverloadAlarm NOTIFICATION-TYPE
    OBJECTS { amfActiveUeContexts, amfMaxUeContexts }
    STATUS  current
    DESCRIPTION "Generated when AMF enters overload condition"
    ::= { amfNotifs 3 }

END
`,

    // =========================================================
    // MAVENIR-SMF-MIB - 5G Session Management
    // =========================================================
    _smfMib: `MAVENIR-SMF-MIB DEFINITIONS ::= BEGIN

IMPORTS
    MODULE-IDENTITY, OBJECT-TYPE, NOTIFICATION-TYPE,
    Counter64, Gauge32, Integer32, Unsigned32
        FROM SNMPv2-SMI
    DisplayString
        FROM SNMPv2-TC
    MODULE-COMPLIANCE, OBJECT-GROUP, NOTIFICATION-GROUP
        FROM SNMPv2-CONF;

mavenicSmfMIB MODULE-IDENTITY
    LAST-UPDATED "202501150000Z"
    ORGANIZATION "Mavenir Systems"
    CONTACT-INFO "Mavenir NOC - noc@mavenir.com"
    DESCRIPTION  "MIB module for Mavenir 5G SMF (Session Management Function)"
    ::= { enterprises 99999 1 2 }

-- OID tree
mavenir          OBJECT IDENTIFIER ::= { enterprises 99999 }
mavenicProducts  OBJECT IDENTIFIER ::= { mavenir 1 }
mavenicSmf       OBJECT IDENTIFIER ::= { mavenicProducts 2 }
smfObjects       OBJECT IDENTIFIER ::= { mavenicSmf 1 }
smfNotifs        OBJECT IDENTIFIER ::= { mavenicSmf 2 }
smfConformance   OBJECT IDENTIFIER ::= { mavenicSmf 3 }

smfPmCounters    OBJECT IDENTIFIER ::= { smfObjects 1 }
smfPmGauges      OBJECT IDENTIFIER ::= { smfObjects 2 }
smfConfig        OBJECT IDENTIFIER ::= { smfObjects 3 }

-- ==========================================
-- PM Objects - PDU Session Counters
-- ==========================================

smfPduSessionCreateAttempts OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total PDU session establishment attempts"
    ::= { smfPmCounters 1 }

smfPduSessionCreateSuccess OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total successful PDU session establishments"
    ::= { smfPmCounters 2 }

smfPduSessionModifyAttempts OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total PDU session modification attempts"
    ::= { smfPmCounters 3 }

smfPduSessionModifySuccess OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total successful PDU session modifications"
    ::= { smfPmCounters 4 }

smfPduSessionReleaseTotal OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total PDU sessions released"
    ::= { smfPmCounters 5 }

smfN4MessagesTotal OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total N4 (PFCP) messages exchanged with UPFs"
    ::= { smfPmCounters 6 }

-- PM Objects - Gauges

smfActivePduSessions OBJECT-TYPE
    SYNTAX      Gauge32
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Current number of active PDU sessions"
    ::= { smfPmGauges 1 }

-- ==========================================
-- CM Objects - Configuration
-- ==========================================

smfSessionTimeout OBJECT-TYPE
    SYNTAX      Unsigned32
    UNITS       "seconds"
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Idle timeout for PDU sessions in seconds"
    ::= { smfConfig 1 }

smfUpfSelectionPolicy OBJECT-TYPE
    SYNTAX      DisplayString (SIZE (0..64))
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "UPF selection policy: round-robin, least-loaded, locality"
    ::= { smfConfig 2 }

smfMaxPduSessions OBJECT-TYPE
    SYNTAX      Unsigned32
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Maximum number of PDU sessions this SMF can manage"
    ::= { smfConfig 3 }

smfIpPoolSize OBJECT-TYPE
    SYNTAX      Unsigned32
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Size of the IP address pool for PDU sessions"
    ::= { smfConfig 4 }

-- ==========================================
-- FM Objects - Notifications
-- ==========================================

smfSessionSetupFailureAlarm NOTIFICATION-TYPE
    OBJECTS { smfPduSessionCreateAttempts, smfPduSessionCreateSuccess }
    STATUS  current
    DESCRIPTION "Generated when PDU session setup failure rate exceeds threshold"
    ::= { smfNotifs 1 }

smfN4PeerDownAlarm NOTIFICATION-TYPE
    OBJECTS { smfN4MessagesTotal }
    STATUS  current
    DESCRIPTION "Generated when N4 peer (UPF) becomes unreachable"
    ::= { smfNotifs 2 }

smfResourceExhaustionAlarm NOTIFICATION-TYPE
    OBJECTS { smfActivePduSessions, smfMaxPduSessions }
    STATUS  current
    DESCRIPTION "Generated when PDU session count approaches configured maximum"
    ::= { smfNotifs 3 }

END
`,

    // =========================================================
    // MAVENIR-UPF-MIB - 5G User Plane
    // =========================================================
    _upfMib: `MAVENIR-UPF-MIB DEFINITIONS ::= BEGIN

IMPORTS
    MODULE-IDENTITY, OBJECT-TYPE, NOTIFICATION-TYPE,
    Counter64, Gauge32, Integer32, Unsigned32
        FROM SNMPv2-SMI
    DisplayString
        FROM SNMPv2-TC
    MODULE-COMPLIANCE, OBJECT-GROUP, NOTIFICATION-GROUP
        FROM SNMPv2-CONF;

mavenicUpfMIB MODULE-IDENTITY
    LAST-UPDATED "202501150000Z"
    ORGANIZATION "Mavenir Systems"
    CONTACT-INFO "Mavenir NOC - noc@mavenir.com"
    DESCRIPTION  "MIB module for Mavenir 5G UPF (User Plane Function)"
    ::= { enterprises 99999 1 3 }

-- OID tree
mavenir          OBJECT IDENTIFIER ::= { enterprises 99999 }
mavenicProducts  OBJECT IDENTIFIER ::= { mavenir 1 }
mavenicUpf       OBJECT IDENTIFIER ::= { mavenicProducts 3 }
upfObjects       OBJECT IDENTIFIER ::= { mavenicUpf 1 }
upfNotifs        OBJECT IDENTIFIER ::= { mavenicUpf 2 }
upfConformance   OBJECT IDENTIFIER ::= { mavenicUpf 3 }

upfPmCounters    OBJECT IDENTIFIER ::= { upfObjects 1 }
upfPmGauges      OBJECT IDENTIFIER ::= { upfObjects 2 }
upfConfig        OBJECT IDENTIFIER ::= { upfObjects 3 }

-- ==========================================
-- PM Objects - Traffic Counters
-- ==========================================

upfBytesReceived OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total bytes received on the user plane"
    ::= { upfPmCounters 1 }

upfBytesSent OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total bytes sent on the user plane"
    ::= { upfPmCounters 2 }

upfPacketsReceived OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total packets received on the user plane"
    ::= { upfPmCounters 3 }

upfPacketsSent OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total packets sent on the user plane"
    ::= { upfPmCounters 4 }

upfPacketsDropped OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total packets dropped due to policy or errors"
    ::= { upfPmCounters 5 }

upfN3BytesTotal OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total bytes on N3 interface (gNB to UPF)"
    ::= { upfPmCounters 6 }

upfN9BytesTotal OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total bytes on N9 interface (UPF to UPF)"
    ::= { upfPmCounters 7 }

-- PM Objects - Gauges

upfGtpTunnelsActive OBJECT-TYPE
    SYNTAX      Gauge32
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Current number of active GTP-U tunnels"
    ::= { upfPmGauges 1 }

-- ==========================================
-- CM Objects - Configuration
-- ==========================================

upfMaxTunnels OBJECT-TYPE
    SYNTAX      Unsigned32
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Maximum number of GTP tunnels this UPF can handle"
    ::= { upfConfig 1 }

upfQosEnforcement OBJECT-TYPE
    SYNTAX      DisplayString (SIZE (0..32))
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "QoS enforcement mode: strict, best-effort, disabled"
    ::= { upfConfig 2 }

upfPacketLossThreshold OBJECT-TYPE
    SYNTAX      Unsigned32
    UNITS       "percent"
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Packet loss percentage threshold for alarm generation"
    ::= { upfConfig 3 }

upfBufferSize OBJECT-TYPE
    SYNTAX      Unsigned32
    UNITS       "megabytes"
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Packet buffer size in megabytes"
    ::= { upfConfig 4 }

-- ==========================================
-- FM Objects - Notifications
-- ==========================================

upfPacketLossAlarm NOTIFICATION-TYPE
    OBJECTS { upfPacketsDropped, upfPacketsReceived }
    STATUS  current
    DESCRIPTION "Generated when packet loss rate exceeds configured threshold"
    ::= { upfNotifs 1 }

upfGtpTunnelFailureAlarm NOTIFICATION-TYPE
    OBJECTS { upfGtpTunnelsActive }
    STATUS  current
    DESCRIPTION "Generated when GTP tunnel setup failure is detected"
    ::= { upfNotifs 2 }

upfHighCpuAlarm NOTIFICATION-TYPE
    OBJECTS { upfGtpTunnelsActive, upfMaxTunnels }
    STATUS  current
    DESCRIPTION "Generated when UPF CPU usage exceeds safe operating limit"
    ::= { upfNotifs 3 }

END
`,

    // =========================================================
    // MAVENIR-MME-MIB - 4G Mobility Management Entity
    // =========================================================
    _mmeMib: `MAVENIR-MME-MIB DEFINITIONS ::= BEGIN

IMPORTS
    MODULE-IDENTITY, OBJECT-TYPE, NOTIFICATION-TYPE,
    Counter64, Gauge32, Integer32, Unsigned32
        FROM SNMPv2-SMI
    DisplayString
        FROM SNMPv2-TC
    MODULE-COMPLIANCE, OBJECT-GROUP, NOTIFICATION-GROUP
        FROM SNMPv2-CONF;

mavenicMmeMIB MODULE-IDENTITY
    LAST-UPDATED "202501150000Z"
    ORGANIZATION "Mavenir Systems"
    CONTACT-INFO "Mavenir NOC - noc@mavenir.com"
    DESCRIPTION  "MIB module for Mavenir 4G MME (Mobility Management Entity)"
    ::= { enterprises 99999 1 4 }

-- OID tree
mavenir          OBJECT IDENTIFIER ::= { enterprises 99999 }
mavenicProducts  OBJECT IDENTIFIER ::= { mavenir 1 }
mavenicMme       OBJECT IDENTIFIER ::= { mavenicProducts 4 }
mmeObjects       OBJECT IDENTIFIER ::= { mavenicMme 1 }
mmeNotifs        OBJECT IDENTIFIER ::= { mavenicMme 2 }
mmeConformance   OBJECT IDENTIFIER ::= { mavenicMme 3 }

mmePmCounters    OBJECT IDENTIFIER ::= { mmeObjects 1 }
mmePmGauges      OBJECT IDENTIFIER ::= { mmeObjects 2 }
mmeConfig        OBJECT IDENTIFIER ::= { mmeObjects 3 }

-- ==========================================
-- PM Objects - Attach/Detach Counters
-- ==========================================

mmeAttachAttempts OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total UE attach attempts"
    ::= { mmePmCounters 1 }

mmeAttachSuccess OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total successful UE attach procedures"
    ::= { mmePmCounters 2 }

mmeDetachTotal OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total UE detach procedures"
    ::= { mmePmCounters 3 }

-- PM Objects - Handover Counters

mmeHandoverAttempts OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total inter-MME handover attempts"
    ::= { mmePmCounters 4 }

mmeHandoverSuccess OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total successful inter-MME handovers"
    ::= { mmePmCounters 5 }

-- PM Objects - Service Request Counters

mmeServiceRequestAttempts OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total service request attempts"
    ::= { mmePmCounters 6 }

mmeServiceRequestSuccess OBJECT-TYPE
    SYNTAX      Counter64
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Total successful service requests"
    ::= { mmePmCounters 7 }

-- PM Objects - Gauges

mmeActiveEpsBearers OBJECT-TYPE
    SYNTAX      Gauge32
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Current number of active EPS bearers"
    ::= { mmePmGauges 1 }

mmeS1ConnectionsActive OBJECT-TYPE
    SYNTAX      Gauge32
    MAX-ACCESS  read-only
    STATUS      current
    DESCRIPTION "Current number of active S1-MME connections to eNBs"
    ::= { mmePmGauges 2 }

-- ==========================================
-- CM Objects - Configuration
-- ==========================================

mmeMaxBearers OBJECT-TYPE
    SYNTAX      Unsigned32
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Maximum number of EPS bearers this MME can manage"
    ::= { mmeConfig 1 }

mmeS1Timeout OBJECT-TYPE
    SYNTAX      Unsigned32
    UNITS       "seconds"
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Timeout for S1-AP interface operations"
    ::= { mmeConfig 2 }

mmeAuthRetryLimit OBJECT-TYPE
    SYNTAX      Unsigned32
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Maximum authentication retry attempts before failure"
    ::= { mmeConfig 3 }

mmePagingDrxCycle OBJECT-TYPE
    SYNTAX      Unsigned32
    UNITS       "milliseconds"
    MAX-ACCESS  read-write
    STATUS      current
    DESCRIPTION "Default paging DRX cycle length in milliseconds"
    ::= { mmeConfig 4 }

-- ==========================================
-- FM Objects - Notifications
-- ==========================================

mmeS1LinkFailureAlarm NOTIFICATION-TYPE
    OBJECTS { mmeS1ConnectionsActive }
    STATUS  current
    DESCRIPTION "Generated when an S1-MME link to an eNB fails"
    ::= { mmeNotifs 1 }

mmeAuthFailureAlarm NOTIFICATION-TYPE
    OBJECTS { mmeAttachAttempts, mmeAttachSuccess }
    STATUS  current
    DESCRIPTION "Generated when authentication failure rate exceeds threshold"
    ::= { mmeNotifs 2 }

mmePoolOverloadAlarm NOTIFICATION-TYPE
    OBJECTS { mmeActiveEpsBearers, mmeMaxBearers }
    STATUS  current
    DESCRIPTION "Generated when MME pool enters overload condition"
    ::= { mmeNotifs 3 }

END
`
};
