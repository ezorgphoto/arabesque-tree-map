import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import type { ProfileTagCategory } from "@/lib/profile-tags";
import { TAG_CATEGORY_LABEL, toggleTag } from "@/lib/profile-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  category: ProfileTagCategory;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  onAddOption?: (label: string) => Promise<void> | void;
  allowAdd?: boolean;
};

export function TagMultiSelect({
  category,
  options,
  selected,
  onChange,
  onAddOption,
  allowAdd = true,
}: Props) {
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  const merged = useMemo(() => {
    const set = new Set([...options, ...selected]);
    return [...set].sort((a, b) => a.localeCompare(b, "ar"));
  }, [options, selected]);

  const add = async () => {
    const label = custom.trim();
    if (!label) return;
    setBusy(true);
    try {
      if (onAddOption) await onAddOption(label);
      if (!selected.includes(label)) onChange([...selected, label]);
      setCustom("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{TAG_CATEGORY_LABEL[category]}</Label>
      <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/20 p-2">
        {merged.map((label) => {
          const active = selected.includes(label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(toggleTag(selected, label))}
              className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground ring-1 ring-border hover:bg-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
        {!merged.length && (
          <p className="w-full py-2 text-center text-xs text-muted-foreground">لا خيارات بعد — أضف خياراً.</p>
        )}
      </div>
      {allowAdd && (
        <div className="flex gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="إضافة خيار جديد…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={!custom.trim() || busy} onClick={() => void add()}>
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
