import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { state, ...rest } = props;

  // Verificar si 'state' y 'state.routes' están definidos
  const routes = state?.routes || [];
  const routeNames = state?.routeNames || [];

  // Filtrar las rutas para mostrar solo 'history'
  const filteredRoutes = routes.filter((r) => r.name === 'history');
  const filteredRouteNames = routeNames.filter((name) => name === 'history');

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Usuario: admin</Text>
      </View>
      {/* Renderizar solo si existen rutas filtradas */}
      {filteredRoutes.length > 0 && filteredRouteNames.length > 0 ? (
        <DrawerItemList state={{ ...state, routes: filteredRoutes, routeNames: filteredRouteNames }} {...rest} />
      ) : (
        <Text style={styles.noItemsText}>No hay elementos disponibles</Text>
      )}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: '#f4f4f4',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerText: {
    fontSize: 18,
 fontWeight: 'bold',
  },
  noItemsText: {
    padding: 20,
    textAlign: 'center',
    color: '#888',
  },
});
