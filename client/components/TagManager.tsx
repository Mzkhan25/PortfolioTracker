import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Tag } from "@portfolio-tracker/shared";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag, useTagPositions } from "../hooks/useTags";

const PRESET_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316",
];

interface TagManagerProps {
  visible: boolean;
  onClose: () => void;
}

function TagAnalyticsRow({ tag }: { tag: Tag }) {
  const { data } = useTagPositions(tag.id);
  const analytics = data?.analytics;

  return (
    <View style={styles.analyticsRow}>
      <Text style={styles.analyticLabel}>{analytics?.positionCount ?? 0} positions</Text>
      {analytics && analytics.unrealizedPnl !== 0 && (
        <Text
          style={[
            styles.analyticValue,
            analytics.unrealizedPnl >= 0 ? styles.positive : styles.negative,
          ]}
        >
          {analytics.unrealizedPnl >= 0 ? "+" : ""}€{analytics.unrealizedPnl.toFixed(2)}
          {" "}({analytics.unrealizedPnlPercent.toFixed(1)}%)
        </Text>
      )}
    </View>
  );
}

export function TagManager({ visible, onClose }: TagManagerProps) {
  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createTag.mutate(
      { name: newName.trim(), color: selectedColor },
      {
        onSuccess: () => {
          setNewName("");
          setSelectedColor(PRESET_COLORS[0]);
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editingTag || !editName.trim()) return;
    updateTag.mutate(
      { id: editingTag.id, name: editName.trim() },
      { onSuccess: () => setEditingTag(null) }
    );
  };

  const handleDelete = (tag: Tag) => {
    const doDelete = () => deleteTag.mutate(tag.id);

    if (Platform.OS === "web") {
      if (confirm(`Delete tag "${tag.name}"? This will remove it from all positions.`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Delete Tag",
        `Delete "${tag.name}"? This will remove it from all positions.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Manage Tags</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </Pressable>
          </View>

          {/* Create Tag */}
          <View style={styles.createRow}>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="New tag name"
              placeholderTextColor="#475569"
              maxLength={100}
              onSubmitEditing={handleCreate}
            />
            <Pressable
              style={[styles.createBtn, !newName.trim() && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!newName.trim()}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </Pressable>
          </View>

          {/* Color Picker */}
          <View style={styles.colorRow}>
            {PRESET_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorDotSelected,
                ]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>

          {/* Tag List */}
          <ScrollView style={styles.tagList}>
            {(tags || []).map((tag) => (
              <View key={tag.id} style={styles.tagRow}>
                <View style={[styles.tagDot, { backgroundColor: tag.color || "#3b82f6" }]} />

                {editingTag?.id === tag.id ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.editInput}
                      value={editName}
                      onChangeText={setEditName}
                      autoFocus
                      onSubmitEditing={handleUpdate}
                      maxLength={100}
                    />
                    <Pressable onPress={handleUpdate}>
                      <Ionicons name="checkmark" size={20} color="#22c55e" />
                    </Pressable>
                    <Pressable onPress={() => setEditingTag(null)}>
                      <Ionicons name="close" size={20} color="#94a3b8" />
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={styles.tagInfo}>
                      <Text style={styles.tagName}>{tag.name}</Text>
                      <TagAnalyticsRow tag={tag} />
                    </View>
                    <Pressable onPress={() => startEditing(tag)} style={styles.iconBtn}>
                      <Ionicons name="pencil" size={16} color="#64748b" />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(tag)} style={styles.iconBtn}>
                      <Ionicons name="trash" size={16} color="#ef4444" />
                    </Pressable>
                  </>
                )}
              </View>
            ))}

            {(tags || []).length === 0 && (
              <Text style={styles.emptyText}>
                No tags yet. Create one above to start organizing your positions.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#1e293b", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "80%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "600", color: "#ffffff" },
  createRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: "#0f172a", borderRadius: 10, padding: 12, fontSize: 15, color: "#ffffff", borderWidth: 1, borderColor: "#334155" },
  createBtn: { backgroundColor: "#3b82f6", borderRadius: 10, width: 44, alignItems: "center", justifyContent: "center" },
  createBtnDisabled: { opacity: 0.4 },
  colorRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: "#ffffff" },
  tagList: { marginBottom: 8 },
  tagRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#334155", gap: 10 },
  tagDot: { width: 12, height: 12, borderRadius: 6 },
  tagInfo: { flex: 1 },
  tagName: { fontSize: 15, fontWeight: "500", color: "#ffffff" },
  analyticsRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  analyticLabel: { fontSize: 12, color: "#64748b" },
  analyticValue: { fontSize: 12, fontWeight: "500" },
  positive: { color: "#22c55e" },
  negative: { color: "#ef4444" },
  editRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  editInput: { flex: 1, backgroundColor: "#0f172a", borderRadius: 8, padding: 8, fontSize: 14, color: "#ffffff", borderWidth: 1, borderColor: "#334155" },
  iconBtn: { padding: 6 },
  emptyText: { color: "#64748b", fontSize: 14, textAlign: "center", paddingVertical: 24 },
});
