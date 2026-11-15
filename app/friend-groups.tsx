import { useState } from "react";
import { View, TextInput, Alert, Platform, ActivityIndicator } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronDown, ChevronUp, Lock, Pencil, Trash2 } from "lucide-react-native";
import { useThemeContext } from "@/contexts/ThemeContext";
import { THEME } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PageTitle, TinyLabel, Caption, BodyStrong } from "@/components/ui/typography";
import { AudiencePicker } from "@/components/AudiencePicker";
import { useFriends } from "@/hooks/useFriends";
import {
  useDefaultAudience,
  useFriendGroups,
  useInvalidateGroups,
  useItemAudiences,
} from "@/hooks/useFriendGroups";
import {
  createFriendGroup,
  deleteFriendGroup,
  renameFriendGroup,
  setDefaultAudience,
  setGroupMembers,
} from "@/lib/services/friend-groups";
import { resolveAvatarSource } from "@/lib/services/avatar";
import { getInitials } from "@/lib/utils";
import type { FriendGroup, ItemAudience } from "@/lib/types";
import { audienceToSave, groupNameError, unusedSuggestions } from "@/lib/visibility";
import * as toast from "@/lib/toast";

/**
 * Friend groups (migration 051): make groups, choose who's in them, and set who new items are
 * visible to. Only the owner ever sees any of this.
 */
export default function FriendGroupsScreen() {
  const router = useRouter();
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";
  const theme = isDark ? THEME.dark : THEME.light;
  const { groups, loading } = useFriendGroups();
  const { friends } = useFriends();
  const { audiences } = useItemAudiences();
  const { defaultAudience } = useDefaultAudience();
  const invalidate = useInvalidateGroups();

  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [defaultDraft, setDefaultDraft] = useState<ItemAudience | null>(null);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await fn();
      invalidate();
      if (done) toast.success(done);
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (name: string) => {
    const problem = groupNameError(name, groups);
    if (problem) return toast.error(problem);
    const ok = await run(async () => {
      const g = await createFriendGroup(name);
      setOpen(g.id);
    }, `Made “${name.trim()}”. Now add friends to it.`);
    if (ok) setNewName("");
  };

  const rename = async () => {
    if (!renaming) return;
    const problem = groupNameError(renaming.name, groups, renaming.id);
    if (problem) return toast.error(problem);
    if (await run(() => renameFriendGroup(renaming.id, renaming.name))) setRenaming(null);
  };

  const remove = (g: FriendGroup) => {
    // Items shown only to this group would end up visible to nobody but you.
    const stranded = Object.values(audiences).filter(
      (a) => a.visibility === "only" && a.groupIds.length === 1 && a.groupIds[0] === g.id
    ).length;
    const message =
      stranded > 0
        ? `${stranded} ${stranded === 1 ? "item is" : "items are"} shared only with this group, so ${stranded === 1 ? "it" : "they"} will be hidden from all your friends until you choose someone else.`
        : "Your friends won’t be told. Items it was used on are updated.";
    const go = () => run(() => deleteFriendGroup(g.id), `Deleted “${g.name}”`);
    if (Platform.OS === "web") {
      if (window.confirm(`Delete “${g.name}”?\n\n${message}`)) void go();
    } else {
      Alert.alert(`Delete “${g.name}”?`, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void go() },
      ]);
    }
  };

  const toggleMember = (g: FriendGroup, friendId: string) => {
    const next = g.memberIds.includes(friendId)
      ? g.memberIds.filter((id) => id !== friendId)
      : [...g.memberIds, friendId];
    void run(() => setGroupMembers(g.id, next, g.memberIds));
  };

  const defaultValue = defaultDraft ?? defaultAudience ?? { visibility: "all" as const, groupIds: [] };
  const saveDefault = async () => {
    const next = audienceToSave(defaultValue, groups);
    if (await run(() => setDefaultAudience(next), "Saved your default for new items")) {
      setDefaultDraft(null);
    }
  };

  const card = {
    backgroundColor: theme.card,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 14,
  };
  const inputStyle = {
    flex: 1,
    backgroundColor: isDark ? theme.muted : "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.foreground,
    fontFamily: "Inter-Medium",
  };
  const chip = {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: isDark ? theme.muted : "#F3F4F6",
  };
  const suggestions = unusedSuggestions(groups);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? theme.muted : "#F3F4F6" }}>
      <View
        style={{
          backgroundColor: theme.card,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 4,
          marginBottom: 24,
        }}
      >
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Pressable
                onPress={() => router.back()}
                accessibilityLabel="Back"
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: isDark ? theme.muted : "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <ArrowLeft size={22} color={theme.mutedForeground} />
              </Pressable>
              <PageTitle>Friend Groups</PageTitle>
            </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <Lock size={14} color={theme.mutedForeground} style={{ marginTop: 3 }} />
              <Caption style={{ flex: 1, color: theme.mutedForeground }}>
                Only you can see your groups. Use them to choose who sees and can ask to borrow
                each item. Friends are never told which group they’re in, or that anything is
                hidden from them.
              </Caption>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={24}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48, gap: 16 }}
      >
        {/* New group */}
        <View style={card}>
          <TinyLabel>New group</TinyLabel>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Poor book maintainers"
              placeholderTextColor={theme.mutedForeground}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => newName.trim() && void add(newName)}
              style={inputStyle}
              accessibilityLabel="New group name"
            />
            <Button onPress={() => void add(newName)} disabled={busy || !newName.trim()} className="rounded-2xl">
              <Text>Add</Text>
            </Button>
          </View>
          {suggestions.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {suggestions.map((s) => (
                <Pressable key={s} onPress={() => void add(s)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Add ${s}`} style={chip}>
                  <Caption style={{ color: theme.primaryInk, fontWeight: "600" }}>+ {s}</Caption>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Groups */}
        {loading ? (
          <ActivityIndicator />
        ) : groups.length === 0 ? (
          <Caption style={{ textAlign: "center", color: theme.mutedForeground }}>
            No groups yet. Make one above, then choose it when adding or editing an item.
          </Caption>
        ) : (
          groups.map((g) => {
            const expanded = open === g.id;
            const isRenaming = renaming?.id === g.id;
            return (
              <View key={g.id} style={card}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {isRenaming ? (
                    <TextInput
                      value={renaming.name}
                      onChangeText={(name) => setRenaming({ id: g.id, name })}
                      autoFocus
                      maxLength={40}
                      onSubmitEditing={() => void rename()}
                      style={inputStyle}
                      accessibilityLabel={`Rename ${g.name}`}
                    />
                  ) : (
                    <Pressable
                      onPress={() => setOpen(expanded ? null : g.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}
                    >
                      <View style={{ flex: 1 }}>
                        <BodyStrong numberOfLines={1}>{g.name}</BodyStrong>
                        <Caption style={{ color: theme.mutedForeground }}>
                          {g.memberIds.length} {g.memberIds.length === 1 ? "friend" : "friends"}
                        </Caption>
                      </View>
                      {expanded ? (
                        <ChevronUp size={20} color={theme.mutedForeground} />
                      ) : (
                        <ChevronDown size={20} color={theme.mutedForeground} />
                      )}
                    </Pressable>
                  )}
                  {isRenaming ? (
                    <>
                      <Button size="sm" onPress={() => void rename()} disabled={busy}>
                        <Text>Save</Text>
                      </Button>
                      <Button size="sm" variant="ghost" onPress={() => setRenaming(null)}>
                        <Text>Cancel</Text>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Pressable onPress={() => setRenaming({ id: g.id, name: g.name })} accessibilityLabel={`Rename ${g.name}`} hitSlop={8} style={{ padding: 6 }}>
                        <Pencil size={18} color={theme.mutedForeground} />
                      </Pressable>
                      <Pressable onPress={() => remove(g)} accessibilityLabel={`Delete ${g.name}`} hitSlop={8} style={{ padding: 6 }}>
                        <Trash2 size={18} color={theme.destructive} />
                      </Pressable>
                    </>
                  )}
                </View>

                {expanded &&
                  (friends.length === 0 ? (
                    <Caption style={{ color: theme.mutedForeground }}>Add some friends first.</Caption>
                  ) : (
                    <View style={{ gap: 4 }}>
                      {friends.map((f) => {
                        const checked = g.memberIds.includes(f.id);
                        return (
                          <Pressable
                            key={f.id}
                            onPress={() => toggleMember(g, f.id)}
                            disabled={busy}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked }}
                            accessibilityLabel={f.name}
                            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
                          >
                            <Avatar className="size-9" alt={f.name}>
                              {f.avatarUrl && <AvatarImage source={resolveAvatarSource(f.avatarUrl) ?? { uri: "" }} />}
                              <AvatarFallback className="bg-primary/15">
                                <Text className="font-sans-bold text-primary" style={{ fontSize: 12 }}>
                                  {getInitials(f.name)}
                                </Text>
                              </AvatarFallback>
                            </Avatar>
                            <Text className="flex-1" numberOfLines={1}>{f.name}</Text>
                            <Checkbox checked={checked} onCheckedChange={() => toggleMember(g, f.id)} disabled={busy} />
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
              </View>
            );
          })
        )}

        {/* Default for new items */}
        <View style={card}>
          <AudiencePicker
            label="New items are visible to"
            value={defaultValue}
            onChange={setDefaultDraft}
            groups={groups}
            friendIds={friends.map((f) => f.id)}
          />
          <Caption style={{ color: theme.mutedForeground }}>
            Applies to items you add from now on. You can still change it on each item.
          </Caption>
          {defaultDraft && (
            <Button onPress={() => void saveDefault()} disabled={busy} className="rounded-full">
              <Text>Save default</Text>
            </Button>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
