import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const ProfileScreen = () => {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://www.bootdey.com/image/900x400/FF7F50/000000' }}
        style={styles.coverImage}
      />
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: 'https://www.bootdey.com/img/Content/avatar/avatar1.png' }}
          style={styles.avatar}
        />
        <Text style={[styles.name, styles.textWithShadow]}>Nguyen Van Nam - 20200421</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>hung2004@gmail.com</Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Địa chỉ:</Text>
          <Text style={styles.infoValue}>Việt Nam</Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Các bộ môn giảng dạy:</Text>
          <Text style={styles.infoValue}>Toán, Lí, Hóa</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  coverImage: {
    height: 200,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    color: 'white'
  },
  content: {
    marginTop: 20,
  },
  infoContainer: {
    marginTop: 20,
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  infoValue: {
    marginTop: 5,
  },
});

export default ProfileScreen;