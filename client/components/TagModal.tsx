import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import type { Tag } from "@portfolio-tracker/shared";
import { TagChip } from "./TagChip";

interface TagModalProps {
  visible: boolean;
  onClose: () => void;
  tags: Tag[];
  assignedTagIds: string[];
  onToggleTag: (tagId: string, assigned: boolean) => void;
  positionName: string;
}

export function TagModal({
  visible,
  onClose,
  tags,
  assignedTagIds,
  onToggleTag,
  positionName,
}: TagModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Tags for {positionName}</Text>
          <Text style={styles.subtitle}>Tap to toggle tags</Text>

          <ScrollView style={styles.tagList}>
            {tags.length === 0 ? (
              <Text style={styles.emptyText}>
                No tags yet. Create tags in the tag manager.
              </Text>
            ) : (
              <View style={styles.tagGrid}>
                {tags.map((tag) => {
                  const assigned = assignedTagIds.includes(tag.id);
                  return (
                    <TagChip
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      selected={assigned}
                      onPress={() => onToggleTag(tag.id, assigned)}
                    />
                  );
                })}
              </View>
            )}
          </ScrollView>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "60%",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 16,
  },
  tagList: {
    marginBottom: 16,
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  closeButton: {
    backgroundColor: "#334155",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  closeText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
