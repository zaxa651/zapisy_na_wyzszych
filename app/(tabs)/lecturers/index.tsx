import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import LecturerCard from "../../components/LecturerCard";
import { Lecturer, useLecturersList } from "../../hooks/useLecturersList";

// --- Sub-components ---

const LoadingScreen = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color="#0F172A" />
    <Text style={styles.loadingText}>LOADING FACULTY...</Text>
  </View>
);

const EmptyScreen = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.emptyTitle}>No Entries Found</Text>
  </View>
);

export default function LecturersListScreen() {
  const { lecturers, loading, refreshing, refresh } = useLecturersList();
  const { width } = useWindowDimensions();

  // ?????????? ?????????? ??????? ? ??????????? ?? ?????? ??????
  // ??? ??????? ?????? 2 (????? ???? ?????????, ?? ?? ?????), ??? ????/????????? — 3 ??? 4
  const numColumns = width > 1000 ? 4 : width > 600 ? 3 : 2;

  if (loading) return <LoadingScreen />;
  if (lecturers.length === 0) return <EmptyScreen />;

  const renderItem = ({ item }: { item: Lecturer }) => (
    <View style={[styles.cardWrapper, { flex: 1 / numColumns }]}>
      <LecturerCard lecturer={item} />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={lecturers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        // ?????????? ?????: key ?????? ????????? ? numColumns, ????? ???????? ??????
        key={numColumns} 
        numColumns={numColumns}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>ZW</Text>
              </View>
              <Text style={styles.brandName}>Zapisy na wyzszych</Text>
            </View>
            <Text style={styles.pageTitle}>Academic Faculty</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#0F172A"
            colors={["#0F172A"]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  brandBadge: {
    width: 32,
    height: 22,
    backgroundColor: "#0F172A",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  brandBadgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 10,
  },
  brandName: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  pageTitle: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 6,
    paddingBottom: 40,
  },
  row: {
    justifyContent: "flex-start",
  },
  cardWrapper: {
    padding: 6,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
  },
});