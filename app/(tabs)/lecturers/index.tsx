import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import LecturerCard from "../../components/LecturerCard";
import { Lecturer, useLecturersList } from "../../hooks/useLecturersList";

// ─── Sub-components ──────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color="#5856D6" />
    <Text style={styles.loadingText}>Loading lecturers...</Text>
  </View>
);

const EmptyScreen = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.emptyTitle}>No lecturers</Text>
    <Text style={styles.emptyText}>
      There are currently no registered lecturers in the database.
    </Text>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const renderItem = ({ item }: { item: Lecturer }) => (
  <LecturerCard lecturer={item} />
);
const keyExtractor = (item: Lecturer) => item.id;

export default function LecturersListScreen() {
  const { lecturers, loading, refreshing, refresh } = useLecturersList();

  if (loading) return <LoadingScreen />;
  if (lecturers.length === 0) return <EmptyScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={lecturers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={["#5856D6"]}
            tintColor="#5856D6"
          />
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  listContent: { padding: 16, paddingBottom: 32 },
  loadingText: { marginTop: 12, fontSize: 16, color: "#8E8E93" },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
  },
});
