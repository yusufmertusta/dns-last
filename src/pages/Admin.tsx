import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Globe, 
  Server, 
  Activity, 
  Crown, 
  Settings, 
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { getDNSLoadBalancers, getDomains, getUsers } from "@/lib/api";

interface DNSLoadBalancer {
  id: string;
  name: string;
  domain: {
    name: string;
  };
  algorithm: string;
  isActive: boolean;
  servers: Array<{
    id: string;
    name: string;
    ip: string;
    port: number;
    weight: number;
    health?: {
      status: string;
      lastCheck: string;
      responseTime: number;
    };
  }>;
  createdAt: string;
}

interface Domain {
  id: string;
  name: string;
  records: Array<{
    id: string;
    type: string;
    name: string;
    value: string;
  }>;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export const Admin = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loadBalancers, setLoadBalancers] = useState<DNSLoadBalancer[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // DNS Load Balancers
        const lbData = await getDNSLoadBalancers() as DNSLoadBalancer[];
        setLoadBalancers(lbData);
        
        // Domains
        const domainData = await getDomains() as Domain[];
        setDomains(domainData);
        
        // Users - gerçek verileri çek
        const userData = await getUsers() as User[];
        setUsers(userData);
        
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Veri çekilemedi: " + error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'unknown':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'unhealthy':
        return 'bg-red-500';
      case 'unknown':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg">Veriler yükleniyor...</span>
        </div>
      </div>
    );
  }

  // İstatistikleri hesapla
  const totalUsers = users.length;
  const totalDomains = domains.length;
  const totalRecords = domains.reduce((total, domain) => total + domain.records.length, 0);
  const totalLoadBalancers = loadBalancers.length;
  const totalServers = loadBalancers.reduce((total, lb) => total + lb.servers.length, 0);
  const healthyServers = loadBalancers.reduce((total, lb) => 
    total + lb.servers.filter(s => s.health?.status === 'healthy').length, 0
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Kullanıcıları, domain'leri ve DNS load balancer'ları yönetin
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="domains">Domain'ler</TabsTrigger>
          <TabsTrigger value="loadbalancers">DNS Load Balancers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Kayıtlı kullanıcılar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Domain</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDomains}</div>
                <p className="text-xs text-muted-foreground">
                  Aktif domain'ler
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">DNS Load Balancers</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLoadBalancers}</div>
                <p className="text-xs text-muted-foreground">
                  Aktif load balancer'lar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sistem Durumu</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Sağlıklı</div>
                <p className="text-xs text-muted-foreground">
                  Tüm sistemler çalışıyor
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detaylı İstatistikler</CardTitle>
              <CardDescription>
                Sistem performansı ve kullanım metrikleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totalRecords}</div>
                  <div className="text-sm text-muted-foreground">Toplam DNS Kaydı</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{totalServers}</div>
                  <div className="text-sm text-muted-foreground">Toplam Sunucu</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{healthyServers}</div>
                  <div className="text-sm text-muted-foreground">Sağlıklı Sunucu</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Son Aktiviteler</CardTitle>
              <CardDescription>
                Sistemdeki son değişiklikler ve güncellemeler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">DNS Load Balancer Güncellendi</p>
                      <p className="text-sm text-muted-foreground">web-lb için health check tamamlandı</p>
                    </div>
                  </div>
                  <Badge variant="outline">2 dakika önce</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">Domain Eklendi</p>
                      <p className="text-sm text-muted-foreground">yeni domain sisteme dahil edildi</p>
                    </div>
                  </div>
                  <Badge variant="outline">1 saat önce</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="font-medium">Kullanıcı Girişi</p>
                      <p className="text-sm text-muted-foreground">admin@destek.com sisteme giriş yaptı</p>
                    </div>
                  </div>
                  <Badge variant="outline">3 saat önce</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kullanıcı Yönetimi</CardTitle>
              <CardDescription>
                Sistem kullanıcılarını ve yetkilerini yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.isAdmin ? (
                        <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-pink-600">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Kullanıcı</Badge>
                      )}
                      <Button variant="outline" size="sm">Düzenle</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Domain Yönetimi</CardTitle>
              <CardDescription>
                Sistemdeki tüm domain'lerin genel bakışı
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {domains.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                        <Globe className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{domain.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {domain.records.length} DNS kaydı • {new Date(domain.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-600">Aktif</Badge>
                      <Button variant="outline" size="sm">Görüntüle</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loadbalancers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>DNS Load Balancer Genel Bakışı</CardTitle>
              <CardDescription>
                DNS load balancer'ları izleyin ve yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadBalancers.map((lb) => (
                  <div key={lb.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{lb.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{lb.domain.name}</Badge>
                        <Badge variant={lb.isActive ? "default" : "secondary"}>
                          {lb.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {lb.servers.map((server) => (
                        <div key={server.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{server.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {server.ip}:{server.port}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Ağırlık: {server.weight}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(server.health?.status || 'unknown')}
                            <Badge 
                              className={`${getStatusColor(server.health?.status || 'unknown')} text-white`}
                            >
                              {server.health?.status || 'unknown'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};