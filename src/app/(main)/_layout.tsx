import { useLayoutEffect, useState } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Animated, Easing, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { PressableStateCallbackType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalWorkspace } from '@/providers';
import { LedgerProvider, useLedger } from '@/ledger';
import { Action, Card, Icon, type IconName, Notice, Page, palette, Waiting } from '@/components/ui';
import { useReducedMotionPreference } from '@/components/useReducedMotionPreference';

const settingsLink = { name: 'Settings', path: '/settings', icon: 'settings', group: 'Settings' } as const;
const links = [
  { name: 'Overview', path: '/', icon: 'grid', group: 'Workspace' },
  { name: 'Payments', path: '/payments', icon: 'credit-card', group: 'Workspace' },
  { name: 'Arrears', path: '/arrears', icon: 'clock', group: 'Workspace' },
  { name: 'Reports', path: '/reports', icon: 'bar-chart-2', group: 'Workspace' },
  { name: 'Properties', path: '/properties', icon: 'home', group: 'Management' },
  { name: 'Tenants', path: '/tenants', icon: 'users', group: 'Management' },
  { name: 'Leases', path: '/leases', icon: 'file-text', group: 'Management' },
  { name: 'Maintenance', path: '/maintenance', icon: 'tool', group: 'Management' },
  settingsLink,
] as const;
type Link = (typeof links)[number];
type PressState = PressableStateCallbackType & { hovered?: boolean; focused?: boolean };
const primary = links.filter(link => link.path === '/' || link.path === '/payments' || link.path === '/properties');
const secondary = links.filter(link => !primary.some(item => item.path === link.path));
const shell = { paper: '#FAFBF7', divider: '#DDE3DA', hover: '#EBF0E8', active: '#244C3F', text: '#334C41', hint: '#586B60' };
const serif = Platform.select({ web: 'Georgia', ios: 'Georgia', default: 'serif' });
const nativeDriver = Platform.OS !== 'web';
const easeOut = Easing.out(Easing.cubic);
const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={s.brand}>
      <Image source={require('../../../assets/rentfold-mark.png')} accessible={false}
        style={compact ? s.markSmall : s.mark} />
      <Text style={[s.wordmark, compact && s.wordmarkSmall]}>Rentfold</Text>
    </View>
  );
}

function SelectionHighlight({ compact = false }: { compact?: boolean }) {
  const reducedMotion = useReducedMotionPreference();
  const [progress] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  useLayoutEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 160, easing: easeOut, useNativeDriver: nativeDriver, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion]);
  return <Animated.View pointerEvents="none" style={[
    StyleSheet.absoluteFill, compact ? s.tabHighlight : s.navHighlight,
    {
      opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [compact ? 0.4 : 0.92, 1] }),
      transform: [{ scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [compact ? 0.72 : 0.96, 1] }) }],
    },
  ]} />;
}

function NavigationItem({ name, icon, active, onPress, compact = false, expanded }: {
  name: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
  expanded?: boolean;
}) {
  const color = active && !compact ? '#FFFFFF' : active ? shell.active : shell.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name}
      accessibilityState={expanded === undefined ? { selected: active } : { expanded }}
      aria-expanded={expanded} aria-haspopup={Platform.OS === 'web' && expanded !== undefined ? 'dialog' : undefined}
      aria-current={Platform.OS === 'web' && expanded === undefined && active ? 'page' : undefined}
      onPress={onPress} style={({ pressed, hovered, focused }: PressState) => [
        s.nav, compact && s.tab,
        !active && (hovered || pressed) && s.hover,
        focused && s.focus,
        pressed && s.pressed,
      ]}>
      {active && !compact && <SelectionHighlight />}
      <View style={[s.iconBox, compact && s.tabIcon]}>
        {active && compact && <SelectionHighlight compact />}
        <Icon name={icon} size={compact ? 19 : 18} color={color} />
      </View>
      <Text numberOfLines={1} style={[s.navLabel, compact && s.tabLabel, { color, fontWeight: active ? '700' : '500' }]}>{name}</Text>
    </Pressable>
  );
}

function MobileNavigation({ active, onNavigate }: { active?: Link; onNavigate: (path: Link['path']) => void }) {
  const { height } = useWindowDimensions();
  const reducedMotion = useReducedMotionPreference();
  const [menu, setMenu] = useState<'closed' | 'open' | 'closing'>('closed');
  const [progress] = useState(() => new Animated.Value(0));
  const open = menu === 'open';
  useLayoutEffect(() => {
    if (menu === 'closed') {
      progress.setValue(0);
      return;
    }
    if (reducedMotion && open) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0, duration: reducedMotion ? 0 : open ? 210 : 145,
      easing: open ? easeOut : Easing.in(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished && !open) setMenu('closed');
    });
    return () => animation.stop();
  }, [menu, open, progress, reducedMotion]);

  function closeMenu() {
    setMenu(current => current === 'open' ? (reducedMotion ? 'closed' : 'closing') : current);
  }
  function choose(link: Link) {
    if (!open) return;
    closeMenu();
    onNavigate(link.path);
  }
  return <>
    <View style={s.mobileTabs}>
      {primary.map(link => <NavigationItem key={link.path} name={link.name} icon={link.icon} compact
        active={active?.path === link.path} onPress={() => onNavigate(link.path)} />)}
      <NavigationItem name="More" icon="menu" compact expanded={menu !== 'closed'}
        active={menu !== 'closed' || !primary.some(link => link.path === active?.path)} onPress={() => setMenu('open')} />
    </View>
    {menu !== 'closed' && (
      <Modal visible transparent animationType="none" accessibilityLabel="Workspace menu" onRequestClose={closeMenu}>
        <View style={s.scrim}>
          <View accessible={false} onStartShouldSetResponder={() => true}
            onResponderRelease={closeMenu} style={StyleSheet.absoluteFill}>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.backdrop, { opacity: progress }]} />
          </View>
          <AnimatedSafeAreaView edges={['bottom', 'left', 'right']} onAccessibilityEscape={closeMenu}
            style={[s.sheet, { maxHeight: height * 0.87, opacity: progress, transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
            ] }]}>
            <View style={s.sheetHead}>
              <Text accessibilityRole="header" style={s.sheetTitle}>Workspace menu</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={closeMenu}
                style={({ pressed, hovered, focused }: PressState) => [s.dismiss, (pressed || hovered) && s.hover, focused && s.focus]}>
                <Icon name="x" size={19} color={shell.text} />
              </Pressable>
            </View>
            <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheetLinks} keyboardShouldPersistTaps="handled">
              {secondary.map(link => <NavigationItem key={link.path} name={link.name} icon={link.icon}
                active={active?.path === link.path} onPress={() => choose(link)} />)}
            </ScrollView>
          </AnimatedSafeAreaView>
        </View>
      </Modal>
    )}
  </>;
}

function WorkspaceFrame() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { workspace } = useLocalWorkspace();
  const { data, loading, error, refresh } = useLedger();
  const router = useRouter();
  const path = usePathname();
  const active = links.find(link =>
    link.path === '/' ? path === '/' : path === link.path || path.startsWith(link.path + '/')
  );
  const name = workspace === 'demo' ? 'Sample workspace' : 'Personal workspace';
  function go(target: Link['path']) {
    router.navigate(target);
  }
  function nav(link: Link) {
    return <NavigationItem key={link.path} name={link.name} icon={link.icon}
      active={active?.path === link.path} onPress={() => go(link.path)} />;
  }
  const workspaceButton = (
    <Pressable accessibilityRole="button" accessibilityLabel="Workspace settings" onPress={() => go('/settings')}
      style={({ pressed, hovered, focused }: PressState) => [s.workspace, (pressed || hovered) && s.hover, focused && s.focus]}>
      <Icon name={workspace === 'demo' ? 'layers' : 'briefcase'} size={15} color={shell.active} />
      <Text numberOfLines={1} style={s.workspaceName}>{name}</Text>
      <Icon name="chevron-right" size={14} color={shell.hint} />
    </Pressable>
  );
  const hasData = data.properties.length + data.tenants.length + data.leases.length > 0;
  const view = path.endsWith('/statement') ? 'Statement' : path.endsWith('/edit') ? 'Edit' : path.endsWith('/add') ? 'New' : '';
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[s.frame, wide && s.horizontal]}>
        {wide && (
          <View style={s.sidebar}>
            <View style={s.brandRow}><Brand /></View>
            <ScrollView style={s.scrollNav} contentContainerStyle={s.sections} keyboardShouldPersistTaps="handled">
              {(['Workspace', 'Management'] as const).map(group => (
                <View key={group} style={s.navGroup}>
                  <Text style={s.groupName}>{group.toUpperCase()}</Text>
                  {links.filter(link => link.group === group).map(link => nav(link))}
                </View>
              ))}
            </ScrollView>
            <View style={s.sidebarFoot}>
              {nav(settingsLink)}
              <View style={s.local}>
                <View style={s.localDot} />
                <Text style={s.localText}>Stored on this device</Text>
              </View>
            </View>
          </View>
        )}
        <View style={s.main}>
          <View style={[s.topbar, !wide && s.mobileHeader]}>
            {wide ? (
              <View style={s.crumb}>
                <Icon name="sidebar" size={16} color={shell.hint} />
                <Text style={s.crumbBase}>Workspace</Text>
                <Icon name="chevron-right" size={13} color={shell.hint} />
                <Text style={s.crumbCurrent}>{active?.name ?? 'Overview'}</Text>
                {!!view && <>
                  <Icon name="chevron-right" size={13} color={shell.hint} />
                  <Text style={s.crumbCurrent}>{view}</Text>
                </>}
              </View>
            ) : <Brand compact />}
            {workspaceButton}
          </View>
          {error && hasData && <Notice tone="error">{error}</Notice>}
          {loading && !hasData ? (
            <Waiting />
          ) : error && !hasData && path !== '/settings' ? (
            <Page narrow>
              <Card>
                <Notice tone="error">{error}</Notice>
                <Action label="Retry loading workspace" onPress={() => void refresh().catch(() => {})} />
                <Action label="Workspace settings" variant="quiet" onPress={() => go('/settings')} />
              </Card>
            </Page>
          ) : <Slot />}
          {!wide && <MobileNavigation active={active} onNavigate={go} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function MainLayout() {
  return <LedgerProvider><WorkspaceFrame /></LedgerProvider>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: shell.paper },
  frame: { flex: 1, minHeight: 0, backgroundColor: palette.paper },
  horizontal: { flexDirection: 'row' },
  sidebar: { width: 226, flexShrink: 0, minHeight: 0, backgroundColor: shell.paper, borderRightColor: shell.divider, borderRightWidth: 1 },
  brandRow: { paddingLeft: 24, paddingTop: 26, paddingBottom: 28 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  mark: { width: 37, height: 37 }, markSmall: { width: 29, height: 29 },
  wordmark: { fontFamily: serif, fontSize: 31, lineHeight: 38, fontWeight: '700', color: palette.forest, letterSpacing: -1.8 },
  wordmarkSmall: { fontSize: 23, lineHeight: 31, letterSpacing: -1.3 },
  scrollNav: { flex: 1, minHeight: 0 },
  sections: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 16, gap: 26 },
  navGroup: { gap: 3 },
  groupName: { fontSize: 10, lineHeight: 15, fontWeight: '700', letterSpacing: 1.6, color: shell.hint, marginLeft: 13, marginBottom: 7 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  navHighlight: { borderRadius: 7, backgroundColor: shell.active },
  iconBox: { width: 22, height: 24, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 14, lineHeight: 19, flexShrink: 1 },
  hover: { backgroundColor: shell.hover },
  focus: { borderColor: '#67976C' },
  pressed: { opacity: 0.82 },
  sidebarFoot: { borderTopWidth: 1, borderTopColor: shell.divider, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 15, gap: 4 },
  local: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingVertical: 5 },
  localDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#61885A' },
  localText: { fontSize: 12, lineHeight: 18, color: shell.hint },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
  topbar: { minHeight: 58, paddingHorizontal: 34, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: shell.divider,
    backgroundColor: '#FEFFFC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  mobileHeader: { minHeight: 54, paddingHorizontal: 16 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0, flexShrink: 1 },
  crumbBase: { color: shell.hint, fontSize: 13 },
  crumbCurrent: { color: shell.text, fontWeight: '600', fontSize: 13 },
  workspace: { minHeight: 44, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8,
    borderColor: 'transparent', borderWidth: 1, borderRadius: 8 },
  workspaceName: { color: shell.text, flexShrink: 1, fontWeight: '600', fontSize: 12.5 },
  mobileTabs: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 4, borderTopWidth: 1,
    borderTopColor: shell.divider, backgroundColor: '#FEFFFC' },
  tab: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 2, paddingVertical: 2,
    flexDirection: 'column', justifyContent: 'center', gap: 1 },
  tabIcon: { width: 42, height: 25, borderRadius: 9 },
  tabHighlight: { borderRadius: 9, backgroundColor: '#DFEBDD' },
  tabLabel: { fontSize: 11, lineHeight: 16 },
  scrim: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { backgroundColor: 'rgba(17, 40, 30, 0.34)' },
  sheet: { width: '100%', maxWidth: 580, flexShrink: 1, backgroundColor: shell.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 22, paddingRight: 12,
    minHeight: 62, borderBottomWidth: 1, borderBottomColor: shell.divider },
  sheetTitle: { fontFamily: serif, fontSize: 23, fontWeight: '600', letterSpacing: -0.7, color: palette.forest },
  dismiss: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  sheetScroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  sheetLinks: { paddingHorizontal: 12, paddingVertical: 12, gap: 2 },
});
