import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeLedgerStore } from './workspace';

export const modifyLocalLedger = createNativeLedgerStore(AsyncStorage);
