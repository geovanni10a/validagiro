import type { NavigationProp } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import type { RootStackParamList } from '../types';

export function useDraftExitGuard({
  navigation, shouldGuard, save, discard,
}: {
  navigation: NavigationProp<RootStackParamList>;
  shouldGuard: boolean;
  save(): Promise<void>;
  discard(): Promise<void>;
}) {
  const skip = useRef(false);
  const callbacks = useRef({ save, discard });
  callbacks.current = { save, discard };

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (!shouldGuard || skip.current) { skip.current = false; return; }
    event.preventDefault();
    Alert.alert('Salvar como rascunho?', 'Você alterou este cadastro. Escolha o que fazer antes de sair.', [
      { text: 'Continuar preenchendo', style: 'cancel' },
      {
        text: 'Descartar alterações', style: 'destructive', onPress: () => void (async () => {
          await callbacks.current.discard(); skip.current = true; navigation.dispatch(event.data.action);
        })(),
      },
      {
        text: 'Salvar rascunho', onPress: () => void (async () => {
          await callbacks.current.save(); skip.current = true; navigation.dispatch(event.data.action);
        })(),
      },
    ]);
  }), [navigation, shouldGuard]);

  return {
    leaveAfter: async (work: () => Promise<void>, navigate: () => void) => {
      await work(); skip.current = true; navigate();
    },
  };
}
