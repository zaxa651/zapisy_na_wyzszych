import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#020617", // ??? ?????? (Slate 950), ????? ??? ????????? ??????????
          borderTopWidth: 1,
          borderTopColor: "#1E293B",
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 12,
        },
        // --- ????? ---
        tabBarActiveTintColor: "#818CF8",   // ????? ???????? ?????? (????????)
        tabBarInactiveTintColor: "#F8FAFC", // ????? ????? (??????????) — ?????? ????? ?? ?????????
        
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "900",
          textTransform: "uppercase",
          letterSpacing: 1.2,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Courses",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "grid" : "grid-outline"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="lecturers"
        options={{
          title: "Faculty",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "school" : "school-outline"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person-circle" : "person-circle-outline"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="lecturer/[id]"
        options={{ href: null }}
      />
    </Tabs>
  );
}