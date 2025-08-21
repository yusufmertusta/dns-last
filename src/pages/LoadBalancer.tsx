import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  Activity, 
  Plus, 
  Settings, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { LoadBalancerList } from "@/components/loadBalancer/LoadBalancerList";
import { CreateLoadBalancerDialog } from "@/components/loadBalancer/CreateLoadBalancerDialog";
import { getLoadBalancers, triggerHealthCheck } from "@/lib/api";

interface LoadBalancer {
  id: string;
  name: string;
  algorithm: string;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxRetries: number;
  isActive: boolean;
  servers: Server[];
  createdAt: string;
}

interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
  isActive: boolean;
  health?: {
    status: string;
    lastCheck: string;
    responseTime: number;
    uptime: number;
    load: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

export const LoadBalancer = () => {
  const [loadBalancers, setLoadBalancers] = useState<LoadBalancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchLoadBalancers = async () => {
    try {
      const data = await getLoadBalancers();
      setLoadBalancers(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch load balancers: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async (loadBalancerId: string) => {
    try {
      setRefreshing(true);
      await triggerHealthCheck(loadBalancerId);
      toast({
        title: "Success",
        description: "Health check completed successfully",
      });
      fetchLoadBalancers(); // Refresh data
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to trigger health check: " + error.message,
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoadBalancers();
  }, []);

  const handleLoadBalancerCreated = () => {
    fetchLoadBalancers();
    setShowCreateDialog(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Server className="h-8 w-8" />
            Load Balancers
          </h1>
          <p className="text-muted-foreground">
            Manage your load balancers and monitor server health
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} variant="dns">
          <Plus className="h-4 w-4" />
          Create Load Balancer
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="loadbalancers">Load Balancers</TabsTrigger>
          <TabsTrigger value="health">Health Status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Load Balancers</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loadBalancers.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active load balancers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadBalancers.reduce((total, lb) => total + lb.servers.length, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all load balancers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Healthy Servers</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loadBalancers.reduce((total, lb) => 
                    total + lb.servers.filter(s => s.health?.status === 'healthy').length, 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently operational
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">
                  All systems operational
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common load balancer operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    loadBalancers.forEach(lb => handleHealthCheck(lb.id));
                  }}
                  disabled={refreshing}
                  className="w-full"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh All Health Checks
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Load Balancer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loadbalancers" className="space-y-6">
          <LoadBalancerList 
            loadBalancers={loadBalancers}
            onRefresh={fetchLoadBalancers}
            onHealthCheck={handleHealthCheck}
            refreshing={refreshing}
          />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Health Overview</CardTitle>
              <CardDescription>
                Real-time health status of all servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadBalancers.map((lb) => (
                  <div key={lb.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{lb.name}</h3>
                      <Badge variant={lb.isActive ? "default" : "secondary"}>
                        {lb.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {lb.servers.map((server) => (
                        <div key={server.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{server.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {server.ip}:{server.port}
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

      <CreateLoadBalancerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onLoadBalancerCreated={handleLoadBalancerCreated}
      />
    </div>
  );
};

