import { Text, View } from "react-native";
import CoursesList from "../src/supabase/components/CoursesList";

export default function Index() {
  return (
    <View style={{ padding: 20 }}>
      <Text>Welcome!</Text>
      <CoursesList />
    </View>
  );
}
