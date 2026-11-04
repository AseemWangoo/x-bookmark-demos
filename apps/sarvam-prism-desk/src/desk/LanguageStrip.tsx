import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TEAM_LABEL, LANG_LABEL, LANGS, type Lang, type LangChip, type TeamId } from "@/lib/types";

function isTeam(value: string): value is TeamId {
  return value in TEAM_LABEL;
}

function teamName(choice: string): string {
  return isTeam(choice) ? TEAM_LABEL[choice] : choice;
}

export function LanguageStrip({
  active,
  disabled,
  chips,
  onPick,
}: {
  active: Lang | null;
  disabled: boolean;
  chips: Partial<Record<Lang, LangChip>>;
  onPick: (lang: Lang) => void;
}) {
  const group = (
    <ToggleGroup
      value={active ? [active] : []}
      disabled={disabled}
      size="sm"
      spacing={1}
      className="max-w-full flex-wrap"
      onValueChange={(values) => {
        const next = values[values.length - 1];
        if (next) onPick(next as Lang);
      }}
      aria-label="Message language"
    >
      {LANGS.map((lang) => (
        <ToggleGroupItem key={lang} value={lang} data-testid={`lang-${lang}`} disabled={disabled}>
          {LANG_LABEL[lang]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {disabled ? (
        <Tooltip>
          <TooltipTrigger render={<div className="w-fit" />}>{group}</TooltipTrigger>
          <TooltipContent>Translations of your own text need live mode</TooltipContent>
        </Tooltip>
      ) : (
        group
      )}
      <div className="grid grid-cols-7 gap-1">
        {LANGS.map((lang) => {
          const chip = chips[lang];
          return (
            <div
              key={lang}
              data-testid={chip ? `lang-chip-${lang}` : `lang-chip-empty-${lang}`}
              className="truncate rounded-md bg-muted px-1.5 py-1 text-[10px] leading-tight text-muted-foreground"
            >
              <div className="font-medium text-foreground">{LANG_LABEL[lang]}</div>
              {chip ? (
                <div>
                  {teamName(chip.choice)} {(chip.pTop * 100).toFixed(0)}% · {Math.round(chip.ms)}ms
                </div>
              ) : (
                <div>—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
