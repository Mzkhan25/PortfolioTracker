import { useState, useCallback } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
} from "react-native";
import type { Position } from "@portfolio-tracker/shared";
import { useGroupedPositions } from "../../hooks/usePortfolio";
import { useTags, useTagPosition, useUntagPosition } from "../../hooks/useTags";
import { Ionicons } from "@expo/vector-icons";
import { GroupedPositionRow } from "../../components/GroupedPositionRow";
import { TagChip } from "../../components/TagChip";
import { TagModal } from "../../components/TagModal";
import { TagManager } from "../../components/TagManager";

type SortKey = "pnl" | "value" | "name";

export default function PositionsScreen() {
  const { data: grouped, isLoading, refetch, isRefetching } = useGroupedPositions();
  const { data: tags } = useTags();
  const tagPosition = useTagPosition();
  const untagPosition = useUntagPosition();

  const [sortBy, setSortBy] = useState<SortKey>("value");
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [tagModalPosition, setTagModalPosition] = useState<Position | null>(null);
  const [tagManagerVisible, setTagManagerVisible] = useState(false);

  const handleToggleTag = useCallback(
    (tagId: string, assigned: boolean) => {
      if (!tagModalPosition) return;
      if (assigned) {
        untagPosition.mutate({ tagId, etoroPositionId: tagModalPosition.id });
      } else {
        tagPosition.mutate({ tagId, etoroPositionId: tagModalPosition.id });
      }
    },
    [tagModalPosition]
  );

  const handlePositionPress = useCallback(
    (positionId: string) => {
      // Find the position across all groups
      const allPositions = (grouped || []).flatMap((g) => g.positions);
      const position = allPositions.find((p) => p.id === positionId);
      if (position) setTagModalPosition(position);
    },
    [grouped]
  );

  // Filter by tag (filter at position level, then re-group)
  let filtered = grouped || [];
  if (filterTagId) {
    filtered = filtered.filter((g) =>
      g.tags?.some((t) => t.id === filterTagId)
    );
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "pnl":
        return b.unrealizedPnlPercent - a.unrealizedPnlPercent;
      case "value":
        return (b.totalAmount + b.unrealizedPnl) - (a.totalAmount + a.unrealizedPnl);
      case "name":
        return (a.ticker || a.instrumentName).localeCompare(b.ticker || b.instrumentName);
      default:
        return 0;
    }
  });

  const totalPositions = sorted.reduce((s, g) => s + g.positionCount, 0);

  return (
    <View style={styles.container}>
      {/* Tag Filter Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        <Pressable
          style={styles.manageTagsBtn}
          onPress={() => setTagManagerVisible(true)}
        >
          <Ionicons name="pricetags" size={16} color="#3b82f6" />
        </Pressable>
        <TagChip
          name="All"
          color="#64748b"
          selected={!filterTagId}
          onPress={() => setFilterTagId(null)}
        />
        {tags?.map((tag) => (
          <TagChip
            key={tag.id}
            name={tag.name}
            color={tag.color}
            selected={filterTagId === tag.id}
            onPress={() =>
              setFilterTagId(filterTagId === tag.id ? null : tag.id)
            }
          />
        ))}
      </ScrollView>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort:</Text>
        {(["value", "pnl", "name"] as SortKey[]).map((key) => (
          <Pressable
            key={key}
            style={[styles.sortButton, sortBy === key && styles.sortButtonActive]}
            onPress={() => setSortBy(key)}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === key && styles.sortButtonTextActive,
              ]}
            >
              {key === "pnl" ? "P&L" : key === "value" ? "Value" : "Name"}
            </Text>
          </Pressable>
        ))}
        <Text style={styles.countLabel}>
          {sorted.length} stock{sorted.length !== 1 ? "s" : ""}
          {totalPositions !== sorted.length && ` · ${totalPositions} positions`}
        </Text>
      </View>

      {/* Grouped Position List */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.instrumentId}
        renderItem={({ item }) => (
          <GroupedPositionRow
            group={item}
            onPress={() => router.push(`/position/${item.instrumentId}`)}
            onPositionPress={handlePositionPress}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading
                ? "Loading positions..."
                : filterTagId
                ? "No positions with this tag"
                : "No open positions"}
            </Text>
          </View>
        }
        contentContainerStyle={sorted.length === 0 ? styles.emptyList : undefined}
      />

      {/* Tag Assignment Modal */}
      <TagModal
        visible={!!tagModalPosition}
        onClose={() => setTagModalPosition(null)}
        tags={tags || []}
        assignedTagIds={tagModalPosition?.tags?.map((t) => t.id) || []}
        onToggleTag={handleToggleTag}
        positionName={
          tagModalPosition?.ticker || tagModalPosition?.instrumentName || ""
        }
      />

      {/* Tag Manager Modal */}
      <TagManager
        visible={tagManagerVisible}
        onClose={() => setTagManagerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  filterBar: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  manageTagsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
  sortButtonActive: {
    backgroundColor: "#3b82f6",
  },
  sortButtonText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  sortButtonTextActive: {
    color: "#ffffff",
  },
  countLabel: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: "auto",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  emptyList: {
    flexGrow: 1,
  },
});
