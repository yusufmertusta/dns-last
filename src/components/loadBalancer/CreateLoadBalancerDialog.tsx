import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createLoadBalancer } from "@/lib/api";

interface CreateLoadBalancerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadBalancerCreated: () => void;
}

export const CreateLoadBalancerDialog = ({ 
  open, 
  onOpenChange, 
  onLoadBalancerCreated 
}: CreateLoadBalancerDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    algorithm: 'round-robin',
    healthCheckInterval: 30,
    healthCheckTimeout: 5,
    maxRetries: 3
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a name for the load balancer",
      });
      return;
    }

    setLoading(true);
    
    try {
      await createLoadBalancer({
        name: formData.name.trim(),
        algorithm: formData.algorithm,
        healthCheckInterval: formData.healthCheckInterval * 1000, // Convert to milliseconds
        healthCheckTimeout: formData.healthCheckTimeout * 1000, // Convert to milliseconds
        maxRetries: formData.maxRetries
      });
      
      toast({
        title: "Success",
        description: "Load balancer created successfully",
      });
      
      onLoadBalancerCreated();
      resetForm();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create load balancer: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      algorithm: 'round-robin',
      healthCheckInterval: 30,
      healthCheckTimeout: 5,
      maxRetries: 3
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Load Balancer</DialogTitle>
          <DialogDescription>
            Configure a new load balancer with your preferred settings and algorithms.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter load balancer name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="algorithm">Load Balancing Algorithm</Label>
              <Select
                value={formData.algorithm}
                onValueChange={(value) => setFormData(prev => ({ ...prev, algorithm: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select algorithm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round-robin">Round Robin</SelectItem>
                  <SelectItem value="least-connections">Least Connections</SelectItem>
                  <SelectItem value="weighted">Weighted</SelectItem>
                  <SelectItem value="ip-hash">IP Hash</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.algorithm === 'round-robin' && 'Distributes requests sequentially across servers'}
                {formData.algorithm === 'least-connections' && 'Routes to server with fewest active connections'}
                {formData.algorithm === 'weighted' && 'Routes based on server performance and health metrics'}
                {formData.algorithm === 'ip-hash' && 'Routes based on client IP address hash'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="healthCheckInterval">Health Check Interval (seconds)</Label>
                <Input
                  id="healthCheckInterval"
                  type="number"
                  min="10"
                  max="300"
                  value={formData.healthCheckInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, healthCheckInterval: parseInt(e.target.value) || 30 }))}
                />
                <p className="text-xs text-muted-foreground">How often to check server health</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="healthCheckTimeout">Health Check Timeout (seconds)</Label>
                <Input
                  id="healthCheckTimeout"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.healthCheckTimeout}
                  onChange={(e) => setFormData(prev => ({ ...prev, healthCheckTimeout: parseInt(e.target.value) || 5 }))}
                />
                <p className="text-xs text-muted-foreground">Timeout for health check requests</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRetries">Max Retries</Label>
              <Input
                id="maxRetries"
                type="number"
                min="1"
                max="10"
                value={formData.maxRetries}
                onChange={(e) => setFormData(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 3 }))}
              />
              <p className="text-xs text-muted-foreground">Maximum retry attempts before marking server as unhealthy</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Load Balancer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

