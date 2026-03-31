import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function UploadAvatarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Экран загрузки аватара</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
    color: '#333',
  },
});