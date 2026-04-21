import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { supabase } from "../../src/supabase/supabaseClient";
import {
  Course,
  CourseSlot,
  Proposal,
  useCoursesData,
} from "../hooks/useCoursesData";

// ——— Reusable components ——————————————————————————————————————————————————

const StatusBadge = ({ status }: { status: Proposal["status"] }) => {
  const config: Record<Proposal["status"], { label: string; style: object }> = {
    pending: { label: "Under Review", style: styles.statusPending },
    approved: { label: "Approved", style: styles.statusApproved },
    rejected: { label: "Rejected", style: styles.statusRejected },
  };
  const { label, style } = config[status];
  return <Text style={[styles.statusText, style]}>{label}</Text>;
};

const LecturerBadge = ({
  name,
  academicTitle,
}: {
  name: string | null;
  academicTitle?: string;
}) => {
  if (!name) {
    return (
      <View style={[styles.lecturerBadge, styles.noLecturerBadge]}>
        <Text style={styles.noLecturerText}>?? Lecturer not assigned</Text>
      </View>
    );
  }
  return (
    <View style={styles.lecturerBadge}>
      <Text style={styles.lecturerText}> {name}</Text>
      {!!academicTitle && (
        <Text style={styles.academicTitle}>{academicTitle}</Text>
      )}
    </View>
  );
};

const SlotChips = ({ slots }: { slots: CourseSlot[] }) => (
  <View style={styles.slotsPreview}>
    <Text style={styles.slotsLabel}>Available Slots:</Text>
    <View style={styles.slotsList}>
      {slots.map((s, i) => (
        <View key={i} style={styles.slotChip}>
          <Text style={styles.slotChipText}>{s.slot}</Text>
        </View>
      ))}
    </View>
  </View>
);

// ——— Slot modal ————————————————————————————————————————————————————————————

interface SlotModalProps {
  course: Course | null;
  onConfirm: (slot: string, lecturerId?: string) => void;
  onClose: () => void;
}
const SlotModal = ({ course, onConfirm, onClose }: SlotModalProps) => (
  <Modal visible={!!course} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Enrollment</Text>
        <Text style={styles.modalSubtitle}>{course?.title}</Text>
        <Text style={styles.modalSectionLabel}>Choose a slot:</Text>
        {(course?.course_slots ?? []).map((slotObj) => (
          <TouchableOpacity
            key={slotObj.id}
            style={styles.slotOption}
            onPress={() => onConfirm(slotObj.slot, slotObj.lecturer_id)}
          >
            <Text style={styles.slotOptionText}>{slotObj.slot}</Text>
            <Text style={styles.slotOptionArrow}>?</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ——— Propose slot modal —————————————————————————————————————————————————————

interface ProposeModalProps {
  course: Course | null;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}
const ProposeModal = ({
  course,
  value,
  onChange,
  onConfirm,
  onClose,
}: ProposeModalProps) => (
  <Modal
    visible={!!course}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Propose Time</Text>
        {course && <Text style={styles.modalSubtitle}>{course.title}</Text>}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="e.g.: Mon 18:00"
          style={styles.input}
        />
        <TouchableOpacity
          style={[styles.primaryBtn, { marginBottom: 8 }]}
          onPress={onConfirm}
        >
          <Text style={styles.primaryBtnText}>Send Proposal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ——— Proposals modal ————————————————————————————————————————————————————————

interface ProposalsModalProps {
  visible: boolean;
  proposals: Proposal[];
  lecturersMap: Record<string, any>;
  processingIds: Set<string>;
  onApprove: (p: Proposal) => void;
  onReject: (p: Proposal) => void;
  onClose: () => void;
}
const ProposalsModal = ({
  visible,
  proposals,
  lecturersMap,
  processingIds,
  onApprove,
  onReject,
  onClose,
}: ProposalsModalProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { maxHeight: "80%" }]}>
        <Text style={styles.modalTitle}>Time Proposals</Text>
        <Text style={styles.modalSubtitle}>
          Approve or reject time proposals from lecturers
        </Text>
        <FlatList
          data={proposals}
          keyExtractor={(p) => p.id}
          ListEmptyComponent={
            <Text style={styles.emptyProposalsText}>No proposals found</Text>
          }
          renderItem={({ item }) => {
            const isProcessing = processingIds.has(item.id);
            const lecturerName =
              lecturersMap[item.proposer_id]?.full_name ??
              item.proposer_id.slice(0, 8);
            return (
              <View style={styles.proposalItem}>
                <Text style={styles.proposalSlot}>{item.slot}</Text>
                <View style={styles.proposalDetails}>
                  <Text style={styles.proposalText}>
                    Course ID: {item.course_id.slice(0, 8)}...
                  </Text>
                  <Text style={styles.proposalText}>
                    Lecturer: {lecturerName}
                  </Text>
                </View>
                <View style={styles.proposalStatus}>
                  <Text>Status: </Text>
                  <StatusBadge status={item.status} />
                </View>
                {item.status === "pending" && (
                  <View style={styles.proposalActions}>
                    <TouchableOpacity
                      style={[
                        styles.approveBtn,
                        isProcessing && styles.disabledBtn,
                      ]}
                      onPress={() => onApprove(item)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.approveBtnText}>? Approve</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.rejectBtn,
                        isProcessing && styles.disabledBtn,
                      ]}
                      onPress={() => onReject(item)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.rejectBtnText}>? Reject</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
        <TouchableOpacity
          style={[styles.cancelBtn, { marginTop: 12 }]}
          onPress={onClose}
        >
          <Text style={styles.cancelBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ——— Course card ———————————————————————————————————————————————————————————

interface CourseCardProps {
  item: Course;
  isEnrolled: boolean;
  isEnrolling: boolean;
  isProposing: boolean;
  isCurrentLecturer: boolean;
  chosenSlot?: string;
  lecturerInfo?: any;
  onEnroll: () => void;
  onUnenroll: () => void;
  onManage: () => void;
  onPropose: () => void;
  swipeRef: (ref: Swipeable | null) => void;
}

const CourseCard = React.memo(
  ({
    item,
    isEnrolled,
    isEnrolling,
    isProposing,
    isCurrentLecturer,
    chosenSlot,
    lecturerInfo,
    onEnroll,
    onUnenroll,
    onManage,
    onPropose,
    swipeRef,
  }: CourseCardProps) => {
    const hasLecturer = !!item.lecturer_id;
    const slots = item.course_slots ?? [];

    const renderRightActions = (
      progress: Animated.AnimatedInterpolation<number>,
    ) => {
      const trans = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [80, 0],
      });
      return (
        <Animated.View
          style={[styles.swipeAction, { transform: [{ translateX: trans }] }]}
        >
          <TouchableOpacity style={styles.swipeDeleteBtn} onPress={onUnenroll}>
            <Text style={styles.swipeDeleteIcon}>?</Text>
            <Text style={styles.swipeDeleteText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    const card = (
      <View
        style={[styles.courseCard, isEnrolled && styles.courseCardEnrolled]}
      >
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle}>{item.title}</Text>
          {!!item.description && (
            <Text style={styles.courseDescription}>{item.description}</Text>
          )}

          <LecturerBadge
            name={
              hasLecturer ? (lecturerInfo?.full_name ?? "Lecturer") : null
            }
            academicTitle={lecturerInfo?.academic_title}
          />

          {!isEnrolled && hasLecturer && slots.length > 0 && (
            <SlotChips slots={slots} />
          )}

          {isEnrolled && chosenSlot && (
            <View style={styles.enrolledSlot}>
              <Text style={styles.enrolledSlotText}>
                ? Your time: {chosenSlot}
              </Text>
            </View>
          )}

          {isEnrolled && (
            <Text style={styles.swipeHint}>? swipe left to unenroll</Text>
          )}
        </View>

        <View style={styles.cardActions}>
          {isCurrentLecturer ? (
            <>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: "#5856D6", marginBottom: 8 },
                ]}
                onPress={onPropose}
                disabled={isProposing}
              >
                {isProposing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Propose Time</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#34C759" }]}
                onPress={onManage}
              >
                <Text style={styles.primaryBtnText}>Manage</Text>
              </TouchableOpacity>
            </>
          ) : isEnrolled ? (
            <View style={styles.enrolledActions}>
              <View
                style={[
                  styles.primaryBtn,
                  { backgroundColor: "#34C759", flex: 1, marginRight: 10 },
                ]}
              >
                <Text style={styles.primaryBtnText}>? Enrolled</Text>
              </View>
              <TouchableOpacity
                style={styles.unenrollBtn}
                onPress={onUnenroll}
                disabled={isEnrolling}
              >
                {isEnrolling ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <Text style={styles.unenrollBtnText}>Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                isEnrolling && styles.primaryBtnLoading,
                !hasLecturer && styles.primaryBtnDisabled,
              ]}
              onPress={onEnroll}
              disabled={isEnrolling || !hasLecturer}
              activeOpacity={0.8}
            >
              {isEnrolling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {!hasLecturer
                    ? "Unavailable"
                    : slots.length > 0
                      ? "Choose Time ?"
                      : "Enroll Now"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );

    if (isEnrolled) {
      return (
        <Swipeable
          ref={swipeRef}
          renderRightActions={renderRightActions}
          overshootRight={false}
        >
          {card}
        </Swipeable>
      );
    }
    return card;
  },
);

// ——— Main screen ————————————————————————————————————————————————————————————

export default function CoursesScreen() {
  const router = useRouter();
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const {
    currentUserIdRef,
    role,
    courses,
    lecturersMap,
    enrolledCourseIds,
    selectedSlots,
    proposals,
    loading,
    error,
    refreshing,
    initialize,
    refresh,
    enroll,
    unenroll,
    proposeSlot,
    approveProposal,
    rejectProposal,
    fetchProposals,
  } = useCoursesData();

  const [enrollingIds, setEnrollingIds] = useState<Set<string>>(new Set());
  const [proposingIds, setProposingIds] = useState<Set<string>>(new Set());
  const [processingProposalIds, setProcessingProposalIds] = useState<
    Set<string>
  >(new Set());

  const [slotModalCourse, setSlotModalCourse] = useState<Course | null>(null);
  const [proposeModalCourse, setProposeModalCourse] = useState<Course | null>(
    null,
  );
  const [newSlotText, setNewSlotText] = useState("");
  const [proposalsModalVisible, setProposalsModalVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    initialize();
  }, [initialize]);
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCourses(courses);
      setSuggestions([]);
      return;
    }

    const q = searchQuery.toLowerCase();

    const filtered = courses.filter((course) => {
      const lecturer = course.lecturer_id
        ? lecturersMap[course.lecturer_id]
        : null;

      return (
        course.title.toLowerCase().includes(q) ||
        lecturer?.academic_title?.toLowerCase().includes(q) ||
        lecturer?.full_name?.toLowerCase().includes(q)
      );
    });

    setFilteredCourses(filtered);

    // Suggestions
    const suggSet = new Set<string>();

    courses.forEach((course) => {
      if (course.title.toLowerCase().includes(q)) {
        suggSet.add(course.title);
      }

      const lecturer = course.lecturer_id
        ? lecturersMap[course.lecturer_id]
        : null;

      if (lecturer?.full_name?.toLowerCase().includes(q)) {
        suggSet.add(lecturer.full_name);
      }

      if (lecturer?.academic_title?.toLowerCase().includes(q)) {
        suggSet.add(lecturer.academic_title);
      }
    });

    setSuggestions(Array.from(suggSet).slice(0, 5));
  }, [searchQuery, courses, lecturersMap]);

  // —— handlers ————————————————————————————————————————————————————————————————

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }, [router]);

  const handleAdminAccess = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    data?.role === "admin"
      ? router.push("/admin")
      : Alert.alert("Access Denied", "You are not an admin ;)");
  }, [router]);

  const handleEnrollPress = useCallback((course: Course) => {
    const slots = course.course_slots ?? [];
    if (slots.length === 0) {
      if (course.lecturer_id) {
        handleDoEnroll(course.id, null, course.lecturer_id);
      } else {
        Alert.alert("Error", "No available slots for enrollment");
      }
      return;
    }
    if (slots.length === 1) {
      const s = slots[0];
      handleDoEnroll(course.id, s.slot, s.lecturer_id);
      return;
    }
    setSlotModalCourse(course);
  }, []);

  const handleDoEnroll = useCallback(
    async (courseId: string, slot: string | null, lecturerId?: string) => {
      setEnrollingIds((prev) => new Set(prev).add(courseId));
      try {
        await enroll(courseId, slot, lecturerId);
        Alert.alert("Success", "You are enrolled in the course!");
      } catch (err: any) {
        Alert.alert("Error", err.message);
      } finally {
        setEnrollingIds((prev) => {
          const n = new Set(prev);
          n.delete(courseId);
          return n;
        });
      }
    },
    [enroll],
  );

  const handleSlotConfirm = useCallback(
    (slot: string, lecturerId?: string) => {
      const courseId = slotModalCourse?.id;
      setSlotModalCourse(null);
      if (courseId) handleDoEnroll(courseId, slot, lecturerId);
    },
    [slotModalCourse, handleDoEnroll],
  );

  const handleUnenroll = useCallback(
    async (courseId: string) => {
      swipeableRefs.current[courseId]?.close();
      try {
        await unenroll(courseId);
        Alert.alert("Done", "You have unenrolled from the course ??");
      } catch (err: any) {
        Alert.alert("Error", err.message);
      }
    },
    [unenroll],
  );

  const handleProposeConfirm = useCallback(async () => {
    const course = proposeModalCourse;
    if (!course) return;
    const slot = newSlotText.trim();
    if (!slot) {
      Alert.alert("Error", "Please enter the time");
      return;
    }

    setProposeModalCourse(null);
    setProposingIds((prev) => new Set(prev).add(course.id));
    try {
      await proposeSlot(course.id, slot);
      Alert.alert(
        "Done",
        "The proposal has been sent for admin moderation",
      );
      if (role === "admin") await fetchProposals();
    } catch (err: any) {
      Alert.alert("Error", "Failed to send proposal: " + err.message);
    } finally {
      setProposingIds((prev) => {
        const n = new Set(prev);
        n.delete(course.id);
        return n;
      });
    }
  }, [proposeModalCourse, newSlotText, proposeSlot, role, fetchProposals]);

  const handleApproveProposal = useCallback(
    async (proposal: Proposal) => {
      setProcessingProposalIds((prev) => new Set(prev).add(proposal.id));
      try {
        await approveProposal(proposal);
        Alert.alert("Done", "The proposal has been approved and published");
      } catch (err: any) {
        Alert.alert("Error", err.message);
      } finally {
        setProcessingProposalIds((prev) => {
          const n = new Set(prev);
          n.delete(proposal.id);
          return n;
        });
      }
    },
    [approveProposal],
  );

  const handleRejectProposal = useCallback(
    async (proposal: Proposal) => {
      setProcessingProposalIds((prev) => new Set(prev).add(proposal.id));
      try {
        await rejectProposal(proposal.id);
        Alert.alert("Done", "The proposal has been rejected");
      } catch (err: any) {
        Alert.alert("Error", err.message);
      } finally {
        setProcessingProposalIds((prev) => {
          const n = new Set(prev);
          n.delete(proposal.id);
          return n;
        });
      }
    },
    [rejectProposal],
  );

  const openProposalsModal = useCallback(async () => {
    setProposalsModalVisible(true);
    await fetchProposals();
  }, [fetchProposals]);

  // —— render ————————————————————————————————————————————————————————————————

  const renderCourseItem = useCallback(
    ({ item }: { item: Course }) => (
      <CourseCard
        item={item}
        isEnrolled={enrolledCourseIds.has(item.id)}
        isEnrolling={enrollingIds.has(item.id)}
        isProposing={proposingIds.has(item.id)}
        isCurrentLecturer={
          role === "lecturer" && currentUserIdRef.current === item.lecturer_id
        }
        chosenSlot={selectedSlots[item.id]}
        lecturerInfo={
          item.lecturer_id ? lecturersMap[item.lecturer_id] : undefined
        }
        onEnroll={() => handleEnrollPress(item)}
        onUnenroll={() => handleUnenroll(item.id)}
        onManage={() =>
          Alert.alert("Info", "Here you can open the list of course students")
        }
        onPropose={() => {
          setNewSlotText("");
          setProposeModalCourse(item);
        }}
        swipeRef={(ref) => {
          swipeableRefs.current[item.id] = ref;
        }}
      />
    ),
    [
      enrolledCourseIds,
      enrollingIds,
      proposingIds,
      role,
      currentUserIdRef,
      selectedSlots,
      lecturersMap,
      handleEnrollPress,
      handleUnenroll,
    ],
  );

  const isAdmin = role === "admin";

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Courses" isAdmin={false} onSignOut={handleSignOut} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={initialize}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Courses"
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
        onAdminAccess={handleAdminAccess}
        onOpenProposals={openProposalsModal}
      />

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search for courses or lecturers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={styles.clearBtn}>?</Text>
          </TouchableOpacity>
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {suggestions.map((s, i) => (
            <TouchableOpacity key={i} onPress={() => setSearchQuery(s)}>
              <Text style={styles.suggestionItem}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={searchQuery ? filteredCourses : courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={refresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "No results found for your search."
                  : "No courses found."}
              </Text>
            </View>
          }
        />
      )}

      <SlotModal
        course={slotModalCourse}
        onConfirm={handleSlotConfirm}
        onClose={() => setSlotModalCourse(null)}
      />

      <ProposeModal
        course={proposeModalCourse}
        value={newSlotText}
        onChange={setNewSlotText}
        onConfirm={handleProposeConfirm}
        onClose={() => setProposeModalCourse(null)}
      />

      <ProposalsModal
        visible={proposalsModalVisible}
        proposals={proposals}
        lecturersMap={lecturersMap}
        processingIds={processingProposalIds}
        onApprove={handleApproveProposal}
        onReject={handleRejectProposal}
        onClose={() => setProposalsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ——— Header ————————————————————————————————————————————————————————————————

interface HeaderProps {
  title: string;
  isAdmin: boolean;
  onSignOut: () => void;
  onAdminAccess?: () => void;
  onOpenProposals?: () => void;
}
const Header = ({
  title,
  isAdmin,
  onSignOut,
  onAdminAccess,
  onOpenProposals,
}: HeaderProps) => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerButtons}>
      {isAdmin && (
        <>
          <TouchableOpacity
            onPress={onOpenProposals}
            style={[styles.adminBtn, { marginRight: 10 }]}
          >
            <Text style={styles.adminBtnText}>Proposals</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onAdminAccess} style={styles.adminBtn}>
            <Text style={styles.adminBtnText}>Admin</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity onPress={onSignOut} style={styles.logoutBtn}>
        <Text style={styles.logoutBtnText}>Exit</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F7FAFC" 
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: "700", 
    color: "#2D3748",
    letterSpacing: 0.5 
  },
  headerButtons: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  adminBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#2D3748",
    borderRadius: 2,
    marginRight: 8,
  },
  adminBtnText: { 
    color: "#2D3748", 
    fontWeight: "700", 
    fontSize: 12,
    textTransform: "uppercase" 
  },
  logoutBtn: { 
    padding: 5 
  },
  logoutBtnText: { 
    color: "#E53E3E", 
    fontSize: 14, 
    fontWeight: "700" 
  },
  listContent: { 
    padding: 20 
  },
  courseCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 2,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  courseCardEnrolled: { 
    borderLeftWidth: 5, 
    borderLeftColor: "#2D3748" 
  },
  courseInfo: { 
    flex: 1, 
    paddingRight: 12, 
    marginBottom: 16 
  },
  courseTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#1A202C", 
    marginBottom: 8 
  },
  courseDescription: {
    fontSize: 14,
    color: "#718096",
    lineHeight: 20,
    marginBottom: 12,
  },
  lecturerBadge: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  lecturerText: { 
    color: "#2D3748", 
    fontWeight: "700", 
    fontSize: 12,
    textTransform: "uppercase" 
  },
  academicTitle: { 
    color: "#A0AEC0", 
    fontSize: 10, 
    marginTop: 2 
  },
  noLecturerBadge: { 
    backgroundColor: "#FFF5F5",
    borderColor: "#FEB2B2"
  },
  noLecturerText: { 
    color: "#C53030", 
    fontWeight: "700", 
    fontSize: 12 
  },
  slotsPreview: { 
    marginTop: 4 
  },
  slotsLabel: { 
    fontSize: 11, 
    color: "#A0AEC0", 
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6 
  },
  slotsList: { 
    flexDirection: "row", 
    flexWrap: "wrap" 
  },
  slotChip: {
    backgroundColor: "#EDF2F7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
    marginRight: 6,
    marginBottom: 6,
  },
  slotChipText: { 
    color: "#4A5568", 
    fontSize: 12, 
    fontWeight: "700" 
  },
  enrolledSlot: {
    marginTop: 8,
    backgroundColor: "#F0FFF4",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#C6F6D5",
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  enrolledSlotText: { 
    color: "#2F855A", 
    fontSize: 12, 
    fontWeight: "700" 
  },
  swipeHint: { 
    fontSize: 10, 
    color: "#CBD5E0", 
    marginTop: 6,
    fontStyle: 'italic' 
  },
  cardActions: { 
    minWidth: 130, 
    justifyContent: "center" 
  },
  primaryBtn: {
    backgroundColor: "#2D3748",
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  primaryBtnLoading: { 
    opacity: 0.7 
  },
  primaryBtnDisabled: { 
    backgroundColor: "#E2E8F0" 
  },
  primaryBtnText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1 
  },
  enrolledActions: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  unenrollBtn: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#CBD5E0",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  unenrollBtnText: { 
    color: "#A0AEC0", 
    fontWeight: "700", 
    fontSize: 12 
  },
  swipeAction: { 
    justifyContent: "center", 
    marginBottom: 20 
  },
  swipeDeleteBtn: {
    backgroundColor: "#E53E3E",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 2,
    paddingHorizontal: 10,
    flex: 1,
  },
  swipeDeleteIcon: { 
    fontSize: 20, 
    marginBottom: 4, 
    color: '#fff' 
  },
  swipeDeleteText: { 
    color: "#fff", 
    fontSize: 11, 
    fontWeight: "700",
    textTransform: "uppercase" 
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: { 
    textAlign: "center", 
    color: "#718096", 
    fontSize: 16,
    fontWeight: "600" 
  },
  emptySubtext: {
    textAlign: "center",
    color: "#A0AEC0",
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26, 32, 44, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A202C",
    marginBottom: 6,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginBottom: 20,
  },
  modalSectionLabel: { 
    marginTop: 16, 
    fontWeight: "700", 
    color: "#4A5568",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 8 
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 2,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
    color: "#2D3748",
  },
  slotOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  slotOptionText: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "#2D3748" 
  },
  slotOptionArrow: { 
    fontSize: 18, 
    color: "#A0AEC0" 
  },
  cancelBtn: {
    padding: 14,
    alignItems: "center",
    backgroundColor: "transparent",
    marginTop: 8,
  },
  cancelBtnText: { 
    fontWeight: "700", 
    color: "#E53E3E",
    textTransform: "uppercase",
    letterSpacing: 1 
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 15,
    color: "#E53E3E",
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: "#2D3748",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 2,
  },
  retryBtnText: { 
    color: "#fff", 
    fontWeight: "700" 
  },
  proposalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  proposalSlot: { 
    fontWeight: "700", 
    fontSize: 16, 
    color: "#2D3748",
    marginBottom: 4 
  },
  proposalDetails: { 
    marginTop: 4, 
    marginBottom: 4 
  },
  proposalText: { 
    color: "#718096", 
    fontSize: 13, 
    marginBottom: 2 
  },
  proposalStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  statusText: { 
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase" 
  },
  statusPending: { color: "#D69E2E" },
  statusApproved: { color: "#38A169" },
  statusRejected: { color: "#E53E3E" },
  proposalActions: { 
    flexDirection: "row", 
    marginTop: 10 
  },
  approveBtn: {
    backgroundColor: "#38A169",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 2,
    marginRight: 8,
  },
  approveBtnText: { 
    color: "#fff", 
    fontWeight: "700",
    fontSize: 12 
  },
  rejectBtn: {
    backgroundColor: "#E53E3E",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 2,
  },
  rejectBtnText: { 
    color: "#fff", 
    fontWeight: "700",
    fontSize: 12 
  },
  disabledBtn: { 
    opacity: 0.6 
  },
  emptyProposalsText: { 
    textAlign: "center", 
    marginTop: 20, 
    color: "#A0AEC0" 
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 2,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#2D3748",
  },
  clearBtn: {
    fontSize: 16,
    color: "#A0AEC0",
    paddingHorizontal: 8,
  },
  suggestionsBox: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#E2E8F0",
    borderRadius: 2,
    marginTop: 0,
    paddingVertical: 5,
  },
  suggestionItem: {
    padding: 12,
    fontSize: 14,
    color: "#4A5568",
    borderBottomWidth: 1,
    borderBottomColor: "#F7FAFC",
  },
});