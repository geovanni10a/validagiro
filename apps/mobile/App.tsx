import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { IntakeProvider } from './src/context/IntakeContext';
import { QueueSyncConsumer } from './src/context/QueueSyncConsumer';
import { StoreProvider } from './src/context/StoreContext';
import { BatchFormScreen } from './src/screens/BatchFormScreen';
import { CameraPermissionScreen, ScannerScreen } from './src/screens/CameraScreens';
import { HomeScreen } from './src/screens/HomeScreen';
import { LookupScreen } from './src/screens/LookupScreen';
import { ManualBarcodeScreen } from './src/screens/ManualBarcodeScreen';
import { ProductFormScreen } from './src/screens/ProductFormScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { ProductConflictScreen, SessionExpiredScreen } from './src/screens/RecoveryScreens';
import { colors } from './src/theme';
import type { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.brand, card: colors.surface, text: colors.text, border: colors.border } };

export default function App() {
  return <SafeAreaProvider>
    <IntakeProvider>
      <StoreProvider>
        <QueueSyncConsumer />
        <NavigationContainer theme={theme}>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerBackTitle: 'Voltar', headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CameraPermission" component={CameraPermissionScreen} options={{ title: 'Câmera' }} />
          <Stack.Screen name="Scanner" component={ScannerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ManualBarcode" component={ManualBarcodeScreen} options={{ title: 'Código de barras' }} />
          <Stack.Screen name="Lookup" component={LookupScreen} options={{ title: 'Buscar produto', headerBackVisible: false }} />
          <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Novo produto' }} />
          <Stack.Screen name="BatchForm" component={BatchFormScreen} options={{ title: 'Dados do lote' }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Revisar cadastro' }} />
          <Stack.Screen name="Result" component={ResultScreen} options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="Queue" component={QueueScreen} options={{ title: 'Pendências' }} />
          <Stack.Screen name="SessionExpired" component={SessionExpiredScreen} options={{ title: 'Sessão expirada', gestureEnabled: false }} />
          <Stack.Screen name="ProductConflict" component={ProductConflictScreen} options={{ title: 'Produto cadastrado' }} />
        </Stack.Navigator>
        </NavigationContainer>
      </StoreProvider>
    </IntakeProvider>
  </SafeAreaProvider>;
}
