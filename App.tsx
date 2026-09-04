import 'react-native-gesture-handler';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { InventoryProvider } from './src/context/InventoryContext';
import { colors } from './src/theme';
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import { HomeScreen } from './src/screens/HomeScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { MapScreen } from './src/screens/MapScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ManualBarcodeScreen, LookupScreen } from './src/screens/BarcodeScreens';
import { ProductFormScreen, BatchFormScreen } from './src/screens/FormScreens';
import { ReviewScreen, SuccessScreen } from './src/screens/ReviewScreens';
import { ProductDetailScreen, EditBatchScreen } from './src/screens/ProductDetailScreen';
import { DraftsScreen, SettingsScreen } from './src/screens/UtilityScreens';
import { Warehouse3DScreen } from './src/screens/Warehouse3DScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, React.ComponentProps<typeof Ionicons>['name']> = {
  Inicio: 'home-outline',
  Estoque: 'cube-outline',
  Alertas: 'notifications-outline',
  Mapa: 'map-outline',
};

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarStyle: { height: 66, paddingTop: 6, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: colors.surface },
        tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? tabIcons[route.name].replace('-outline', '') as typeof tabIcons[typeof route.name] : tabIcons[route.name]} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="Inicio" component={HomeScreen} />
      <Tabs.Screen name="Estoque" component={InventoryScreen} />
      <Tabs.Screen name="Alertas" component={AlertsScreen} />
      <Tabs.Screen name="Mapa" component={MapScreen} />
    </Tabs.Navigator>
  );
}

export default function App() {
  return (
    <InventoryProvider>
      <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.brand, card: colors.surface, text: colors.text, border: colors.border } }}>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerTintColor: colors.brandDark, headerTitleStyle: { fontWeight: '800' }, headerShadowVisible: false, headerStyle: { backgroundColor: colors.surface }, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Ler código', headerShown: false }} />
          <Stack.Screen name="ManualBarcode" component={ManualBarcodeScreen} options={{ title: 'Código de barras' }} />
          <Stack.Screen name="Lookup" component={LookupScreen} options={{ title: 'Buscar produto', headerBackVisible: false }} />
          <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Novo produto' }} />
          <Stack.Screen name="BatchForm" component={BatchFormScreen} options={{ title: 'Dados do lote' }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Revisar cadastro' }} />
          <Stack.Screen name="Success" component={SuccessScreen} options={{ title: 'Cadastro salvo', headerBackVisible: false }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Detalhes do produto' }} />
          <Stack.Screen name="EditBatch" component={EditBatchScreen} options={{ title: 'Editar lote' }} />
          <Stack.Screen name="Drafts" component={DraftsScreen} options={{ title: 'Rascunhos' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configurações' }} />
          <Stack.Screen name="Warehouse3D" component={Warehouse3DScreen} options={{ title: 'Estoque 3D' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </InventoryProvider>
  );
}
