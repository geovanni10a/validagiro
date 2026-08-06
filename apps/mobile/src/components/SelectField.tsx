import React, { forwardRef, useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing } from '../theme';
import { Button } from './Button';

interface Option { id: string; name: string; description?: string }
export const SelectField = forwardRef<View, {
  label: string; value: string; options: Option[]; onChange(option: Option): void; error?: string; loading?: boolean; onRetry?(): void;
}>(function SelectField({ label, value, options, onChange, error, loading, onRetry }, ref) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((option) => option.id === value);
  const filtered = useMemo(() => options.filter((option) => option.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))), [options, search]);
  return <View style={styles.group}>
    <Text style={styles.label}>{label} (obrigatório)</Text>
    <Pressable ref={ref} accessibilityRole="button" accessibilityHint={error} onPress={() => setOpen(true)} style={[styles.field, error && styles.fieldError]}>
      <Text style={[styles.value, !selected && styles.placeholder]}>{loading ? 'Carregando…' : selected?.name ?? `Selecionar ${label.toLowerCase()}`}</Text>
    </Pressable>
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    {!loading && options.length === 0 && onRetry ? <Button label="Tentar carregar novamente" variant="secondary" onPress={onRetry} /> : null}
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}><Text accessibilityRole="header" style={styles.modalTitle}>{label}</Text><Button label="Fechar" variant="text" onPress={() => setOpen(false)} /></View>
        <TextInput accessibilityLabel={`Buscar ${label.toLowerCase()}`} placeholder="Buscar" value={search} onChangeText={setSearch} style={styles.search} autoFocus />
        <ScrollView keyboardShouldPersistTaps="handled">
          {filtered.map((option) => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: option.id === value }} style={styles.option} onPress={() => { onChange(option); setOpen(false); setSearch(''); }}>
            <Text style={styles.optionName}>{option.name}</Text>{option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}
          </Pressable>)}
          {!loading && filtered.length === 0 ? <Text style={styles.empty}>Nenhuma opção encontrada.</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </View>;
});

const styles = StyleSheet.create({
  group: { gap: spacing.xs }, label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  field: { minHeight: 50, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, backgroundColor: colors.surface }, fieldError: { borderColor: colors.danger, borderWidth: 2 },
  value: { color: colors.text, fontSize: 16 }, placeholder: { color: '#788596' }, error: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: colors.background, padding: spacing.lg }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { fontSize: 24, color: colors.text, fontWeight: '800' },
  search: { minHeight: 50, marginVertical: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  option: { minHeight: 58, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: spacing.sm }, optionName: { color: colors.text, fontSize: 16, fontWeight: '700' }, optionDescription: { color: colors.muted, fontSize: 14 }, empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl, fontSize: 16 },
});
