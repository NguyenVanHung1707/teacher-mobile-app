import {View, Text, useColorScheme} from 'react-native';
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {getThemeColors} from './Utility';
import ClassManagement from './classManagement/ClassManagement';
import ClassDetail from './classManagement/ClassDetail';
import {createStackNavigator} from '@react-navigation/stack';
import StudentDetail from './classManagement/StudentDetail';
import ProfileScreen from './ProfileScreen';
import AddFormScreen from './classManagement/AddFormScreen';
import ClassDiscussion from './classManagement/ClassDiscussion';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import the icon library
import HomePage from './HomePage';
import ManagePermissions from './classManagement/ManagePermissions';
import TimetableScreen from './classManagement/TimetableScreen'; // Import TimetableScreen
import GradeSubmissionsListScreen from './classManagement/GradeSubmissionsListScreen';
import GradeAssessmentScreen from './classManagement/GradeAssessmentScreen';
import CreateAssessmentScreen from './classManagement/CreateAssessmentScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeScreen = () => {
  return <HomePage />;
};

const ClassManagementStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ClassManagement"
        component={ClassManagement}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ClassDetail"
        component={ClassDetail}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="StudentDetail"
        component={StudentDetail}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AddFormScreen"
        component={AddFormScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ClassDiscussion"
        component={ClassDiscussion}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ManagePermissions"
        component={ManagePermissions}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="GradeSubmissionsList"
        component={GradeSubmissionsListScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="GradeAssessment"
        component={GradeAssessmentScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="CreateAssessment"
        component={CreateAssessmentScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

export default function MainPage() {
  const isDark = useColorScheme() === 'dark';
  const theme = getThemeColors(isDark);

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'qrcode';
          } else if (route.name === 'Lớp học') {
            iconName = 'university';
          } else if (route.name === 'Lịch dạy') {
            iconName = 'calendar';
          } else if (route.name === 'Hồ sơ') {
            iconName = 'user';
          }

          return <Icon name={iconName} size={focused ? size + 2 : size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          paddingBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 62,
          paddingTop: 6,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -3},
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        headerStyle: {
          backgroundColor: theme.card,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 1},
          shadowOpacity: 0.05,
          shadowRadius: 3,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTitleStyle: {
          color: theme.text,
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: 0.5,
        },
      })}>
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Lớp học" component={ClassManagementStack} />
      <Tab.Screen name="Lịch dạy" component={TimetableScreen} options={{headerShown: false}} />
      <Tab.Screen name="Hồ sơ" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

