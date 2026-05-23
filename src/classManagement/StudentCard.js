import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { getData, storeData } from '../Utility'

export default function StudentCard(props) {
  const { student } = props
  const navigation = useNavigation()
  const onPress = async () => {
    console.log(`You pressed ${student.studentCode}`)
    await storeData('currentStudentId', student.id.toString())
    await storeData('currentStudentCode', student.studentCode)
    await storeData('currentStudentName', student.name)
    await storeData('currentStudentNumberOfAbsent', student.numberOfAbsent.toString())
    await storeData('currentStudentNumberOfPresent', student.numberOfPresent.toString())
    console.log('currentStudentId: ' + await getData('currentStudentId'))
    navigation.navigate('StudentDetail', { studentCode: student.studentCode })
  }
  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <View style={styles.studentInfoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.studentCodeLabel}>Mã sinh viên:</Text>
            <Text style={styles.studentCodeValue}>{student.studentCode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.nameLabel}>Họ tên:</Text>
            <Text style={styles.nameValue}>{student.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.absentLabel}>Số buổi vắng:</Text>
            <Text style={styles.absentValue}>{student.numberOfAbsent}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.presentLabel}>Số buổi đi:</Text>
            <Text style={styles.presentValue}>{student.numberOfPresent}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 10,
        paddingTop: 10,
        paddingBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#00ff99',
        borderRadius: 10,
    },
    studentInfoContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
    },
    studentCodeLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    studentCodeValue: {
        fontSize: 16,
    },
    nameLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    nameValue: {
        fontSize: 16,
    },
    absentLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    absentValue: {
        fontSize: 16,
        color: 'red', // Highlight absent value in red
    },
    presentLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    presentValue: {
        fontSize: 16,
        color: 'green', // Highlight present value in green
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Can adjust as needed
    },
});
