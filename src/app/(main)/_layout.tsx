import { useState } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalWorkspace } from '@/providers';
import { LedgerProvider, useLedger } from '@/ledger';
import { Action, Card, Icon, type IconName, Notice, Page, palette, Waiting } from '@/components/ui';

const links = [
  { name: 'Overview', path: '/', icon: 'grid' },
  { name: 'Properties', path: '/properties', icon: 'home' },
  { name: 'Tenants', path: '/tenants', icon: 'users' },
  { name: 'Leases', path: '/leases', icon: 'file-text' },
  { name: 'Payments', path: '/payments', icon: 'credit-card' },
  { name: 'Maintenance', path: '/maintenance', icon: 'tool' },
  { name: 'Reports', path: '/reports', icon: 'bar-chart-2' },
  { name: 'Settings', path: '/settings', icon: 'settings' },
] as const;
function WorkspaceFrame() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { workspace } = useLocalWorkspace();
  const isDemo = workspace === 'demo';
  const { data, loading, error, refresh } = useLedger();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const active = links.find((x) =>
    x.path === '/' ? path === '/' : path === x.path || path.startsWith(x.path + '/')
  );
  const name = isDemo ? 'Sample workspace' : 'Personal workspace';
  function go(target: (typeof links)[number]['path']) {
    setMenu(false);
    router.navigate(target);
  }
  function navLink(
    label: string,
    icon: IconName,
    selected: boolean,
    press: () => void,
    compact = false
  ) {
    const color = compact
      ? selected
        ? palette.forest
        : palette.muted
      : selected
        ? palette.ink
        : '#D1E1D8';
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={press}
        style={({ pressed }) => ({
          minHeight: compact ? 54 : 45,
          flex: compact ? 1 : undefined,
          flexDirection: compact ? 'column' : 'row',
          gap: compact ? 3 : 12,
          alignItems: 'center',
          justifyContent: compact ? 'center' : 'flex-start',
          borderRadius: 8,
          paddingHorizontal: compact ? 2 : 13,
          backgroundColor: compact
            ? selected
              ? '#E8F1E4'
              : 'transparent'
            : selected
              ? palette.mint
              : pressed
                ? '#2B5146'
                : 'transparent',
        })}
      >
        <Icon name={icon} size={compact ? 18 : 17} color={color} />
        <Text style={{ color, fontWeight: selected ? '700' : '500', fontSize: compact ? 11 : 14 }}>
          {label}
        </Text>
      </Pressable>
    );
  }
  const brand = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.mint,
          borderRadius: 9,
        }}
      >
        <Icon name="home" size={20} />
      </View>
      <Text style={{ fontSize: 19, color: '#FFF', fontWeight: '700', letterSpacing: -0.65 }}>
        Rent Manager
      </Text>
    </View>
  );
  const primary = links.filter(
    (x) => x.path === '/' || x.path === '/properties' || x.path === '/payments'
  );
  const hasData = data.properties.length + data.tenants.length + data.leases.length > 0;
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: wide ? palette.forest : palette.paper }}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View
        style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: palette.paper }}
      >
        {wide ? (
          <View
            style={{
              width: 212,
              backgroundColor: palette.forest,
              paddingHorizontal: 16,
              paddingTop: 32,
              paddingBottom: 24,
              gap: 30,
            }}
          >
            <View style={{ paddingHorizontal: 8 }}>{brand}</View>
            <View style={{ gap: 4, flex: 1 }}>
              {links.map((x) => navLink(x.name, x.icon, active?.path === x.path, () => go(x.path)))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Workspace settings"
              onPress={() => go('/settings')}
              style={{ borderTopWidth: 1, borderColor: '#3C5B50', paddingTop: 18, gap: 6 }}
            >
              <Text style={{ color: '#B5C8BC', fontSize: 12 }}>Saved locally</Text>
              <Text numberOfLines={1} style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>
                {name}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: palette.forest,
              paddingVertical: 10,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {brand}
            <Text style={{ color: palette.mint, fontSize: 12 }}>{name}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          {error && hasData && <Notice tone="error">{error}</Notice>}
          {loading && !hasData ? (
            <Waiting />
          ) : error && !hasData && path !== '/settings' ? (
            <Page narrow>
              <Card>
                <Notice tone="error">{error}</Notice>
                <Action
                  label="Retry loading workspace"
                  onPress={() => void refresh().catch(() => {})}
                />
                <Action label="Workspace settings" variant="quiet" onPress={() => go('/settings')} />
              </Card>
            </Page>
          ) : (
            <Slot />
          )}
        </View>
        {!wide && (
          <View
            style={{
              borderTopWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.surface,
            }}
          >
            {menu && (
              <View style={{ backgroundColor: palette.forest, padding: 12, gap: 2 }}>
                {links
                  .filter((x) => !primary.some((p) => p.path === x.path))
                  .map((x) => navLink(x.name, x.icon, active?.path === x.path, () => go(x.path)))}
              </View>
            )}
            <View style={{ flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 3 }}>
              {primary.map((x) =>
                navLink(x.name, x.icon, !menu && active?.path === x.path, () => go(x.path), true)
              )}
              {navLink(
                menu ? 'Close' : 'More',
                menu ? 'x' : 'menu',
                menu || !primary.some((x) => x.path === active?.path),
                () => setMenu((v) => !v),
                true
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
export default function MainLayout() {
  return (
    <LedgerProvider>
      <WorkspaceFrame />
    </LedgerProvider>
  );
}
