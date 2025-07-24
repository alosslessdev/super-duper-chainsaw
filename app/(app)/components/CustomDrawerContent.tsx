import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps} from '@react-navigation/drawer';




export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const userName = 'admin'; // Aquí podrías usar props o contexto para hacerlo dinámico

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Usuario: {userName}</Text>
      </View>

      {props.state.routeNames.length > 0 ? (
        <DrawerItemList {...props} />
      ) : (
        <Text style={styles.noItemsText}>No hay elementos en el menú</Text>
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
