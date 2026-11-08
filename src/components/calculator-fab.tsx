import { PureComponent, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/app-text';
import { Modal } from '@/components/ui/modal';
import { radii, shadows, spacing, useThemeColors } from '@/theme';

const KEYS = [['AC', '⌫', '%', '÷'], ['7', '8', '9', '×'], ['4', '5', '6', '−'], ['1', '2', '3', '+'], ['±', '0', '.', '=']];
const FAB_SIZE = 56;
const EDGE_GAP = 12;
const TAB_BAR_CLEARANCE = 88;

type Position = { x: number; y: number };
type DraggableButtonProps = {
  width: number;
  height: number;
  topInset: number;
  bottomInset: number;
  buttonColors: { backgroundColor: string; borderColor: string };
  onPress: () => void;
};
type DraggableButtonState = { position: Position; pressed: boolean };

function clampPosition(next: Position, bounds: DraggableButtonProps): Position {
  const minX = EDGE_GAP;
  const maxX = Math.max(minX, bounds.width - FAB_SIZE - EDGE_GAP);
  const minY = Math.max(EDGE_GAP, bounds.topInset + EDGE_GAP);
  const maxY = Math.max(minY, bounds.height - Math.max(bounds.bottomInset, EDGE_GAP) - TAB_BAR_CLEARANCE - FAB_SIZE);
  return {
    x: Math.min(maxX, Math.max(minX, next.x)),
    y: Math.min(maxY, Math.max(minY, next.y)),
  };
}

class DraggableCalculatorButton extends PureComponent<DraggableButtonProps, DraggableButtonState> {
  private opacity = new Animated.Value(0.18);
  private fade: ReturnType<typeof Animated.timing> | null = null;
  private dragOrigin: Position;
  private dragged = false;
  private panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];

  constructor(props: DraggableButtonProps) {
    super(props);
    const start = {
      x: props.width - FAB_SIZE - spacing.lg,
      y: props.height - Math.max(props.bottomInset, EDGE_GAP) - TAB_BAR_CLEARANCE - FAB_SIZE,
    };
    this.state = { position: clampPosition(start, props), pressed: false };
    this.dragOrigin = this.state.position;
    this.panHandlers = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: this.onDragGrant,
      onPanResponderMove: this.onDragMove,
      onPanResponderRelease: this.onDragRelease,
      onPanResponderTerminate: this.onDragTerminate,
      onPanResponderTerminationRequest: () => false,
    }).panHandlers;
  }

  componentDidUpdate(previousProps: DraggableButtonProps) {
    const { width, height, topInset, bottomInset } = this.props;
    if (width !== previousProps.width || height !== previousProps.height || topInset !== previousProps.topInset || bottomInset !== previousProps.bottomInset) {
      const position = clampPosition(this.state.position, this.props);
      if (position.x !== this.state.position.x || position.y !== this.state.position.y) this.setState({ position });
    }
  }

  componentWillUnmount() {
    this.fade?.stop();
  }

  private wake = () => {
    this.fade?.stop();
    this.opacity.setValue(1);
  };

  private fadeWhenIdle = () => {
    this.fade?.stop();
    this.fade = Animated.timing(this.opacity, {
      toValue: 0.18, delay: 1500, duration: 300, useNativeDriver: true, isInteraction: false,
    });
    this.fade.start();
  };

  private onDragGrant = () => {
    this.wake();
    this.dragOrigin = this.state.position;
    this.dragged = false;
    this.setState({ pressed: true });
  };

  private onDragMove = (_event: unknown, gesture: { dx: number; dy: number }) => {
    if (!this.dragged && Math.abs(gesture.dx) <= 5 && Math.abs(gesture.dy) <= 5) return;
    this.dragged = true;
    this.setState({
      position: clampPosition({ x: this.dragOrigin.x + gesture.dx, y: this.dragOrigin.y + gesture.dy }, this.props),
    });
  };

  private onDragRelease = () => {
    const wasDragged = this.dragged;
    this.dragged = false;
    this.setState({ pressed: false });
    this.fadeWhenIdle();
    if (!wasDragged) this.props.onPress();
  };

  private onDragTerminate = () => {
    this.dragged = false;
    this.setState({ pressed: false });
    this.fadeWhenIdle();
  };

  render() {
    const { position } = this.state;
    return (
      <Animated.View style={[styles.fabPosition, { left: position.x, top: position.y, opacity: this.opacity }]}>
        <View
          {...this.panHandlers}
          accessible
          accessibilityHint="Drag to move the calculator button. Tap to open the calculator."
          accessibilityLabel="Open calculator"
          accessibilityRole="button"
          onAccessibilityTap={this.props.onPress}
          style={[styles.fab, this.props.buttonColors, this.state.pressed && styles.pressed]}
        >
          <Icon name="calculator" size={23} color="primary" />
        </View>
      </Animated.View>
    );
  }
}

function evaluateExpression(source: string): number {
  const tokens = source.match(/(?:\d+\.?\d*|\.\d+)|[+−×÷]/g) ?? [];
  if (!tokens.length || tokens.join('') !== source) return NaN;
  let index = 0;

  function primary(): number {
    let sign = 1;
    while (tokens[index] === '+' || tokens[index] === '−') {
      if (tokens[index] === '−') sign *= -1;
      index += 1;
    }
    const token = tokens[index++];
    if (!token || !/^\d+\.?\d*$|^\.\d+$/.test(token)) throw new Error('Invalid expression');
    return sign * Number(token);
  }

  function term(): number {
    let value = primary();
    while (tokens[index] === '×' || tokens[index] === '÷') {
      const operation = tokens[index++];
      const next = primary();
      if (operation === '÷' && next === 0) throw new Error('Division by zero');
      value = operation === '×' ? value * next : value / next;
    }
    return value;
  }

  function sum(): number {
    let value = term();
    while (tokens[index] === '+' || tokens[index] === '−') {
      const operation = tokens[index++];
      const next = term();
      value = operation === '+' ? value + next : value - next;
    }
    return value;
  }

  try {
    const result = sum();
    return index === tokens.length ? result : NaN;
  } catch {
    return NaN;
  }
}

export function CalculatorFab({ inline = false }: { inline?: boolean }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [startNew, setStartNew] = useState(false);

  function clear() {
    setDisplay('0');
    setExpression('');
    setStartNew(false);
  }

  function calculate() {
    if (!expression || expression.endsWith('=')) return;
    const result = evaluateExpression(`${expression}${display}`);
    setExpression(`${expression}${display} =`);
    setDisplay(Number.isFinite(result) ? String(Number(result.toFixed(8))) : 'Error');
    setStartNew(true);
  }

  function press(key: string) {
    if (key === 'AC') return clear();
    if (key === '⌫') {
      setDisplay((value) => value === 'Error' || value.length <= 1 ? '0' : value.slice(0, -1));
      return;
    }
    if (key === '=') return calculate();
    if (['+', '−', '×', '÷'].includes(key)) {
      if (expression.endsWith('=')) {
        setExpression(`${display}${key}`);
      } else if (startNew && /[+−×÷]$/.test(expression)) {
        setExpression(`${expression.slice(0, -1)}${key}`);
      } else {
        setExpression(`${expression}${display}${key}`);
      }
      setDisplay('0');
      setStartNew(true);
      return;
    }
    if (key === '%') {
      setDisplay((value) => String(Number(value) / 100));
      setStartNew(true);
      return;
    }
    if (key === '±') {
      setDisplay((value) => String(-Number(value)));
      return;
    }
    if (key === '.') {
      if (startNew || display === 'Error') {
        if (expression.endsWith('=')) setExpression('');
        setDisplay('0.');
        setStartNew(false);
      } else if (!display.includes('.')) setDisplay((value) => `${value}.`);
      return;
    }
    if (startNew || display === 'Error') {
      if (expression.endsWith('=')) setExpression('');
      setDisplay(key);
      setStartNew(false);
    } else {
      setDisplay((value) => value === '0' ? key : value.length < 14 ? `${value}${key}` : value);
    }
  }

  return (
    <>
      {inline ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Open calculator"
          onPress={() => setVisible(true)} style={({ pressed }) => [styles.inlineTrigger, pressed && styles.keyPressed]}>
          <AppText variant="link" color="primary">Calculator</AppText>
        </Pressable>
      ) : <DraggableCalculatorButton
        bottomInset={insets.bottom}
        buttonColors={{ backgroundColor: colors.surface, borderColor: colors.borderStrong }}
        height={height}
        onPress={() => setVisible(true)}
        topInset={insets.top}
        width={width}
      />}
      <Modal visible={visible} onClose={() => setVisible(false)} title="Calculator">
        <View style={[styles.display, { backgroundColor: colors.surfaceAlt }]} accessibilityLiveRegion="polite">
          <AppText variant="caption" color="textSecondary" numberOfLines={1} style={styles.expression}>
            {expression ? `${expression}${startNew ? '' : display}` : ' '}
          </AppText>
          <AppText variant="amount" numberOfLines={1} adjustsFontSizeToFit style={styles.displayText}>{display}</AppText>
        </View>
        <View style={styles.keypad}>
          {KEYS.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key, keyIndex) => {
                const isOperator = ['÷', '×', '−', '+', '='].includes(key);
                return (
                  <Pressable
                    key={`${rowIndex}-${keyIndex}`}
                    accessibilityRole="button"
                    accessibilityLabel={key === '⌫' ? 'Delete last digit' : key}
                    onPress={() => press(key)}
                    style={({ pressed }) => [
                      styles.key,
                      { backgroundColor: 'transparent', borderColor: colors.borderStrong, borderWidth: 1 },
                      pressed && styles.keyPressed,
                    ]}
                  >
                    <AppText variant="h3" color={isOperator ? 'primary' : 'text'}>{key}</AppText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  inlineTrigger: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  fabPosition: {
    position: 'absolute',
    zIndex: 10,
  },
  fab: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
    ...shadows.card,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  display: {
    alignItems: 'flex-end',
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: 80,
    paddingHorizontal: spacing.lg,
  },
  displayText: { maxWidth: '100%' },
  expression: { alignSelf: 'stretch', minHeight: 18, textAlign: 'right' },
  keypad: { gap: spacing.sm, width: '100%' },
  keypadRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  key: {
    alignItems: 'center',
    borderRadius: radii.md,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    minWidth: 0,
  },
  keyPressed: { opacity: 0.68 },
});
