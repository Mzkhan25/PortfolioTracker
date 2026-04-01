import { Pressable, Text, StyleSheet } from "react-native";

interface TagChipProps {
  name: string;
  color?: string | null;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
}

export function TagChip({ name, color, selected, onPress, small }: TagChipProps) {
  const bgColor = selected
    ? (color || "#3b82f6")
    : `${color || "#3b82f6"}33`; // 20% opacity when not selected

  return (
    <Pressable
      style={[
        styles.chip,
        { backgroundColor: bgColor },
        small && styles.chipSmall,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.text,
          { color: selected ? "#ffffff" : (color || "#3b82f6") },
          small && styles.textSmall,
        ]}
      >
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
  textSmall: {
    fontSize: 11,
  },
});
