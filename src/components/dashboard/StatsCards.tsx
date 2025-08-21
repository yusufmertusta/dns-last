import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Settings, BarChart3, Users, Server, Activity } from "lucide-react";
import { getDNSLoadBalancers, getDomains } from "@/lib/api";

interface DNSLoadBalancer {
  id: string;
  name: string;
  domain: {
    name: string;
  };
  servers: Array<{
    id: string;
    health?: {
      status: string;
    };
  }>;
}

interface Domain {
  id: string;
  name: string;
  records: Array<{
    id: string;
  }>;
}

interface Stats {
  totalDomains: number;
  totalRecords: number;
  totalUsers: number;
  totalDNSLoadBalancers: number;
  totalDNSServers: number;
  healthyDNSServers: number;
}

export const StatsCards = () => {
  const [stats, setStats] = useState<Stats>({
    totalDomains: 0,
    totalRecords: 0,
    totalUsers: 0,
    totalDNSLoadBalancers: 0,
    totalDNSServers: 0,
    healthyDNSServers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Fetching stats...');
        
        // DNS load balancer istatistiklerini al
        const loadBalancers = await getDNSLoadBalancers() as DNSLoadBalancer[];
        console.log('Load balancers:', loadBalancers);
        
        const totalDNSLoadBalancers = loadBalancers.length;
        const totalDNSServers = loadBalancers.reduce((total, lb) => total + lb.servers.length, 0);
        const healthyDNSServers = loadBalancers.reduce((total, lb) => 
          total + lb.servers.filter(s => s.health?.status === 'healthy').length, 0
        );

        // Domain ve DNS record istatistiklerini al
        const domains = await getDomains() as Domain[];
        console.log('Domains:', domains);
        
        const totalDomains = domains.length;
        const totalRecords = domains.reduce((total, domain) => total + domain.records.length, 0);

        console.log('Stats calculated:', {
          totalDomains,
          totalRecords,
          totalDNSLoadBalancers,
          totalDNSServers,
          healthyDNSServers
        });

        setStats({
          totalDomains,
          totalRecords,
          totalUsers: 0, // Bu değer backend'den alınacak
          totalDNSLoadBalancers,
          totalDNSServers,
          healthyDNSServers,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Hata durumunda placeholder değerler göster
        setStats({
          totalDomains: 0,
          totalRecords: 0,
          totalUsers: 0,
          totalDNSLoadBalancers: 0,
          totalDNSServers: 0,
          healthyDNSServers: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Toplam Domains</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDomains}</div>
          <p className="text-xs text-muted-foreground">
            Aktif domain'ler
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">DNS Records</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalRecords}</div>
          <p className="text-xs text-muted-foreground">
            Toplam DNS kayıtları
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">DNS Load Balancers</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDNSLoadBalancers}</div>
          <p className="text-xs text-muted-foreground">
            Aktif load balancer'lar
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">DNS Servers</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDNSServers}</div>
          <p className="text-xs text-muted-foreground">
            Tüm load balancer'larda
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sağlıklı Servers</CardTitle>
          <Activity className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.healthyDNSServers}</div>
          <p className="text-xs text-muted-foreground">
            Şu anda çalışan
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sistem Durumu</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">Aktif</div>
          <p className="text-xs text-muted-foreground">
            Tüm sistemler çalışıyor
          </p>
        </CardContent>
      </Card>
    </div>
  );
};