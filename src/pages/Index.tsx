import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { login } from "@/lib/api";
import { Globe, Shield, Server, Activity } from "lucide-react";

export default function Index() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      toast({
        title: "Giriş başarılı!",
        description: "DNS Manager'a hoş geldiniz.",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Destek DNS Manager
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Profesyonel DNS Yönetim ve Load Balancing Platformu
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Features Section */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                DNS Yönetiminde Yeni Dönem
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Domain yönetimi, DNS kayıtları ve load balancing işlemlerinizi 
                tek platformdan yönetin. Güvenli, hızlı ve kullanıcı dostu.
              </p>
            </div>

            <div className="grid gap-6">
              <div className="flex items-start gap-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Domain Yönetimi
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Tüm domain'lerinizi tek yerden yönetin, DNS kayıtlarını kolayca düzenleyin.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
                <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <Server className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    DNS Load Balancing
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Health check ile otomatik failover, round-robin ve weighted load balancing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
                <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Real-time Monitoring
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Sunucu sağlık durumu, response time ve sistem metriklerini canlı izleyin.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
                <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Güvenli Erişim
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    JWT tabanlı kimlik doğrulama ve role-based access control.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold">
                  Giriş Yap
                </CardTitle>
                <CardDescription>
                  DNS Manager hesabınıza giriş yapın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Giriş yapılıyor...
                      </div>
                    ) : (
                      "Giriş Yap"
                    )}
                  </Button>
                </form>

                <div className="text-center text-sm text-muted-foreground">
                  <p>Demo hesap: admin@destek.com / admin123</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2024 Destek DNS Manager. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </div>
  );
}
