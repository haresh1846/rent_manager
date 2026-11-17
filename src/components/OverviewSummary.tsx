import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { displayFont, Icon, palette, styles, type ControlState, type IconName } from './ui';
import { money } from './portfolio';
import { CollectionFill } from './CollectionFill';

const forest = '#134033';

export function OverviewSummary({
  collected,
  due,
  period,
}: {
  collected: number;
  due: number;
  period: string;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 630;
  const pct = due ? Math.min(100, Math.round((100 * collected) / due)) : 0;
  const amount = money(collected);
  const wideAmount = compact && (amount.length > 9 || money(due).length > 12);
  return (
    <View style={[css.hero, { minHeight: compact ? 208 : 222 }]}>
      <View pointerEvents="none" style={[css.art, { width: wideAmount ? '32%' : compact ? '53%' : '55%' }]}>
        <Image
          source={require('../../assets/portfolio-street.jpg')}
          accessible={false}
          resizeMode="cover"
          style={[
            StyleSheet.absoluteFill,
            { height: '100%', width: '100%', opacity: compact ? 0.78 : 0.93 },
          ]}
        />
        <View style={css.fade} />
      </View>
      <View
        style={[
          css.heroBody,
          {
            width: wideAmount ? '74%' : compact ? '57%' : '50%',
            paddingHorizontal: compact ? 18 : 30,
            paddingVertical: compact ? 18 : 24,
          },
        ]}
      >
        <View style={css.eyebrow}>
          <Icon name="credit-card" size={14} color="#D9E8C9" />
          <Text style={css.kicker}>Rent collected</Text>
        </View>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          numberOfLines={1}
          style={[
            css.amount,
            { fontSize: compact ? Math.min(39, 335 / amount.length) : amount.length > 11 ? 44 : 58 },
          ]}
        >
          {amount}
        </Text>
        <Text style={css.billed}>of {money(due)} billed</Text>
        <View
          style={css.meter}
          accessibilityRole="progressbar"
          accessibilityLabel="Rent collection"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={due ? `${pct}% collected, ${amount} of ${money(due)}` : 'No rent billed yet'}
        >
          <CollectionFill style={css.fill} percent={pct} />
        </View>
        <Text style={css.percent}>{due ? pct + '% collected' : 'No rent billed yet'}</Text>
      </View>
      <View style={[css.period, compact && css.periodCompact]}>
        <Icon name="calendar" size={12} color="#E1ECD8" />
        <Text style={css.periodText}>{period}</Text>
      </View>
    </View>
  );
}

type Tile = {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  color: string;
  tint: string;
  onPress: () => void;
};
export function PortfolioTiles({ tiles }: { tiles: Tile[] }) {
  const { width } = useWindowDimensions();
  const compact = width < 740;
  return (
    <View style={css.tiles}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.label}
          accessibilityRole="button"
          accessibilityLabel={tile.label + ', ' + tile.value + ', ' + tile.detail}
          onPress={tile.onPress}
          style={({ pressed, hovered, focused }: ControlState) => [
            css.tile,
            { flexBasis: compact ? '46%' : 0, backgroundColor: hovered ? '#F7FAF5' : '#FFFFFF' },
            focused && styles.controlFocus,
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={css.tileHead}>
            <View style={[css.badge, { backgroundColor: tile.tint }]}>
              <Icon name={tile.icon} size={16} color={tile.color} />
            </View>
            {compact ? (
              <Text style={[css.tileLabel, { flex: 1 }]}>{tile.label}</Text>
            ) : (
              <Icon name="arrow-up-right" size={14} color="#748479" />
            )}
          </View>
          {!compact && <Text style={css.tileLabel}>{tile.label}</Text>}
          <Text style={[css.tileValue, compact && { fontSize: tile.value.length > 10 ? 17 : 25 }]}>
            {tile.value}
          </Text>
          <Text style={css.tileDetail}>{tile.detail}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const css = StyleSheet.create({
  hero: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: forest,
    justifyContent: 'center',
  },
  art: { position: 'absolute', right: 0, top: 0, height: '100%' },
  fade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '32%',
    backgroundImage: 'linear-gradient(to right, #134033, rgba(19,64,51,0))',
  },
  heroBody: { maxWidth: 530, justifyContent: 'center' },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { fontWeight: '600', color: '#EBF2E4', fontSize: 14 },
  amount: {
    color: '#FEFCED',
    fontFamily: displayFont,
    letterSpacing: -1.9,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  billed: { color: '#DAE7D3', fontSize: 14, lineHeight: 20, marginTop: 2 },
  meter: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 22,
    maxWidth: 360,
    backgroundColor: '#416657',
  },
  fill: { height: '100%', backgroundColor: '#C7DE99', borderRadius: 3 },
  percent: { marginTop: 7, color: '#D7E7C4', fontSize: 12, fontWeight: '600' },
  period: {
    position: 'absolute',
    right: 18,
    top: 16,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 20,
    backgroundColor: '#153F34',
    borderWidth: 1,
    borderColor: '#60806B',
  },
  periodCompact: { right: 9, top: 9, gap: 4, paddingHorizontal: 7 },
  periodText: { fontSize: 11, lineHeight: 16, color: '#F5F7E9', fontWeight: '600' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    gap: 4,
    paddingHorizontal: 17,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#DCE2D8',
    borderRadius: 13,
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  badge: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  tileLabel: { fontSize: 13, fontWeight: '600', color: '#435D4F' },
  tileValue: {
    color: palette.ink,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: -1.3,
    fontVariant: ['tabular-nums'],
  },
  tileDetail: { fontSize: 12, lineHeight: 17, color: '#5F7065' },
});
