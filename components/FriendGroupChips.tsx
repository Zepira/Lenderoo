import { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import { TinyLabel, Caption } from "@/components/ui/typography";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { useFriendGroups, useInvalidateGroups } from "@/hooks/useFriendGroups";
import { setGroupMembers } from "@/lib/services/friend-groups";
import * as toast from "@/lib/toast";

/**
 * Which of your groups a friend is in, on their profile: tap a group to add or remove them.
 * Only you see this (migration 051).
 */
export function FriendGroupChips({ friendId, friendName }: { friendId: string; friendName: string }) {
  const router = useRouter();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const { groups } = useFriendGroups();
  const invalidate = useInvalidateGroups();
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (groupId: string) => {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return;
    const isIn = g.memberIds.includes(friendId);
    setBusy(groupId);
    try {
      await setGroupMembers(
        g.id,
        isIn ? g.memberIds.filter((id) => id !== friendId) : [...g.memberIds, friendId],
        g.memberIds
      );
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't change their groups");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 24,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <TinyLabel style={{ flex: 1 }}>Your groups</TinyLabel>
        <Lock size={12} color={theme.mutedForeground} />
        <Caption style={{ color: theme.mutedForeground, fontSize: 12 }}>Only you see this</Caption>
      </View>
      {groups.length === 0 ? (
        <Pressable onPress={() => router.push("/friend-groups")} accessibilityRole="button">
          <Caption style={{ color: theme.primaryInk, fontWeight: "600" }}>
            Make groups to choose who sees each item
          </Caption>
        </Pressable>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {groups.map((g) => {
            const selected = g.memberIds.includes(friendId);
            return (
              <Pressable
                key={g.id}
                onPress={() => void toggle(g.id)}
                disabled={busy !== null}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${friendName} in ${g.name}`}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: selected ? THEME.light.primary + "18" : isDark ? theme.muted : "#F3F4F6",
                  borderWidth: 1.5,
                  borderColor: selected ? THEME.light.primary : "transparent",
                  opacity: busy === g.id ? 0.5 : 1,
                }}
              >
                <Caption
                  style={{
                    color: selected ? theme.primaryInk : theme.mutedForeground,
                    fontWeight: selected ? "600" : "400",
                  }}
                >
                  {selected ? "✓ " : ""}
                  {g.name}
                </Caption>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
