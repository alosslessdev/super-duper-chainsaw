import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomDrawerContent from './components/CustomDrawerContent';

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{ headerShown: false }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: 'Inicio',
            headerShown: true,
          }}
        />
        <Drawer.Screen
          name="history"
          options={{
            drawerLabel: 'Historial',
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="analogClock"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="Formulario"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="components/CustomDrawerContent"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}




/*<GestureHandlerRootView style={{ flex: 1 }}>
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
</GestureHandlerRootView>*/



/*<Stack>
<Stack.Screen name = "app2" options={{headerShown : false }}/>
<Stack.Screen name = "home" options={{headerShown : false }}/>
<Stack.Screen name = "history" options={{headerShown : false }}/>
<Stack.Screen name = "setting" options={{headerShown : false }}/>
</Stack>*/