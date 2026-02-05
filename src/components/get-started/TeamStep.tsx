import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, ShieldCheck, CreditCard } from "lucide-react";
import { SelectedPlanCard } from "./SelectedPlanCard";
import { Plan } from "@/hooks/usePlans";
import { generateAccessCode } from "@/hooks/useTeams";

interface TeamStepProps {
  selectedPlan: Plan | null;
  onBack: () => void;
  onFinish: (teamData: { name: string; description: string; accessCode: string }) => void;
  isProcessing: boolean;
}

export function TeamStep({ selectedPlan, onBack, onFinish, isProcessing }: TeamStepProps) {
  const { t } = useTranslation();
  
  const [teamData, setTeamData] = useState({
    name: "",
    description: "",
    accessCode: generateAccessCode(),
  });

  const handleSubmit = () => {
    if (teamData.name.trim()) {
      onFinish(teamData);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold">{t("getStarted.step3")}</h2>
        <p className="text-muted-foreground">{t("getStarted.teamSubtitle")}</p>
      </div>

      {/* Selected plan summary */}
      {selectedPlan && (
        <SelectedPlanCard plan={selectedPlan} onEdit={onBack} />
      )}

      {/* Team form */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t("getStarted.teamInfo")}</CardTitle>
          <CardDescription>{t("createTeam.formDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="flex items-center gap-1">
              {t("createTeam.teamName")}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="team-name"
              placeholder={t("createTeam.teamNamePlaceholder")}
              value={teamData.name}
              onChange={(e) => setTeamData({ ...teamData, name: e.target.value })}
              className="h-11"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="team-description">{t("common.description")}</Label>
            <Textarea
              id="team-description"
              placeholder={t("createTeam.descriptionPlaceholder")}
              value={teamData.description}
              onChange={(e) => setTeamData({ ...teamData, description: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>
          
          <div className="space-y-2">
            <Label>{t("createTeam.accessCode")}</Label>
            <div className="flex items-center gap-2">
              <Input
                value={teamData.accessCode}
                readOnly
                className="font-mono bg-muted/50 h-11"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={() => setTeamData({ ...teamData, accessCode: generateAccessCode() })}
                title={t("createTeam.generateNew")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("createTeam.accessCodeHint")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-success" />
        <span>{t("getStarted.securePayment")}</span>
      </div>

      {/* Submit button */}
      <Button
        className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25"
        onClick={handleSubmit}
        disabled={isProcessing || !teamData.name.trim()}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t("getStarted.processingCheckout")}
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            {t("getStarted.finishAndPay")}
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      <Button variant="ghost" className="w-full" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("getStarted.backToPlans")}
      </Button>
    </div>
  );
}
