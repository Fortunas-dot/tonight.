// When a screen crashes while drawing, show a calm "something went wrong" page instead of a blank app,
// and log the crash (with the component trail) to the error log.
import { Component } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from './theme';
import { logError } from './errorLog';

export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    const where = String(info?.componentStack || '').trim().split('\n').slice(0, 12).join('\n');
    logError('render', error, where ? { components: where.slice(0, 3000) } : null, 'crash');
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={s.wrap}>
        <Text style={s.title}>Something went wrong</Text>
        <Text style={s.body}>{"We've been told about it and are looking into it. Try again, and if it keeps happening, let us know in Me › Support."}</Text>
        <Pressable style={s.btn} onPress={() => this.setState({ failed: false })} accessibilityRole="button">
          <Text style={s.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  title: { color: C.ink, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { color: C.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  btn: { marginTop: 8, backgroundColor: C.pink, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 28 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
