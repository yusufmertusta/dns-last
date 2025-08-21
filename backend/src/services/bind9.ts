import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const ZONE_DIR = '/etc/bind/zones';
const RNDC_PATH = '/usr/sbin/rndc';
const NAMED_CONF_LOCAL = '/etc/bind/named.conf.local';

interface DNSLoadBalancer {
  id: string;
  name: string;
  isActive: boolean;
  algorithm: string;
  domain: {
    name: string;
  };
  servers: Array<{
    id: string;
    name: string;
    ip: string;
    port: number;
    weight: number;
    isActive: boolean;
    health?: {
      status: string;
      responseTime: number;
    };
  }>;
}

interface Domain {
  id: string;
  name: string;
  records: Array<{
    id: string;
    name: string;
    type: string;
    value: string;
    ttl: number;
    priority?: number | null;
    weight?: number | null;
    port?: number | null;
    isLoadBalanced?: boolean;
    loadBalancerId?: string | null;
  }>;
}

export async function syncBind9() {
  try {
    console.log('Syncing Bind9...');
    
    // Get all domains and their DNS records
    const domains = await prisma.domain.findMany({
      include: {
        records: true
      }
    });

    // Get all DNS load balancers and their servers
    const loadBalancers = await prisma.dNSLoadBalancer.findMany({
      include: {
        domain: true,
        servers: {
          include: {
            health: true
          }
        }
      }
    });

    // Create zone files for each domain
    for (const domain of domains) {
      await createZoneFile(domain as Domain, loadBalancers as DNSLoadBalancer[]);
    }

    // Update named.conf.local
    await updateNamedConfLocal(domains as Domain[]);

    // Reload BIND9
    await reloadBind9();
    
    console.log('Bind9 sync completed successfully');
  } catch (error) {
    console.error('Error syncing Bind9:', error);
    throw error;
  }
}

async function createZoneFile(domain: Domain, loadBalancers: DNSLoadBalancer[]) {
  const zoneFileName = `${domain.name}.zone`;
  const zoneFilePath = `${ZONE_DIR}/${zoneFileName}`;
  
  let zoneContent = `$TTL 86400
@       IN      SOA     ${domain.name}. admin.${domain.name}. (
                        2023080701      ; Serial
                        3600            ; Refresh
                        1800            ; Retry
                        1209600         ; Expire
                        86400 )         ; Negative Cache TTL

@       IN      NS      ns1.${domain.name}.
@       IN      A       127.0.0.1
ns1     IN      A       127.0.0.1

`;

  // Add DNS records
  for (const record of domain.records) {
    // Load balanced kayıtları atla, bunlar ayrıca işlenecek
    if (record.isLoadBalanced) continue;
    
    const ttl = record.ttl || 300;
    const priority = record.priority ? ` ${record.priority}` : '';
    const weight = record.weight ? ` ${record.weight}` : '';
    const port = record.port ? ` ${record.port}` : '';
    
    // Handle record name - extract subdomain from full domain name
    let recordName = record.name;
    
    // If the record name is the same as the domain, use @
    if (recordName === domain.name) {
      recordName = '@';
    }
    // If the record name ends with the domain name, remove it
    else if (recordName.endsWith(`.${domain.name}`)) {
      recordName = recordName.replace(`.${domain.name}`, '');
    }
    // If the record name is a full domain that contains the domain name
    else if (recordName.includes(`.${domain.name}`)) {
      recordName = recordName.replace(`.${domain.name}`, '');
    }
    // If the record name is a separate domain (like ece.com), skip it
    else if (recordName.includes('.') && !recordName.endsWith(domain.name)) {
      console.log(`Skipping record ${recordName} as it's not a subdomain of ${domain.name}`);
      continue;
    }
    
    // Handle MX records - they need a priority number
    if (record.type === 'MX') {
      const mxPriority = record.priority || 10;
      zoneContent += `${recordName}       IN      ${record.type}     ${mxPriority} ${record.value}\n`;
    } else if (record.type === 'CNAME') {
      // For CNAME records, ensure the target doesn't have the domain appended
      let target = record.value;
      
      // If the target already ends with the domain name, remove it
      if (target.endsWith(`.${domain.name}`)) {
        target = target.replace(`.${domain.name}`, '');
      }
      
      // If the target doesn't end with a dot, add the domain
      if (!target.endsWith('.')) {
        target = target + '.' + domain.name + '.';
      }
      
      zoneContent += `${recordName}       IN      ${record.type}     ${target}\n`;
    } else {
      zoneContent += `${recordName}       IN      ${record.type}${priority}${weight}${port}     ${record.value}\n`;
    }
  }

  // Add DNS load balancer records
  for (const lb of loadBalancers) {
    if (lb.isActive && lb.domain.name === domain.name && lb.servers.length > 0) {
      const healthyServers = lb.servers.filter(server => 
        server.isActive && server.health && server.health.status === 'healthy'
      );
      
      if (healthyServers.length === 0) continue;

      // Load balancing algoritmasına göre DNS kayıtları oluştur
      switch (lb.algorithm) {
        case 'round-robin':
          // Her sağlıklı sunucu için A kaydı
          for (const server of healthyServers) {
            zoneContent += `${lb.name}       IN      A       ${server.ip}\n`;
          }
          break;

        case 'weighted':
          // Weight'e göre birden fazla kayıt
          for (const server of healthyServers) {
            const recordCount = Math.floor(server.weight / 10);
            for (let i = 0; i < recordCount; i++) {
              zoneContent += `${lb.name}       IN      A       ${server.ip}\n`;
            }
          }
          break;

        case 'health-based':
          // En sağlıklı sunucular için kayıt
          const sortedServers = healthyServers.sort((a, b) => {
            const aHealth = a.health || { responseTime: 0 };
            const bHealth = b.health || { responseTime: 0 };
            return (aHealth.responseTime || 0) - (bHealth.responseTime || 0);
          });
          
          const topServers = sortedServers.slice(0, 3);
          for (const server of topServers) {
            zoneContent += `${lb.name}       IN      A       ${server.ip}\n`;
          }
          break;
      }

      // SRV kayıtları (eğer birden fazla sunucu varsa)
      if (healthyServers.length > 1) {
        for (let i = 0; i < healthyServers.length; i++) {
          const server = healthyServers[i];
          const weight = Math.floor((1 / healthyServers.length) * 100);
          zoneContent += `_${lb.name}._tcp.${domain.name}.       IN      SRV     0 ${weight} ${server.port} ${server.ip}\n`;
        }
      }
    }
  }

  // Write zone file
  const fs = require('fs').promises;
  await fs.writeFile(zoneFilePath, zoneContent);
  
  console.log(`Created zone file: ${zoneFilePath}`);
}

async function updateNamedConfLocal(domains: Domain[]) {
  const fs = require('fs').promises;
  
  let configContent = `//
// Do any local configuration here
//

// Consider adding the 1918 zones here, if they are not used in your
// organization
//include "/etc/bind/zones.rfc1918";

`;

  // Add zone configurations for each domain from database
  for (const domain of domains) {
    configContent += `zone "${domain.name}" {
    type master;
    file "/etc/bind/zones/${domain.name}.zone";
    allow-update { none; };
};

`;
  }

  // Write the configuration file
  await fs.writeFile(NAMED_CONF_LOCAL, configContent);
  console.log('Updated named.conf.local');
}

async function reloadBind9() {
  try {
    // Reload zones using rndc
    await execAsync(`${RNDC_PATH} reload`);
    console.log('Bind9 zones reloaded successfully');
  } catch (error) {
    console.error('Error reloading Bind9:', error);
    // Try to restart BIND9 as fallback
    try {
      await execAsync('sudo service named restart');
      console.log('Bind9 restarted successfully');
    } catch (restartError) {
      console.error('Error restarting Bind9:', restartError);
      throw restartError;
    }
  }
}

// DNS load balancer health check sonuçlarına göre DNS kayıtlarını güncelle
export async function updateDNSLoadBalancerRecords() {
  try {
    // Tüm domain'leri yeniden senkronize et
    await syncBind9();
    
    console.log('DNS load balancer records updated successfully');
  } catch (error) {
    console.error('Error updating DNS load balancer records:', error);
    throw error;
  }
}

// DNS propagation check
export async function checkDNSPropagation(domain: string, recordType: string = 'A') {
  try {
    const result = await execAsync(`dig +short ${recordType} ${domain}`);
    return result.stdout.trim().split('\n').filter(line => line.length > 0);
  } catch (error) {
    console.error('Error checking DNS propagation:', error);
    return [];
  }
}

// Zone file validation
export async function validateZoneFile(domain: string) {
  try {
    const zoneFile = `${ZONE_DIR}/${domain}.zone`;
    const result = await execAsync(`named-checkzone ${domain} ${zoneFile}`);
    return result.stdout.includes('OK');
  } catch (error) {
    console.error('Zone file validation error:', error);
    return false;
  }
}
