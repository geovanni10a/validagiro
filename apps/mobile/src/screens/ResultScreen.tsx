import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ActionBar, Card, HeaderCopy, Screen } from '../components/Layout';
import { useIntake } from '../context/IntakeContext';
import { formatDate } from '../lib/format';
import { colors } from '../theme';
import type { RootStackParamList } from '../types';

export function ResultScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Result'>) {
  const { current, clearCurrent } = useIntake(); if (!current?.batch) return null;
  const offline = route.params.offline && current.status !== 'SENT';
  const product = current.existingProduct ?? current.product;
  const goNext = () => { clearCurrent(); navigation.popTo('Home'); navigation.navigate('CameraPermission'); };
  return <Screen footer={<ActionBar primaryLabel="Ler próximo item" onPrimary={goNext} secondaryLabel={offline ? 'Ver pendências' : 'Voltar ao início'} onSecondary={() => { clearCurrent(); if (offline) navigation.replace('Queue'); else navigation.popTo('Home'); }} />}>
    <Text accessibilityElementsHidden style={[styles.icon, offline && styles.offlineIcon]}>{offline ? '☁' : '✓'}</Text>
    <HeaderCopy title={offline ? 'Salvo no aparelho' : 'Cadastro enviado'} description={offline ? 'Este cadastro ainda não aparece no site. Enviaremos quando a conexão voltar.' : 'O lote já foi registrado e pode aparecer no site.'} />
    <Card><Text style={styles.product}>{product?.name ?? 'Produto novo'}</Text><Text style={styles.summary}>{current.batch.quantity} unidades · validade {formatDate(current.batch.expiryDate)}</Text><Text style={styles.summary}>{current.batch.locationName}</Text></Card>
  </Screen>;
}

const styles = StyleSheet.create({ icon: { alignSelf: 'center', marginTop: 32, width: 78, height: 78, borderRadius: 39, backgroundColor: colors.successBg, color: colors.success, textAlign: 'center', textAlignVertical: 'center', fontSize: 42, fontWeight: '900' }, offlineIcon: { backgroundColor: colors.warningBg, color: colors.warning }, product: { color: colors.text, fontSize: 20, fontWeight: '800' }, summary: { color: colors.muted, fontSize: 16, lineHeight: 23 } });
