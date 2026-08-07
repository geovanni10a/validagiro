import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef } from 'react';
import { reconcileDraft } from '../data/sync';
import { useIntake } from './IntakeContext';

export function QueueSyncConsumer() {
  const { ready, drafts, saveDraft } = useIntake();
  const running = useRef(false);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const drain = useCallback((connected: boolean | null) => {
    if (!ready || connected === false || running.current) return;
    const pending = draftsRef.current.filter((draft) => draft.status === 'PENDING' || draft.status === 'SYNCING');
    if (!pending.length) return;
    running.current = true;
    void (async () => {
      try {
        for (const draft of pending) await reconcileDraft(draft, saveDraft);
      } finally { running.current = false; }
    })();
  }, [ready, saveDraft]);

  useEffect(() => {
    const subscription = NetInfo.addEventListener((state) => drain(state.isConnected));
    void NetInfo.fetch().then((state) => drain(state.isConnected));
    return () => subscription();
  }, [drain]);

  useEffect(() => {
    if (drafts.some((draft) => draft.status === 'PENDING' || draft.status === 'SYNCING')) {
      void NetInfo.fetch().then((state) => drain(state.isConnected));
    }
  }, [drafts, drain]);
  return null;
}
