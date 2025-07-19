import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from './components/CustomDrawerContent';

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer drawerContent={(props) => <CustomDrawerContent {...props} />}>
        <Drawer.Screen
          name="settings"
          options={{ drawerItemStyle: { display: 'none' } }}
        />
        <Drawer.Screen
          name="home"
          options={{ drawerLabel: 'home' }}
        />
        <Drawer.Screen
          name="history"
          options={{ drawerLabel: 'Historial' }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
