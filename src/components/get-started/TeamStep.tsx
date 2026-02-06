import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, RefreshCw } from "lucide-react";
import { generateAccessCode } from "@/hooks/useTeams";

interface TeamStepProps {
  initialData?: { name: string; description: string; accessCode: string };
  onNext: (teamData: { name: string; description: string; accessCode: string }) => void;
}

export function TeamStep({ initialData, onNext }: TeamStepProps) {
  const { t } = useTranslation();
  
  const [teamData, setTeamData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    accessCode: initialData?.accessCode || generateAccessCode(),
  });

  const handleSubmit = () => {
    if (teamData.name.trim()) {
      onNext(teamData);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold">{t("getStarted.step1Title")}</h2>
        <p className="text-muted-foreground">{t("getStarted.teamSubtitle")}</p>
      </div>

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

      {/* Next button */}
      <Button
        className="w-full h-14 text-base font-semibold"
        onClick={handleSubmit}
        disabled={!teamData.name.trim()}
      >
        {t("getStarted.nextStep")}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}
