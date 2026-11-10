import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider, useStore } from './src/store';
import { COLORS } from './src/config';
import CatalogScreen from './src/screens/CatalogScreen';
import ProductScreen from './src/screens/ProductScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import LoginScreen from './src/screens/LoginScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const icon = (e) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

function Tabs() {
  const { cart } = useStore();
  const n = cart.reduce((s, i) => s + i.cantidad, 0);
  return (
    <Tab.Navigator screenOptions={{ headerStyle: { backgroundColor: COLORS.blue }, headerTintColor: '#fff', tabBarActiveTintColor: COLORS.brand }}>
      <Tab.Screen name="Catálogo" component={CatalogScreen} options={{ tabBarIcon: icon('🃏') }} />
      <Tab.Screen name="Deseos" component={WishlistScreen} options={{ tabBarIcon: icon('♥') }} />
      <Tab.Screen name="Carrito" component={CartScreen} options={{ tabBarIcon: icon('🛒'), tabBarBadge: n > 0 ? n : undefined }} />
      <Tab.Screen name="Pedidos" component={OrdersScreen} options={{ tabBarIcon: icon('📦') }} />
      <Tab.Screen name="Cuenta" component={LoginScreen} options={{ tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { ready } = useStore();
  if (!ready) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.brand} />;
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: COLORS.blue }, headerTintColor: '#fff' }}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Producto" component={ProductScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Finalizar compra' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <Root />
    </StoreProvider>
  );
}
