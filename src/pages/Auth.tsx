import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import logoSomaDark from "@/assets/logo-soma-dark.png";
import authBackground from "@/assets/auth-background.jpg";

export default function Auth() {
  const { t } = useTranslation();
  const { user, loading, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    phone: "",
    state: "",
    city: "",
    password: ""
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/welcome" replace />;
  }

  const getErrorMessage = (error: any): string => {
    const message = error?.message?.toLowerCase() || "";
    if (message.includes("user already registered") || message.includes("already been registered")) {
      return t("auth.hasAccount");
    }
    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
      return t("toast.error");
    }
    if (message.includes("email not confirmed")) {
      return t("common.email");
    }
    return error?.message || t("toast.error");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(loginData.email, loginData.password);
      toast.success(t("toast.success"), {
        description: t("auth.welcomeBack")
      });
    } catch (error: any) {
      toast.error(t("toast.error"), {
        description: getErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password.length < 6) {
      toast.warning(t("toast.warning"), {
        description: t("profile.newPassword")
      });
      return;
    }
    if (!signupData.fullName.trim()) {
      toast.warning(t("toast.warning"), {
        description: t("auth.fullName")
      });
      return;
    }
    setIsLoading(true);
    try {
      await signUp(signupData.email, signupData.password, signupData.fullName);
      toast.success(t("toast.success"), {
        description: t("welcome.title")
      });
    } catch (error: any) {
      toast.error(t("toast.error"), {
        description: getErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Mobile/Tablet Header with Image */}
      <div 
        className="lg:hidden relative h-48 sm:h-64 md:h-72 overflow-hidden" 
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6 text-center">
          <img src={logoSomaDark} alt="SoMA" className="h-10 sm:h-12 w-auto mb-3" />
          <h2 className="text-lg sm:text-xl font-semibold">{t("settings.description")}</h2>
        </div>
      </div>

      {/* Desktop Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden" 
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div />
          <div className="max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">{t("settings.description")}</h1>
            <p className="text-lg xl:text-xl text-white/90 leading-relaxed">
              {t("welcome.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30" />
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30" />
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30" />
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30 flex items-center justify-center text-sm font-medium">
                +30
              </div>
            </div>
            <p className="text-white/80 text-sm">{t("teams.title")}</p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-start lg:items-center justify-center p-6 sm:p-8 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
              {t("auth.welcomeBack")} <img alt="SoMA+" src="/lovable-uploads/9889f524-0819-424e-9185-2cc441526116.png" className="h-10 w-20 inline-block items-center justify-center" />
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t("auth.loginDescription")}</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5 sm:mb-6 h-10 sm:h-11 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="login" className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                {t("auth.login")}
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                {t("auth.signup")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t("common.email")}</Label>
                  <Input 
                    id="login-email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    className="h-11 sm:h-12" 
                    value={loginData.email} 
                    onChange={e => setLoginData({...loginData, email: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t("common.password")}</Label>
                  <div className="relative">
                    <Input 
                      id="login-password" 
                      type={showLoginPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="h-11 sm:h-12 pr-10" 
                      value={loginData.password} 
                      onChange={e => setLoginData({...loginData, password: e.target.value})} 
                      required 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 sm:h-12 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? t("common.loading") : t("auth.login")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t("auth.fullName")}</Label>
                  <Input 
                    id="signup-name" 
                    type="text" 
                    placeholder={t("common.name")} 
                    className="h-10 sm:h-11" 
                    value={signupData.fullName} 
                    onChange={e => setSignupData({...signupData, fullName: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("common.email")}</Label>
                  <Input 
                    id="signup-email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    className="h-10 sm:h-11" 
                    value={signupData.email} 
                    onChange={e => setSignupData({...signupData, email: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">{t("common.phone")}</Label>
                  <Input 
                    id="signup-phone" 
                    type="tel" 
                    placeholder="(00) 00000-0000" 
                    className="h-10 sm:h-11" 
                    value={signupData.phone} 
                    onChange={e => setSignupData({...signupData, phone: e.target.value})} 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-state">{t("common.state")}</Label>
                    <Input 
                      id="signup-state" 
                      type="text" 
                      placeholder="UF" 
                      className="h-10 sm:h-11" 
                      value={signupData.state} 
                      onChange={e => setSignupData({...signupData, state: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-city">{t("common.city")}</Label>
                    <Input 
                      id="signup-city" 
                      type="text" 
                      placeholder={t("common.city")} 
                      className="h-10 sm:h-11" 
                      value={signupData.city} 
                      onChange={e => setSignupData({...signupData, city: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("common.password")}</Label>
                  <div className="relative">
                    <Input 
                      id="signup-password" 
                      type={showSignupPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="h-10 sm:h-11 pr-10" 
                      value={signupData.password} 
                      onChange={e => setSignupData({...signupData, password: e.target.value})} 
                      required 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                    >
                      {showSignupPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 sm:h-12 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? t("common.loading") : t("auth.signup")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
