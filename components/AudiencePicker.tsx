import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Users } from "lucide-react-native";
import { TinyLabel, Caption } from "@/components/ui/typography";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import type { FriendGroup, ItemAudience, ItemVisibility } from "@/lib/types";
import { VISIBILITY_OPTIONS, cleanAudience, reach } from "@/lib/visibility";

interface AudiencePickerProps {
  value: ItemAudience;
  onChange: (next: ItemAudience) => void;
  groups: FriendGroup[];
  /** Your friends' user ids, to say how many will see it. */
  friendIds?: string[];
  label?: string;
}

/**
 * "Who can see this": all friends, only some groups, or all friends except some groups
 * (migration 051). Used on the add and edit item forms and for the default in Settings.
 */
export function AudiencePicker({
  value,
  onChange,
  groups,
  friendIds,
  label = "Who can see this",
}: AudiencePickerProps) {
  const router = useRouter();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const clean = cleanAudience(value, groups);
  const pickGroups = value.visibility !== "all";

  const setVisibility = (visibility: ItemVisibility) =>
    onChange({ visibility, groupIds: visibility === "all" ? [] : clean.groupIds });
  const toggleGroup = (id: string) =>
    onChange({
      visibility: value.visibility,
      groupIds: clean.groupIds.includes(id)
        ? clean.groupIds.filter((g) => g !== id)
        : [...clean.groupIds, id],
    });

  // Unselected options get the card colour and a border, so they read as buttons on the grey
  // form pages as well as on white cards.
  const pill = (selected: boolean) => ({
    backgroundColor: selected ? THEME.light.primary + "18" : theme.card,
    borderWidth: 1.5,
    borderColor: selected ? THEME.light.primary : theme.border,
  });
  const pillText = (selected: boolean) => ({
    color: selected ? theme.primaryInk : theme.mutedForeground,
    fontWeight: (selected ? "600" : "400") as "600" | "400",
  });

  const count = friendIds ? reach(clean, groups, friendIds) : null;
  const summary =
    value.visibility === "only" && clean.empty
      ? "Pick at least one group, or only you will see it."
      : value.visibility === "except" && clean.empty
        ? "Pick the groups to hide it from."
        : count !== null && friendIds && friendIds.length > 0
          ? `${count} of ${friendIds.length} ${friendIds.length === 1 ? "friend" : "friends"} can see and request it.`
          : null;

  return (
    <View style={{ gap: 8 }}>
      <TinyLabel>{label}</TinyLabel>
      <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="radiogroup">
        {VISIBILITY_OPTIONS.map((o) => {
          const selected = value.visibility === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => setVisibility(o.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", ...pill(selected) }}
            >
              <Caption style={pillText(selected)}>{o.label}</Caption>
            </Pressable>
          );
        })}
      </View>

      {pickGroups &&
        (groups.length === 0 ? (
          <Pressable
            onPress={() => router.push("/friend-groups")}
            accessibilityRole="button"
            style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}
          >
            <Users size={16} color={theme.primaryInk} />
            <Caption style={{ color: theme.primaryInk, fontWeight: "600" }}>
              Make a friend group first
            </Caption>
          </Pressable>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {groups.map((g) => {
              const selected = clean.groupIds.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  onPress={() => toggleGroup(g.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${g.name}, ${g.memberIds.length} ${g.memberIds.length === 1 ? "friend" : "friends"}`}
                  style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, ...pill(selected) }}
                >
                  <Caption style={pillText(selected)}>
                    {g.name} · {g.memberIds.length}
                  </Caption>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => router.push("/friend-groups")}
              accessibilityRole="button"
              style={{ paddingVertical: 8, paddingHorizontal: 12 }}
            >
              <Caption style={{ color: theme.primaryInk, fontWeight: "600" }}>Edit groups</Caption>
            </Pressable>
          </View>
        ))}

      {summary && <Caption style={{ color: theme.mutedForeground }}>{summary}</Caption>}
    </View>
  );
}
