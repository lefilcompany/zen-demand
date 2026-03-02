import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, X, Plus, Clock } from "lucide-react";

export interface MeetingData {
  startTime: string;
  endTime: string;
  attendeeEmails: string[];
}

interface MeetingFieldsProps {
  value: MeetingData;
  onChange: (data: MeetingData) => void;
  creatorEmail?: string;
}

export const defaultMeetingData: MeetingData = {
  startTime: "",
  endTime: "",
  attendeeEmails: [],
};

export function MeetingFields({ value, onChange, creatorEmail }: MeetingFieldsProps) {
  const [emailInput, setEmailInput] = useState("");

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (value.attendeeEmails.includes(email)) return;

    onChange({
      ...value,
      attendeeEmails: [...value.attendeeEmails, email],
    });
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    onChange({
      ...value,
      attendeeEmails: value.attendeeEmails.filter((e) => e !== email),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 text-primary font-medium text-sm">
        <Video className="h-4 w-4" />
        Configuração da Reunião (Google Meet)
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Início *
          </Label>
          <Input
            type="datetime-local"
            value={value.startTime}
            onChange={(e) => onChange({ ...value, startTime: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Fim *
          </Label>
          <Input
            type="datetime-local"
            value={value.endTime}
            onChange={(e) => onChange({ ...value, endTime: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Participantes (emails)</Label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@exemplo.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button type="button" size="sm" variant="outline" onClick={addEmail}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {(value.attendeeEmails.length > 0 || creatorEmail) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {creatorEmail && (
              <Badge variant="secondary" className="text-xs">
                {creatorEmail} (você)
              </Badge>
            )}
            {value.attendeeEmails
              .filter((e) => e !== creatorEmail)
              .map((email) => (
                <Badge key={email} variant="outline" className="text-xs gap-1">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Os participantes receberão um convite por email com o link do Google Meet.
          {creatorEmail && " O seu email será incluído automaticamente."}
        </p>
      </div>
    </div>
  );
}
