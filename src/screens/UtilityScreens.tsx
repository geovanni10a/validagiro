import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, FormField, HeaderCopy, Screen } from '../components/ui';
import { useInventory } from '../context/InventoryContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import type { Product, ProductInput } from '../types';

export function DraftsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Drafts'>) {
  const { drafts, deleteDraft } = useInventory();
  const resume = (draft: (typeof drafts)[number]) => {
    const product = draft.product;
    if (!product?.barcode || !product.name || !product.categoryId || !product.categoryName || !product.unitOfMeasure) {
      Alert.alert('Rascunho incompleto', 'Este rascunho não possui os dados mínimos para continuar.');
      return;
    }
    navigation.navigate('BatchForm', { product: product as Product | ProductInput, isNew: !('id' in product), draft });
  };
  const remove = (id: string) => Alert.alert('Excluir rascunho?', 'Os dados preenchidos neste rascunho serão perdidos.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: () => void deleteDraft(id) },
  ]);
  return (
    <Screen>
      <HeaderCopy title="Rascunhos" description="Continue de onde parou ou descarte cadastros incompletos." />
      {!drafts.length ? <EmptyState icon="document-text-outline" title="Nenhum rascunho" description="Todos os cadastros iniciados foram salvos ou descartados." /> : drafts.map((draft) => (
        <Card key={draft.id}>
          <View style={styles.row}><View style={styles.draftIcon}><Ionicons name="document-text-outline" size={24} color={colors.warning} /></View><View style={styles.flex}><Text style={styles.title}>{draft.product?.name || 'Produto em cadastro'}</Text><Text style={styles.meta}>Código {draft.barcode}</Text><Text style={styles.meta}>Atualizado em {new Date(draft.updatedAt).toLocaleString('pt-BR')}</Text></View></View>
          <View style={styles.actions}><View style={styles.flex}><Button label="Continuar" onPress={() => resume(draft)} /></View><View style={styles.flex}><Button label="Excluir" variant="secondary" onPress={() => remove(draft.id)} /></View></View>
        </Card>
      ))}
    </Screen>
  );
}

export function SettingsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Settings'>) {
  const { inventory, drafts, clearAll, serverUrl, setServerUrl, syncNow, syncing, lastSync, syncError } = useInventory();
  const [serverInput, setServerInput] = useState(serverUrl);
  useEffect(() => setServerInput(serverUrl), [serverUrl]);

  const connect = async () => {
    try {
      await setServerUrl(serverInput);
      Alert.alert('Servidor salvo', 'Toque em Sincronizar agora para testar a conexão.');
    } catch (cause) {
      Alert.alert('Endereço inválido', cause instanceof Error ? cause.message : 'Confira o endereço informado.');
    }
  };
  const sync = async () => {
    try {
      const result = await syncNow();
      Alert.alert('Sincronização concluída', `${result.downloadedProducts} produtos e ${result.downloadedBatches} lotes disponíveis.`);
    } catch (cause) {
      Alert.alert('Falha na sincronização', cause instanceof Error ? cause.message : 'Confira a rede e tente novamente.');
    }
  };
  const clear = () => Alert.alert('Apagar todos os dados?', 'Produtos, lotes e rascunhos serão removidos permanentemente deste aparelho.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar tudo', style: 'destructive', onPress: async () => { await clearAll(); navigation.goBack(); } },
  ]);
  return (
    <Screen>
      <HeaderCopy title="Configurações" description="O ValidaGiro funciona offline e mantém os dados neste aparelho." />
      <Card>
        <View style={styles.aboutIcon}><Ionicons name="shield-checkmark" size={34} color={colors.brand} /></View>
        <Text style={styles.title}>Seus dados ficam locais</Text>
        <Text style={styles.body}>Nenhum cadastro é enviado para servidores. Faça backup do aparelho para reduzir o risco de perda.</Text>
      </Card>
      <Card>
        <Text style={styles.section}>Sincronização entre aparelhos</Text>
        <Text style={styles.body}>Informe o endereço mostrado pelo servidor no computador principal. Todos os aparelhos devem usar o mesmo endereço.</Text>
        <FormField label="Endereço do servidor" placeholder="http://192.168.1.10:3333" value={serverInput} onChangeText={setServerInput} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Button label="Salvar endereço" variant="secondary" icon="save-outline" onPress={() => void connect()} />
        <Button label={syncing ? 'Sincronizando…' : 'Sincronizar agora'} icon="sync-outline" loading={syncing} disabled={!serverUrl} onPress={() => void sync()} />
        {lastSync ? <Text style={styles.successText}>Última sincronização: {new Date(lastSync.syncedAt).toLocaleString('pt-BR')}</Text> : null}
        {syncError ? <Text style={styles.errorText}>{syncError}</Text> : null}
      </Card>
      <Card>
        <Text style={styles.section}>Resumo</Text>
        <View style={styles.metric}><Text style={styles.meta}>Lotes cadastrados</Text><Text style={styles.metricValue}>{inventory.length}</Text></View>
        <View style={styles.metric}><Text style={styles.meta}>Rascunhos</Text><Text style={styles.metricValue}>{drafts.length}</Text></View>
      </Card>
      <Card>
        <Text style={styles.section}>Sobre</Text>
        <Text style={styles.body}>ValidaGiro 1.0.0</Text>
        <Text style={styles.meta}>Controle de estoque, validade e localização.</Text>
      </Card>
      <Button label="Apagar todos os dados" icon="trash-outline" variant="danger" onPress={clear} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  draftIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8 },
  aboutIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  section: { color: colors.text, fontSize: 18, fontWeight: '900' },
  metric: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  metricValue: { color: colors.brandDark, fontSize: 19, fontWeight: '900' },
  successText: { color: colors.success, fontSize: 13, fontWeight: '700' },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
});
