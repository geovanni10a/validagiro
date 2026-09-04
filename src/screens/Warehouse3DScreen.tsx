import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Button, Card, HeaderCopy, Screen } from '../components/ui';
import { useInventory } from '../context/InventoryContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

export function Warehouse3DScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Warehouse3D'>) {
  const { serverUrl } = useInventory();
  const [failed, setFailed] = useState(false);
  if (!serverUrl) {
    return (
      <Screen>
        <HeaderCopy title="Estoque 3D" description="O mapa 3D é servido pelo computador principal para funcionar igual em celulares e PCs." />
        <Card style={styles.center}>
          <View style={styles.icon}><Ionicons name="desktop-outline" size={38} color={colors.brand} /></View>
          <Text style={styles.title}>Configure o servidor</Text>
          <Text style={styles.text}>Inicie o servidor no computador e informe o endereço em Configurações.</Text>
          <Button label="Abrir configurações" onPress={() => navigation.navigate('Settings')} />
        </Card>
      </Screen>
    );
  }
  if (failed) {
    return (
      <Screen>
        <HeaderCopy title="Servidor indisponível" description={`Não foi possível abrir ${serverUrl}. Verifique se o computador está ligado e na mesma rede.`} />
        <Button label="Tentar novamente" onPress={() => setFailed(false)} />
        <Button label="Alterar servidor" variant="secondary" onPress={() => navigation.navigate('Settings')} />
      </Screen>
    );
  }
  return (
    <View style={styles.webPage}>
      <WebView
        source={{ uri: `${serverUrl}/?embed=1` }}
        onError={() => setFailed(true)}
        startInLoadingState
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webPage: { flex: 1, backgroundColor: '#07101F' },
  center: { alignItems: 'center' },
  icon: { width: 72, height: 72, borderRadius: 22, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  text: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
