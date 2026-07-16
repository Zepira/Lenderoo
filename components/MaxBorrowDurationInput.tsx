import { useEffect, useRef, useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { TinyLabel, Caption } from "@/components/ui/typography";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";

type Unit = "days" | "weeks" | "months";

const UNIT_MULTIPLIER: Record<Unit, number> = { days: 1, weeks: 7, months: 30 };
const UNITS: Unit[] = ["days", "weeks", "months"];
const MAX_DAYS = 365;

function unitsFromDays(days: number | null): { amount: string; unit: Unit } {
  if (!days) return { amount: "", unit: "weeks" };
  if (days % 30 === 0) return { amount: String(days / 30), unit: "months" };
  if (days % 7 === 0) return { amount: String(days / 7), unit: "weeks" };
  return { amount: String(days), unit: "days" };
}

interface MaxBorrowDurationInputProps {
  /** Structured max-borrow window in days, or null/undefined for "no limit". */
  days: number | null | undefined;
  onChange: (days: number | null) => void;
}

/**
 * Owner-facing "how long can this be borrowed" input. Structured (amount +
 * unit) instead of free text, so it can drive due_date and the due-soon
 * reminder — see supabase/migrations/046_max_borrow_duration.sql and
 * docs/NOTIFICATIONS.md.
 */
export function MaxBorrowDurationInput({ days, onChange }: MaxBorrowDurationInputProps) {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;

  const initial = unitsFromDays(days ?? null);
  const [amount, setAmount] = useState(initial.amount);
  const [unit, setUnit] = useState<Unit>(initial.unit);

  // Re-sync from an external reset (e.g. loading a different item to edit)
  // without fighting the user's own keystrokes on every render.
  const lastExternalDays = useRef(days ?? null);
  useEffect(() => {
    const next = days ?? null;
    if (next !== lastExternalDays.current) {
      lastExternalDays.current = next;
      const parsed = unitsFromDays(next);
      setAmount(parsed.amount);
      setUnit(parsed.unit);
    }
  }, [days]);

  const emit = (nextAmount: string, nextUnit: Unit) => {
    const parsed = parseInt(nextAmount, 10);
    if (!nextAmount || Number.isNaN(parsed) || parsed <= 0) {
      onChange(null);
      return;
    }
    onChange(Math.min(parsed * UNIT_MULTIPLIER[nextUnit], MAX_DAYS));
  };

  const handleAmountChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "").slice(0, 3);
    setAmount(digitsOnly);
    emit(digitsOnly, unit);
  };

  const handleUnitChange = (nextUnit: Unit) => {
    setUnit(nextUnit);
    emit(amount, nextUnit);
  };

  const inputStyle = {
    backgroundColor: isDark ? theme.muted : "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.foreground,
    fontFamily: "Inter-Medium",
  };

  return (
    <View style={{ gap: 8 }}>
      <TinyLabel>Max Borrow Duration (Optional)</TinyLabel>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={amount}
          onChangeText={handleAmountChange}
          placeholder="2"
          placeholderTextColor={theme.mutedForeground}
          keyboardType="number-pad"
          style={[inputStyle, { width: 64, textAlign: "center" }]}
        />
        <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
          {UNITS.map((u) => {
            const selected = unit === u;
            return (
              <Pressable
                key={u}
                onPress={() => handleUnitChange(u)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: selected
                    ? THEME.light.primary + "18"
                    : isDark
                      ? theme.muted
                      : "#F3F4F6",
                  borderWidth: 1.5,
                  borderColor: selected ? THEME.light.primary : "transparent",
                }}
              >
                <Caption
                  style={{
                    color: selected ? THEME.light.primary : theme.mutedForeground,
                    fontWeight: selected ? "600" : "400",
                  }}
                >
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </Caption>
              </Pressable>
            );
          })}
        </View>
      </View>
      {amount !== "" && (
        <Caption style={{ color: theme.mutedForeground }}>
          Borrower gets a reminder when their time is almost up.
        </Caption>
      )}
    </View>
  );
}
