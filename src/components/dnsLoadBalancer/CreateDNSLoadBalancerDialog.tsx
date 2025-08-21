import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createDNSLoadBalancer, getDomains } from "@/lib/api";

interface Domain {
  id: string;
  name: string;
}

interface CreateDNSLoadBalancerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadBalancerCreated: () => void;
}

export const CreateDNSLoadBalancerDialog = ({
  open,
  onOpenChange,
  onLoadBalancerCreated,
}: CreateDNSLoadBalancerDialogProps) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    domainId: "",
    algorithm: "round-robin",
    healthCheckInterval: 30000,
    healthCheckTimeout: 5000,
    maxRetries: 3,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchDomains();
    }
  }, [open]);

  const fetchDomains = async () => {
    try {
      const data = await getDomains();
      setDomains(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch domains: " + error.message,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.domainId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    setLoading(true);
    try {
      await createDNSLoadBalancer({
        name: formData.name,
        domainId: formData.domainId,
        algorithm: formData.algorithm as "round-robin" | "weighted" | "health-based",
        healthCheckInterval: formData.healthCheckInterval,
        healthCheckTimeout: formData.healthCheckTimeout,
        maxRetries: formData.maxRetries,
      });

      toast({
        title: "Success",
        description: "DNS load balancer created successfully",
      });

      // Reset form
      setFormData({
        name: "",
        domainId: "",
        algorithm: "round-robin",
        healthCheckInterval: 30000,
        healthCheckTimeout: 5000,
        maxRetries: 3,
      });

      onLoadBalancerCreated();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create DNS load balancer: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create DNS Load Balancer</DialogTitle>
          <DialogDescription>
            Create a new DNS load balancer to distribute traffic across multiple servers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="web-lb"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain *</Label>
              <Select
                value={formData.domainId}
                onValueChange={(value) => handleInputChange("domainId", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="algorithm">Load Balancing Algorithm</Label>
            <Select
              value={formData.algorithm}
              onValueChange={(value) => handleInputChange("algorithm", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round-robin">Round Robin</SelectItem>
                <SelectItem value="weighted">Weighted</SelectItem>
                <SelectItem value="health-based">Health Based</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="healthCheckInterval">Health Check Interval (ms)</Label>
              <Input
                id="healthCheckInterval"
                type="number"
                min="5000"
                max="300000"
                step="5000"
                value={formData.healthCheckInterval}
                onChange={(e) => handleInputChange("healthCheckInterval", parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="healthCheckTimeout">Health Check Timeout (ms)</Label>
              <Input
                id="healthCheckTimeout"
                type="number"
                min="1000"
                max="30000"
                step="1000"
                value={formData.healthCheckTimeout}
                onChange={(e) => handleInputChange("healthCheckTimeout", parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRetries">Max Retries</Label>
              <Input
                id="maxRetries"
                type="number"
                min="1"
                max="10"
                value={formData.maxRetries}
                onChange={(e) => handleInputChange("maxRetries", parseInt(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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

