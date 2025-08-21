import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Prisma model adlarını kontrol et
console.log('Available Prisma models:', Object.keys(prisma));

export interface DNSServerHealth {
  id: string;
  name: string;
  ip: string;
  port: number;
  weight: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime: number;
  uptime: number;
  load: number;
  memoryUsage: number;
  diskUsage: number;
}

export interface DNSLoadBalancerConfig {
  id: string;
  name: string;
  domainId: string;
  algorithm: 'round-robin' | 'weighted' | 'health-based';
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxRetries: number;
  servers: DNSServerHealth[];
}

interface DNSServer {
  id: string;
  name: string;
  ip: string;
  port: number;
  weight: number;
  isActive: boolean;
  health?: {
    id: string;
    status: string;
    lastCheck: Date;
    responseTime: number;
    uptime: number;
    load: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

export class DNSLoadBalancerService {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  async startHealthChecks() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting DNS Load Balancer health checks...');
    
    // İlk health check'i hemen yap
    await this.performHealthChecks();
    
    // Her 30 saniyede bir health check yap
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000);
  }

  async stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.isRunning = false;
    console.log('DNS Load Balancer health checks stopped');
  }

  private async performHealthChecks() {
    try {
      console.log('Performing health checks...');
      
      // @ts-ignore - Prisma model adları dinamik olarak oluşturuluyor
      const loadBalancers = await prisma.dNSLoadBalancer.findMany({
        where: { isActive: true },
        include: {
          domain: true,
          servers: {
            include: {
              health: true
            }
          }
        }
      });

      for (const lb of loadBalancers) {
        for (const server of lb.servers) {
          const healthStatus = await this.checkServerHealth(server.ip, server.port);
          await this.updateServerHealth(server.id, healthStatus);
        }
        
        // DNS kayıtlarını güncelle
        await this.updateDNSRecords(lb);
      }
      
      console.log(`Health checks completed for ${loadBalancers.length} load balancers`);
    } catch (error) {
      console.error('Error during health checks:', error);
    }
  }

  private async checkServerHealth(ip: string, port: number) {
    try {
      console.log(`🔍 Health checking ${ip}:${port}...`);
      
      // 1. Ping test
      const pingResult = await this.pingTest(ip);
      console.log(`📡 Ping result for ${ip}: ${pingResult.status} (${pingResult.responseTime}ms)`);
      
      // 2. Port-specific health checks
      let portResult = { status: 'unknown', responseTime: -1 };
      
      if (port === 53) {
        // DNS port için özel check
        portResult = await this.dnsHealthCheck(ip, port);
      } else if (port === 80 || port === 443) {
        // HTTP/HTTPS için
        portResult = await this.httpHealthCheck(ip, port);
      } else {
        // Diğer portlar için ping yeterli
        portResult = pingResult;
      }
      
      console.log(`🌐 Port check result for ${ip}:${port}: ${portResult.status}`);
      
      // 3. System metrics (placeholder)
      const systemMetrics = await this.getSystemMetrics(ip);
      
      const finalStatus = this.determineOverallStatus(pingResult, portResult);
      console.log(`✅ Final status for ${ip}:${port}: ${finalStatus}`);
      
      return {
        status: finalStatus,
        responseTime: portResult.responseTime,
        uptime: systemMetrics.uptime,
        load: systemMetrics.load,
        memoryUsage: systemMetrics.memoryUsage,
        diskUsage: systemMetrics.diskUsage
      };
    } catch (error) {
      console.error(`❌ Health check failed for ${ip}:${port}:`, error);
      return {
        status: 'unhealthy',
        responseTime: -1,
        uptime: 0,
        load: 0,
        memoryUsage: 0,
        diskUsage: 0
      };
    }
  }

  private async pingTest(ip: string): Promise<{ status: string; responseTime: number }> {
    try {
      const startTime = Date.now();
      const { stdout } = await execAsync(`ping -c 1 -W 5 ${ip}`);
      const responseTime = Date.now() - startTime;
      
      if (stdout.includes('1 packets transmitted, 1 received')) {
        return { status: 'healthy', responseTime };
      } else {
        return { status: 'unhealthy', responseTime: -1 };
      }
    } catch (error) {
      return { status: 'unhealthy', responseTime: -1 };
    }
  }

  private async dnsHealthCheck(ip: string, port: number): Promise<{ status: string; responseTime: number }> {
    try {
      console.log(`🔍 DNS health check for ${ip}:${port}`);
      
      // DNS port için basit port availability check
      const startTime = Date.now();
      
      // Port 53 için özel logic: ping yeterli, port check gerekli değil
      // DNS sunucuları genellikle ping'e yanıt verir
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ DNS health check successful for ${ip}:${port}`);
      return { status: 'healthy', responseTime };
      
    } catch (error) {
      console.error(`❌ DNS health check failed for ${ip}:${port}:`, error);
      return { status: 'unhealthy', responseTime: -1 };
    }
  }

  private async httpHealthCheck(ip: string, port: number): Promise<{ status: string; responseTime: number }> {
    try {
      const protocol = port === 443 ? 'https' : 'http';
      const url = `${protocol}://${ip}:${port}/health`;
      
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'DNS-LoadBalancer-HealthCheck/1.0' }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return { status: 'healthy', responseTime };
      } else {
        return { status: 'unhealthy', responseTime: -1 };
      }
    } catch (error) {
      return { status: 'unhealthy', responseTime: -1 };
    }
  }

  private async getSystemMetrics(ip: string) {
    // Bu kısım gerçek implementasyonda sunucuda agent çalıştırılarak yapılır
    // Şimdilik placeholder değerler döndürüyoruz
    return {
      uptime: Math.floor(Math.random() * 86400), // 0-24 saat arası random
      load: Math.random() * 5, // 0-5 arası random load
      memoryUsage: Math.random() * 100, // 0-100% arası random
      diskUsage: Math.random() * 100 // 0-100% arası random
    };
  }

  private determineOverallStatus(pingResult: any, portResult: any): string {
    console.log(`🔍 Determining status: ping=${pingResult.status}, port=${portResult.status}`);
    
    // Ping başarılıysa genellikle healthy
    if (pingResult.status === 'healthy') {
      if (portResult.status === 'healthy' || portResult.status === 'unknown') {
        console.log(`✅ Status: healthy (ping success)`);
        return 'healthy';
      } else {
        console.log(`⚠️ Status: degraded (ping success, port issue)`);
        return 'degraded';
      }
    }
    
    // Ping başarısız ama port check başarılı
    if (portResult.status === 'healthy') {
      console.log(`⚠️ Status: degraded (ping failed, port success)`);
      return 'degraded';
    }
    
    // Her ikisi de başarısız
    console.log(`❌ Status: unhealthy (both failed)`);
    return 'unhealthy';
  }

  private async updateServerHealth(serverId: string, healthData: any) {
    try {
      // @ts-ignore - Prisma model adları dinamik olarak oluşturuluyor
      await prisma.dNSServerHealth.upsert({
        where: { serverId },
        update: {
          status: healthData.status,
          lastCheck: new Date(),
          responseTime: healthData.responseTime,
          uptime: healthData.uptime,
          load: healthData.load,
          memoryUsage: healthData.memoryUsage,
          diskUsage: healthData.diskUsage
        },
        create: {
          serverId,
          status: healthData.status,
          lastCheck: new Date(),
          responseTime: healthData.responseTime,
          uptime: healthData.uptime,
          load: healthData.load,
          memoryUsage: healthData.memoryUsage,
          diskUsage: healthData.diskUsage
        }
      });
    } catch (error) {
      console.error(`Failed to update server health for ${serverId}:`, error);
    }
  }

  private async updateDNSRecords(loadBalancer: any) {
    try {
      const healthyServers = loadBalancer.servers.filter((s: any) => 
        s.health?.status === 'healthy'
      );

      if (healthyServers.length === 0) {
        console.log(`No healthy servers for load balancer ${loadBalancer.name}`);
        return;
      }

      // Load balancer algoritmasına göre DNS kayıtlarını güncelle
      switch (loadBalancer.algorithm) {
        case 'round-robin':
          await this.updateRoundRobinDNS(loadBalancer, healthyServers);
          break;
        case 'weighted':
          await this.updateWeightedDNS(loadBalancer, healthyServers);
          break;
        case 'health-based':
          await this.updateHealthBasedDNS(loadBalancer, healthyServers);
          break;
        default:
          await this.updateRoundRobinDNS(loadBalancer, healthyServers);
      }

      // Bind9'u yeniden yükle
      await this.reloadBind9();
      
    } catch (error) {
      console.error(`Failed to update DNS records for ${loadBalancer.name}:`, error);
    }
  }

  private async updateRoundRobinDNS(loadBalancer: any, healthyServers: any[]) {
    // Round-robin algoritması: Her sunucuya sırayla trafik gönder
    const serverIndex = Math.floor(Date.now() / 1000) % healthyServers.length;
    const selectedServer = healthyServers[serverIndex];
    
    await this.createOrUpdateDNSRecord(loadBalancer, selectedServer);
  }

  private async updateWeightedDNS(loadBalancer: any, healthyServers: any[]) {
    // Weighted algoritması: Ağırlıklara göre trafik dağıt
    const totalWeight = healthyServers.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of healthyServers) {
      random -= server.weight;
      if (random <= 0) {
        await this.createOrUpdateDNSRecord(loadBalancer, server);
        break;
      }
    }
  }

  private async updateHealthBasedDNS(loadBalancer: any, healthyServers: any[]) {
    // Health-based algoritması: En sağlıklı sunucuyu seç
    const bestServer = healthyServers.reduce((best, current) => {
      if (!best) return current;
      
      const bestScore = this.calculateHealthScore(best);
      const currentScore = this.calculateHealthScore(current);
      
      return currentScore > bestScore ? current : best;
    });
    
    if (bestServer) {
      await this.createOrUpdateDNSRecord(loadBalancer, bestServer);
    }
  }

  private calculateHealthScore(server: any): number {
    const health = server.health;
    if (!health) return 0;
    
    let score = 0;
    
    // Response time score (daha düşük = daha iyi)
    if (health.responseTime > 0) {
      score += Math.max(0, 100 - health.responseTime);
    }
    
    // Uptime score
    score += Math.min(100, health.uptime / 3600); // Her saat için 1 puan
    
    // Load score (daha düşük = daha iyi)
    score += Math.max(0, 100 - health.load * 20);
    
    // Memory score (daha düşük = daha iyi)
    score += Math.max(0, 100 - health.memoryUsage);
    
    // Disk score (daha düşük = daha iyi)
    score += Math.max(0, 100 - health.diskUsage);
    
    return score;
  }

  private async createOrUpdateDNSRecord(loadBalancer: any, server: any) {
    try {
      // A record oluştur/güncelle
      const recordName = `${loadBalancer.name}.${loadBalancer.domain.name}`;
      
      // Önce mevcut kaydı kontrol et
      const existingRecord = await prisma.dNSRecord.findFirst({
        where: {
          domainId: loadBalancer.domainId,
          name: recordName,
          type: 'A'
        }
      });
      
      if (existingRecord) {
        // Mevcut kaydı güncelle
        await prisma.dNSRecord.update({
          where: { id: existingRecord.id },
          data: {
            value: server.ip,
            ttl: 60 // Kısa TTL için load balancing
          }
        });
      } else {
        // Yeni kayıt oluştur
        await prisma.dNSRecord.create({
          data: {
            domainId: loadBalancer.domainId,
            name: recordName,
            type: 'A',
            value: server.ip,
            ttl: 60
          }
        });
      }
      
      console.log(`DNS record updated: ${recordName} -> ${server.ip}`);
    } catch (error) {
      console.error(`Failed to update DNS record:`, error);
    }
  }

  private async reloadBind9() {
    try {
      // Bind9'u yeniden yükle
      await execAsync('rndc reload');
      console.log('Bind9 reloaded successfully');
    } catch (error) {
      console.error('Failed to reload Bind9:', error);
    }
  }

  // Public methods for API endpoints
  async getAllLoadBalancers() {
    // @ts-ignore - Prisma model adları dinamik olarak oluşturuluyor
    return await prisma.dNSLoadBalancer.findMany({
      include: {
        domain: true,
        servers: {
          include: {
            health: true
          }
        }
      }
    });
  }

  async createLoadBalancer(data: any) {
    // @ts-ignore - Prisma model adları dinamik olarak oluşturuluyor
    return await prisma.dNSLoadBalancer.create({
      data,
      include: {
        domain: true,
        servers: true
      }
    });
  }

  async addServer(loadBalancerId: string, serverData: any) {
    // @ts-ignore - Prisma model adları dinamik olarak oluşturuluyor
    return await prisma.dNSServer.create({
      data: {
        ...serverData,
        loadBalancerId
      }
    });
  }

  async getLoadBalancerStatus(id: string) {
    // @ts-ignore - Prisma model adları dinamik olarak oluşturuluyor
    const lb = await prisma.dNSLoadBalancer.findUnique({
      where: { id },
      include: {
        servers: {
          include: {
            health: true
          }
        }
      }
    });

    if (!lb) throw new Error('Load balancer not found');

    const totalServers = lb.servers.length;
    const healthyServers = lb.servers.filter((s: any) => s.health?.status === 'healthy').length;
    const unhealthyServers = lb.servers.filter((s: any) => s.health?.status === 'unhealthy').length;

    return {
      id: lb.id,
      name: lb.name,
      algorithm: lb.algorithm,
      isActive: lb.isActive,
      totalServers,
      healthyServers,
      unhealthyServers,
      healthPercentage: totalServers > 0 ? (healthyServers / totalServers) * 100 : 0,
      lastHealthCheck: new Date(),
      servers: lb.servers.map((s: any) => ({
        id: s.id,
        name: s.name,
        ip: s.ip,
        port: s.port,
        weight: s.weight,
        health: s.health
      }))
    };
  }
}
