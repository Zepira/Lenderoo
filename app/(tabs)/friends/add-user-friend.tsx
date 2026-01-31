/**
 * Add User Friend Screen
 *
 * Allows users to add other app users as friends by:
 * 1. Entering a friend code
 * 2. Searching for users by name
 */

import { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, Stack } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SafeAreaWrapper } from "@/components/SafeAreaWrapper";
import {
  UserPlus,
  Hash,
  Search,
  Copy,
  RefreshCw,
  X,
} from "lucide-react-native";
import * as toast from "@/lib/toast";
import {
  getMyFriendCode,
  addFriendByCode,
  searchUsers,
  addFriendByUserId,
  regenerateFriendCode,
  type FriendUser,
} from "@/lib/friends-service";
import { useThemeContext } from "@/contexts/ThemeContext";
import * as Clipboard from "expo-clipboard";
import { FloatingBackButton } from "@/components/FloatingBackButton";

export default function AddUserFriendScreen() {
  const { activeTheme } = useThemeContext();
  const isDark = activeTheme === "dark";

  // Tab state
  const [activeTab, setActiveTab] = useState<"code" | "search">("code");

  // Friend code state
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [addingByCode, setAddingByCode] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [searching, setSearching] = useState(false);

  // My friend code
  const [myFriendCode, setMyFriendCode] = useState<string | null>(null);
  const [loadingMyCode, setLoadingMyCode] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  // Load user's friend code on mount
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoadingMyCode(true);
        const code = await getMyFriendCode();
        if (isMounted) {
          setMyFriendCode(code);
        }
      } catch (error: any) {
        console.error("Error loading friend code:", error);
        if (isMounted) {
          toast.error("Failed to load your friend code");
        }
      } finally {
        if (isMounted) {
          setLoadingMyCode(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadMyFriendCode() {
    try {
      setLoadingMyCode(true);
      const code = await getMyFriendCode();
      setMyFriendCode(code);
    } catch (error: any) {
      console.error("Error loading friend code:", error);
      toast.error("Failed to load your friend code");
    } finally {
      setLoadingMyCode(false);
    }
  }

  async function handleCopyFriendCode() {
    if (!myFriendCode) return;
    await Clipboard.setStringAsync(myFriendCode);
    toast.success("Friend code copied!");
  }

  async function handleRegenerateFriendCode() {
    try {
      setRegenerating(true);
      const newCode = await regenerateFriendCode();
      setMyFriendCode(newCode);
      toast.success("New friend code generated!");
    } catch (error: any) {
      console.error("Error regenerating code:", error);
      toast.error("Failed to regenerate friend code");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleAddByCode() {
    if (!friendCodeInput.trim()) {
      toast.error("Please enter a friend code");
      return;
    }

    if (friendCodeInput.trim().length !== 6) {
      toast.error("Friend code must be 6 characters");
      return;
    }

    try {
      setAddingByCode(true);
      const result = await addFriendByCode(friendCodeInput);

      if (result.success) {
        toast.success(result.message || "Friend request sent!");
        setFriendCodeInput("");
        router.back();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      toast.error(error.message || "Failed to send friend request");
    } finally {
      setAddingByCode(false);
    }
  }

  async function handleSearch() {
    if (searchQuery.trim().length < 2) {
      toast.error("Please enter at least 2 characters");
      return;
    }

    try {
      setSearching(true);
      const results = await searchUsers(searchQuery);
      setSearchResults(results);

      if (results.length === 0) {
        toast.info("No users found");
      }
    } catch (error: any) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  }

  async function handleAddUser(userId: string, userName: string) {
    try {
      await addFriendByUserId(userId);
      toast.success(`Friend request sent to ${userName}!`);
      // Remove from search results
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      toast.error(error.message || "Failed to send friend request");
    }
  }

  return (
    <>
      {/* <Stack.Screen
        options={{
          title: "Add Friend",
          headerShown: true,
          presentation: "modal",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={isDark ? "#fff" : "#000"} />
            </TouchableOpacity>
          ),
        }}
      /> */}

      <ScrollView className="flex-1 bg-background">
        <SafeAreaWrapper>
          <FloatingBackButton />
          <View className="gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <View className="gap-2 items-center px-20">
              <Text variant="h4">Your Friend Code</Text>
              <Text
                variant="small"
                className="text-muted-foreground text-center"
              >
                Share this code with friends so they can add you
              </Text>
            </View>

            {loadingMyCode ? (
              <ActivityIndicator />
            ) : (
              <View className="gap-3">
                <View className="flex-row items-center gap-2">
                  <View className="flex-1 bg-background p-4 rounded-lg border border-border">
                    <Text className="text-2xl font-bold tracking-widest text-center">
                      {myFriendCode || "N/A"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onPress={handleCopyFriendCode}
                    disabled={!myFriendCode}
                  >
                    <Copy size={16} color={isDark ? "#fff" : "#000"} />
                    <Text>Copy</Text>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1"
                    onPress={handleRegenerateFriendCode}
                    disabled={regenerating}
                  >
                    <RefreshCw size={16} color={isDark ? "#fff" : "#000"} />
                    <Text>Regenerate</Text>
                  </Button>
                </View>
              </View>
            )}
          </View>

          {/* Tabs */}
          <View className="flex-row gap-2 mt-6">
            <Button
              variant={activeTab === "code" ? "default" : "outline"}
              className="flex-1"
              onPress={() => setActiveTab("code")}
            >
              <Hash size={16} />
              <Text>Friend Code</Text>
            </Button>

            <Button
              variant={activeTab === "search" ? "default" : "outline"}
              className="flex-1"
              onPress={() => setActiveTab("search")}
            >
              <Search size={16} />
              <Text>Search</Text>
            </Button>
          </View>

          {/* Tab Content */}
          {activeTab === "code" ? (
            <View className="gap-4 mt-6">
              <View className="gap-2">
                <Text variant="base" className="font-semibold">
                  Enter Friend Code
                </Text>
                <Text variant="small" className="text-muted-foreground">
                  Enter the 6-character code from your friend
                </Text>
              </View>

              <TextInput
                className="bg-background border border-border rounded-lg p-4 text-lg tracking-widest text-center uppercase"
                style={{ color: isDark ? "#fff" : "#000" }}
                placeholder="ABC123"
                placeholderTextColor={isDark ? "#666" : "#999"}
                value={friendCodeInput}
                onChangeText={(text) =>
                  setFriendCodeInput(text.toUpperCase().slice(0, 6))
                }
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <Button
                className="w-full"
                onPress={handleAddByCode}
                disabled={addingByCode || friendCodeInput.trim().length !== 6}
              >
                {addingByCode ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <UserPlus size={20} color="#fff" />
                    <Text className="text-white">Send Friend Request</Text>
                  </>
                )}
              </Button>
            </View>
          ) : (
            <View className="gap-4 mt-6">
              <View className="gap-2">
                <Text variant="base" className="font-semibold">
                  Search Users
                </Text>
                <Text variant="small" className="text-muted-foreground">
                  Search by name or email
                </Text>
              </View>

              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 bg-background border border-border rounded-lg px-4 py-3"
                  style={{ color: isDark ? "#fff" : "#000" }}
                  placeholder="Enter name or email..."
                  placeholderTextColor={isDark ? "#666" : "#999"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Button onPress={handleSearch} disabled={searching}>
                  {searching ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Search size={20} color="#fff" />
                  )}
                </Button>
              </View>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <View className="gap-2">
                  <Text variant="small" className="text-muted-foreground">
                    {searchResults.length} user(s) found
                  </Text>

                  {searchResults.map((user) => (
                    <View
                      key={user.id}
                      className="flex-row items-center justify-between p-4 bg-card rounded-lg border border-border"
                    >
                      <View className="flex-1 gap-1">
                        <Text variant="base" className="font-semibold">
                          {user.name}
                        </Text>
                        <Text variant="small" className="text-muted-foreground">
                          {user.email}
                        </Text>
                      </View>

                      <Button
                        size="sm"
                        onPress={() => handleAddUser(user.id, user.name)}
                      >
                        <UserPlus size={16} color="#fff" />
                        <Text className="text-white text-xs">Request</Text>
                      </Button>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </SafeAreaWrapper>
      </ScrollView>
    </>
  );
}
